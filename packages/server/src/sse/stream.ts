import { Router, type Router as IRouter, Request, Response } from 'express';
import { authenticateSDK } from '../middleware/auth.js';
import { getPublisherClient } from './publisher.js';

const router: IRouter = Router();

// SDK auth — validates X-API-Key and attaches req.environment
router.use(authenticateSDK);

// ---------------------------------------------------------------------------
// GET /stream — Server-Sent Events endpoint
// ---------------------------------------------------------------------------

router.get('/stream', (req: Request, res: Response) => {
  // SSE response headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Send initial heartbeat
  res.write('event: heartbeat\ndata: {}\n\n');

  // Create a per-connection subscriber by duplicating the publisher client
  const subscriber = getPublisherClient().duplicate();
  const channel = `flag-updates:${req.environment!.key}`;

  subscriber.subscribe(channel).catch((err) => {
    console.error('SSE subscribe error:', err);
  });

  subscriber.on('message', (_ch: string, message: string) => {
    try {
      const event = JSON.parse(message) as { type: string; data: unknown };
      res.write(`event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`);
    } catch {
      // Ignore malformed messages
    }
  });

  // Heartbeat every 30 seconds to keep connection alive through proxies
  const heartbeatInterval = setInterval(() => {
    res.write('event: heartbeat\ndata: {}\n\n');
  }, 30_000);

  // Cleanup on client disconnect
  req.on('close', () => {
    clearInterval(heartbeatInterval);
    subscriber.unsubscribe(channel).catch(() => {});
    subscriber.quit().catch(() => {});
  });
});

export default router;
