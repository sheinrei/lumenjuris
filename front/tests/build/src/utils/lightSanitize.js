export function lightSanitize(input, maxRemovalRatio) {
    if (maxRemovalRatio === void 0) { maxRemovalRatio = 0.015; }
    var report = {
        originalLength: input.length,
        sanitizedLength: input.length,
        removedControlChars: 0,
        collapsedSpaces: 0,
        collapsedPunctuation: 0,
        trimmedBom: false,
        removedZeroWidth: 0,
        removedSoftHyphen: 0,
        ratioRemovedNonWhitespace: 0,
        aborted: false,
    };
    if (!input) {
        return { text: input, report: report };
    }
    var work = input;
    // Retirer BOM éventuel
    if (work.charCodeAt(0) === 0xFEFF) {
        work = work.slice(1);
        report.trimmedBom = true;
    }
    var originalNonWhitespace = (work.match(/\S/g) || []).length;
    // 1. Retirer caractères de contrôle invisibles (sauf \n, \r, \t) + nulls
    var beforeCtrl = work.length;
    work = work.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    report.removedControlChars = beforeCtrl - work.length;
    // 1b. Retirer soft hyphen (discrétionnaire) & zero-width marks (préserver indices propres)
    var beforeSoft = work.length;
    work = work.replace(/\u00AD/g, '');
    report.removedSoftHyphen = beforeSoft - work.length;
    var beforeZW = work.length;
    work = work.replace(/[\u200B-\u200D\u2060\uFEFF]/g, '');
    report.removedZeroWidth = beforeZW - work.length;
    // 2. Normaliser fins de ligne CRLF -> LF (conserve structure)
    work = work.replace(/\r\n?/g, '\n');
    // 3. Collapser espaces consécutifs horizontaux uniquement (ne pas toucher aux \n). On remplace runs de 2+ espaces par un seul espace.
    work = work.replace(/ {2,}/g, function (m) { report.collapsedSpaces += (m.length - 1); return ' '; });
    // 4. Retirer espaces immédiatement avant ponctuation simple , ; : ! ? .
    work = work.replace(/\s+([,;:!?\.])/g, ' $1') // d'abord garantir un espace unique avant de normaliser
        .replace(/ ([,;:!?\.])/g, '$1');
    // 5. Réduire répétitions de ponctuation (3+ mêmes) à 2 (préserve emphase modérée) ex: "!!!!" -> "!!"
    work = work.replace(/([!?.;,])\1{2,}/g, function (m, p1) { report.collapsedPunctuation += (m.length - 2); return p1 + p1; });
    // 6. Retirer espaces multiples autour des parenthèses/guillemets simples
    work = work.replace(/\(\s+/g, '(')
        .replace(/\s+\)/g, ')')
        .replace(/\s+"/g, '"')
        .replace(/"\s+/g, '"')
        .replace(/\s+'/g, "'")
        .replace(/'\s+/g, "'");
    // 7. Ne pas compacter les \n; mais supprimer les lignes contenant uniquement des espaces
    work = work.replace(/^[ \t]+$/gm, '');
    // 8. Trim extrémités sans toucher structure interne
    work = work.trim();
    var removedNonWhitespace = originalNonWhitespace - (work.match(/\S/g) || []).length;
    report.ratioRemovedNonWhitespace = originalNonWhitespace === 0 ? 0 : removedNonWhitespace / originalNonWhitespace;
    // Garde-fou
    if (report.ratioRemovedNonWhitespace > maxRemovalRatio) {
        report.aborted = true;
        return { text: input, report: report }; // fallback à l'original
    }
    report.sanitizedLength = work.length;
    return { text: work, report: report };
}
