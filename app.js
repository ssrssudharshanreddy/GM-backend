/**
 * app.js — Express application factory (no server.listen).
 * Exported separately from server.js to allow testing and Render zero-downtime deploys.
 */
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import pinoHttp from 'pino-http';
import { logger } from './src/config/logger.js';
import { env } from './src/config/env.js';
import { errorHandler } from './src/middleware/errorHandler.js';
import { rateLimiter } from './src/middleware/rateLimiter.js';
import router from './src/routes/index.js';

const app = express();

app.use(helmet());
app.use(cors({
  origin: env.CORS_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(compression());
app.use(pinoHttp({ logger }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(rateLimiter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString(), version: process.env.npm_package_version || '1.0.0' });
});

app.use('/api', router);

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

app.use(errorHandler);

export default app;
