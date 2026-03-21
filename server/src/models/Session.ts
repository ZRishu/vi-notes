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
    content: { type: String } // "amount of text pasted" - maybe just length but I'll store it as per requirement if needed. Actually it says "record that event and the amount of text pasted". I'll store length.
  }]
}, { timestamps: true });

export default mongoose.model('Session', sessionSchema);
