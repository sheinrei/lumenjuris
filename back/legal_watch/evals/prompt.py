"""
Fonction de prompt pour les evals Promptfoo.

Réutilise le VRAI prompt de production (enrichment.build_prompt) — les evals
testent exactement ce que le pipeline exécute.

La taxonomie ci-dessous reflète le seed backNode/prisma/seedLegalWatch.ts :
la maintenir synchronisée si un concept est ajouté.
"""
import os
import sys

# Rend le package `back` importable quel que soit le cwd de promptfoo
_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from back.legal_watch.enrichment import build_prompt  # noqa: E402
from back.legal_watch.schemas import ConceptDef, EnrichItemInput  # noqa: E402

DOMAIN = "droit_travail_contrats_precaires"

CONCEPTS = [
    ConceptDef(concept="motif_recours_cdd", label="Motif de recours au CDD",
               legalDomain=DOMAIN,
               keywords=["motif de recours", "cas de recours", "article L1242-2"]),
    ConceptDef(concept="accroissement_temporaire_activite",
               label="Accroissement temporaire d'activité", legalDomain=DOMAIN,
               keywords=["accroissement temporaire d'activité", "surcroît d'activité"]),
    ConceptDef(concept="requalification_cdi", label="Requalification en CDI",
               legalDomain=DOMAIN,
               keywords=["requalification en contrat à durée indéterminée",
                         "article L1245-1"]),
    ConceptDef(concept="duree_maximale_renouvellement",
               label="Durée maximale et renouvellement du CDD", legalDomain=DOMAIN,
               keywords=["durée maximale", "renouvellement", "article L1242-8"]),
    ConceptDef(concept="delai_de_carence", label="Délai de carence",
               legalDomain=DOMAIN,
               keywords=["délai de carence", "contrats successifs",
                         "article L1244-3"]),
    ConceptDef(concept="mentions_obligatoires_cdd",
               label="Mentions obligatoires du CDD", legalDomain=DOMAIN,
               keywords=["mentions obligatoires", "définition précise de son motif",
                         "article L1242-12"]),
    ConceptDef(concept="indemnite_precarite", label="Indemnité de précarité",
               legalDomain=DOMAIN,
               keywords=["indemnité de fin de contrat", "10 % de la rémunération",
                         "article L1243-8"]),
    ConceptDef(concept="rupture_anticipee_cdd", label="Rupture anticipée du CDD",
               legalDomain=DOMAIN,
               keywords=["rupture anticipée", "faute grave", "article L1243-1"]),
    ConceptDef(concept="transmission_tardive_contrat",
               label="Transmission tardive du contrat", legalDomain=DOMAIN,
               keywords=["transmission du contrat", "deux jours ouvrables",
                         "article L1242-13"]),
]


def generate_prompt(context: dict) -> str:
    v = context["vars"]
    item = EnrichItemInput(
        externalId="eval",
        title=v.get("title", ""),
        jurisdiction=v.get("jurisdiction", "soc"),
        decisionDate=v.get("decisionDate", "2026-01-15"),
        rawText=v["rawText"],
    )
    return build_prompt(item, CONCEPTS)
