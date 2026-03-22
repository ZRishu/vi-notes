import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FilePlus2, FileText, Clock3, Trash2, AlertTriangle, X, ShieldCheck, LoaderCircle, FileDown } from 'lucide-react';
import api from '../api';
import { downloadReportPdf } from '../utils/reportExport';

interface AnalysisResult {
  reportId: string;
  verificationTag: string;
  generatedAt: string;
  authenticityScore: number;
  typingSpeed: number;
  speedVariance: number;
  pauseCount: number;
  microPauseCount: number;
  punctuationPauseCount: number;
  revisionCount: number;
  revisionRate: number;
  burstCount: number;
  averagePauseMs: number;
  hesitationScore: number;
  rhythmScore: number;
  consistencyMismatchScore: number;
  wordCount: number;
  vocabularyDiversity: number;
  sentenceLengthVariance: number;
  isPasted: boolean;
  suspiciousFlags: string[];
  supportingEvidence: string[];
  behaviorSummary: string[];
  linguisticSummary: string[];
  recommendation: string;
}

interface DocumentItem {
  _id: string;
  title: string;
  updatedAt: string;
  content: string;
  keystrokeData?: Array<{ type: 'keydown' | 'keyup'; keyCode: string; timestamp: number; duration?: number }>;
  pastedEvents?: Array<{ timestamp: number; textLength: number }>;
  lastAnalysis?: AnalysisResult | null;
}

const normalizeAnalysisResult = (analysis: AnalysisResult | null | undefined): AnalysisResult | null => {
  if (!analysis) return null;
  return {
    reportId: analysis.reportId || 'legacy-report',
    verificationTag: analysis.verificationTag || 'Verified by Vi-Notes',
    generatedAt: analysis.generatedAt || new Date().toISOString(),
    authenticityScore: analysis.authenticityScore ?? 0,
    typingSpeed: analysis.typingSpeed ?? 0,
    speedVariance: analysis.speedVariance ?? 0,
    pauseCount: analysis.pauseCount ?? 0,
    microPauseCount: analysis.microPauseCount ?? 0,
    punctuationPauseCount: analysis.punctuationPauseCount ?? 0,
    revisionCount: analysis.revisionCount ?? 0,
    revisionRate: analysis.revisionRate ?? 0,
    burstCount: analysis.burstCount ?? 0,
    averagePauseMs: analysis.averagePauseMs ?? 0,
    hesitationScore: analysis.hesitationScore ?? 0,
    rhythmScore: analysis.rhythmScore ?? 0,
    consistencyMismatchScore: analysis.consistencyMismatchScore ?? 0,
    wordCount: analysis.wordCount ?? 0,
    vocabularyDiversity: analysis.vocabularyDiversity ?? 0,
    sentenceLengthVariance: analysis.sentenceLengthVariance ?? 0,
    isPasted: analysis.isPasted ?? false,
    suspiciousFlags: analysis.suspiciousFlags || [],
    supportingEvidence: analysis.supportingEvidence || [],
    behaviorSummary: analysis.behaviorSummary || [],
    linguisticSummary: analysis.linguisticSummary || [],
    recommendation: analysis.recommendation || 'Authenticity Verified'
  };
};

