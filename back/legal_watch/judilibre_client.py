"""
Client Judilibre dédié à la veille juridique.

Réutilise l'authentification PISTE existante (OAuth2 client_credentials via
`_get_judilibre_token` de pdf_processing) et supporte en complément une clé
API PISTE (header `KeyId`) via la variable d'environnement JUDILIBRE_API_KEY.

Endpoints documentés (spec OpenAPI Cour de cassation) :
  GET {base}/search   — query, chamber, date_start/date_end (YYYY-MM-DD),
                        sort=date, order=desc, page (0-indexé), page_size (max 50)
  GET {base}/decision — id → texte intégral pseudonymisé (champ `text`)

Base par défaut : https://api.piste.gouv.fr/cassation/judilibre/v1.0
(surchargable via JUDILIBRE_SEARCH_ENDPOINT, ou legacy JUDI_ENDPOINT).
"""
import logging
import os
import time
from typing import Any, Callable, Dict, List, Optional

import requests

from back.services.pdf_processing import _get_judilibre_token, _PROXIES

logger = logging.getLogger(__name__)

JUDILIBRE_API_KEY = os.environ.get("JUDILIBRE_API_KEY")  # clé PISTE (header KeyId)

_DEFAULT_BASE = "https://api.piste.gouv.fr/cassation/judilibre/v1.0"


_CHAMBER_LABELS = {
    "soc": "soc.",
    "com": "com.",
    "civ1": "1re civ.",
    "civ2": "2e civ.",
    "civ3": "3e civ.",
    "crim": "crim.",
}


def _build_title(res: Dict[str, Any], chamber: str) -> str:
    """Titre de repli : l'API /search ne renvoie pas de champ title exploitable.
    Format : "Cass. soc., 2026-07-01, n° 25-10.960"."""
    title = (res.get("title") or "").strip()
    if title:
        return title
    label = _CHAMBER_LABELS.get(res.get("chamber") or chamber, res.get("chamber") or chamber)
    parts = [f"Cass. {label}"]
    if res.get("decision_date"):
        parts.append(str(res["decision_date"]))
    if res.get("number"):
        parts.append(f"n° {res['number']}")
    return ", ".join(parts)


def _base_url() -> str:
    override = os.environ.get("JUDILIBRE_SEARCH_ENDPOINT")
    if override:
        return override.rstrip("/").removesuffix("/search")
    legacy = os.environ.get("JUDI_ENDPOINT")
    if legacy:
        return legacy.rstrip("/").removesuffix("/search")
    return _DEFAULT_BASE


