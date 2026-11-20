import express from 'express';
import type { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createApp } from './server/app.js';
import { isAuthConfigured } from './server/security.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  // সব API রুট ও নিরাপত্তা server/app.ts-এ
  const app = createApp();

  if (!isAuthConfigured()) {
    console.warn(
      '[Dhamti Server] ADMIN_PASSWORD সেট করা নেই, তাই অ্যাডমিন লগইন বন্ধ আছে। .env.example দেখুন।'
    );
  }

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const dist = path.resolve(__dirname, 'dist');
    app.use(
      express.static(dist, {
        index: false,
        setHeaders(res, filePath) {
          // Vite-এর হ্যাশ করা ফাইল ১ বছর ক্যাশ হতে পারে
          if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          } else {
            res.setHeader('Cache-Control', 'public, max-age=86400');
          }
        },
      })
    );
    app.get('*', (_req: Request, res: Response) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.resolve(dist, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Dhamti Server] Listening on http://0.0.0.0:${PORT} (${isProd ? 'Production' : 'Development'})`);
  });
}

startServer().catch((err) => {
  console.error('[Dhamti Server] Fatal error starting server:', err);
  process.exit(1);
});
