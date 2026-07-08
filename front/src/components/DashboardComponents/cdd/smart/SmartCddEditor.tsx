// Éditeur de contrat « document d'abord » — générique (piloté par un ContractModel).
// Mode plein écran focalisé : barre d'app (logo + fil d'ariane + « Générer le contrat »),
// panneau latéral « Champs à compléter » (avancement par section), document éditable
// avec variables surlignées remplies d'un clic.
// Utilisé pour tous les types de contrat (CDD, CDI, avenant, disciplinaire, rupture).
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { jsPDF } from "jspdf";
import {
  Download, FileText, FileSignature, Bold, Italic, List, Quote,
  Sparkles, X, Loader2, ShieldCheck, ShieldAlert, MessagesSquare, Check, ChevronDown,
} from "lucide-react";
import { cddAccroissementModel } from "../../../../contractEngine/models/cddAccroissement";
import type { ContractModel } from "../../../../contractEngine/types";
import { createInitialState } from "../../../../contractEngine/state";
import { splitSegments } from "../../../../contractEngine/segments";
import { Variable } from "./VariableNode";
import { CompanySearchField } from "../../../common/CompanySearchField";
import { LumenJurisLogo } from "../../../common/LumenJurisLogo";
import { mapCompanyToContractParty, formatConventionFromCompany } from "../../../../utils/companyLookup";
import type { CompanyResult } from "../../../../types/companySearch";
import ReactMarkdown from "react-markdown";
import { instructClause, instructContract, verifyConvention } from "./clauseAi";
import { contractApi } from "../../contratheque/api";
import { negotiationApi } from "../../negotiation/api";

const isEmptyClause = (c: string) => c.trim() === "Sans objet.";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Convertit un contenu modèle (avec {{var}}) en HTML (texte + spans variables).
 * `values` permet de restaurer les valeurs déjà saisies (ex. après réécriture IA).
 */
function segmentsToHtml(
  content: string,
  varLabel: Map<string, string>,
  values?: Record<string, string>,
): string {
  return splitSegments(content)
    .map((seg) =>
      seg.type === "text"
        ? escapeHtml(seg.text)
        : `<span data-variable="${seg.name}" data-label="${escapeHtml(varLabel.get(seg.name) ?? seg.name)}" data-value="${escapeHtml(values?.[seg.name] ?? "")}"></span>`,
    )
    .join("");
}

/** Résout le contenu effectif d'un bloc (contenu par défaut ou option d'alternative). */
function resolveBlockContent(model: ContractModel, block: ContractModel["blocks"][number]): string {
  if (!block.alternativeId) return block.content;
  const state = createInitialState(model);
  const alt = model.alternatives.find((a) => a.id === block.alternativeId);
  const opt = alt?.options.find((o) => o.id === state.alternatives[block.alternativeId!]);
  return opt?.content ?? block.content;
}

/** Document de départ : contrat complet par défaut, variables vides surlignées. */
function buildInitialHtml(model: ContractModel, varLabel: Map<string, string>): string {
  let html = "";
  for (const block of model.blocks) {
    const content = resolveBlockContent(model, block);
    if (isEmptyClause(content)) continue;
    if (block.kind === "title") {
      html += `<h2>${escapeHtml(content)}</h2>`;
      continue;
    }
    if (block.heading) html += `<h3>${escapeHtml(block.heading)}</h3>`;
    // Respecte la structure : double saut de ligne = nouveau paragraphe, simple = <br>.
    // (Sans cela, ProseMirror écrase tous les \n et affiche la section en un seul bloc.)
    for (const para of content.split(/\n{2,}/)) {
      if (!para.trim()) continue;
      html += `<p>${segmentsToHtml(para, varLabel).replace(/\n/g, "<br>")}</p>`;
    }
  }
  return html;
}