def _auth_headers() -> Optional[Dict[str, str]]:
    """Header d'auth PISTE : clé API (KeyId) si fournie, sinon token OAuth2."""
    if JUDILIBRE_API_KEY:
        return {"KeyId": JUDILIBRE_API_KEY, "Accept": "application/json"}
    token = _get_judilibre_token()
    if token:
        return {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    return None


def _get_with_retry(url: str, params: Dict[str, Any], headers: Dict[str, str],
                    attempts: int = 3) -> Optional[requests.Response]:
    """GET avec retry + backoff exponentiel (429 / 5xx / erreurs réseau)."""
    delay = 0.5
    last_err: Optional[str] = None
    for attempt in range(attempts):
        try:
            r = requests.get(url, params=params, headers=headers, timeout=15,
                             proxies=_PROXIES)
            if r.status_code == 429 or r.status_code >= 500:
                last_err = f"HTTP {r.status_code}"
            elif not r.ok:
                logger.warning(f"[Judilibre] {url} → {r.status_code} {r.text[:200]}")
                return r  # erreur non réessayable (4xx) : remontée à l'appelant
            else:
                return r
        except requests.RequestException as e:
            last_err = str(e)
        if attempt < attempts - 1:
            time.sleep(delay)
            delay *= 2
    logger.warning(f"[Judilibre] Échec après {attempts} tentatives : {last_err}")
    return None


def search_decisions(
    query: str,
    date_start: Optional[str] = None,
    date_end: Optional[str] = None,
    chamber: str = "soc",
    page_size: int = 25,
    max_pages: int = 4,
) -> List[Dict[str, Any]]:
    """
    Recherche des décisions (jurisdiction=cc), triées par date décroissante.
    Retourne les métadonnées de recherche (id, titre, chambre, date, url) —
    le texte intégral est récupéré ensuite via `fetch_decision_text`.
    """
    headers = _auth_headers()
    if not headers:
        raise RuntimeError(
            "Aucune authentification Judilibre disponible : renseigner "
            "JUDILIBRE_API_KEY ou JUDI_CLIENT_ID/JUDI_CLIENT_SECRET dans le .env."
        )

    base = _base_url()
    out: List[Dict[str, Any]] = []
    for page in range(max_pages):
        params: Dict[str, Any] = {
            "query": query,
            "operator": "and",
            "jurisdiction": "cc",
            "chamber": chamber,
            "sort": "date",
            "order": "desc",
            "page": page,
            "page_size": min(page_size, 50),
        }
        if date_start:
            params["date_start"] = date_start
        if date_end:
            params["date_end"] = date_end

        r = _get_with_retry(f"{base}/search", params, headers)
        if r is None or not r.ok:
            break
        data = r.json() or {}
        results = data.get("results", []) or []
        for res in results:
            if not isinstance(res, dict) or not res.get("id"):
                continue
            out.append({
                "providerId": res.get("id"),
                "title": _build_title(res, chamber),
                "jurisdiction": res.get("chamber") or chamber,
                "decisionDate": res.get("decision_date") or None,
                "sourceUrl": res.get("url")
                    or f"https://www.courdecassation.fr/decision/{res.get('id')}",
                "summary": res.get("summary") or "",
                "solution": res.get("solution") or "",
            })
        total = data.get("total", 0)
        if (page + 1) * params["page_size"] >= total or not results:
            break
    return out


def fetch_decision_text(provider_id: str) -> Optional[str]:
    """Texte intégral pseudonymisé d'une décision (champ `text` de GET /decision)."""
    headers = _auth_headers()
    if not headers:
        return None
    base = _base_url()
    r = _get_with_retry(f"{base}/decision", {"id": provider_id}, headers)
    if r is None or not r.ok:
        return None
    data = r.json() or {}
    text = data.get("text") or ""
    return text if text.strip() else None


def collect_decisions(
    queries: List[str],
    date_start: Optional[str],
    date_end: Optional[str],
    chamber: str,
    max_decisions: int,
    on_error: Optional[Callable[[str], None]] = None,
) -> List[Dict[str, Any]]:
    """
    Exécute toutes les requêtes, déduplique par id de décision, hydrate le
    texte intégral. Les erreurs par requête/décision sont collectées via
    `on_error` sans interrompre le run.
    """
    seen: Dict[str, Dict[str, Any]] = {}
    for q in queries:
        try:
            for dec in search_decisions(q, date_start, date_end, chamber):
                pid = dec["providerId"]
                if pid not in seen:
                    seen[pid] = dec
        except Exception as e:
            logger.warning(f"[Judilibre] Requête '{q}' en échec : {e}")
            if on_error:
                on_error(f"search '{q}': {e}")

    decisions: List[Dict[str, Any]] = []
    for pid, dec in list(seen.items())[:max_decisions]:
        try:
            text = fetch_decision_text(pid)
        except Exception as e:
            text = None
            if on_error:
                on_error(f"decision {pid}: {e}")
        if not text:
            # Repli : résumé + solution si le texte intégral est indisponible
            text = "\n".join(x for x in (dec.get("summary"), dec.get("solution")) if x)
        if not text:
            if on_error:
                on_error(f"decision {pid}: aucun texte disponible, ignorée")
            continue
        decisions.append({**dec, "rawText": text})
    return decisions
