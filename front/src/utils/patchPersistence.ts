import FEATURE_FLAGS from '../config/features';
import { shortHash } from './hashUtils';
import type { TextPatch } from '../store/documentTextStore';

interface PersistedPatchesSchema {
  version: 1;
  docHash: string; // short hash of original text
  patches: Array<Pick<TextPatch,'clauseId'|'recommendationKey'|'startOrig'|'endOrig'|'originalSlice'|'newSlice'|'active'>>;
  savedAt: number;
}

const STORAGE_KEY_PREFIX = 'contract_patches_v1_';

export function buildStorageKey(originalText: string): string {
  return STORAGE_KEY_PREFIX + shortHash(originalText);
}

export function savePatches(originalText: string, patches: TextPatch[]): void {
  if (!FEATURE_FLAGS.ENABLE_PATCH_PERSISTENCE) return;
  try {
    if (!originalText) return;
    const docHash = shortHash(originalText);
    const payload: PersistedPatchesSchema = {
      version: 1,
      docHash,
      patches: patches.map(p => ({ clauseId: p.clauseId, recommendationKey: p.recommendationKey, startOrig: p.startOrig, endOrig: p.endOrig, originalSlice: p.originalSlice, newSlice: p.newSlice, active: p.active })),
      savedAt: Date.now()
    };
    const key = STORAGE_KEY_PREFIX + docHash;
    localStorage.setItem(key, JSON.stringify(payload));
    // garder uniquement les 5 plus récents (cleanup basique)
    cleanupOldEntries();
  } catch (e) {
    console.warn('[patch persistence] save error', e);
  }
}

export function loadPatches(originalText: string): PersistedPatchesSchema | null {
  if (!FEATURE_FLAGS.ENABLE_PATCH_PERSISTENCE) return null;
  try {
    if (!originalText) return null;
    const docHash = shortHash(originalText);
    const key = STORAGE_KEY_PREFIX + docHash;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedPatchesSchema;
    if (parsed.version !== 1 || parsed.docHash !== docHash) return null;
    return parsed;
  } catch (e) {
    console.warn('[patch persistence] load error', e);
    return null;
  }
}

function cleanupOldEntries() {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_KEY_PREFIX));
    if (keys.length <= 5) return;
    const entries: { key: string; ts: number }[] = [];
    keys.forEach(k => {
      try {
        const js = JSON.parse(localStorage.getItem(k) || '{}');
        if (js && typeof js.savedAt === 'number') entries.push({ key: k, ts: js.savedAt });
      } catch {}
    });
    entries.sort((a,b)=>b.ts - a.ts);
    entries.slice(5).forEach(e => localStorage.removeItem(e.key));
  } catch {}
}
