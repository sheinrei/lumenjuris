// Small, non-invasive diff utility (line-oriented fallback to character spans)
// Designed to be pure/read-only so it cannot break existing patch system.
import FEATURE_FLAGS from '../config/features';
// Simple LCS-based diff limited to replacements (no explicit insert/delete separate types)
// If feature flag disabled, returns a single replacement covering entire change when texts differ.
export function computeDiff(originalText, modifiedText) {
    if (!FEATURE_FLAGS.ENABLE_PATCH_DIFF_COMPUTE) {
        if (originalText === modifiedText) {
            return [{ type: 'equal', origStart: 0, origEnd: originalText.length, newStart: 0, newEnd: modifiedText.length, originalText: originalText, newText: modifiedText }];
        }
        return [{ type: 'replace', origStart: 0, origEnd: originalText.length, newStart: 0, newEnd: modifiedText.length, originalText: originalText, newText: modifiedText }];
    }
    // Fast path identical
    if (originalText === modifiedText) {
        return [{ type: 'equal', origStart: 0, origEnd: originalText.length, newStart: 0, newEnd: modifiedText.length, originalText: originalText, newText: modifiedText }];
    }
    // Find common prefix
    var prefix = 0;
    var minLen = Math.min(originalText.length, modifiedText.length);
    while (prefix < minLen && originalText[prefix] === modifiedText[prefix])
        prefix++;
    // Find common suffix
    var suffix = 0;
    while (suffix < (minLen - prefix) && originalText[originalText.length - 1 - suffix] === modifiedText[modifiedText.length - 1 - suffix]) {
        suffix++;
    }
    var segs = [];
    if (prefix > 0) {
        segs.push({
            type: 'equal',
            origStart: 0,
            origEnd: prefix,
            newStart: 0,
            newEnd: prefix,
            originalText: originalText.slice(0, prefix),
            newText: modifiedText.slice(0, prefix)
        });
    }
    var origChangedStart = prefix;
    var origChangedEnd = originalText.length - suffix;
    var newChangedStart = prefix;
    var newChangedEnd = modifiedText.length - suffix;
    segs.push({
        type: 'replace',
        origStart: origChangedStart,
        origEnd: origChangedEnd,
        newStart: newChangedStart,
        newEnd: newChangedEnd,
        originalText: originalText.slice(origChangedStart, origChangedEnd),
        newText: modifiedText.slice(newChangedStart, newChangedEnd)
    });
    if (suffix > 0) {
        segs.push({
            type: 'equal',
            origStart: originalText.length - suffix,
            origEnd: originalText.length,
            newStart: modifiedText.length - suffix,
            newEnd: modifiedText.length,
            originalText: originalText.slice(originalText.length - suffix),
            newText: modifiedText.slice(modifiedText.length - suffix)
        });
    }
    return segs;
}
export function summarizeDiff(segs) {
    var replacedChars = 0;
    var equalChars = 0;
    for (var _i = 0, segs_1 = segs; _i < segs_1.length; _i++) {
        var s = segs_1[_i];
        if (s.type === 'equal')
            equalChars += s.originalText.length;
        else
            replacedChars += s.originalText.length + s.newText.length;
    }
    return { segments: segs.length, replacedChars: replacedChars, equalChars: equalChars };
}
