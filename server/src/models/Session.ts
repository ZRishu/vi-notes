import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  keystrokeData: [{
    type: { type: String, enum: ['keydown', 'keyup'] },
    keyCode: { type: String }, // Optional, maybe just key name/code but not character if strictly "actual characters typed must not be stored"
    timestamp: { type: Number },
    duration: { type: Number } // Time since last event or specific duration if applicable
  }],
  pastedEvents: [{
    timestamp: { type: Number },
    textLength: { type: Number },
  }],
  analysis: {
    authenticityScore: { type: Number },
    typingSpeed: { type: Number }, // characters per minute
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

export default mongoose.model('Session', sessionSchema);
