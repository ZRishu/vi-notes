import express from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import Session from '../models/Session.js';
import { analyzeSession } from '../utils/analysisEngine.js';

const router = express.Router();

router.get('/draft', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const draft = await Session.findOne({ userId: req.userId, isDraft: true }).sort({ updatedAt: -1 });
    if (!draft) {
      return res.status(404).json({ message: 'No draft found' });
    }
    res.json(draft);
  } catch (error) {
    console.error('Draft fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/draft', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const {
      content,
      documentTitle,
      htmlContent,
      pageContents,
      editorPreferences,
      keystrokeData = [],
      pastedEvents = []
    } = req.body;

    if (typeof content !== 'string' || typeof htmlContent !== 'string') {
      return res.status(400).json({ message: 'Invalid draft payload' });
    }

    if (!Array.isArray(pageContents)) {
      return res.status(400).json({ message: 'Invalid page payload' });
    }

    const sanitizedPages = pageContents.filter((page) => typeof page === 'string');
    const nextDraft = await Session.findOneAndUpdate(
      { userId: req.userId, isDraft: true },
      {
        userId: req.userId,
        isDraft: true,
        content,
        documentTitle: typeof documentTitle === 'string' ? documentTitle : 'Untitled Document',
        htmlContent,
        pageContents: sanitizedPages,
        editorPreferences: typeof editorPreferences === 'object' && editorPreferences ? editorPreferences : {},
        keystrokeData: Array.isArray(keystrokeData) ? keystrokeData : [],
        pastedEvents: Array.isArray(pastedEvents) ? pastedEvents : []
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json(nextDraft);
  } catch (error) {
    console.error('Draft save error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { content, keystrokeData, pastedEvents } = req.body;

    if (typeof content !== 'string') {
      return res.status(400).json({ message: 'Invalid content payload' });
    }

    if (!Array.isArray(keystrokeData) || !Array.isArray(pastedEvents)) {
      return res.status(400).json({ message: 'Invalid session payload' });
    }

    const sanitizedKeystrokes = keystrokeData
      .filter(
        (item) =>
          item &&
          (item.type === 'keydown' || item.type === 'keyup') &&
          typeof item.keyCode === 'string' &&
          typeof item.timestamp === 'number'
      )
      .map((item) => ({
        type: item.type,
        keyCode: item.keyCode,
        timestamp: item.timestamp,
        duration: typeof item.duration === 'number' ? item.duration : undefined
      }));

    const sanitizedPastes = pastedEvents
      .filter((item) => item && typeof item.timestamp === 'number' && typeof item.textLength === 'number')
      .map((item) => ({
        timestamp: item.timestamp,
        textLength: item.textLength
      }));

    // Perform AI Behavioral Analysis
    const analysis = analyzeSession(content, sanitizedKeystrokes, sanitizedPastes);

    const session = new Session({
      userId: req.userId,
      content,
      keystrokeData: sanitizedKeystrokes,
      pastedEvents: sanitizedPastes,
      analysis
    });
    
    await session.save();
    res.status(201).json(session);
  } catch (error) {
    console.error('Session save error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const sessions = await Session.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
