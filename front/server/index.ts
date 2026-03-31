/* eslint-disable no-console */
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Charge d'abord server/.env puis la racine
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });
dotenv.config();




const app = express();

/* app.use(cors({
  origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
})); */

//Cord adapté pour prod
app.use(cors({
  origin: [
    /^http:\/\/localhost:\d+$/,
    /^http:\/\/127\.0\.0\.1:\d+$/,
    /^https:\/\/.*\.odns\.fr$/,
  ],
  credentials: true,
}));


app.use(express.json({ limit: '1mb' }));

const PORT = Number(process.env.PORT || 4000);

// Supporte aussi les variables LEGI_* (compat Flask) si PISTE_* absentes
const PISTE_CLIENT_ID = process.env.PISTE_CLIENT_ID || process.env.LEGI_CLIENT_ID || '';
const PISTE_CLIENT_SECRET = process.env.PISTE_CLIENT_SECRET || process.env.LEGI_CLIENT_SECRET || '';
const PISTE_SCOPE = process.env.PISTE_SCOPE || process.env.LEGI_SCOPE || 'search';
const PISTE_AUDIENCE = process.env.PISTE_AUDIENCE || process.env.LEGI_AUDIENCE || '';
const CAP_MAX_RESULTS = Math.max(100, Number(process.env.LEGI_CAP_MAX_RESULTS || 2000));
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';


// OAuth2 client_credentials per PISTE documentation
const OAUTH_URL = 'https://oauth.piste.gouv.fr/api/oauth/token';
const LF_SEARCH_URL = 'https://api.piste.gouv.fr/dila/legifrance/lf-engine-app/search';
const LF_CONSULT_JURI_URL = 'https://api.piste.gouv.fr/dila/legifrance/lf-engine-app/consult/juri';

let cachedToken: { access_token: string; expiresAt: number } | null = null;

const now = () => Date.now();


