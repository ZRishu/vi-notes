import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, default: 'Untitled Document' },
  content: { type: String, default: '' },
  htmlContent: { type: String, default: '' },
  pageContents: [{ type: String }],
  editorPreferences: {
    currentFont: { type: String, default: 'Inter' },
    currentFontSize: { type: String, default: '3' },
    currentStyle: { type: String, default: 'Normal Text' },
    currentAlign: { type: String, default: 'Left' },
    activeFormats: {
      bold: { type: Boolean, default: false },
      italic: { type: Boolean, default: false },
      underline: { type: Boolean, default: false },
      strikeThrough: { type: Boolean, default: false },
      unorderedList: { type: Boolean, default: false },
      orderedList: { type: Boolean, default: false },
      blockquote: { type: Boolean, default: false },
      codeBlock: { type: Boolean, default: false }
    }
  },
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
  lastAnalysis: {
    authenticityScore: { type: Number },
    typingSpeed: { type: Number },
    speedVariance: { type: Number },
    pauseCount: { type: Number },
    microPauseCount: { type: Number },
    punctuationPauseCount: { type: Number },
    revisionCount: { type: Number },
    revisionRate: { type: Number },
    wordCount: { type: Number },
    vocabularyDiversity: { type: Number },
    sentenceLengthVariance: { type: Number },
    isPasted: { type: Boolean },
    suspiciousFlags: [{ type: String }],
    recommendation: { type: String }
  }
}, { timestamps: true });

export default mongoose.model('Document', documentSchema);
