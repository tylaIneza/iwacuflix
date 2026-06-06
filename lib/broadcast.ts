import { EventEmitter } from 'events';

// Module-level singleton — shared across all requests in the same Node.js process (PM2)
const emitter = new EventEmitter();
emitter.setMaxListeners(200);

export interface WatchPayload {
  videoId:        number;
  sessionId:      string;
  watchTimeDelta: number;
}

export function emitWatchUpdate(payload: WatchPayload) {
  emitter.emit('watch', payload);
}

export function onWatchUpdate(handler: (p: WatchPayload) => void): () => void {
  emitter.on('watch', handler);
  return () => emitter.off('watch', handler);
}
