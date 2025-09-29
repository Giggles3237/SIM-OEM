import request from 'supertest';
import express from 'express';
import { SimService } from '../simService.js';
import type { PrismaClient } from '@prisma/client';

describe('Sim API', () => {
  it('returns validation error when plan invalid', async () => {
    const prisma = {
      simConfig: { findFirst: async () => null },
      trim: { findMany: async () => [] },
      market: { findMany: async () => [] },
      plant: { findMany: async () => [] },
    } as unknown as PrismaClient;
    const service = new SimService(prisma);
    const app = express();
    app.use(express.json());
    app.post('/api/actions/plan', async (req, res) => {
      try {
        const plan = await service.submitPlan(req.body);
        res.json({ plan });
      } catch (error: any) {
        res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error.message } });
      }
    });

    const response = await request(app).post('/api/actions/plan').send({ pricing: [{}] });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
