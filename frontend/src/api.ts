import { treaty } from '@elysiajs/eden';
import type { App } from '../../backend/src/server';

const client = treaty<App>('localhost:3000');

export const api = client;
