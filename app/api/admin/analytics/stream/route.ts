export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { verifyRequest } from '@/lib/server/auth';
import { WatchHistory } from '@/lib/models/watchHistory';
import { onWatchUpdate } from '@/lib/broadcast';
import { totalActiveSessions } from '@/lib/activeSessions';

const enc = new TextEncoder();

function sseData(event: string, payload: unknown): Uint8Array {
  return enc.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
}

function sseComment(): Uint8Array {
  return enc.encode(': keepalive\n\n');
}

export async function GET(req: NextRequest) {
  if (!verifyRequest(req)) {
    return new Response('Unauthorized', { status: 401 });
  }

  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial full stats immediately
      try {
        const stats = await WatchHistory.stats();
        controller.enqueue(sseData('stats', { ...stats, liveNow: totalActiveSessions() }));
      } catch { /* ignore */ }

      // Debounce: merge rapid watch updates into one DB query per 2s
      let debounceTimer: ReturnType<typeof setTimeout> | null = null;
      const sendStats = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
          try {
            const stats = await WatchHistory.stats();
            controller.enqueue(sseData('stats', { ...stats, liveNow: totalActiveSessions() }));
          } catch { /* client may have closed */ }
        }, 2_000);
      };

      const unsub = onWatchUpdate(({ videoId, watchTimeDelta }) => {
        // Also forward raw event so client can update specific video counts
        try {
          controller.enqueue(sseData('watch', { videoId, delta: watchTimeDelta, liveNow: totalActiveSessions() }));
        } catch { /* ignore */ }
        sendStats();
      });

      // Keepalive ping every 25s (nginx default proxy timeout is 60s)
      const keepalive = setInterval(() => {
        try { controller.enqueue(sseComment()); } catch { /* closed */ }
      }, 25_000);

      cleanup = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        clearInterval(keepalive);
        unsub();
        try { controller.close(); } catch { /* already closed */ }
      };

      req.signal.addEventListener('abort', () => cleanup?.());
    },
    cancel() {
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':        'text/event-stream',
      'Cache-Control':       'no-cache, no-transform',
      'Connection':          'keep-alive',
      'X-Accel-Buffering':   'no',   // disable nginx buffering
    },
  });
}
