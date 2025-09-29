import { config } from 'dotenv';

config();

export const PORT = Number(process.env.PORT ?? 3333);
export const WEB_ORIGIN = process.env.WEB_ORIGIN ?? 'http://localhost:5173';
export const DATABASE_URL = process.env.DATABASE_URL ?? 'file:./dev.db';
export const DATABASE_PROVIDER = process.env.DATABASE_PROVIDER ?? 'sqlite';
