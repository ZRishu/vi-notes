import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
  content: { type: String, required: true },
  documentTitle: { type: String, default: 'Untitled Document' },
  htmlContent: { type: String, default: '' },
  pageContents: [{ type: String }],
  editorPreferences: {
    currentFont: { type: String },
    currentFontSize: { type: String },
    currentStyle: { type: String },
    currentAlign: { type: String },
    activeFormats: {
      bold: { type: Boolean },
      italic: { type: Boolean },
      underline: { type: Boolean },
      strikeThrough: { type: Boolean },
      unorderedList: { type: Boolean },
      orderedList: { type: Boolean },
      blockquote: { type: Boolean },
      codeBlock: { type: Boolean }
    }
  },
  isDraft: { type: Boolean, default: false },
  keystrokeData: [{
    type: { type: String, enum: ['keydown', 'keyup'] },
    keyCode: { type: String },
    timestamp: { type: Number },
    duration: { type: Number } 
  }],
  pastedEvents: [{
    timestamp: { type: Number },
    textLength: { type: Number },
  }],
  analysis: {
    reportId: { type: String },
    verificationTag: { type: String },
    generatedAt: { type: Date },
    authenticityScore: { type: Number },
    typingSpeed: { type: Number },
    speedVariance: { type: Number },
    pauseCount: { type: Number },
    microPauseCount: { type: Number },
    punctuationPauseCount: { type: Number },
    revisionCount: { type: Number },
    revisionRate: { type: Number },
    burstCount: { type: Number },
    averagePauseMs: { type: Number },
    hesitationScore: { type: Number },
    rhythmScore: { type: Number },
    consistencyMismatchScore: { type: Number },
    wordCount: { type: Number },
    vocabularyDiversity: { type: Number },
    sentenceLengthVariance: { type: Number },
    isPasted: { type: Boolean },
    suspiciousFlags: [{ type: String }],
    supportingEvidence: [{ type: String }],
    behaviorSummary: [{ type: String }],
    linguisticSummary: [{ type: String }],
    recommendation: { type: String }
  }
}, { timestamps: true });

export default mongoose.model('Session', sessionSchema);
