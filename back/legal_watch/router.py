"""
Endpoints FastAPI du module veille juridique (stateless — pas d'accès base).

Appelés par backNode (jobs d'ingestion/enrichissement) avec le header
`x-internal-api-key` si INTERNAL_API_KEY est défini côté environnement.
Ces endpoints ne sont pas exposés par le proxy public.
"""
import logging
import os
from typing import Optional

from fastapi import APIRouter, Header, HTTPException

from back.legal_watch import judilibre_client, legifrance_client
from back.legal_watch.enrichment import DEFAULT_MODEL, enrich_items
from back.legal_watch.schemas import (
    EnrichRequest,
    EnrichResponse,
    FetchRequest,
    FetchResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/legal-watch", tags=["legal-watch"])

INTERNAL_API_KEY = os.environ.get("INTERNAL_API_KEY")


def _check_internal_key(key: Optional[str]) -> None:
    """Garde interne : si INTERNAL_API_KEY est configurée, le header doit matcher."""
    if INTERNAL_API_KEY and key != INTERNAL_API_KEY:
        raise HTTPException(status_code=401, detail="Clé interne invalide.")


@router.post("/fetch", response_model=FetchResponse)
async def legal_watch_fetch(
    req: FetchRequest,
    x_internal_api_key: Optional[str] = Header(default=None),
) -> FetchResponse:
    """Recherche d'une source (Judilibre ou Légifrance) + texte intégral.
    Stateless : la déduplication par hash et la persistance sont côté Node."""
    _check_internal_key(x_internal_api_key)
    errors: list[str] = []
    try:
        if req.source == "legifrance":
            decisions = legifrance_client.collect_texts(
                queries=req.queries,
                date_start=req.date_start,
                date_end=req.date_end,
                max_texts=req.max_decisions,
                on_error=errors.append,
            )
        else:
            decisions = judilibre_client.collect_decisions(
                queries=req.queries,
                date_start=req.date_start,
                date_end=req.date_end,
                chamber=req.chamber,
                max_decisions=req.max_decisions,
                on_error=errors.append,
            )
    except RuntimeError as e:  # auth PISTE absente/invalide
        raise HTTPException(status_code=503, detail=str(e))

    logger.info(
        f"[legal-watch fetch] source={req.source} : {len(req.queries)} requêtes → "
        f"{len(decisions)} items, {len(errors)} erreurs"
    )
    return FetchResponse(
        decisions=decisions,
        report={
            "queries": len(req.queries),
            "decisions": len(decisions),
            "errors": errors,
        },
    )


@router.post("/enrich", response_model=EnrichResponse)
async def legal_watch_enrich(
    req: EnrichRequest,
    x_internal_api_key: Optional[str] = Header(default=None),
) -> EnrichResponse:
    """Enrichit un batch d'items : résumé, domaine, concepts (liste fermée),
    impact, évolution. Validation Pydantic stricte + 1 retry par item."""
    _check_internal_key(x_internal_api_key)
    try:
        results, usage = enrich_items(req.items, req.concepts,
                                      model=req.model or DEFAULT_MODEL)
    except RuntimeError as e:  # client OpenAI non configuré
        raise HTTPException(status_code=503, detail=str(e))
    return EnrichResponse(results=results, usage=usage)
