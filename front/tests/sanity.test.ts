// Lightweight ad-hoc tests (no framework) runnable via ts-node.
// These are non-invasive: they import pure utilities & store, execute, and log results.
// Runtime note: when built, this file ends in tests/build/tests; source files transpile under tests/build/src
// so relative paths still work with ../src/... below.
import { lightSanitize } from '../src/utils/lightSanitize.js';
import { computeDiff } from '../src/utils/diffUtils.js';
import { useDocumentTextStore } from '../src/store/documentTextStore.js';

function assert(name: string, cond: boolean) {
  if (!cond) {
    console.error('[FAIL]', name);
    process.exitCode = 1;
  } else {
    console.log('[OK ]', name);
  }
}

function testLightSanitize() {
  const messy = '\uFEFF  Hello   world!!!\nLine 2\u200B\u200B  '; // BOM + double spaces + extra ! + zero width + trailing
  const { text, report } = lightSanitize(messy);
  assert('lightSanitize trims BOM', report.trimmedBom === true);
  assert('lightSanitize collapses spaces', report.collapsedSpaces > 0);
  assert('lightSanitize reduces punctuation run', report.collapsedPunctuation > 0);
  assert('lightSanitize removes zero-width', report.removedZeroWidth > 0);
  assert('lightSanitize not aborted', report.aborted === false);
  // Guard: ratio limited
  const huge = 'A'.repeat(1000) + '\u200B'.repeat(50); // should remove 50 but ratio small
  const r2 = lightSanitize(huge);
  assert('lightSanitize ratio stays below abort threshold', r2.report.aborted === false);
}

function testComputeDiff() {
  const a = 'Clause ABC';
  const b = 'Clause AXC';
  const segs = computeDiff(a, b);
  assert('computeDiff returns at least 1 segment', segs.length >= 1);
  assert('computeDiff first segment type has data', !!segs[0].originalText);
}

function testPatchOverlap() {
  // Initialize store with simple original
  const setOriginal = useDocumentTextStore.getState().setOriginalText;
  setOriginal('ABCDEFGH');
  const apply = useDocumentTextStore.getState().applyPatch;
  apply({ clauseId: 'c1', recommendationKey: 'r1', startOrig: 1, endOrig: 3, newSlice: 'XX' }); // replaces BC
  const before = useDocumentTextStore.getState().patches.length;
  // Overlapping patch (should be rejected)
  apply({ clauseId: 'c2', recommendationKey: 'r2', startOrig: 2, endOrig: 4, newSlice: 'YY' });
  const after = useDocumentTextStore.getState().patches.length;
  assert('overlap patch not added', after === before);
}

function run() {
  console.log('Running lightweight sanity tests');
  testLightSanitize();
  testComputeDiff();
  testPatchOverlap();
  console.log('Done');
}

run();
