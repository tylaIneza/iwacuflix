// In-memory active viewer tracker (per Node.js process)
// A session is "active" if it sent a watch heartbeat within the last 2 minutes.

const TTL = 2 * 60 * 1000; // 2 minutes

interface Entry { videoId: number; lastSeen: number }
const sessions = new Map<string, Entry>();

export function heartbeat(sessionId: string, videoId: number) {
  sessions.set(sessionId, { videoId, lastSeen: Date.now() });
}

export function activeViewers(videoId: number): number {
  const cutoff = Date.now() - TTL;
  let n = 0;
  for (const [, e] of sessions) {
    if (e.videoId === videoId && e.lastSeen > cutoff) n++;
  }
  return n;
}

export function totalActiveSessions(): number {
  const cutoff = Date.now() - TTL;
  let n = 0;
  for (const [, e] of sessions) {
    if (e.lastSeen > cutoff) n++;
  }
  return n;
}

// Clean up stale entries periodically
setInterval(() => {
  const cutoff = Date.now() - TTL;
  for (const [k, e] of sessions) {
    if (e.lastSeen < cutoff) sessions.delete(k);
  }
}, 60_000);
