import express from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import Document from '../models/Document.js';

const router = express.Router();

const sanitizeKeystrokes = (keystrokeData: unknown) =>
  Array.isArray(keystrokeData)
    ? keystrokeData
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
        }))
    : [];

const sanitizePastes = (pastedEvents: unknown) =>
  Array.isArray(pastedEvents)
    ? pastedEvents
        .filter((item) => item && typeof item.timestamp === 'number' && typeof item.textLength === 'number')
        .map((item) => ({
          timestamp: item.timestamp,
          textLength: item.textLength
        }))
    : [];

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const documents = await Document.find({ userId: req.userId }).sort({ updatedAt: -1 });
    res.json(documents);
  } catch (error) {
    console.error('Document list error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const {
      title,
      content = '',
      htmlContent = '',
      pageContents = [''],
      editorPreferences = {},
      keystrokeData = [],
      pastedEvents = []
    } = req.body;

    const document = new Document({
      userId: req.userId,
      title: typeof title === 'string' && title.trim() ? title.trim() : 'Untitled Document',
      content: typeof content === 'string' ? content : '',
      htmlContent: typeof htmlContent === 'string' ? htmlContent : '',
      pageContents: Array.isArray(pageContents) ? pageContents.filter((page) => typeof page === 'string') : [''],
      editorPreferences: typeof editorPreferences === 'object' && editorPreferences ? editorPreferences : {},
      keystrokeData: sanitizeKeystrokes(keystrokeData),
      pastedEvents: sanitizePastes(pastedEvents)
    });

    await document.save();
    res.status(201).json(document);
  } catch (error) {
    console.error('Document create error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, userId: req.userId });
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    res.json(document);
  } catch (error) {
    console.error('Document fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const {
      title,
      content,
      htmlContent,
      pageContents,
      editorPreferences,
      keystrokeData,
      pastedEvents,
      lastAnalysis
    } = req.body;

    const update: Record<string, unknown> = {};
    if (typeof title === 'string') update.title = title;
    if (typeof content === 'string') update.content = content;
    if (typeof htmlContent === 'string') update.htmlContent = htmlContent;
    if (Array.isArray(pageContents)) update.pageContents = pageContents.filter((page) => typeof page === 'string');
    if (typeof editorPreferences === 'object' && editorPreferences) update.editorPreferences = editorPreferences;
    if (keystrokeData) update.keystrokeData = sanitizeKeystrokes(keystrokeData);
    if (pastedEvents) update.pastedEvents = sanitizePastes(pastedEvents);
    if (typeof lastAnalysis === 'object' && lastAnalysis) update.lastAnalysis = lastAnalysis;

    const document = await Document.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      update,
      { new: true }
    );

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    res.json(document);
  } catch (error) {
    console.error('Document update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
