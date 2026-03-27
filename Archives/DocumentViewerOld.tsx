import React, { useRef, forwardRef, useImperativeHandle, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ClauseRisk } from '../types';
import { ClausesSidebar } from './ClausesSidebar';
import { isFeatureEnabled } from '../config/features';
import { modernHighlighter } from '../utils/modernHighlighter';
import { useDocumentTextStore } from '../store/documentTextStore';
import { ContractAnalysisSummary } from './ContractAnalysisSummary';
import { AnalysisContext } from '../types/contextualAnalysis';
import { findBestClauseSpan } from '../utils/textPatchLocator';
import { ModaleTextEditor } from './ModaleTextEditorClause';




interface DocumentViewerProps {
  content: string;
  clauses: ClauseRisk[];
  onClauseClick: (clauseId: string) => void;
  fileName: string;
  activeClauseId?: string | null;
  contractSummary?: AnalysisContext
  recommendationIndex: number;
  setRecommendationIndex: (number: number) => void
}


export interface DocumentViewerRef {
  scrollToClause: (clauseId: string) => void;
  clearHighlight: () => void;
  reHighlight: () => void;

}




export const DocumentViewer = forwardRef<DocumentViewerRef, DocumentViewerProps>(({
  content,
  clauses,
  onClauseClick,
  fileName,
  //activeClauseId,
  contractSummary,
  recommendationIndex,
  setRecommendationIndex
}, ref) => {

  const documentRef = useRef<HTMLDivElement>(null);
  const showSidebar = isFeatureEnabled('ENABLE_CLAUSES_SIDEBAR');
  const originalText = useDocumentTextStore(s => s.originalText);
  const currentText = useDocumentTextStore(s => s.currentText);
  const patches = useDocumentTextStore(s => s.patches);
  const resetAll = useDocumentTextStore(s => s.resetAll);
  const viewMode = useDocumentTextStore(s => s.viewMode);
  const setViewMode = useDocumentTextStore(s => s.setViewMode);
  const lastAppliedKey = useDocumentTextStore(s => s.lastAppliedRecommendationKey);
  const clearLastApplied = useDocumentTextStore(s => s.clearLastApplied);
  const activePatchCount = useMemo(() => patches.filter(p => p.active).length, [patches]);
  const effectiveOriginal = originalText && originalText.length > 0 ? originalText : content;
  const effectiveModified = currentText;




  // Sécurité : si aucune modification active on retourne sur original
  useEffect(() => {
    if (viewMode === 'modified' && activePatchCount === 0) setViewMode('original');
  }, [viewMode, activePatchCount, setViewMode]);




  // Effet pour faire un scroll doux jusqu'à la première zone modifiée
  useEffect(() => {
    if (lastAppliedKey && viewMode === 'modified') {
      const el = documentRef.current?.querySelector(`[data-patch='${lastAppliedKey}']`);
      if (el) {
        (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('animate-pulse');
        setTimeout(() => el.classList.remove('animate-pulse'), 1600);
      }
      clearLastApplied();
    }
  }, [lastAppliedKey, viewMode, clearLastApplied]);



  const highlightKeyRef = useRef('');



  useEffect(() => {
    if (viewMode !== 'original') {
      modernHighlighter.clearHighlights();
      highlightKeyRef.current = '';
      return;
    }
    if (!documentRef.current || clauses.length === 0 || !effectiveOriginal) return;
    const newKey = `${effectiveOriginal.length}|${clauses.map(c => c.id).join(',')}`;
    if (highlightKeyRef.current === newKey) return;
    highlightKeyRef.current = newKey;
    console.log('🎨 Auto-highlighting all clauses on mount/update (original view)');
    const successCount = modernHighlighter.highlightAllClauses(clauses, documentRef.current);
    console.log(`✅ Successfully highlighted ${successCount}/${clauses.length} clauses`);
  }, [clauses, effectiveOriginal, viewMode]);





  const clearCurrentHighlight = () => {
    if (!documentRef.current) return;
    modernHighlighter.clearHighlights();
    console.log('🧹 Modern highlights cleared');
  };



  useImperativeHandle(ref, () => ({
    scrollToClause: (clauseId: string) => {
      console.log('🔍 scrollToClause appelé avec clauseId:', clauseId);
      const clause = clauses.find(c => c.id === clauseId);
      if (clause) {
        console.log('🔍 Appel de scrollAndHighlightClause...');
        scrollAndHighlightClause(clause);
      } else {
        console.log('❌ Clause non trouvée pour ID:', clauseId);
      }
    },
    clearHighlight: () => {
      clearCurrentHighlight();
    },
    reHighlight: () => {
      if (!documentRef.current) return
      console.log(" 🎯 Appel du rehighLight")
      modernHighlighter.clearAllHighlights();
      highlightKeyRef.current = '';
      if (viewMode === 'original' && clauses.length > 0) {
        modernHighlighter.highlightAllClauses(clauses, documentRef.current);
      }
    }
  }));



  const handleSidebarClauseClick = (clause: ClauseRisk, index: number) => {
    console.log('🎯 handleSidebarClauseClick appelé avec:', clause.type, 'index:', index);
    onClauseClick(clause.id);
  };




  //Gestion du click sur un span d'une clause detecté dans le text
  const [showTextEdit, setShowTextEdit] = useState(false)
  const [editingClause, setEditingClause] = useState<ClauseRisk | null>()
  const lastClick = useRef(0);

  const handleClickSpanClause = (clauseId: string) => {
    const delayDobleClick: number = 250
    const now = Date.now();
    const diff = now - lastClick.current;
    lastClick.current = now;

    const targetClause = clauses.find((c) => c.id == clauseId)
    if (!targetClause) return


    //double clic ouverture de la modale textEdit
    if (diff < delayDobleClick && targetClause) {
      console.log("ouverture de l'edit de text");
      scrollAndHighlightClause(targetClause)
      setShowTextEdit(true)
      setEditingClause(targetClause)
      return
    }

    //Ouverture de la modale EnhancedClause simple clic
    setTimeout(() => {
      if (Date.now() - lastClick.current >= delayDobleClick) {
        scrollAndHighlightClause(targetClause)
        onClauseClick(clauseId);
      }
    }, 250);
  }



  const handleCloseTextEdit = () => {
    setShowTextEdit(false);
    if (!documentRef.current) return
    modernHighlighter.clearAllHighlights()
    modernHighlighter.highlightAllClauses(clauses, documentRef.current)
  }






  const scrollAndHighlightClause = (clause: ClauseRisk) => {
    console.log('🎯 Modern Highlighting for clause:', clause.type);
    if (!documentRef.current || !clause.content) {
      console.log('❌ documentRef ou clause.content manquant');
      return;
    }
    try {
      if (!documentRef.current) {
        console.error('❌ documentRef.current is null');
        return;
      }
      console.log('🔍 Attempting modern highlighting...');
      const success = modernHighlighter.highlightClause(clause, documentRef.current);
      if (success) {
        console.log('✅ Modern highlighting successful');
      } else {
        console.warn('⚠️ Modern highlighting failed');
      }
    } catch (error) {
      console.error('❌ Modern highlighting error:', error);
    }
  };









  // Formatage du contenu en paragraphes avec wrapping des clauses
  const formatContent = (text: string, clauseRiskRange: any) => {
    if (!text.trim()) return [];
    let transformed = text;

    //set un element React pour chaque fragment de texte
    const setDiv = (index: number, string: string) => (<div
      key={`paragraph-${index}-${string}`}
      className="mb-4 leading-relaxed text-gray-800"
      dangerouslySetInnerHTML={{ __html: string }}
    />)

    //set un element React pour un titre
    const setTitle = (index: number, string: string) => (<div
      key={`title-${index}-${string}`} className="mb-6 mt-8">
      <h3 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2">
        {string.replace(/^##\s*/, '')}
      </h3>
    </div>)

    //Detection de titre dans le texte
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
      })
      if (cursor < effectiveOriginal.length) fragments.push(escapeHtml(effectiveOriginal.slice(cursor)));
      transformed = fragments.join('');
      return transformed
        .split('\n\n')
        .filter(paragraph => paragraph.trim())
        .map((paragraph, index) => {
          const trimmed = paragraph.trim();
          if (searchTitle(trimmed)) return setTitle(index, trimmed);
          return setDiv(index, trimmed);
        });

    } else {
      //Si le viewMode n'est pas à modified
      const FragmentTextBrut: React.ReactNode[] = []
      let cursor = 0

      for (const range of clauseRiskRange) {
        const { start, end, clauseId } = range
        const before: string = transformed.slice(cursor, start)
        const clause: string = transformed.slice(start, end);
        FragmentTextBrut.push(escapeHtml(before));

        const parsedClause = escapeHtml(clause).replace(/\n\n/g, '<br />')

        FragmentTextBrut.push(<span
          key={clauseId}
          className="cursor-pointer select-none"
          data-clause-risk-id={clauseId}
          dangerouslySetInnerHTML={{ __html: parsedClause }}
          onPointerUp={() => { handleClickSpanClause(clauseId) }}
        />)



        cursor = end;
      }

      //Toute les clauses sont injectées on ajoute la fin du texte
      if (cursor < transformed.length) {
        FragmentTextBrut.push(transformed.slice(cursor))
      }

      return FragmentTextBrut.flatMap((fragment): React.ReactNode[] => {
        if (typeof fragment !== 'string') return [fragment]

        const paragraphs = fragment
          .split('\n\n')
          .filter(p => p.trim())

        return paragraphs.map((p: any, index: any): React.ReactNode => {

          if (searchTitle(p)) return setTitle(index, p);
          return setDiv(index, p.trim())
        })
      })
    }

  };









  function escapeHtml(str: string) {
    return str.replace(/[&<>"]/g, c => {
      switch (c) {
        case '&': return '&amp;';
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }

  const displayedText = viewMode === 'modified' ? effectiveModified : effectiveOriginal;







  const formattedContent = useMemo(() => {
    console.log("DOCUMENT MIS A JOUR")
    const rangeClauseRisk: any[] = []
    clauses.map(c => {
      const range = findBestClauseSpan(displayedText, c)
      rangeClauseRisk.push({ ...range, clauseId: c.id })
    })
    rangeClauseRisk.sort((a, b) => a.start - b.start)



    return formatContent(displayedText, rangeClauseRisk);
  }, [displayedText, clauses, activePatchCount])




  //Retour du JSX
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 h-full ${showSidebar ? 'flex' : ''}`}>
      {/* Document Principal */}
      <div className={`${showSidebar ? 'flex-1' : 'w-full'} flex flex-col`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex-shrink-0 flex items-center justify-between gap-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">📄 {fileName}</h2>
          <div className="flex items-center gap-4 text-xs">
            <div className="inline-flex rounded-full border border-gray-300 overflow-hidden">
              <button
                className={`px-2 py-1 font-medium transition-colors ${viewMode === 'original' ? 'bg-gray-800 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                onClick={() => setViewMode('original')}
                title="Afficher le texte original"
              >Original</button>
              <button
                className={`relative px-2 py-1 font-medium transition-colors ${viewMode === 'modified' ? 'bg-green-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'} ${activePatchCount === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => activePatchCount > 0 && setViewMode('modified')}
                title={activePatchCount > 0 ? 'Afficher le texte modifié' : 'Aucune modification appliquée'}
              >Modifié{activePatchCount > 0 && ` (${activePatchCount})`}
                {lastAppliedKey && viewMode === 'modified' && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                )}
              </button>
            </div>
            <button
              onClick={() => { resetAll(); setViewMode('original'); }}
              disabled={activePatchCount === 0}
              className={`px-2 py-1 rounded-full border text-xs font-medium transition-colors ${activePatchCount === 0 ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-red-300 text-red-600 hover:bg-red-50'}`}
              title="Réinitialiser toutes les modifications"
            >Réinitialiser tout</button>
          </div>
        </div>

        {/* Body - Document avec scroll */}
        <div
          ref={documentRef}
          className="flex-1 overflow-y-auto custom-scrollbar"
        >
          <div className="p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              <div className="max-w-4xl mx-auto space-y-2">
                {formattedContent.length > 0 ? (
                  formattedContent
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-6xl mb-4">📄</div>
                    <p>Aucun contenu à afficher</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div>
        {showSidebar && (
          <ClausesSidebar
            clauses={clauses}
            onClauseClick={handleSidebarClauseClick}
            isVisible={true}
            recommandationApplied={patches}
            currentView={viewMode}
          />
        )}

        <ContractAnalysisSummary
          contractSummary={contractSummary}
        />

        {showTextEdit && editingClause && (
          <ModaleTextEditor
            clause={editingClause}
            onClose={handleCloseTextEdit}
            recommendationIndex={recommendationIndex}
            setRecommendationIndex={setRecommendationIndex}
          />
        )}

      </div>
    </div>
  );
});

DocumentViewer.displayName = 'DocumentViewer';