/**
 * 🔧 CHUNKING INTELLIGENT POUR OPENAI
 * Divise les documents longs en petits morceaux analysables
 */

export interface DocumentChunk {
  content: string;
  index: number;
  totalChunks: number;
  startPosition: number;
  endPosition: number;
}

/**
 * Divise intelligemment un document en chunks
 */
export function createIntelligentChunks(text: string, maxChunkSize: number = 6000): DocumentChunk[] {
  if (text.length <= maxChunkSize) {
    return [{
      content: text,
      index: 0,
      totalChunks: 1,
      startPosition: 0,
      endPosition: text.length
    }];
  }

  const chunks: DocumentChunk[] = [];
  let currentPosition = 0;
  let chunkIndex = 0;

  while (currentPosition < text.length) {
    let chunkEnd = Math.min(currentPosition + maxChunkSize, text.length);
    
    // Trouve une coupure naturelle (fin de phrase)
    if (chunkEnd < text.length) {
      const lastPeriod = text.lastIndexOf('.', chunkEnd);
      const lastExclamation = text.lastIndexOf('!', chunkEnd);
      const lastQuestion = text.lastIndexOf('?', chunkEnd);
      
      const bestCut = Math.max(lastPeriod, lastExclamation, lastQuestion);
      
      if (bestCut > currentPosition + maxChunkSize * 0.7) {
        chunkEnd = bestCut + 1;
      }
    }

    const chunkContent = text.substring(currentPosition, chunkEnd).trim();
    
    if (chunkContent.length > 0) {
      chunks.push({
        content: chunkContent,
        index: chunkIndex,
        totalChunks: 0, // Sera mis à jour après
        startPosition: currentPosition,
        endPosition: chunkEnd
      });
      chunkIndex++;
    }

    currentPosition = chunkEnd;
  }

  // Met à jour le nombre total de chunks
  chunks.forEach(chunk => {
    chunk.totalChunks = chunks.length;
  });

  console.log(`📄 Document divisé en ${chunks.length} chunks intelligents`);
  return chunks;
}

/**
 * Prompt optimisé pour chunk
 */
export function createChunkPrompt(chunk: DocumentChunk, basePrompt: string): string {
  const chunkInfo = chunk.totalChunks > 1 
    ? `\n\n⚠️ IMPORTANT: Ceci est la partie ${chunk.index + 1}/${chunk.totalChunks} du document complet. Analysez UNIQUEMENT cette partie.\n\n`
    : '\n\n';

  return `${basePrompt}${chunkInfo}TEXTE À ANALYSER:\n${chunk.content}`;
}
