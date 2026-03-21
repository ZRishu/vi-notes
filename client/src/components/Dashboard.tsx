import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FilePlus2, FileText, Clock3 } from 'lucide-react';
import api from '../api';

interface DocumentItem {
  _id: string;
  title: string;
  updatedAt: string;
  content: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const { data } = await api.get('/documents');
        setDocuments(data);
      } finally {
        setIsLoading(false);
      }
    };

    loadDocuments();
  }, []);

  const handleCreateDocument = async () => {
    const { data } = await api.post('/documents', { title: 'Untitled Document', pageContents: [''] });
    navigate(`/documents/${data._id}`);
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1>Your Documents</h1>
          <p>Create a new document or pick up where you left off.</p>
        </div>
      </div>

      <div className="documents-grid">
        <button className="document-card create-document-card" onClick={handleCreateDocument}>
          <div className="create-document-icon"><FilePlus2 size={28} /></div>
          <div className="document-card-title">Create New Document</div>
          <div className="document-card-meta">Start with a fresh A4 writing page.</div>
        </button>

        {!isLoading && documents.map((document) => (
          <button
            key={document._id}
            className="document-card"
            onClick={() => navigate(`/documents/${document._id}`)}
          >
            <div className="document-card-icon"><FileText size={22} /></div>
            <div className="document-card-title">{document.title || 'Untitled Document'}</div>
            <div className="document-card-preview">{document.content?.trim() || 'No content yet.'}</div>
            <div className="document-card-meta">
              <Clock3 size={14} />
              Updated {new Date(document.updatedAt).toLocaleString()}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
