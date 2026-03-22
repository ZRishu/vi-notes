export interface ReportAnalysisData {
  reportId: string;
  verificationTag: string;
  generatedAt: string;
  authenticityScore: number;
  typingSpeed: number;
  pauseCount: number;
  microPauseCount: number;
  punctuationPauseCount: number;
  revisionCount: number;
  burstCount: number;
  averagePauseMs: number;
  hesitationScore: number;
  rhythmScore: number;
  consistencyMismatchScore: number;
  vocabularyDiversity: number;
  supportingEvidence: string[];
  behaviorSummary: string[];
  linguisticSummary: string[];
  recommendation: string;
}

interface DownloadReportPdfOptions {
  title: string;
  report: ReportAnalysisData;
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildListItems = (items: string[]): string =>
  items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');

const getConfidenceTone = (score: number): { accent: string; soft: string } => {
  if (score >= 80) {
    return { accent: '#15803d', soft: '#dcfce7' };
  }
  if (score >= 55) {
    return { accent: '#b45309', soft: '#fef3c7' };
  }
  return { accent: '#b91c1c', soft: '#fee2e2' };
};

const getFileName = (title: string): string =>
  `${title || 'authenticity_report'}_report`.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase() || 'authenticity_report';

export const downloadReportPdf = async ({ title, report }: DownloadReportPdfOptions): Promise<void> => {
  const html2pdf = (await import('html2pdf.js')).default;
  const confidenceTone = getConfidenceTone(report.authenticityScore);
  const container = document.createElement('div');
  container.setAttribute('aria-hidden', 'true');
  container.style.position = 'fixed';
  container.style.left = '-100000px';
  container.style.top = '0';
  container.style.width = '279.4mm';
  container.style.background = '#ffffff';
  container.innerHTML = `
    <div style="width:279.4mm; min-height:215.9mm; background:#ffffff; color:#172033; font-family:Inter, Arial, sans-serif; position:relative; overflow:hidden;">
      <div style="position:absolute; inset:0; pointer-events:none; display:flex; align-items:center; justify-content:center;">
        <div style="transform:rotate(-24deg); text-align:center; opacity:0.08;">
          <div style="font-size:46px; font-weight:700; letter-spacing:0.28em; text-transform:uppercase; color:#15803d;">Verified by</div>
          <div style="margin-top:10px; font-size:108px; line-height:1; font-family:'Satisfy', cursive; color:#b36b00;">Vi-Notes</div>
        </div>
      </div>
      <div style="position:relative; z-index:1; padding:16mm 16mm 12mm;">
        <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12mm; padding:0 0 8mm; border-bottom:1px solid #d9e2df;">
          <div style="min-width:0;">
            <div style="display:inline-flex; align-items:center; padding:2.5mm 4mm; border-radius:999px; background:#dcfce7; color:#166534; font-size:10px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase;">${escapeHtml(report.verificationTag)}</div>
            <h1 style="margin:4mm 0 0; font-size:26px; line-height:1.12; color:#172033;">${escapeHtml(title || 'Untitled Document')}</h1>
            <div style="display:flex; flex-wrap:wrap; gap:4mm 8mm; margin-top:4mm; font-size:11px; color:#516072;">
              <span>Report ID: ${escapeHtml(report.reportId)}</span>
              <span>Generated ${escapeHtml(new Date(report.generatedAt).toLocaleString())}</span>
            </div>
          </div>
          <div style="padding:5mm 6mm; border-radius:8mm; border:1px solid ${confidenceTone.accent}; background:${confidenceTone.soft}; min-width:44mm; text-align:right;">
            <div style="font-size:10px; letter-spacing:0.08em; text-transform:uppercase; color:#516072;">Confidence Score</div>
            <div style="margin-top:2mm; font-size:28px; font-weight:800; line-height:1; color:${confidenceTone.accent};">${report.authenticityScore}</div>
            <div style="margin-top:2mm; font-size:11px; color:#374151;">${escapeHtml(report.recommendation)}</div>
          </div>
        </div>
        <div style="display:grid; grid-template-columns:1.35fr 0.95fr; gap:8mm; margin-top:8mm;">
          <div style="min-width:0;">
            <div style="display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:4mm; margin-bottom:6mm;">
              <div style="padding:4.5mm; border:1px solid #d6e8fb; border-radius:6mm; background:#eff6ff;">
                <div style="font-size:10px; color:#516072; text-transform:uppercase; letter-spacing:0.08em;">Behavior Rhythm</div>
                <div style="margin-top:2mm; font-size:22px; font-weight:800; color:#0369a1;">${report.rhythmScore}</div>
                <div style="margin-top:1.5mm; font-size:11px; color:#334155;">${report.typingSpeed} CPM and ${report.pauseCount} long pauses</div>
              </div>
              <div style="padding:4.5mm; border:1px solid #e7ddfb; border-radius:6mm; background:#f5f3ff;">
                <div style="font-size:10px; color:#516072; text-transform:uppercase; letter-spacing:0.08em;">Linguistic Match</div>
                <div style="margin-top:2mm; font-size:22px; font-weight:800; color:#6d28d9;">${100 - report.consistencyMismatchScore}</div>
                <div style="margin-top:1.5mm; font-size:11px; color:#334155;">${report.vocabularyDiversity} vocabulary diversity</div>
              </div>
            </div>
            <div style="padding-top:5mm; border-top:1px solid #d9e2df;">
              <div style="font-size:10px; font-weight:700; color:#172033; text-transform:uppercase; letter-spacing:0.08em;">Behavioral Monitoring</div>
              <ul style="margin:3mm 0 0; padding-left:5mm; font-size:11px; line-height:1.55; color:#475569;">${buildListItems(report.behaviorSummary)}</ul>
            </div>
            <div style="padding-top:5mm; border-top:1px solid #d9e2df; margin-top:5mm;">
              <div style="font-size:10px; font-weight:700; color:#172033; text-transform:uppercase; letter-spacing:0.08em;">Linguistic Analysis</div>
              <ul style="margin:3mm 0 0; padding-left:5mm; font-size:11px; line-height:1.55; color:#475569;">${buildListItems(report.linguisticSummary)}</ul>
            </div>
            <div style="padding-top:5mm; border-top:1px solid #d9e2df; margin-top:5mm;">
              <div style="font-size:10px; font-weight:700; color:#172033; text-transform:uppercase; letter-spacing:0.08em;">Supporting Evidence</div>
              <ul style="margin:3mm 0 0; padding-left:5mm; font-size:11px; line-height:1.55; color:#475569;">${buildListItems(report.supportingEvidence.length > 0 ? report.supportingEvidence : ['No suspicious evidence detected in this session.'])}</ul>
            </div>
          </div>
          <div style="min-width:0;">
            <div style="padding:5mm; border:1px solid #d9e2df; border-radius:7mm; background:#f8fafc;">
              <div style="font-size:10px; font-weight:700; color:#172033; text-transform:uppercase; letter-spacing:0.08em;">Key Metrics</div>
              <div style="display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:3mm; margin-top:4mm;">
                <div style="padding:3.5mm; border-radius:5mm; background:#eff6ff; border:1px solid #bfdbfe;"><div style="font-size:9px; color:#516072;">Micro-pauses</div><div style="margin-top:1.5mm; font-size:14px; font-weight:800; color:#0f172a;">${report.microPauseCount}</div></div>
                <div style="padding:3.5mm; border-radius:5mm; background:#fffbeb; border:1px solid #fde68a;"><div style="font-size:9px; color:#516072;">Punctuation pauses</div><div style="margin-top:1.5mm; font-size:14px; font-weight:800; color:#0f172a;">${report.punctuationPauseCount}</div></div>
                <div style="padding:3.5mm; border-radius:5mm; background:#fef2f2; border:1px solid #fecaca;"><div style="font-size:9px; color:#516072;">Revisions</div><div style="margin-top:1.5mm; font-size:14px; font-weight:800; color:#0f172a;">${report.revisionCount}</div></div>
                <div style="padding:3.5mm; border-radius:5mm; background:#f5f3ff; border:1px solid #ddd6fe;"><div style="font-size:9px; color:#516072;">Burst sequences</div><div style="margin-top:1.5mm; font-size:14px; font-weight:800; color:#0f172a;">${report.burstCount}</div></div>
                <div style="padding:3.5mm; border-radius:5mm; background:#ecfeff; border:1px solid #a5f3fc;"><div style="font-size:9px; color:#516072;">Average pause</div><div style="margin-top:1.5mm; font-size:14px; font-weight:800; color:#0f172a;">${report.averagePauseMs} ms</div></div>
                <div style="padding:3.5mm; border-radius:5mm; background:#fdf2f8; border:1px solid #fbcfe8;"><div style="font-size:9px; color:#516072;">Hesitation score</div><div style="margin-top:1.5mm; font-size:14px; font-weight:800; color:#0f172a;">${report.hesitationScore}</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    await html2pdf()
      .from(container.firstElementChild as HTMLElement)
      .set({
        margin: 0,
        filename: `${getFileName(title)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, backgroundColor: '#ffffff', useCORS: true },
        jsPDF: { unit: 'mm', format: 'letter', orientation: 'landscape' },
      } as any)
      .save();
  } finally {
    container.remove();
  }
};
