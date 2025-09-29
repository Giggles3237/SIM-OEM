import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { PORT, WEB_ORIGIN } from './env.js';
import { SimService } from './simService.js';
import { openApiSpec } from './openapi.js';
import createHttpError from 'http-errors';

const prisma = new PrismaClient();
const service = new SimService(prisma);
const app = express();

app.use(express.json());
app.use(cors({ origin: WEB_ORIGIN }));

app.get('/openapi.json', (_req, res) => {
  res.json(openApiSpec);
});

app.get('/api/sim/config', async (_req, res) => {
  const cfg = await service.getConfig();
  res.json(cfg);
});

app.post('/api/sim/new', async (_req, res) => {
  const snapshot = await service.startNewSim();
  res.json(snapshot);
});

app.post('/api/actions/plan', async (req, res) => {
  try {
    const plan = await service.submitPlan(req.body);
    res.json({ plan });
  } catch (error: any) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error.message } });
  }
});

app.post('/api/sim/tick', async (_req, res, next) => {
  try {
    const snapshot = await service.advanceTick();
    res.json(snapshot);
  } catch (error) {
    next(error);
  }
});

app.get('/api/sim/state', async (_req, res) => {
  const state = await service.getActiveState();
  res.json(state ?? null);
});

app.get('/api/sim/history', async (req, res) => {
  const from = req.query.from ? Number(req.query.from) : undefined;
  const to = req.query.to ? Number(req.query.to) : undefined;
  const history = await service.history(from, to);
  res.json(history);
});

app.post('/api/save', async (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/save', async (_req, res) => {
  res.json([]);
});

app.post('/api/load', async (_req, res) => {
  const snapshot = await service.startNewSim();
  res.json(snapshot);
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (createHttpError.isHttpError(err)) {
    res.status(err.status).json({ error: { code: err.name, message: err.message } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error' } });
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
