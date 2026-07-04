// Éditeur de contrat « document d'abord » — générique (piloté par un ContractModel).
// Un seul éditeur : tout le texte est librement éditable, les variables sont
// surlignées et remplies d'un seul clic. Export en bas.
// Utilisé pour tous les types de contrat (CDD, CDI, avenant, disciplinaire, rupture).
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { jsPDF } from "jspdf";
import {
  ArrowLeft, Download, FileText, FileSignature, Bold, Italic, List,
  Sparkles, X, Loader2, ShieldCheck, ChevronDown, ShieldAlert, MessagesSquare,
} from "lucide-react";
import { cddAccroissementModel } from "../../../../contractEngine/models/cddAccroissement";
import type { ContractModel } from "../../../../contractEngine/types";
import { createInitialState } from "../../../../contractEngine/state";
import { splitSegments } from "../../../../contractEngine/segments";
import { Variable } from "./VariableNode";
import { CompanySearchField } from "../../../common/CompanySearchField";
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

/** Document de départ : contrat complet par défaut, variables vides surlignées. */
function buildInitialHtml(model: ContractModel, varLabel: Map<string, string>): string {
  const state = createInitialState(model);
  let html = "";
  for (const block of model.blocks) {
    let content = block.content;
    if (block.alternativeId) {
      const altId = block.alternativeId;
      const alt = model.alternatives.find((a) => a.id === altId);
      const opt = alt?.options.find((o) => o.id === state.alternatives[altId]);
      content = opt?.content ?? content;
    }
    if (isEmptyClause(content)) continue;
    if (block.kind === "title") {
      html += `<h2 style="text-align:center">${escapeHtml(content)}</h2>`;
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
  const hasConvention = useMemo(
    () => model.variables.some((v) => v.id === "convention_collective"),
    [model],
  );
  // Pré-remplissage employeur : pertinent seulement pour les modèles « employeur ».
  const hasEmployer = useMemo(
    () => model.variables.some((v) => v.id === "emp_denomination"),
    [model],
  );

  const editor = useEditor(
    {
      extensions: [StarterKit, Variable],
      content: initialHtml,
    },
    [initialHtml],
  );

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

  const [exportOpen, setExportOpen] = useState(false);
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
    const values: Record<string, string> = {};
    editor.state.doc.descendants((node) => {
      if (node.type.name === "variable" && node.attrs.value) {
        values[node.attrs.name as string] = node.attrs.value as string;
      }
    });
    let html = "";
    for (const block of newText.split(/\n{2,}/)) {
      const t = block.trim();
      if (!t) continue;
      if (t.startsWith("# ")) html += `<h2 style="text-align:center">${escapeHtml(t.slice(2))}</h2>`;
      else if (t.startsWith("### ")) html += `<h3>${segmentsToHtml(t.slice(4), varLabel, values)}</h3>`;
      else html += `<p>${segmentsToHtml(t, varLabel, values).replace(/\n/g, "<br>")}</p>`;
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
    `rounded p-1.5 ${active ? "bg-[#354F99] text-white" : "text-gray-500 hover:bg-gray-100"}`;

  return (
    <div className="mx-auto max-w-3xl">
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#354F99]">
        <ArrowLeft className="h-4 w-4" /> Retour aux modèles
      </button>

      {/* Pré-remplissage employeur (SIRET / nom) — seulement si le modèle a un employeur */}
      {hasEmployer && (
        <div className="mb-5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
          <CompanySearchField
            onSelect={applyCompany}
            label="Pré-remplir l'employeur"
            hint=""
          />
        </div>
      )}

      {/* Barre de mise en forme */}
      {editor && (
        <div className="mb-2 flex gap-1">
          <button type="button" className={tbtn(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></button>
          <button type="button" className={tbtn(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></button>
          <button type="button" className={tbtn(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></button>
        </div>
      )}

      {/* Le contrat — entièrement éditable */}
      <div
        ref={wrapRef}
        onMouseMove={onMouseMove}
        onMouseLeave={() => setHover(null)}
        className="relative rounded-2xl border border-gray-200 bg-white px-10 py-10 shadow-sm"
      >
        <EditorContent
          editor={editor}
          className="prose prose-sm max-w-none leading-relaxed text-gray-800 focus:outline-none [&_:focus]:outline-none"
        />

        {/* Bouton IA au survol d'une clause */}
        {hover && !ai && (
          <button
            type="button"
            onClick={openAi}
            style={{ top: hover.top }}
            title="Préciser cette clause avec l'IA"
            className="absolute right-3 z-10 inline-flex items-center gap-1 rounded-lg border border-[#354F99]/30 bg-white px-2 py-1 text-[11px] font-medium text-[#354F99] shadow-sm transition hover:bg-[#354F99]/5"
          >
            <Sparkles className="h-3.5 w-3.5" /> IA
          </button>
        )}

        {/* Panneau IA de la clause */}
        {ai && (
          <div
            style={{ top: Math.max(0, ai.top) }}
            className="absolute right-3 z-20 w-80 rounded-xl border border-gray-200 bg-white p-3 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-800">
                <Sparkles className="h-3.5 w-3.5 text-[#354F99]" /> Préciser la clause
              </span>
              <button onClick={() => setAi(null)} className="rounded p-0.5 text-gray-400 hover:bg-gray-100"><X className="h-3.5 w-3.5" /></button>
            </div>

            <textarea
              value={ai.instruction}
              onChange={(e) => setAi((a) => (a ? { ...a, instruction: e.target.value } : a))}
              rows={2}
              placeholder="Que souhaitez-vous préciser ? (ex. « ajoute un préavis de 8 jours »)"
              className="mt-2 w-full resize-none rounded-lg border border-gray-200 px-2 py-1.5 text-[12px] outline-none focus:border-[#354F99]"
            />
            <button
              disabled={ai.loading || !ai.instruction.trim()}
              onClick={runInstruction}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#354F99] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#1a2d5a] disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" /> Valider
            </button>

            {ai.loading && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-gray-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Génération…</p>
            )}
            {ai.error && <p className="mt-2 text-[11px] text-red-600">{ai.error}</p>}
            {ai.result && (
              <div className="mt-2">
                <p className="max-h-40 overflow-auto whitespace-pre-line rounded-lg bg-gray-50 p-2 text-[12px] leading-snug text-gray-700">{ai.result}</p>
                <div className="mt-2 flex gap-1.5">
                  <button onClick={acceptAi} className="rounded-lg bg-[#354F99] px-2.5 py-1 text-[11px] font-medium text-white hover:bg-[#1a2d5a]">Remplacer la clause</button>
                  <button onClick={() => setAi((a) => (a ? { ...a, result: null } : a))} className="rounded-lg px-2.5 py-1 text-[11px] text-gray-500 hover:bg-gray-100">Réessayer</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Barre sticky « Modifier avec l'IA » — visible en permanence pendant l'édition */}
      <div className="sticky bottom-4 z-30 mt-4">
        <div className="rounded-2xl border border-gray-200 bg-white/95 p-2 shadow-lg backdrop-blur">
          <div className="flex items-center gap-2">
            <Sparkles className="ml-2 h-4 w-4 shrink-0 text-[#354F99]" />
            <input
              value={globalAi.instruction}
              onChange={(e) => setGlobalAi((g) => ({ ...g, instruction: e.target.value, applied: false }))}
              onKeyDown={(e) => { if (e.key === "Enter") void runGlobalAi(); }}
              disabled={globalAi.loading}
              placeholder="Modifier avec l'IA — ex. « passe le préavis à 2 mois », « ajoute une clause de confidentialité »…"
              className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm text-gray-800 outline-none placeholder:text-gray-400 disabled:opacity-60"
            />
            <button
              onClick={() => void runGlobalAi()}
              disabled={globalAi.loading || !globalAi.instruction.trim()}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#354F99] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1a2d5a] disabled:opacity-40"
            >
              {globalAi.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {globalAi.loading ? "Modification…" : "Modifier"}
            </button>
          </div>
          {globalAi.error && (
            <p className="px-2 pb-1 pt-1.5 text-xs text-red-600">{globalAi.error}</p>
          )}
          {globalAi.applied && (
            <p className="flex items-center gap-2 px-2 pb-1 pt-1.5 text-xs text-emerald-700">
              Contrat modifié.
              <button
                onClick={() => { editor?.chain().focus().undo().run(); setGlobalAi((g) => ({ ...g, applied: false })); }}
                className="font-semibold underline underline-offset-2 hover:text-emerald-900"
              >
                Annuler
              </button>
            </p>
          )}
        </div>
      </div>

      {/* Actions en bas : à gauche secondaires, signature en ligne à droite */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Exporter (menu PDF / Word) */}
          <div className="relative">
            <button
              onClick={() => setExportOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:border-[#354F99] hover:text-[#354F99]"
            >
              <Download className="h-4 w-4" /> Exporter <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {exportOpen && (
              <div className="absolute bottom-full left-0 z-20 mb-1 w-40 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                <button onClick={() => { exportPdf(); setExportOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"><Download className="h-4 w-4" /> PDF</button>
                <button onClick={() => { exportDocx(); setExportOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"><FileText className="h-4 w-4" /> Word</button>
              </div>
            )}
          </div>

          {hasConvention && (
            <button
              onClick={() => setCcPanel((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:border-[#354F99] hover:text-[#354F99]"
            >
              <ShieldCheck className="h-4 w-4" /> Convention collective
            </button>
          )}

          {/* Réviser : analyse des risques (surlignage + modale) */}
          <button
            onClick={goReview}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:border-[#354F99] hover:text-[#354F99]"
          >
            <ShieldAlert className="h-4 w-4" /> Réviser (risques)
          </button>
        </div>

        {/* Choix final : négocier ou signer */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={goNegotiation}
            disabled={negoLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#354F99] px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-[#354F99]/25 transition hover:bg-[#1a2d5a] active:scale-[0.99] disabled:opacity-60"
          >
            {negoLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessagesSquare className="h-5 w-5" />}
            Négocier
          </button>
          <button
            onClick={goSignature}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700 active:scale-[0.99]"
          >
            <FileSignature className="h-5 w-5" /> Signature en ligne
          </button>
        </div>
      </div>

      {actionError && (
        <p className="mt-2 text-right text-xs text-red-600">{actionError}</p>
      )}

      {/* Panneau Convention collective : identifier (open data) + vérifier (IA) */}
      {hasConvention && ccPanel && (
        <div className="mt-4 space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-800">
              <ShieldCheck className="h-4 w-4 text-[#354F99]" /> Convention collective
            </span>
            <button onClick={() => setCcPanel(false)} className="rounded p-0.5 text-gray-400 hover:bg-gray-100"><X className="h-4 w-4" /></button>
          </div>

          <p className="text-xs text-gray-500">
            Convention actuelle : <strong className="text-gray-800">{readVar("convention_collective") || "—"}</strong>
          </p>

          <CompanySearchField
            onSelect={pickConvention}
            label="Identifier via une entreprise (open data)"
            hint="Recherchez l'entreprise par nom ou SIRET pour récupérer sa convention (code IDCC)."
            placeholder="Ex. « LumenJuris » ou « 55203253400703 »"
          />
          {ccFinderMsg && <p className="text-xs text-[#354F99]">{ccFinderMsg}</p>}

          <div className="border-t border-gray-100 pt-3">
            <button
              onClick={runCc}
              disabled={cc.loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#354F99] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#1a2d5a] disabled:opacity-50"
            >
              {cc.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Vérifier la conformité (IA)
            </button>
            {cc.error && <p className="mt-2 text-sm text-red-600">{cc.error}</p>}
            {cc.result && (
              <div className="prose prose-sm mt-2 max-w-none text-[13px] leading-relaxed text-gray-700 prose-p:my-1 prose-ul:my-1.5 prose-li:my-0.5">
                <ReactMarkdown>{cc.result}</ReactMarkdown>
              </div>
            )}
            <p className="mt-2 text-[10px] text-gray-400">Open data : recherche-entreprises (IDCC). Avis IA indicatif — ne remplace pas un conseil juridique.</p>
          </div>
        </div>
      )}
    </div>
  );
}
