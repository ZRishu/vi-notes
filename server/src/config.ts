import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_PORT = 5000;
const DEFAULT_MONGODB_URI = 'mongodb://localhost:27017/vi-notes';
const DEFAULT_FRONTEND_URL = 'http://localhost:5173';
const DEFAULT_JWT_SECRET = 'local-dev-secret-change-me';

const parsePort = (value: string | undefined): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PORT;
};

const parseFrontendUrls = (value: string | undefined): string[] => {
  const raw = value?.trim();
  if (!raw) return [DEFAULT_FRONTEND_URL];

  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

export const serverConfig = {
  port: parsePort(process.env.PORT),
  mongoUri: process.env.MONGODB_URI?.trim() || DEFAULT_MONGODB_URI,
  frontendUrls: parseFrontendUrls(process.env.FRONTEND_URL),
  hasExplicitFrontendUrls: Boolean(process.env.FRONTEND_URL?.trim()),
  jwtSecret: process.env.JWT_SECRET?.trim() || DEFAULT_JWT_SECRET,
} as const;
