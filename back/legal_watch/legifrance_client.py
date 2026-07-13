"""
Client Légifrance (LODA — lois, décrets, arrêtés) pour la veille juridique.

Réutilise l'authentification PISTE existante (`_get_legifrance_token`).
Deux appels par texte :
  POST {lf}/search        — fond LODA_DATE, filtre de date, tri date décroissante
  POST {lf}/consult/jorf  — textCid → titre + visa + articles (corps du texte)

Base : https://api.piste.gouv.fr/dila/legifrance/lf-engine-app
(surchargeable via LEGI_ENDPOINT, comme le reste du projet).
"""
import logging
import re
import time
from typing import Any, Callable, Dict, List, Optional

import requests

from back.services.pdf_processing import _get_legifrance_token, _PROXIES, LEGI_ENDPOINT

logger = logging.getLogger(__name__)

_TAG_RE = re.compile(r"<[^>]+>")


def _base_url() -> str:
    if LEGI_ENDPOINT:
        return LEGI_ENDPOINT.rstrip("/").removesuffix("/search")
    return "https://api.piste.gouv.fr/dila/legifrance/lf-engine-app"


def _strip_html(html: Optional[str]) -> str:
    if not html:
        return ""
    return _TAG_RE.sub(" ", html).replace("&nbsp;", " ").replace("[...]", "…").strip()


def _post_with_retry(path: str, body: Dict[str, Any], token: str,
                     attempts: int = 3) -> Optional[requests.Response]:
    """POST avec retry + backoff (429 / 5xx / erreurs réseau)."""
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/json",
               "Content-Type": "application/json"}
    url = f"{_base_url()}{path}"
    delay = 0.5
    last_err: Optional[str] = None
    for attempt in range(attempts):
        try:
            import json
            r = requests.post(url, headers=headers, data=json.dumps(body), timeout=15,
                             proxies=_PROXIES)
            if r.status_code == 429 or r.status_code >= 500:
                last_err = f"HTTP {r.status_code}"
            elif not r.ok:
                logger.warning(f"[Légifrance] {path} → {r.status_code} {r.text[:200]}")
                return r
            else:
                return r
        except requests.RequestException as e:
            last_err = str(e)
        if attempt < attempts - 1:
            time.sleep(delay)
            delay *= 2
    logger.warning(f"[Légifrance] Échec après {attempts} tentatives : {last_err}")
    return None


def search_texts(
    query: str,
    date_start: Optional[str],
    date_end: Optional[str],
    page_size: int = 20,
    max_pages: int = 2,
) -> List[Dict[str, Any]]:
    """Recherche LODA par mot-clé, filtrée sur la date de signature, la plus récente d'abord."""
    token = _get_legifrance_token()
    if not token:
        raise RuntimeError(
            "Aucune authentification Légifrance : renseigner LEGI_CLIENT_ID/"
            "LEGI_CLIENT_SECRET dans le .env."
        )

    out: List[Dict[str, Any]] = []
    for page in range(max_pages):
        recherche: Dict[str, Any] = {
            "champs": [{
                "typeChamp": "ALL",
                "operateur": "ET",
                "criteres": [{"typeRecherche": "UN_DES_MOTS", "valeur": query.replace('"', ''),
                              "operateur": "ET"}],
            }],
            "pageNumber": page + 1,
            "pageSize": min(page_size, 50),
            "sort": "SIGNATURE_DATE_DESC",
            "typePagination": "DEFAUT",
            "operateur": "ET",
        }
        if date_start or date_end:
            recherche["filtres"] = [{
                "facette": "DATE_SIGNATURE",
                "dates": {"start": date_start or "2000-01-01", "end": date_end or "2999-12-31"},
            }]

        r = _post_with_retry("/search", {"fond": "LODA_DATE", "recherche": recherche}, token)
        if r is None or not r.ok:
            break
        data = r.json() or {}
        results = data.get("results") or []
        for it in results:
            if not isinstance(it, dict):
                continue
            titles = it.get("titles") or []
            first = titles[0] if titles and isinstance(titles[0], dict) else {}
            cid = first.get("cid") or it.get("cid")
            title = (first.get("title") or "").strip()
            if not cid or not title:
                continue
            out.append({
                "providerId": cid,
                "title": title[:400],
                "jurisdiction": it.get("nature") or None,  # LOI | DECRET | ARRETE…
                "decisionDate": (it.get("datePublication") or "")[:10] or None,
                "sourceUrl": f"https://www.legifrance.gouv.fr/jorf/id/{cid}",
            })
        if not results or len(results) < recherche["pageSize"]:
            break
    return out


def fetch_text(cid: str) -> Optional[str]:
    """Corps d'un texte via /consult/jorf : titre + visa + articles."""
    token = _get_legifrance_token()
    if not token:
        return None
    r = _post_with_retry("/consult/jorf", {"textCid": cid}, token)
    if r is None or not r.ok:
        return None
    data = r.json() or {}
    parts: List[str] = []
    if data.get("title"):
        parts.append(str(data["title"]))
    if data.get("visa"):
        parts.append(_strip_html(str(data["visa"])))
    for art in data.get("articles") or []:
        if isinstance(art, dict):
            content = _strip_html(art.get("content"))
            if content:
                parts.append(content)
    if data.get("nota"):
        parts.append(_strip_html(str(data["nota"])))
    text = "\n".join(p for p in parts if p).strip()
    return text or None


def collect_texts(
    queries: List[str],
    date_start: Optional[str],
    date_end: Optional[str],
    max_texts: int,
    on_error: Optional[Callable[[str], None]] = None,
) -> List[Dict[str, Any]]:
    """Exécute les requêtes, déduplique par cid, hydrate le corps du texte.
    Erreurs par requête/texte collectées via `on_error` sans interrompre le run."""
    seen: Dict[str, Dict[str, Any]] = {}
    for q in queries:
        try:
            for txt in search_texts(q, date_start, date_end):
                pid = txt["providerId"]
                if pid not in seen:
                    seen[pid] = txt
        except Exception as e:
            logger.warning(f"[Légifrance] Requête '{q}' en échec : {e}")
            if on_error:
                on_error(f"search '{q}': {e}")

    texts: List[Dict[str, Any]] = []
    for pid, txt in list(seen.items())[:max_texts]:
        try:
            body = fetch_text(pid)
        except Exception as e:
            body = None
            if on_error:
                on_error(f"texte {pid}: {e}")
        # Repli : au moins le titre (permet à l'IA de statuer, souvent hors périmètre).
        raw = body or txt.get("title") or ""
        if not raw:
            continue
        texts.append({**txt, "rawText": raw})
    return texts
