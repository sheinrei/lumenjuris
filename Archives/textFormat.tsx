








// Formatage du contenu en paragraphes avec wrapping des clauses
const formatContent = (text: string, clauseRiskRange: any) => {
    if (!text.trim()) return [];
    let transformed = text;

    const setDiv = (index: number, string: string) => (<div
        key={`paragraph-${index}-${string.slice(0, 24)}`}
        className="mb-4 leading-relaxed text-gray-800"
        dangerouslySetInnerHTML={{ __html: string }}
    />)

    const setTitle = (index: number, string: string) => (<div
        key={`title-${index}`} className="mb-6 mt-8">
        <h3 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2">
            {string.replace(/^##\s*/, '')}
        </h3>
    </div>)

    const searchTitle = (string: string) => string.length < 100 && (
        string === string.toUpperCase() ||
        string.startsWith('ARTICLE') ||
        string.startsWith('CHAPITRE') ||
        string.startsWith('##') ||
        /^[IVX]+\./.test(string)
    )


    // Si mode modifié: injecter des spans pour chaque patch actif
    if (viewMode === 'modified' && activePatchCount > 0) {
        const activePatches = patches.filter(p => p.active).sort((a, b) => a.startOrig - b.startOrig);
        const fragments: string[] = [];
        let cursor = 0;
        activePatches.forEach(p => {
            if (cursor < p.startOrig) fragments.push(escapeHtml(effectiveOriginal.slice(cursor, p.startOrig)));
            fragments.push(`<span class="bg-yellow-100/70 ring-2 ring-yellow-300/60 ring-offset-1 rounded-sm px-0.5 shadow-[0_0_0_1px_rgba(250,204,21,0.4)] transition-colors" data-patch="${p.recommendationKey}" title="Modification appliquée">${escapeHtml(p.newSlice)}</span>`);
            cursor = p.endOrig;
        });
        if (cursor < effectiveOriginal.length) fragments.push(escapeHtml(effectiveOriginal.slice(cursor)));
        transformed = fragments.join('');

        return transformed
            .split('\n\n')
            .filter(paragraph => paragraph.trim())
            .map((paragraph, index) => {
                const trimmed = paragraph.trim();

                // Détection des titres
                if (searchTitle(trimmed)) return setTitle(index, trimmed);

                return setDiv(index, trimmed);
            });

    } else {
        //Si le viewMode n'est pas à modified
        const FragmentTextBrut: string[] = []
        let currentIndexFragmented = 0


        for (const range of clauseRiskRange) {

            const { start, end, clauseId } = range
            const before: string = transformed.slice(currentIndexFragmented, start)
            const clause: string = transformed.slice(start, end);

            FragmentTextBrut.push(before);
            const safeClause = clause.replace(/\n\n/g, '<br />')

            FragmentTextBrut.push(`<span class="cursor-pointer" data-clauseRisk-id="${clauseId}">${safeClause}</span>`)
            currentIndexFragmented = end;

        }
        //Toute les clauses sont injectées on ajout la fin du texte
        if (currentIndexFragmented < transformed.length) {
            FragmentTextBrut.push(transformed.slice(currentIndexFragmented))
        }

        return FragmentTextBrut.flatMap((fragment): React.ReactNode[] => {
            const paragraphs = fragment
                .split('\n\n')
                .filter(p => p.trim())

            return paragraphs.map((p, index): React.ReactNode => {

                // Détection des titres
                if (searchTitle(p)) return setTitle(index, p);
                return setDiv(index, p.trim())
            })
        })
    }

};
