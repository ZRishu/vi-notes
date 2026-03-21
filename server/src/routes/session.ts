import express from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import Session from '../models/Session.js';

const router = express.Router();

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { content, keystrokeData, pastedEvents } = req.body;
    const session = new Session({
      userId: req.userId,
      content,
      keystrokeData,
      pastedEvents
    });
    await session.save();
    res.status(201).json(session);
  } catch (error) {
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
