var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { create } from 'zustand';
import FEATURE_FLAGS from '../config/features';
import { fnv1a } from '../utils/hashUtils';
import { savePatches, loadPatches } from '../utils/patchPersistence';
import { computeDiff } from '../utils/diffUtils';
function genId() {
    return Math.random().toString(36).slice(2, 10);
}
function rebuildFrom(originalText, patches) {
    var active = patches.filter(function (p) { return p.active; }).sort(function (a, b) { return a.startOrig - b.startOrig; });
    if (!active.length)
        return originalText;
    var parts = [];
    var cursor = 0;
    for (var _i = 0, active_1 = active; _i < active_1.length; _i++) {
        var p = active_1[_i];
        if (cursor < p.startOrig)
            parts.push(originalText.slice(cursor, p.startOrig));
        parts.push(p.newSlice);
        cursor = p.endOrig;
    }
    if (cursor < originalText.length)
        parts.push(originalText.slice(cursor));
    return parts.join('');
}
export var useDocumentTextStore = create(function (set, get) { return ({
    originalText: '',
    currentText: '',
    patches: [],
    viewMode: 'original',
    lastAppliedRecommendationKey: undefined,
    setOriginalText: function (text) {
        var _a;
        set({ originalText: text, currentText: text, patches: [], viewMode: 'original', lastAppliedRecommendationKey: undefined });
        // tentative de restauration persistée
        if (FEATURE_FLAGS.ENABLE_PATCH_PERSISTENCE) {
            var loaded = loadPatches(text);
            if (loaded && ((_a = loaded.patches) === null || _a === void 0 ? void 0 : _a.length)) {
                var restored = loaded.patches.map(function (p) { return ({
                    id: genId(),
                    clauseId: p.clauseId,
                    recommendationKey: p.recommendationKey,
                    startOrig: p.startOrig,
                    endOrig: p.endOrig,
                    originalSlice: p.originalSlice,
                    newSlice: p.newSlice,
                    active: p.active,
                    sliceHash: FEATURE_FLAGS.ENABLE_PATCH_INTEGRITY_CHECKS ? fnv1a(p.originalSlice) : undefined,
                }); });
                set({ patches: restored, currentText: rebuildFrom(text, restored), viewMode: 'modified' });
                console.log('[patch persistence] restored', restored.length);
            }
        }
    },
    applyPatch: function (_a) {
        var clauseId = _a.clauseId, recommendationKey = _a.recommendationKey, startOrig = _a.startOrig, endOrig = _a.endOrig, newSlice = _a.newSlice, originalSlice = _a.originalSlice;
        var _b = get(), patches = _b.patches, originalText = _b.originalText;
        if (patches.some(function (p) { return p.recommendationKey === recommendationKey && p.active; }))
            return; // already applied
        // Validation basique des bornes
        if (startOrig < 0 || endOrig <= startOrig || endOrig > originalText.length) {
            console.warn('[patch invalid bounds]', { recommendationKey: recommendationKey, startOrig: startOrig, endOrig: endOrig, originalLength: originalText.length });
            return;
        }
        var origSlice = originalSlice !== null && originalSlice !== void 0 ? originalSlice : originalText.slice(startOrig, endOrig);
        // Sanity check: mismatch -> on continue mais on log, on utilise la tranche réelle pour éviter l'abandon silencieux
        var groundTruth = originalText.slice(startOrig, endOrig);
        if (origSlice !== groundTruth) {
            console.warn('[patch warning] original slice mismatch – correction automatique', { recommendationKey: recommendationKey, provided: origSlice.slice(0, 80), expected: groundTruth.slice(0, 80) });
        }
        // Overlap detection
        var overlap = patches.find(function (p) { return p.active && !(endOrig <= p.startOrig || startOrig >= p.endOrig); });
        if (overlap) {
            console.warn('[patch overlap rejected]', { recommendationKey: recommendationKey, overlap: { start: overlap.startOrig, end: overlap.endOrig } });
            return;
        }
        var newPatch = {
            id: genId(),
            clauseId: clauseId,
            recommendationKey: recommendationKey,
            startOrig: startOrig,
            endOrig: endOrig,
            originalSlice: groundTruth,
            newSlice: newSlice,
            active: true,
            sliceHash: FEATURE_FLAGS.ENABLE_PATCH_INTEGRITY_CHECKS ? fnv1a(groundTruth) : undefined,
        };
        console.log('[patch add]', { recommendationKey: recommendationKey, startOrig: startOrig, endOrig: endOrig, originalExcerpt: groundTruth.slice(0, 60), newExcerpt: newSlice.slice(0, 60) });
        var newPatches = __spreadArray(__spreadArray([], patches.filter(function (p) { return p.recommendationKey !== recommendationKey; }), true), [newPatch], false);
        var currentText = rebuildFrom(originalText, newPatches);
        set({ patches: newPatches, currentText: currentText, viewMode: 'modified', lastAppliedRecommendationKey: recommendationKey });
        if (FEATURE_FLAGS.ENABLE_PATCH_PERSISTENCE)
            savePatches(originalText, newPatches);
    },
    removePatch: function (recommendationKey) {
        var _a = get(), patches = _a.patches, originalText = _a.originalText;
        var newPatches = patches.map(function (p) { return p.recommendationKey === recommendationKey ? __assign(__assign({}, p), { active: false }) : p; });
        var currentText = rebuildFrom(originalText, newPatches);
        set({ patches: newPatches, currentText: currentText });
        if (FEATURE_FLAGS.ENABLE_PATCH_PERSISTENCE)
            savePatches(originalText, newPatches);
    },
    resetAll: function () {
        var originalText = get().originalText;
        set({ patches: [], currentText: originalText, viewMode: 'original', lastAppliedRecommendationKey: undefined });
        if (FEATURE_FLAGS.ENABLE_PATCH_PERSISTENCE)
            savePatches(originalText, []);
    },
    isApplied: function (recommendationKey) { return get().patches.some(function (p) { return p.recommendationKey === recommendationKey && p.active; }); },
    rebuild: function () {
        var _a = get(), originalText = _a.originalText, patches = _a.patches;
        if (FEATURE_FLAGS.ENABLE_PATCH_INTEGRITY_CHECKS) {
            for (var _i = 0, patches_1 = patches; _i < patches_1.length; _i++) {
                var p = patches_1[_i];
                if (!p.active)
                    continue;
                var slice = originalText.slice(p.startOrig, p.endOrig);
                if (p.originalSlice !== slice) {
                    console.warn('[patch integrity mismatch slice]', { recommendationKey: p.recommendationKey });
                }
                if (p.sliceHash && p.sliceHash !== fnv1a(slice)) {
                    console.warn('[patch integrity hash mismatch]', { recommendationKey: p.recommendationKey });
                }
            }
        }
        set({ currentText: rebuildFrom(originalText, patches) });
    },

    //Retrait des viewMode-> une seul view
    //setViewMode: function (mode) { return set({ viewMode: mode }); },

    clearLastApplied: function () { return set({ lastAppliedRecommendationKey: undefined }); },
    getDiffSegments: function () {
        var _a = get(), originalText = _a.originalText, currentText = _a.currentText;
        return computeDiff(originalText, currentText);
    }
}); });
