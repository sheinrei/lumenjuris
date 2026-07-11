"""
Enrichissement LLM des décisions ingérées.

Règles (brique critique — testée par les evals Promptfoo de legal_watch/evals) :
- liste FERMÉE de concepts (issue de LegalConceptMapping) : aucun concept inventé ;
- hors périmètre → legalDomain="hors_perimetre" (l'item sera DISCARDED côté Node) ;
- impactLevel "haut" réservé aux revirements / précisions nouvelles affectant
  la rédaction ou la validité des contrats ;
- le résumé ne présente jamais une interprétation comme certaine
  (« la Cour retient que… », jamais de conseil) ;
- validation Pydantic stricte, 1 retry en cas de sortie invalide, puis erreur
  d'item sans bloquer le batch.
"""
import json
import logging
import os
from typing import Any, Dict, List, Tuple

from pydantic import ValidationError

from back.services.pdf_processing import _openai_client
from back.legal_watch.schemas import (
    HORS_PERIMETRE,
    ConceptDef,
    EnrichItemInput,
    EnrichItemOutput,
    EnrichmentResult,
)

logger = logging.getLogger(__name__)

DEFAULT_MODEL = os.environ.get("LEGAL_WATCH_ENRICH_MODEL", "gpt-4o-mini")
MAX_TEXT_CHARS = 24_000  # ~6k tokens : suffisant pour motivation + dispositif


def build_prompt(item: EnrichItemInput, concepts: List[ConceptDef]) -> str:
    """Prompt d'enrichissement. Liste fermée de concepts + règles de calibrage."""
    concept_lines = "\n".join(
        f'- "{c.concept}" ({c.label}) — indices : {", ".join(c.keywords[:6])}'
        for c in concepts
    )
    domains = sorted({c.legalDomain for c in concepts})
    text = item.rawText[:MAX_TEXT_CHARS]

    return f"""Tu es un juriste documentaliste spécialisé en droit du travail français. Tu analyses une source juridique (décision de justice OU texte officiel : loi, décret, arrêté) pour un outil de veille destiné à des juristes. Tu détectes et priorises, tu ne donnes JAMAIS d'avis juridique.

SOURCE À ANALYSER
Titre : {item.title}
Juridiction / nature : {item.jurisdiction or "inconnue"}
Date : {item.decisionDate or "inconnue"}
Texte (pseudonymisé) :
\"\"\"{text}\"\"\"

CONCEPTS AUTORISÉS (liste FERMÉE — tu ne peux en inventer AUCUN autre) :
{concept_lines}

DOMAINES AUTORISÉS : {", ".join(domains)} ou "{HORS_PERIMETRE}".

Réponds UNIQUEMENT avec un objet JSON valide, exactement ce format :
{{
  "summary": "2-3 phrases en français clair, sans jargon inutile",
  "legalDomain": "un domaine autorisé ou '{HORS_PERIMETRE}'",
  "concepts": ["uniquement des concepts de la liste fermée ci-dessus"],
  "impactLevel": "haut | moyen | faible",
  "isEvolution": true,
  "confidence": 0.0
}}

RÈGLES IMPÉRATIVES :
1. "concepts" ne contient QUE des identifiants exacts de la liste fermée. Si la source ne touche aucun de ces concepts : "concepts": [] et "legalDomain": "{HORS_PERIMETRE}".
2. "impactLevel": "haut" UNIQUEMENT pour un revirement de jurisprudence, un texte nouveau ou une précision affectant directement la rédaction ou la validité des contrats ; "moyen" pour une confirmation avec application notable ; "faible" pour le reste.
3. "isEvolution": true si la source fait évoluer la position établie (revirement, texte nouveau), false si elle la confirme.
4. Le "summary" ne présente jamais une interprétation comme certaine : écris « la Cour retient que… », « le texte prévoit que… » — jamais de conseil ni de recommandation.
5. "confidence" : ta confiance globale (0 à 1) dans cette classification."""


def _validate(raw: str, allowed_concepts: set) -> EnrichmentResult:
    """Parse + validation stricte : JSON, schéma, et liste fermée des concepts."""
    data = json.loads(raw)
    result = EnrichmentResult.model_validate(data)
    unknown = [c for c in result.concepts if c not in allowed_concepts]
    if unknown:
        raise ValueError(f"concepts hors liste fermée : {unknown}")
    return result


def enrich_items(
    items: List[EnrichItemInput],
    concepts: List[ConceptDef],
    model: str = DEFAULT_MODEL,
) -> Tuple[List[EnrichItemOutput], Dict[str, Any]]:
    """Enrichit un batch. Chaque item est indépendant : une erreur n'interrompt
    pas les autres. Retourne (résultats, usage tokens agrégé)."""
    if _openai_client is None:
        raise RuntimeError("Client OpenAI non configuré (OPENAI_API_KEY manquante).")

    allowed = {c.concept for c in concepts}
    valid_domains = {c.legalDomain for c in concepts} | {HORS_PERIMETRE}
    outputs: List[EnrichItemOutput] = []
    usage = {"model": model, "input_tokens": 0, "output_tokens": 0}

    for item in items:
        prompt = build_prompt(item, concepts)
        last_error = ""
        result: EnrichmentResult | None = None

        for attempt in range(2):  # 1 essai + 1 retry sur sortie invalide
            try:
                resp = _openai_client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0,
                    max_tokens=600,
                    response_format={"type": "json_object"},
                )
                u = getattr(resp, "usage", None)
                if u:
                    usage["input_tokens"] += int(getattr(u, "prompt_tokens", 0) or 0)
                    usage["output_tokens"] += int(getattr(u, "completion_tokens", 0) or 0)
                raw = resp.choices[0].message.content or ""
                result = _validate(raw, allowed)
                if result.legalDomain not in valid_domains:
                    raise ValueError(f"legalDomain inconnu : {result.legalDomain}")
                break
            except (json.JSONDecodeError, ValidationError, ValueError) as e:
                last_error = f"sortie LLM invalide (tentative {attempt + 1}) : {e}"
                logger.warning(f"[legal-watch enrich] {item.externalId} — {last_error}")
                result = None
            except Exception as e:
                # Erreur d'appel API : pas de retry immédiat ici (le backoff est
                # géré par le SDK), on marque l'item en erreur.
                last_error = f"appel LLM en échec : {e}"
                logger.warning(f"[legal-watch enrich] {item.externalId} — {last_error}")
                result = None
                break

        if result is None:
            outputs.append(EnrichItemOutput(
                externalId=item.externalId, status="error", error=last_error))
        elif result.legalDomain == HORS_PERIMETRE or not result.concepts:
            outputs.append(EnrichItemOutput(
                externalId=item.externalId, status="discarded", data=result))
        else:
            outputs.append(EnrichItemOutput(
                externalId=item.externalId, status="enriched", data=result))

    return outputs, usage
