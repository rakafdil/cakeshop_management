import { app } from './app';
import { env } from './config/env';

// Bootstrap Bun.serve — pengganti main.ts pada framework lain.

console.info(`[server] Cakeshop API berjalan di http://localhost:${env.PORT}`);

export default {
  port: env.PORT,
  hostname: env.HOST,
  fetch: app.fetch,
};