import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import documentRoutes from './routes/document.js';
import sessionRoutes from './routes/session.js';
import { serverConfig } from './config.js';

const app = express();

const isAllowedDevOrigin = (origin: string): boolean => {
  try {
    const url = new URL(origin);
    return ['localhost', '127.0.0.1'].includes(url.hostname);
  } catch {
    return false;
  }
};

app.use(cors({
  origin(origin, callback) {
    if (
      !origin ||
      serverConfig.frontendUrls.includes(origin) ||
      (!serverConfig.hasExplicitFrontendUrls && isAllowedDevOrigin(origin))
    ) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/sessions', sessionRoutes);

mongoose.connect(serverConfig.mongoUri)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(serverConfig.port, () => {
      console.log(`Server running on port ${serverConfig.port}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });
