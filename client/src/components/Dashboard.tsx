import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FilePlus2, FileText, Clock3, Trash2, AlertTriangle, X } from 'lucide-react';
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
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const confirmDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteId(id);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await api.delete(`/documents/${deleteId}`);
      setDocuments(documents.filter(doc => doc._id !== deleteId));
      setDeleteId(null);
    } catch (error) {
      console.error('Failed to delete document:', error);
      alert('Failed to delete document. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const documentToDelete = documents.find(d => d._id === deleteId);

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
          <div className="document-card-meta">
            <Clock3 size={14} />
            Ready to start
          </div>
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
              {new Date(document.updatedAt).toLocaleString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
            <button 
              className="document-delete-btn" 
              onClick={(e) => confirmDelete(e, document._id)}
              aria-label="Delete document"
            >
              <Trash2 size={16} />
            </button>
          </button>
        ))}
      </div>

      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal-content delete-modal" onClick={e => e.stopPropagation()}>
            <div className="delete-modal-header">
              <div className="delete-warning-icon">
                <AlertTriangle size={24} />
              </div>
              <h3>Delete Document?</h3>
              <button className="modal-close-btn" onClick={() => setDeleteId(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="delete-modal-body">
              <p>Are you sure you want to delete <strong>"{documentToDelete?.title || 'Untitled Document'}"</strong>?</p>
              <p className="delete-warning-text">This action cannot be undone and the document will be permanently removed.</p>
            </div>

            <div className="modal-actions delete-modal-actions">
              <button 
                className="btn-secondary" 
                onClick={() => setDeleteId(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button 
                className="btn-danger" 
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