/** Regroupe les variables par section (heading du bloc) pour le panneau « Champs à compléter ». */
interface FieldGroup { id: string; label: string; varIds: string[] }
function buildFieldGroups(model: ContractModel): FieldGroup[] {
  const seen = new Set<string>();
  const groups: FieldGroup[] = [];
  for (const block of model.blocks) {
    if (block.kind === "title") continue;
    const content = resolveBlockContent(model, block);
    if (isEmptyClause(content)) continue;
    const label = block.heading?.trim() || (block.kind === "preamble" ? "Parties" : "Préambule");
    const fresh: string[] = [];
    for (const seg of splitSegments(content)) {
      if (seg.type === "var" && !seen.has(seg.name)) {
        seen.add(seg.name);
        fresh.push(seg.name);
      }
    }
    if (!fresh.length) continue;
    const existing = groups.find((g) => g.label === label);
    if (existing) existing.varIds.push(...fresh);
    else groups.push({ id: block.id, label, varIds: fresh });
  }
  return groups;
}

// — Sérialisation pour l'export PDF —
type JNode = { type: string; attrs?: Record<string, unknown>; text?: string; content?: JNode[] };
function inlineText(nodes?: JNode[]): string {
  if (!nodes) return "";
  return nodes
    .map((n) =>
      n.type === "text" ? n.text ?? ""
      : n.type === "variable" ? (String(n.attrs?.value || "") || "…")
      : inlineText(n.content),
    )
    .join("");
}

/** Sérialisation pour l'IA : les variables restent des marqueurs {{nom}}. */
function markerText(nodes?: JNode[]): string {
  if (!nodes) return "";
  return nodes
    .map((n) =>
      n.type === "text" ? n.text ?? ""
      : n.type === "variable" ? `{{${String(n.attrs?.name ?? "")}}}`
      : markerText(n.content),
    )
    .join("");
}

interface Props {
  onBack: () => void;
  /** Modèle de contrat à éditer. Par défaut : CDD accroissement (rétro-compat). */
  model?: ContractModel;
  /** Base du nom de fichier exporté (sans extension). */
  fileBase?: string;
}