const getConfidenceToneClass = (score: number): string => {
  if (score >= 80) return 'confidence-high';
  if (score >= 55) return 'confidence-medium';
  return 'confidence-low';
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const [reportDocumentId, setReportDocumentId] = useState<string | null>(null);
  const [reportLoadingId, setReportLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const storedName = localStorage.getItem('userName');
    if (storedName) {
      setUserName(storedName);
    }

    const loadDocuments = async () => {
      try {
        const [{ data: docs }, { data: user }] = await Promise.all([
          api.get('/documents'),
          !storedName ? api.get('/auth/me') : Promise.resolve({ data: { name: storedName } })
        ]);
        
        setDocuments(docs.map((doc: DocumentItem) => ({
          ...doc,
          lastAnalysis: normalizeAnalysisResult(doc.lastAnalysis)
        })));
        if (user && user.name) {
          setUserName(user.name);
          localStorage.setItem('userName', user.name);
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
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

  const handleViewReport = async (e: React.MouseEvent, document: DocumentItem) => {
    e.stopPropagation();
    if (reportLoadingId === document._id) return;

    if (document.lastAnalysis) {
      setReportDocumentId(document._id);
      return;
    }

    setReportLoadingId(document._id);
    try {
      const { data } = await api.post(`/sessions/documents/${document._id}/report`);
      const normalizedReport = normalizeAnalysisResult(data.analysis);
      setDocuments((prev) => prev.map((item) => (
        item._id === document._id
          ? {
              ...item,
              lastAnalysis: normalizedReport,
            }
          : item
      )));
      setReportDocumentId(document._id);
    } catch (error) {
      console.error('Failed to generate latest report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setReportLoadingId(null);
    }
  };

  const handleDownloadReportPdf = async () => {
    if (!report || !reportDocument) return;
    try {
      await downloadReportPdf({
        title: reportDocument.title || 'Authenticity Report',
        report,
      });
    } catch (error) {
      console.error('Failed to export report PDF:', error);
      alert('Failed to download report PDF. Please try again.');
    }
  };

  const documentToDelete = documents.find(d => d._id === deleteId);
  const reportDocument = documents.find(d => d._id === reportDocumentId) || null;
  const report = reportDocument?.lastAnalysis || null;

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1>Hello, {userName.trim() || 'Writer'}!</h1>
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
              className="document-report-btn"
              onClick={(e) => void handleViewReport(e, document)}
              aria-label={document.lastAnalysis ? 'View latest report' : 'Generate report'}
              title={document.lastAnalysis ? 'View latest verified report' : 'Generate latest report'}
              disabled={reportLoadingId === document._id}
            >
              {reportLoadingId === document._id ? <LoaderCircle size={15} className="spin-icon" /> : <ShieldCheck size={15} />}
            </button>
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

      {report && reportDocument && (
        <div className="modal-overlay" onClick={() => setReportDocumentId(null)}>
          <div className="modal-content report-modal" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const confidenceToneClass = getConfidenceToneClass(report.authenticityScore);
              return (
                <>
            <div className="report-modal-header">
              <div>
                <div className="report-badge">{report.verificationTag}</div>
                <h3>{reportDocument.title || 'Untitled Document'}</h3>
                <div className="report-meta-row">
                  <p>Report ID: {report.reportId}</p>
                  <p>Generated {new Date(report.generatedAt).toLocaleString()}</p>
                </div>
              </div>
              <div className="report-header-actions">
                <button type="button" className="report-header-btn report-download-btn" onClick={() => void handleDownloadReportPdf()}>
                  <FileDown size={16} />
                  Download
                </button>
                <button type="button" className="report-header-btn report-close-header-btn" onClick={() => setReportDocumentId(null)}>
                  <X size={16} />
                  Close
                </button>
              </div>
            </div>
            <div className="report-modal-body">
              <div className="report-summary-grid">
                <div className={`report-summary-card report-summary-card-primary ${confidenceToneClass}`}>
                  <div className="report-summary-label">Confidence Score</div>
                  <div className={`report-summary-value ${confidenceToneClass}`}>{report.authenticityScore}</div>
                  <div className="report-summary-note">{report.recommendation}</div>
                </div>
                <div className="report-summary-card report-summary-card-rhythm">
                  <div className="report-summary-label">Behavior Rhythm</div>
                  <div className="report-summary-value">{report.rhythmScore}</div>
                  <div className="report-summary-note">{report.typingSpeed} CPM and {report.pauseCount} long pauses</div>
                </div>
                <div className="report-summary-card report-summary-card-linguistic">
                  <div className="report-summary-label">Linguistic Match</div>
                  <div className="report-summary-value">{100 - report.consistencyMismatchScore}</div>
                  <div className="report-summary-note">{report.vocabularyDiversity} vocabulary diversity</div>
                </div>
              </div>

              <div className="report-layout">
                <div className="report-main-column">
                  <div className="report-section">
                    <div className="report-section-title">Behavioral Monitoring</div>
                    <ul className="report-list">
                      {report.behaviorSummary.map((item, index) => <li key={index}>{item}</li>)}
                    </ul>
                  </div>
                  <div className="report-section">
                    <div className="report-section-title">Linguistic Analysis</div>
                    <ul className="report-list">
                      {report.linguisticSummary.map((item, index) => <li key={index}>{item}</li>)}
                    </ul>
                  </div>
                  <div className="report-section">
                    <div className="report-section-title">Supporting Evidence</div>
                    <ul className="report-list">
                      {(report.supportingEvidence.length > 0 ? report.supportingEvidence : ['No suspicious evidence detected in this session.']).map((item, index) => <li key={index}>{item}</li>)}
                    </ul>
                  </div>
                </div>

                <div className="report-side-column">
                  <div className="report-side-card">
                    <div className="report-section-title">Key Metrics</div>
                    <div className="report-metrics-grid">
                      <div className="metric-chip">
                        <span className="metric-chip-label">Micro-pauses</span>
                        <strong>{report.microPauseCount}</strong>
                      </div>
                      <div className="metric-chip">
                        <span className="metric-chip-label">Punctuation pauses</span>
                        <strong>{report.punctuationPauseCount}</strong>
                      </div>
                      <div className="metric-chip">
                        <span className="metric-chip-label">Revisions</span>
                        <strong>{report.revisionCount}</strong>
                      </div>
                      <div className="metric-chip">
                        <span className="metric-chip-label">Burst sequences</span>
                        <strong>{report.burstCount}</strong>
                      </div>
                      <div className="metric-chip">
                        <span className="metric-chip-label">Average pause</span>
                        <strong>{report.averagePauseMs} ms</strong>
                      </div>
                      <div className="metric-chip">
                        <span className="metric-chip-label">Hesitation score</span>
                        <strong>{report.hesitationScore}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