/*
async function getPisteAccessToken(): Promise<{ access_token: string; expires_in: number }> {
  if (cachedToken && cachedToken.expiresAt - now() > 30_000) {
    const expires_in = Math.floor((cachedToken.expiresAt - now()) / 1000);
    return { access_token: cachedToken.access_token, expires_in };
  }
  const params = new URLSearchParams();
  params.set('grant_type', 'client_credentials');
  params.set('client_id', PISTE_CLIENT_ID);
  params.set('client_secret', PISTE_CLIENT_SECRET);
  if (PISTE_SCOPE) params.set('scope', PISTE_SCOPE);
  if (PISTE_AUDIENCE) params.set('audience', PISTE_AUDIENCE);

  const resp = await fetch(OAUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const text = await resp.text();
  if (!resp.ok) {
    console.error('❌ OAuth PISTE', resp.status, text.slice(0, 300));
    throw new Error(`OAuth ${resp.status}`);
  }
  const json = JSON.parse(text) as { access_token: string; expires_in: number };
  const ttl = Math.max(10, (json.expires_in || 300) - 60);
  cachedToken = { access_token: json.access_token, expiresAt: now() + ttl * 1000 };
  console.log('✅ Token PISTE OK, TTL ~', ttl, 's');
  return { access_token: json.access_token, expires_in: json.expires_in || ttl };
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'Accept-Language': 'fr-FR',
  };
}

function sanitizeQuery(q: string) {
  const cleaned = (q || '').replace(/\r?\n+/g, ' ').replace(/\s+/g, ' ').trim();
  // Légifrance n’aime pas les requêtes trop longues
  const words = cleaned.split(' ').filter(Boolean).slice(0, 12);
  return words.join(' ').slice(0, 300);
}

// Helpers
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchJsonWithRetry(url: string, options: RequestInit, label: string, maxRetries = 4): Promise<any> {
  let attempt = 0;
  let lastErr: any;
  while (attempt <= maxRetries) {
    try {
      const r = await fetch(url, options);
      const t = await r.text();
      if (r.ok) {
        try { return JSON.parse(t); } catch { return t; }
      }
      const retriable = r.status === 429 || (r.status >= 500 && r.status < 600);
      if (!retriable) throw new Error(`${label} HTTP ${r.status} ${t.slice(0, 400)}`);
      const backoff = Math.min(2000 * Math.pow(2, attempt), 8000);
      console.warn(`⏳ Retry ${attempt + 1}/${maxRetries} after ${backoff}ms for ${label} (status ${r.status})`);
      await sleep(backoff);
    } catch (e: any) {
      lastErr = e;
      const backoff = Math.min(2000 * Math.pow(2, attempt), 8000);
      console.warn(`⏳ Retry ${attempt + 1}/${maxRetries} after ${backoff}ms for ${label} (error: ${String(e?.message || e)})`);
      await sleep(backoff);
    }
    attempt++;
  }
  throw lastErr || new Error(`${label} failed after retries`);
}

function findJuriIdLoose(obj: any): string | null {
  const re = /JURITEXT\w+/i;
  try {
    if (!obj) return null;
    if (typeof obj === 'string') {
      const m = obj.match(re);
      return m ? m[0].toUpperCase() : null;
    }
    if (Array.isArray(obj)) {
      for (const el of obj) {
        const rid = findJuriIdLoose(el);
        if (rid) return rid;
      }
      return null;
    }
    if (typeof obj === 'object') {
      for (const v of Object.values(obj)) {
        const rid = findJuriIdLoose(v);
        if (rid) return rid;
      }
    }
  } catch { }
  return null;
}

function extractTotalAndItems(root: any): { total: number; items: any[]; nbPages?: number } {
  const num = (v: any): number | undefined => {
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
      const n = parseInt(v, 10);
      if (!Number.isNaN(n)) return n;
    }
    return undefined;
  };
  let total = num(root?.total) || num(root?.totalHits) || num(root?.nbResultats) || num(root?.nbHits) || num(root?.nombreResultats) || 0;
  let nbPages = num(root?.nbPages) || num(root?.nombrePages) || undefined;
  let items: any[] = [];
  const candidates: any[] = [];
  const pushIfArray = (arr: any) => { if (Array.isArray(arr) && arr.length) items = arr; };
  pushIfArray(root?.results);
  pushIfArray(root?.resultsListe);
  pushIfArray(root?.resultats);
  pushIfArray(root?.items);
  if (!items.length && root && typeof root === 'object') {
    for (const [k, v] of Object.entries(root)) {
      if (Array.isArray(v) && v.length) {
        const name = String(k).toLowerCase();
        if (/result|liste|list|hits|documents|docs/.test(name)) { items = v; break; }
      }
    }
  }
  return { total, items, nbPages };
}

function dateIso(s: any): string {
  if (!s) return '';
  if (typeof s === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return '';
}

function plainText(x: any): string {
  if (!x) return '';
  if (typeof x === 'string') return x;
  if (typeof x === 'object') {
    const c = (x as any).texte || (x as any).resume || (x as any).abstract || (x as any).content || '';
    return typeof c === 'string' ? c : '';
  }
  return '';
}



function countOccurrences(hay: string, needle: string): number {
  if (!hay || !needle) return 0;
  const re = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  return (hay.match(re) || []).length;
}


async function summarizeWithOpenAI(fullSummary: string, title: string): Promise<{ vulgarise: string; tags: string[] } | null> {
  const prompt = `Tu es un juriste français. \nRésumé source (complet):\n"""${fullSummary.slice(0, 6000)}"""\n\nTâches:\n1) Vulgarise en 3 à 5 phrases claires, grand public.\n2) Propose 5 à 12 mots-clés courts (tags), séparés par des virgules.\n\nRéponds en JSON strict:\n{ "resumeVulgarise": "...", "motsCles": ["tag1","tag2",...] }`;
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(`${BACKEND_URL}/openai-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          max_tokens: 300,
          response_format: { type: 'json_object' }
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const txt = data.content || '';
      const obj = JSON.parse(txt);
      const tags: string[] = Array.isArray(obj.motsCles) ? obj.motsCles : String(obj.motsCles || '')
        .split(/[;,]/).map((s: string) => s.trim()).filter(Boolean).slice(5, 12);
      return { vulgarise: String(obj.resumeVulgarise || '').trim(), tags };
    } catch (e: any) {
      const backoff = 1000 * Math.pow(2, i);
      console.warn(`OpenAI retry ${i + 1}/3 after ${backoff}ms:`, String(e?.message || e));
      await sleep(backoff);
    }
  }
  return null;
}

// Health
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    hasSecrets: Boolean(PISTE_CLIENT_ID && PISTE_CLIENT_SECRET),
    port: PORT,
    oauth: OAUTH_URL,
    search: LF_SEARCH_URL,
  });
});

// Debug token
app.post('/api/legi-token', async (_req, res) => {
  try {
    const t = await getPisteAccessToken();
    return res.json(t);
  } catch (e: any) {
    return res.status(500).json({ error: 'token_fetch_failed', detail: String(e?.message || e) });
  }
});

// Route SEARCH Légifrance (fond JURI)
app.post('/api/legi-search', async (req: Request, res: Response) => {
  const start = Date.now();
  try {
    const token = (await getPisteAccessToken()).access_token;

    const b = req.body || {};
    const pageNumber = Number(b.pageNumber || 1) || 1;
    const pageSize = Math.min(Math.max(Number(b.pageSize || 20) || 20, 1), 50);
    const sort = String(b.sort || 'PERTINENCE');
    const qRaw: string = b.query ?? b.q ?? b.text ?? b.clauseText ?? '';
    const query = sanitizeQuery(qRaw);
    const todayIso = new Date().toISOString().slice(0, 10);
    const dateFrom: string = b.dateFrom || '2019-01-01';
    const dateTo: string = b.dateTo || todayIso;

    console.log('➡️ /api/legi-search', { pageNumber, pageSize, sort, qLen: query.length, dateFrom, dateTo });

    // Bodies without filters (more stable)
    const bodyWorkingNoFilter = {
      fond: 'JURI',
      recherche: { mots: query, pageNumber, pageSize }
    };
    const bodyV1NoFilter = {
      fond: 'JURI',
      champs: [
        { typeChamp: 'ALL', criteres: [{ typeRecherche: 'UN_DES_MOTS', valeur: query, operateur: 'ET' }], operateur: 'ET' }
      ],
      pageNumber,
      pageSize,
      operateur: 'ET',
      sort,
      typePagination: 'DEFAUT'
    };
    const bodyV2NoFilter = {
      fond: 'JURI',
      champs: [
        { typeChamp: 'ALL', criteres: [{ typeRecherche: 'TOUS_LES_MOTS', valeur: query, operateur: 'ET' }], operateur: 'ET' }
      ],
      pageNumber,
      pageSize,
      operateur: 'ET',
      sort,
      typePagination: 'DEFAUT'
    };

    // Same bodies with a tentative date filter (may 500 on some tenants)
    const bodyWorkingWithFilter = {
      fond: 'JURI',
      recherche: { mots: query, pageNumber, pageSize },
      filtres: [{ type: 'DATE_DECISION', valeurs: [dateFrom, dateTo] }]
    };
    const bodyV1WithFilter = {
      ...bodyV1NoFilter,
      filtres: [{ type: 'DATE_DECISION', valeurs: [dateFrom, dateTo] }]
    };
    const bodyV2WithFilter = {
      ...bodyV2NoFilter,
      filtres: [{ type: 'DATE_DECISION', valeurs: [dateFrom, dateTo] }]
    };

    const tries = [
      { label: 'search-UN_DES_MOTS-noFilter', body: bodyV1NoFilter },
      { label: 'search-TOUS_LES_MOTS-noFilter', body: bodyV2NoFilter },
      { label: 'search-working-noFilter', body: bodyWorkingNoFilter },
      { label: 'search-UN_DES_MOTS-withFilter', body: bodyV1WithFilter },
      { label: 'search-TOUS_LES_MOTS-withFilter', body: bodyV2WithFilter },
      { label: 'search-working-withFilter', body: bodyWorkingWithFilter },
    ] as const;

    for (const t of tries) {
      const r = await fetch(LF_SEARCH_URL, { method: 'POST', headers: authHeaders(token), body: JSON.stringify(t.body) });
      const txt = await r.text();
      if (r.ok) {
        console.log(`⬅️ OK ${r.status} via ${t.label} (${Date.now() - start}ms)`);
        try { return res.status(200).json(JSON.parse(txt)); }
        catch { return res.status(200).send(txt); }
      }
      console.warn(`⚠️ LF ${r.status} via ${t.label}: ${txt.slice(0, 300)}`);
      if (r.status === 401) { cachedToken = null; continue; }
      if (r.status === 429) { return res.status(429).json({ error: 'too_many_requests', detail: txt.slice(0, 600) }); }
      // On other errors, try next shape
    }

    return res.status(400).json({ error: 'legifrance_bad_request', detail: 'Formats refusés par /search. Voir logs serveur.' });
  } catch (e: any) {
    console.error('❌ /api/legi-search', e);
    return res.status(500).json({ error: 'proxy_exception', detail: String(e?.message || e) });
  }
});






// Route RAW passthrough: envoie le JSON fourni tel quel à /search (debug avancé)
app.post('/api/legi-search-raw', async (req: Request, res: Response) => {
  const start = Date.now();
  try {
    const token = (await getPisteAccessToken()).access_token;
    const raw = req.body && (req.body.raw ?? req.body);
    if (!raw || typeof raw !== 'object') {
      return res.status(400).json({ error: 'invalid_raw', hint: 'Envoyez { raw: { ...corps attendu par Legifrance... } }' });
    }
    const r = await fetch(LF_SEARCH_URL, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(raw),
    });
    const txt = await r.text();
    if (r.ok) {
      console.log(`⬅️ OK ${r.status} via RAW (${Date.now() - start}ms)`);
      try { return res.status(200).json(JSON.parse(txt)); }
      catch { return res.status(200).send(txt); }
    }
    console.warn(`⚠️ LF ${r.status} via RAW: ${txt.slice(0, 400)}`);
    return res.status(r.status).send(txt);
  } catch (e: any) {
    console.error('❌ /api/legi-search-raw', e);
    return res.status(500).json({ error: 'proxy_exception', detail: String(e?.message || e) });
  }
});







// Consultation texte intégral
app.post('/api/legi-consult-juri', async (req: Request, res: Response) => {
  try {
    const { textId } = req.body || {};
    if (!textId || typeof textId !== 'string') {
      return res.status(400).json({ error: 'invalid_textId' });
    }
    const token = (await getPisteAccessToken()).access_token;
    console.log('➡️ /api/legi-consult-juri', { textId });

    const r = await fetch(LF_CONSULT_JURI_URL, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ textId }),
    });
    const t = await r.text();
    if (!r.ok) {
      console.warn('⚠️ consult/juri', r.status, t.slice(0, 300));
      return res.status(r.status).send(t);
    }
    try { return res.status(200).json(JSON.parse(t)); }
    catch { return res.status(200).send(t); }
  } catch (e: any) {
    console.error('❌ /api/legi-consult-juri', e);
    return res.status(500).json({ error: 'proxy_exception', detail: String(e?.message || e) });
  }
});






// Helpers to extract decision date from title when explicit fields are missing
function parseDateFromTitle(title: string): { dateIso?: string; year?: number } {
  if (!title) return {};
  // YYYY-MM-DD
  const m1 = title.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m1) {
    const y = parseInt(m1[1], 10), mo = parseInt(m1[2], 10) - 1, d = parseInt(m1[3], 10);
    const dt = new Date(Date.UTC(y, mo, d));
    return { dateIso: dt.toISOString().slice(0, 10), year: y };
  }
  // DD/MM/YYYY or DD-MM-YYYY
  const m2 = title.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m2) {
    let day = parseInt(m2[1], 10); let month = parseInt(m2[2], 10) - 1; let year = parseInt(m2[3], 10);
    if (year < 100) year += 2000;
    const dt = new Date(Date.UTC(year, month, day));
    if (!Number.isNaN(dt.getTime())) return { dateIso: dt.toISOString().slice(0, 10), year };
  }
  // French textual date: 12 mai 2021, 2 mars 1967, etc.
  const months = '(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)';
  const m3 = title.match(new RegExp(`(\\d{1,2})\\s+${months}\\s+(\\d{4})`, 'i'));
  if (m3) {
    const map: Record<string, number> = { 'janvier': 0, 'février': 1, 'fevrier': 1, 'mars': 2, 'avril': 3, 'mai': 4, 'juin': 5, 'juillet': 6, 'août': 7, 'aout': 7, 'septembre': 8, 'octobre': 9, 'novembre': 10, 'décembre': 11, 'decembre': 11 };
    const day = parseInt(m3[1], 10); const mon = map[m3[2].toLowerCase()] ?? 0; const year = parseInt(m3[3], 10);
    const dt = new Date(Date.UTC(year, mon, day));
    if (!Number.isNaN(dt.getTime())) return { dateIso: dt.toISOString().slice(0, 10), year };
  }
  return {};
}




function computeDecisionDate(hit: any): { dateIso?: string; year?: number } {
  const tryStr = (s: any) => (typeof s === 'string' && s) ? s : '';
  const ds = tryStr(hit?.dateDecision) || tryStr(hit?.datePrononcee) || tryStr(hit?.datePublication);
  if (ds) {
    const t = Date.parse(ds);
    if (!Number.isNaN(t)) {
      const d = new Date(t);
      return { dateIso: d.toISOString().slice(0, 10), year: d.getUTCFullYear() };
    }
  }
  const title = tryStr(hit?.titre) || tryStr(hit?.title) || '';
  return parseDateFromTitle(title);
}




// Top3 global paginé, trié, avec résumé principal et post-traitement OpenAI
app.post('/api/legi-top3', async (req: Request, res: Response) => {
  const started = Date.now();
  try {
    const token = (await getPisteAccessToken()).access_token;
    const qRaw: string = req.body?.query ?? '';
    const typeRecherche: string = req.body?.typeRecherche || 'UN_DES_MOTS';
    const query = sanitizeQuery(qRaw);
    const pageSize = 50;
    const sort = 'DATE_DECROISSANT';
    const limit = 3;
    const todayIso = new Date().toISOString().slice(0, 10);
    const dateFrom: string = (req.body?.dateFrom || '2020-01-01');
    const dateTo: string = (req.body?.dateTo || todayIso);

    const buildBody = (pageNumber: number, tr: string) => ({
      fond: 'JURI',
      champs: [{ typeChamp: 'ALL', criteres: [{ typeRecherche: tr, valeur: query, operateur: 'ET' }], operateur: 'ET' }],
      pageNumber,
      pageSize,
      operateur: 'ET',
      sort,
      typePagination: 'DEFAUT'
    });

    console.log('➡️ /api/legi-top3 begin', { qLen: query.length, typeRecherche, pageSize, dateFrom, dateTo });

    // Try without API-side filters first to avoid 500s; we will filter locally by computed date
    const shapes = [typeRecherche, 'TOUS_LES_MOTS', 'UN_DES_MOTS'];
    let firstOk: any | null = null;
    let selectedTR = typeRecherche;
    for (const tr of shapes) {
      const r = await fetch(LF_SEARCH_URL, { method: 'POST', headers: authHeaders(token), body: JSON.stringify(buildBody(1, tr)) });
      const txt = await r.text();
      if (r.ok) { selectedTR = tr; try { firstOk = JSON.parse(txt); } catch { firstOk = txt; } break; }
      console.warn(`⚠️ LF ${r.status} top3.first tr=${tr}: ${txt.slice(0, 250)}`);
      if (r.status === 401) cachedToken = null; // refresh token next loop
    }
    if (!firstOk) return res.status(502).json({ error: 'legifrance_unavailable' });

    const { total: totalAnnounced, items: firstItems, nbPages: nbPagesAnnounced } = extractTotalAndItems(firstOk);
    let allHits: any[] = Array.isArray(firstItems) ? [...firstItems] : [];
    const totalCap = Math.min(totalAnnounced || CAP_MAX_RESULTS, CAP_MAX_RESULTS);
    const nbPagesCalc = Math.max(1, nbPagesAnnounced || Math.ceil((totalAnnounced || allHits.length) / pageSize));
    const nbPagesToFetch = Math.min(nbPagesCalc, Math.ceil(totalCap / pageSize));

    for (let page = 2; page <= nbPagesToFetch; page++) {
      if (allHits.length >= totalCap) break;
      const rr = await fetch(LF_SEARCH_URL, { method: 'POST', headers: authHeaders(token), body: JSON.stringify(buildBody(page, selectedTR)) });
      const tt = await rr.text();
      if (!rr.ok) { console.warn(`⚠️ LF ${rr.status} p${page}: ${tt.slice(0, 200)}`); if (rr.status === 401) cachedToken = null; continue; }
      try {
        const { items } = extractTotalAndItems(JSON.parse(tt));
        if (Array.isArray(items) && items.length) allHits = allHits.concat(items);
      } catch { }
    }

    // Compute decision date and filter within [dateFrom..dateTo]
    const inRange = (iso?: string): boolean => !!iso && iso >= dateFrom && iso <= dateTo;
    const normed = allHits.map((hit) => {
      const { dateIso, year } = computeDecisionDate(hit);
      return { hit, dateIso: dateIso || '', year: year || 0 };
    });
    const filtered = normed.filter(n => inRange(n.dateIso) && n.year >= 2020);

    // Score and sort (primary score + date desc)
    const textAll = (obj: any): string => {
      const out: string[] = [];
      const push = (s: any) => { if (typeof s === 'string') out.push(s.toLowerCase()); };
      if (obj && typeof obj === 'object') { push(obj.resume); push(obj.abstract); push(obj.titre); push(obj.title); push(obj.texte); }
      return out.join(' ');
    };

    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    const scored = filtered.map((n, idx) => {
      const hay = textAll(n.hit);
      const primary = Number((n.hit as any).score || (n.hit as any).pertinence || 0) || 0;
      let extra = 0; for (const t of terms) extra += countOccurrences(hay, t) * 10;
      const dateScore = n.dateIso ? Date.parse(n.dateIso) || 0 : 0;
      const sortKey = primary * 1000 + extra;
      return { ...n, primary, extra, dateScore, sortKey, idx };
    });

    scored.sort((a, b) => (b.sortKey - a.sortKey) || (b.dateScore - a.dateScore) || (a.idx - b.idx));
    const picked = scored.slice(0, limit).map(s => s.hit);

    // Enrich picked with consult/juri
    const out: any[] = [];
    for (const h of picked) {
      const juriId = findJuriIdLoose(h);
      const { dateIso } = computeDecisionDate(h);
      const title: string = (h as any).titre || (h as any).title || '';
      const court: string = (h as any).juridiction || (h as any).formation || (h as any).chambre || 'Juridiction';
      let resumePrincipal = '';
      try {
        if (juriId) {
          const consulted = await fetchJsonWithRetry(LF_CONSULT_JURI_URL, { method: 'POST', headers: authHeaders(token), body: JSON.stringify({ textId: juriId }) }, `legifrance.consult.${juriId}`);
          const tryFields = [consulted?.resumePrincipal, consulted?.resume, consulted?.abstract, consulted?.resultat?.resume, consulted?.resultat?.abstract, consulted?.contenu?.resume];
          for (const f of tryFields) { if (typeof f === 'string' && f.trim().length > 20) { resumePrincipal = f.trim(); break; } }
        }
      } catch (e) { console.warn('⚠️ consult/juri error', e); }

      let resumeVulgarise = ''; let motsCles: string[] = [];
      if (resumePrincipal) {
        const post = await summarizeWithOpenAI(resumePrincipal, title).catch(() => null);
        if (post) { resumeVulgarise = post.vulgarise; motsCles = post.tags; }
      }
      out.push({ idDecision: juriId || '', juridiction: court, dateDecision: dateIso || '', titre: title, resumePrincipal: resumePrincipal || '', resumeVulgarise: resumeVulgarise || '', motsCles });
    }

    console.log('✅ /api/legi-top3 done', { collected: allHits.length, kept: out.length, window: `${dateFrom}..${dateTo}` });
    return res.json(out);
  } catch (e: any) {
    console.error('❌ /api/legi-top3', e);
    return res.status(500).json({ error: 'legi_top3_failed', detail: String(e?.message || e) });
  }
});




// === Route Chat IA simple ===
app.post('/api/chat', async (req: Request, res: Response) => {
  const { message, context } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'missing_message', detail: 'Le champ "message" est manquant ou invalide.' });
  }
  const trimmed = message.slice(0, 6000);
  const ctx = typeof context === 'string' ? context.slice(0, 4000) : '';
  console.log('➡️ /api/chat', { msgLen: trimmed.length, hasContext: Boolean(ctx) });
  try {
    const resp = await fetch(`${BACKEND_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: trimmed, context: ctx })
    });
    const data = await resp.json();
    if (!resp.ok) {
      return res.status(resp.status).json({ error: 'backend_error', detail: data.detail || data.error });
    }
    return res.json({ response: data.response });
  } catch (e: any) {
    return res.status(500).json({ error: 'openai_error', detail: String(e?.message || e) });
  }
});



app.post("/api/openai-chat", async (req: Request, res: Response) => {
  try {
    const r = await fetch(`${BACKEND_URL}/openai-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });

    const data = await r.json()
    return res.status(r.status).json(data)

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'python_down' })
  }
})


app.listen(PORT, () => {
  console.log(`🚀 Proxy prêt: http://localhost:${PORT}`);
  console.log(`PISTE_CLIENT_ID: ${PISTE_CLIENT_ID ? '✔' : '✖'}  PISTE_CLIENT_SECRET: ${PISTE_CLIENT_SECRET ? '✔' : '✖'}`);
});
 */