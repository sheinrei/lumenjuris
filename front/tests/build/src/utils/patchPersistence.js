import FEATURE_FLAGS from '../config/features';
import { shortHash } from './hashUtils';
var STORAGE_KEY_PREFIX = 'contract_patches_v1_';
export function buildStorageKey(originalText) {
    return STORAGE_KEY_PREFIX + shortHash(originalText);
}
export function savePatches(originalText, patches) {
    if (!FEATURE_FLAGS.ENABLE_PATCH_PERSISTENCE)
        return;
    try {
        if (!originalText)
            return;
        var docHash = shortHash(originalText);
        var payload = {
            version: 1,
            docHash: docHash,
            patches: patches.map(function (p) { return ({ clauseId: p.clauseId, recommendationKey: p.recommendationKey, startOrig: p.startOrig, endOrig: p.endOrig, originalSlice: p.originalSlice, newSlice: p.newSlice, active: p.active }); }),
            savedAt: Date.now()
        };
        var key = STORAGE_KEY_PREFIX + docHash;
        localStorage.setItem(key, JSON.stringify(payload));
        // garder uniquement les 5 plus récents (cleanup basique)
        cleanupOldEntries();
    }
    catch (e) {
        console.warn('[patch persistence] save error', e);
    }
}
export function loadPatches(originalText) {
    if (!FEATURE_FLAGS.ENABLE_PATCH_PERSISTENCE)
        return null;
    try {
        if (!originalText)
            return null;
        var docHash = shortHash(originalText);
        var key = STORAGE_KEY_PREFIX + docHash;
        var raw = localStorage.getItem(key);
        if (!raw)
            return null;
        var parsed = JSON.parse(raw);
        if (parsed.version !== 1 || parsed.docHash !== docHash)
            return null;
        return parsed;
    }
    catch (e) {
        console.warn('[patch persistence] load error', e);
        return null;
    }
}
function cleanupOldEntries() {
    try {
        var keys = Object.keys(localStorage).filter(function (k) { return k.startsWith(STORAGE_KEY_PREFIX); });
        if (keys.length <= 5)
            return;
        var entries_1 = [];
        keys.forEach(function (k) {
            try {
                var js = JSON.parse(localStorage.getItem(k) || '{}');
                if (js && typeof js.savedAt === 'number')
                    entries_1.push({ key: k, ts: js.savedAt });
            }
            catch (_a) { }
        });
        entries_1.sort(function (a, b) { return b.ts - a.ts; });
        entries_1.slice(5).forEach(function (e) { return localStorage.removeItem(e.key); });
    }
    catch (_a) { }
}
