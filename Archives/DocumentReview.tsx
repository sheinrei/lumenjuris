import React, { useEffect, useState } from 'react';
import { useRecoStore } from '../store/recoStore';
import { DocumentViewer } from './DocumentViewer';
import type { ClauseRisk } from '../types';

interface Props {
  content: string;
  clauses: ClauseRisk[];
  fileName: string;
}

export const DocumentReview: React.FC<Props> = ({
  content,
  clauses,
  fileName,
}) => {
  const fetchAll = useRecoStore((s) => s.fetchAll);
  useEffect(() => {
    fetchAll(clauses).catch(console.error);
  }, [clauses, fetchAll]);

  const [activeClauseId, setActiveClauseId] = useState<string | null>(null);

  return (
    <DocumentViewer
      content={content}
      clauses={clauses}
      activeClauseId={activeClauseId}
      onClauseClick={setActiveClauseId}
      fileName={fileName}
    />
  );
};