export function SmartCddEditor({ onBack, model = cddAccroissementModel, fileBase = "CDD-accroissement" }: Props) {
  const navigate = useNavigate();
  const varLabel = useMemo(() => new Map(model.variables.map((v) => [v.id, v.label])), [model]);
  const initialHtml = useMemo(() => buildInitialHtml(model, varLabel), [model, varLabel]);
  const fieldGroups = useMemo(() => buildFieldGroups(model), [model]);
  const hasConvention = useMemo(
    () => model.variables.some((v) => v.id === "convention_collective"),
    [model],
  );
  // Pré-remplissage employeur : pertinent seulement pour les modèles « employeur ».
  const hasEmployer = useMemo(
    () => model.variables.some((v) => v.id === "emp_denomination"),
    [model],
  );

  // Tick incrémenté à chaque modification du document : permet de recalculer
  // l'avancement (champs remplis) sans stocker une seconde source de vérité.
  const [tick, setTick] = useState(0);

  const editor = useEditor(
    {
      extensions: [StarterKit, Variable],
      content: initialHtml,
      onUpdate: () => setTick((t) => t + 1),
    },
    [initialHtml],
  );

  // Valeurs live des variables (dérivées du document ProseMirror à chaque tick).
  const values = useMemo(() => {
    const map: Record<string, string> = {};
    editor?.state.doc.descendants((node) => {
      if (node.type.name === "variable") map[node.attrs.name as string] = (node.attrs.value as string) || "";
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, tick]);

  const isFilled = (name: string) => (values[name] ?? "").trim().length > 0;
  const allVarIds = useMemo(() => fieldGroups.flatMap((g) => g.varIds), [fieldGroups]);
  const filledCount = allVarIds.filter(isFilled).length;
  const totalCount = allVarIds.length;
  const progress = totalCount ? Math.round((filledCount / totalCount) * 100) : 0;

  /** Focus + défilement vers le premier champ non rempli d'une section (ou le premier). */
  const scrollToGroup = (group: FieldGroup) => {
    const root = editor?.view.dom;
    if (!root) return;
    const target = group.varIds.find((v) => !isFilled(v)) ?? group.varIds[0];
    const el = root.querySelector<HTMLInputElement>(`input[data-var-name="${target}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus({ preventScroll: true });
    }
  };

  const setVar = (name: string, value: string) => {
    editor?.commands.command(({ tr, state }) => {
      state.doc.descendants((node, pos) => {
        if (node.type.name === "variable" && node.attrs.name === name) {
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, value });
        }
      });
      return true;
    });
  };

  const applyCompany = (result: CompanyResult, siret?: string) => {
    const p = mapCompanyToContractParty(result, siret);
    if (p.nom) setVar("emp_denomination", p.nom);
    if (p.siren) setVar("emp_siren", p.siren);
    const adresse = [p.code_postal, p.ville].filter(Boolean).join(" ");
    if (adresse) setVar("emp_adresse", adresse);
    if (p.representant) setVar("emp_representant", p.representant);
    if (p.qualite) setVar("emp_qualite", p.qualite);
  };

  // ── IA par clause (survol à droite) ──────────────────────────────────────
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ top: number; el: HTMLElement } | null>(null);
  const [ai, setAi] = useState<
    | { el: HTMLElement; top: number; original: string; instruction: string; loading: boolean; result: string | null; error: string | null }
    | null
  >(null);

  /** Bloc de premier niveau (enfant direct de la racine ProseMirror) survolé. */
  const topBlock = (target: HTMLElement): HTMLElement | null => {
    const root = editor?.view.dom;
    if (!root) return null;
    let node: HTMLElement | null = target;
    while (node && node.parentElement !== root) node = node.parentElement;
    return node;
  };

  const HEADINGS = new Set(["H1", "H2", "H3", "H4"]);

  const onMouseMove = (e: React.MouseEvent) => {
    const blk = topBlock(e.target as HTMLElement);
    if (!blk || !wrapRef.current) return;

    // Ancre le bouton au TITRE de la clause, cible le paragraphe (corps).
    let heading: Element | null = null;
    let paragraph: Element | null = null;
    if (HEADINGS.has(blk.tagName)) {
      heading = blk;
      let n = blk.nextElementSibling;
      while (n && n.tagName !== "P") n = n.nextElementSibling;
      paragraph = n;
    } else if (blk.tagName === "P") {
      paragraph = blk;
      let n = blk.previousElementSibling;
      while (n && !HEADINGS.has(n.tagName)) n = n.previousElementSibling;
      heading = n;
    }
    if (!paragraph) return;

    const anchor = (heading ?? paragraph) as HTMLElement;
    const top = anchor.getBoundingClientRect().top - wrapRef.current.getBoundingClientRect().top;
    const para = paragraph as HTMLElement;
    setHover((h) => (h?.el === para ? h : { el: para, top }));
  };

  const openAi = () => {
    if (!hover) return;
    // Sérialise la clause en conservant les variables sous forme {{NOM}}, afin que
    // l'IA les préserve et qu'on puisse les recréer ensuite (sinon elles sont perdues).
    let original = hover.el.textContent ?? "";
    if (editor) {
      try {
        const pos = editor.view.posAtDOM(hover.el, 0);
        const node = editor.state.doc.resolve(pos).parent;
        let out = "";
        node.forEach((child) => {
          out += child.type.name === "variable" ? `{{${child.attrs.name}}}` : child.textContent;
        });
        if (out.trim()) original = out;
      } catch { /* repli sur textContent */ }
    }
    setAi({ el: hover.el, top: hover.top, original, instruction: "", loading: false, result: null, error: null });
  };

  const runInstruction = async () => {
    if (!ai || !ai.instruction.trim()) return;
    setAi((a) => (a ? { ...a, loading: true, error: null } : a));
    try {
      const txt = await instructClause(ai.original, ai.instruction);
      setAi((a) => (a ? { ...a, loading: false, result: txt } : a));
    } catch {
      setAi((a) => (a ? { ...a, loading: false, error: "IA indisponible. Vérifiez que le service est lancé." } : a));
    }
  };

  const acceptAi = () => {
    if (!ai?.result || !editor) return;
    const pos = editor.view.posAtDOM(ai.el, 0);
    const $p = editor.state.doc.resolve(pos);
    const from = $p.before(1), to = $p.after(1);
    // Reconstruit le paragraphe en re-parsant les {{NOM}} en variables surlignées
    // (au lieu d'un texte brut qui supprimerait les variables de la clause).
    const html = `<p>${segmentsToHtml(ai.result, varLabel).replace(/\n/g, "<br>")}</p>`;
    editor.chain().focus().insertContentAt({ from, to }, html).run();
    setAi(null);
    setHover(null);
  };

  // ── Vérification convention collective ───────────────────────────────────
  const readVar = (name: string): string => {
    let v = "";
    editor?.state.doc.descendants((node) => {
      if (node.type.name === "variable" && node.attrs.name === name) v = (node.attrs.value as string) || "";
    });
    return v;
  };
  const [cc, setCc] = useState<{ open: boolean; loading: boolean; result: string | null; error: string | null }>(
    { open: false, loading: false, result: null, error: null },
  );
  const runCc = async () => {
    setCc({ open: true, loading: true, result: null, error: null });
    try {
      const result = await verifyConvention(readVar("convention_collective"), readVar("poste_intitule"), readVar("emp_code_naf"));
      setCc({ open: true, loading: false, result, error: null });
    } catch {
      setCc({ open: true, loading: false, result: null, error: "Vérification indisponible (service IA non joignable)." });
    }
  };

  const [genOpen, setGenOpen] = useState(false);
  const [ccPanel, setCcPanel] = useState(false);
  const [ccFinderMsg, setCcFinderMsg] = useState<string | null>(null);
  const [negoLoading, setNegoLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // ── Modification globale par l'IA (barre sticky sous le contrat) ─────────
  const [globalAi, setGlobalAi] = useState<{
    instruction: string;
    loading: boolean;
    error: string | null;
    applied: boolean;
  }>({ instruction: "", loading: false, error: null, applied: false });

  /** Sérialise le document complet pour l'IA (# titre, ### articles, {{variables}}). */
  const serializeDoc = (): string => {
    if (!editor) return "";
    const json = editor.getJSON() as JNode;
    const lines: string[] = [];
    for (const n of json.content ?? []) {
      const txt = markerText(n.content);
      if (!txt.trim()) continue;
      if (n.type === "heading") lines.push((n.attrs?.level === 2 ? "# " : "### ") + txt);
      else lines.push(txt);
    }
    return lines.join("\n\n");
  };

  /** Remplace tout le document par la version réécrite (annulable via Ctrl+Z). */
  const applyRewrite = (newText: string) => {
    if (!editor) return;
    // Conserve les valeurs déjà saisies dans les variables.
    const savedValues: Record<string, string> = {};
    editor.state.doc.descendants((node) => {
      if (node.type.name === "variable" && node.attrs.value) {
        savedValues[node.attrs.name as string] = node.attrs.value as string;
      }
    });
    let html = "";
    for (const block of newText.split(/\n{2,}/)) {
      const t = block.trim();
      if (!t) continue;
      if (t.startsWith("# ")) html += `<h2>${escapeHtml(t.slice(2))}</h2>`;
      else if (t.startsWith("### ")) html += `<h3>${segmentsToHtml(t.slice(4), varLabel, savedValues)}</h3>`;
      else html += `<p>${segmentsToHtml(t, varLabel, savedValues).replace(/\n/g, "<br>")}</p>`;
    }
    if (!html) return;
    // insertContentAt sur toute la plage = transaction annulable (contrairement à setContent).
    editor.chain().focus().insertContentAt({ from: 0, to: editor.state.doc.content.size }, html).run();
  };

  const runGlobalAi = async () => {
    if (!editor || !globalAi.instruction.trim() || globalAi.loading) return;
    setGlobalAi((g) => ({ ...g, loading: true, error: null, applied: false }));
    try {
      const rewritten = await instructContract(serializeDoc(), globalAi.instruction);
      applyRewrite(rewritten);
      setGlobalAi({ instruction: "", loading: false, error: null, applied: true });
    } catch {
      setGlobalAi((g) => ({
        ...g,
        loading: false,
        error: "IA indisponible. Vérifiez que le service est lancé.",
      }));
    }
  };

  /** Identifie la convention via l'entreprise (open data : IDCC). */
  const pickConvention = (result: CompanyResult, siret?: string) => {
    const conv = formatConventionFromCompany(result, siret);
    if (conv) {
      setVar("convention_collective", conv);
      setCcFinderMsg(`Convention appliquée : ${conv}`);
    } else {
      setCcFinderMsg("Aucune convention collective (IDCC) trouvée — saisissez-la manuellement dans le contrat.");
    }
  };

  /** Construit le PDF du contrat (réutilisé pour l'export et la signature). */
  const buildPdfDoc = () => {
    const json = editor!.getJSON() as JNode;
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 56, maxW = pdf.internal.pageSize.getWidth() - margin * 2, pageH = pdf.internal.pageSize.getHeight();
    let y = margin;
    const block = (txt: string, bold: boolean, size: number, gap = 8) => {
      pdf.setFont("helvetica", bold ? "bold" : "normal"); pdf.setFontSize(size);
      for (const line of pdf.splitTextToSize(txt || " ", maxW) as string[]) {
        if (y + size + 2 > pageH - margin) { pdf.addPage(); y = margin; }
        pdf.text(line, margin, y); y += size + 2;
      }
      y += gap;
    };
    for (const n of json.content ?? []) {
      const txt = inlineText(n.content);
      if (n.type === "heading") block(txt, true, n.attrs?.level === 2 ? 15 : 11.5, 4);
      else if (txt.trim()) block(txt, false, 10.5, 8);
    }
    return pdf;
  };

  const exportPdf = () => {
    if (!editor) return;
    buildPdfDoc().save(`${fileBase}.pdf`);
  };

  /** Génère le PDF et l'envoie directement dans le module Signature. */
  const goSignature = () => {
    if (!editor) { navigate("/signature"); return; }
    const incomingPdf = buildPdfDoc().output("datauristring");
    navigate("/signature", { state: { incomingPdf, incomingName: `${fileBase}.pdf` } });
  };

  /** Texte brut du contrat (paragraphes séparés) pour la révision / négociation. */
  const getContractText = () => {
    if (!editor) return "";
    const json = editor.getJSON() as JNode;
    return (json.content ?? [])
      .map((n) => inlineText(n.content))
      .filter((t) => t.trim())
      .join("\n\n");
  };

  /** Réviser le contrat : ouvre l'analyse des risques (surlignage + modale) sur ce contrat. */
  const goReview = () => {
    if (!editor) { navigate("/analyzer"); return; }
    navigate("/analyzer", { state: { text: getContractText(), fileName: fileBase } });
  };

  /** Négocier : enregistre le contrat en contrathèque puis ouvre l'espace de négociation. */
  const goNegotiation = async () => {
    if (!editor || negoLoading) return;
    setNegoLoading(true);
    setActionError(null);
    try {
      const dataUri = buildPdfDoc().output("datauristring");
      const fileBase64 = dataUri.split(",")[1] ?? "";
      const created = await contractApi.create({
        title: fileBase,
        ocrText: getContractText(),
        fileBase64,
        metadataFields: [],
        contractType: model.label ?? null,
        counterpartyName: null,
        currency: "EUR",
        renewalType: "NONE",
        status: "ACTIVE",
      });
      const nego = await negotiationApi.enter(created.id, `Négociation — ${fileBase}`);
      navigate(`/negociation/${nego.id}`);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Impossible d'ouvrir la négociation.");
      setNegoLoading(false);
    }
  };

  const exportDocx = async () => {
    if (!editor) return;
    const json = editor.getJSON() as JNode;
    const docx = await import("docx");
    const { saveAs } = await import("file-saver");
    const { Document, Paragraph, TextRun, HeadingLevel, AlignmentType } = docx;
    const children = (json.content ?? []).map((n) => {
      const txt = inlineText(n.content);
      if (n.type === "heading") {
        const isTitle = n.attrs?.level === 2;
        return new Paragraph({
          heading: isTitle ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
          alignment: isTitle ? AlignmentType.CENTER : undefined,
          children: [new TextRun({ text: txt, bold: true })],
        });
      }
      return new Paragraph({ children: [new TextRun(txt)] });
    });
    const wordDoc = new Document({
      styles: { default: { document: { run: { font: "Calibri", size: 22 }, paragraph: { spacing: { line: 276 } } } } },
      sections: [{ properties: { page: { margin: { top: 1440, bottom: 1440, left: 1800, right: 1800 } } }, children }],
    });
    const blob = await docx.Packer.toBlob(wordDoc);
    saveAs(blob, `${fileBase}.docx`);
  };

  const tbtn = (active: boolean) =>
    `rounded-lg p-1.5 transition-colors ${active ? "bg-brand text-white" : "text-ink-muted hover:bg-surface-muted hover:text-ink-secondary"}`;

  /** Élément du menu « Générer le contrat ». */
  const MenuItem = ({ icon: Icon, label, onClick, tone = "default" }: {
    icon: React.ElementType; label: string; onClick: () => void; tone?: "default" | "brand";
  }) => (
    <button
      onClick={() => { setGenOpen(false); onClick(); }}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-surface-subtle ${
        tone === "brand" ? "font-medium text-brand" : "text-ink-secondary"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" /> {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface-subtle">
      {/* ── Barre d'application ─────────────────────────────────────────── */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-line bg-white px-5">
        <div className="flex items-center gap-3">
          <LumenJurisLogo variant="light" height={26} />
          <span className="text-ink-placeholder">/</span>
          <span className="text-sm text-ink-muted">Modèles</span>
          <span className="text-ink-placeholder">/</span>
          <span className="text-sm font-medium text-ink-secondary">{model.label}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink-muted sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" /> Brouillon enregistré
          </span>
          <div className="relative">
            <button
              onClick={() => setGenOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-brand-hover"
            >
              Générer le contrat <ChevronDown className={`h-3.5 w-3.5 transition-transform ${genOpen ? "rotate-180" : ""}`} />
            </button>
            {genOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setGenOpen(false)} />
                <div className="absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-card-md">
                  <MenuItem icon={FileSignature} label="Envoyer en signature" onClick={goSignature} tone="brand" />
                  <MenuItem icon={MessagesSquare} label="Ouvrir la négociation" onClick={() => void goNegotiation()} />
                  <MenuItem icon={ShieldAlert} label="Réviser (risques)" onClick={goReview} />
                  {hasConvention && (
                    <MenuItem icon={ShieldCheck} label="Convention collective" onClick={() => setCcPanel(true)} />
                  )}
                  <div className="my-1 border-t border-line-subtle" />
                  <MenuItem icon={Download} label="Télécharger en PDF" onClick={exportPdf} />
                  <MenuItem icon={FileText} label="Télécharger en Word" onClick={() => void exportDocx()} />
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Corps : panneau latéral + éditeur ───────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto flex max-w-6xl gap-8 px-6 py-6">
          {/* Colonne gauche */}
          <aside className="hidden w-64 shrink-0 space-y-4 lg:block">
            <button onClick={onBack} className="text-sm text-ink-muted transition-colors hover:text-brand">
              ← Retour aux modèles
            </button>

            <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-ink-subtle">
                Champs à compléter
              </p>
              <ul className="space-y-1">
                {fieldGroups.map((g) => {
                  const complete = g.varIds.every(isFilled);
                  return (
                    <li key={g.id}>
                      <button
                        onClick={() => scrollToGroup(g)}
                        className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                          complete ? "bg-brand-light ring-1 ring-brand/15" : "hover:bg-surface-subtle"
                        }`}
                      >
                        <span
                          className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border transition-colors ${
                            complete ? "border-brand bg-brand text-white" : "border-line-emphasis bg-white"
                          }`}
                        >
                          {complete && <Check className="h-3 w-3 stroke-[3]" />}
                        </span>
                        <span className={`min-w-0 flex-1 truncate text-sm ${complete ? "font-medium text-ink" : "text-ink-secondary"}`}>
                          {g.label}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Carte de progression */}
            <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-2.5 text-xs text-ink-muted">
                <span className="font-semibold text-ink-secondary">{filledCount}</span> champs sur {totalCount} complétés
              </p>
            </div>

            {/* Pré-remplissage employeur (SIRET / nom) — seulement si le modèle a un employeur */}
            {hasEmployer && (
              <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
                <CompanySearchField onSelect={applyCompany} label="Pré-remplir l'employeur" hint="" />
              </div>
            )}
          </aside>

          {/* Colonne éditeur */}
          <div className="min-w-0 flex-1 space-y-3">
            {/* Barre d'outils + synchronisation */}
            <div className="flex items-center justify-between px-1">
              {editor && (
                <div className="flex items-center gap-1">
                  <button type="button" className={tbtn(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></button>
                  <button type="button" className={tbtn(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></button>
                  <button type="button" className={tbtn(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></button>
                  <button type="button" className={tbtn(editor.isActive("blockquote"))} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="h-4 w-4" /></button>
                </div>
              )}
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-success" /> Synchronisé avec Word
              </span>
            </div>

            {/* Le contrat — entièrement éditable */}
            <div
              ref={wrapRef}
              onMouseMove={onMouseMove}
              onMouseLeave={() => setHover(null)}
              className="relative min-h-[70vh] rounded-2xl border border-line bg-white px-12 py-10 shadow-card"
            >
              <EditorContent
                editor={editor}
                className="prose prose-sm max-w-none leading-relaxed text-ink-secondary focus:outline-none [&_:focus]:outline-none
                  [&_h2]:mb-4 [&_h2]:text-[26px] [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-ink
                  [&_h3]:mb-2 [&_h3]:mt-7 [&_h3]:flex [&_h3]:items-center [&_h3]:gap-2.5 [&_h3]:text-[11px] [&_h3]:font-semibold [&_h3]:uppercase [&_h3]:tracking-[0.18em] [&_h3]:text-brand
                  [&_h3]:before:h-[2px] [&_h3]:before:w-6 [&_h3]:before:rounded-full [&_h3]:before:bg-brand [&_h3]:before:content-['']"
              />

              {/* Bouton IA au survol d'une clause */}
              {hover && !ai && (
                <button
                  type="button"
                  onClick={openAi}
                  style={{ top: hover.top }}
                  title="Préciser cette clause avec l'IA"
                  className="absolute right-3 z-10 inline-flex items-center gap-1 rounded-lg border border-brand/30 bg-white px-2 py-1 text-[11px] font-medium text-brand shadow-sm transition hover:bg-brand-light"
                >
                  <Sparkles className="h-3.5 w-3.5" /> IA
                </button>
              )}

              {/* Panneau IA de la clause */}
              {ai && (
                <div
                  style={{ top: Math.max(0, ai.top) }}
                  className="absolute right-3 z-20 w-80 rounded-card border border-line bg-white p-3 shadow-card-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink">
                      <Sparkles className="h-3.5 w-3.5 text-brand" /> Préciser la clause
                    </span>
                    <button onClick={() => setAi(null)} className="rounded p-0.5 text-ink-subtle hover:bg-surface-muted"><X className="h-3.5 w-3.5" /></button>
                  </div>

                  <textarea
                    value={ai.instruction}
                    onChange={(e) => setAi((a) => (a ? { ...a, instruction: e.target.value } : a))}
                    rows={2}
                    placeholder="Que souhaitez-vous préciser ? (ex. « ajoute un préavis de 8 jours »)"
                    className="mt-2 w-full resize-none rounded-lg border border-line px-2 py-1.5 text-[12px] outline-none focus:border-brand/40 focus:shadow-ring-brand"
                  />
                  <button
                    disabled={ai.loading || !ai.instruction.trim()}
                    onClick={runInstruction}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[12px] font-medium text-white hover:bg-brand-hover disabled:opacity-50"
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Valider
                  </button>

                  {ai.loading && (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-ink-muted"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Génération…</p>
                  )}
                  {ai.error && <p className="mt-2 text-[11px] text-danger">{ai.error}</p>}
                  {ai.result && (
                    <div className="mt-2">
                      <p className="max-h-40 overflow-auto whitespace-pre-line rounded-lg bg-surface-subtle p-2 text-[12px] leading-snug text-ink-secondary">{ai.result}</p>
                      <div className="mt-2 flex gap-1.5">
                        <button onClick={acceptAi} className="rounded-lg bg-brand px-2.5 py-1 text-[11px] font-medium text-white hover:bg-brand-hover">Remplacer la clause</button>
                        <button onClick={() => setAi((a) => (a ? { ...a, result: null } : a))} className="rounded-lg px-2.5 py-1 text-[11px] text-ink-muted hover:bg-surface-muted">Réessayer</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Barre sticky « Modifier avec l'IA » */}
            <div className="sticky bottom-3 z-30">
              <div className="rounded-2xl border border-line bg-white/95 p-2 shadow-card-md backdrop-blur">
                <div className="flex items-center gap-2">
                  <Sparkles className="ml-2 h-4 w-4 shrink-0 text-brand" />
                  <input
                    value={globalAi.instruction}
                    onChange={(e) => setGlobalAi((g) => ({ ...g, instruction: e.target.value, applied: false }))}
                    onKeyDown={(e) => { if (e.key === "Enter") void runGlobalAi(); }}
                    disabled={globalAi.loading}
                    placeholder="Modifier avec l'IA — ex. « passe le préavis à 2 mois », « ajoute une clause de confidentialité »…"
                    className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm text-ink outline-none placeholder:text-ink-subtle disabled:opacity-60"
                  />
                  <button
                    onClick={() => void runGlobalAi()}
                    disabled={globalAi.loading || !globalAi.instruction.trim()}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-40"
                  >
                    {globalAi.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {globalAi.loading ? "Modification…" : "Modifier"}
                  </button>
                </div>
                {globalAi.error && (
                  <p className="px-2 pb-1 pt-1.5 text-xs text-danger">{globalAi.error}</p>
                )}
                {globalAi.applied && (
                  <p className="flex items-center gap-2 px-2 pb-1 pt-1.5 text-xs text-success-dark">
                    Contrat modifié.
                    <button
                      onClick={() => { editor?.chain().focus().undo().run(); setGlobalAi((g) => ({ ...g, applied: false })); }}
                      className="font-semibold underline underline-offset-2 hover:text-success"
                    >
                      Annuler
                    </button>
                  </p>
                )}
              </div>
            </div>

            {actionError && <p className="text-right text-xs text-danger">{actionError}</p>}
          </div>
        </div>
      </div>

      {/* ── Modale Convention collective ────────────────────────────────── */}
      {hasConvention && ccPanel && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 p-4" onClick={() => setCcPanel(false)}>
          <div
            className="w-full max-w-lg space-y-3 rounded-card border border-line bg-white p-5 shadow-card-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
                <ShieldCheck className="h-4 w-4 text-brand" /> Convention collective
              </span>
              <button onClick={() => setCcPanel(false)} className="rounded p-0.5 text-ink-subtle hover:bg-surface-muted"><X className="h-4 w-4" /></button>
            </div>

            <p className="text-xs text-ink-muted">
              Convention actuelle : <strong className="text-ink">{readVar("convention_collective") || "—"}</strong>
            </p>

            <CompanySearchField
              onSelect={pickConvention}
              label="Identifier via une entreprise (open data)"
              hint="Recherchez l'entreprise par nom ou SIRET pour récupérer sa convention (code IDCC)."
              placeholder="Ex. « LumenJuris » ou « 55203253400703 »"
            />
            {ccFinderMsg && <p className="text-xs text-brand">{ccFinderMsg}</p>}

            <div className="border-t border-line-subtle pt-3">
              <button
                onClick={runCc}
                disabled={cc.loading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
              >
                {cc.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Vérifier la conformité (IA)
              </button>
              {cc.error && <p className="mt-2 text-sm text-danger">{cc.error}</p>}
              {cc.result && (
                <div className="prose prose-sm mt-2 max-h-64 max-w-none overflow-auto text-[13px] leading-relaxed text-ink-secondary prose-p:my-1 prose-ul:my-1.5 prose-li:my-0.5">
                  <ReactMarkdown>{cc.result}</ReactMarkdown>
                </div>
              )}
              <p className="mt-2 text-2xs text-ink-subtle">Open data : recherche-entreprises (IDCC). Avis IA indicatif — ne remplace pas un conseil juridique.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
