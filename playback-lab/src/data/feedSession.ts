let sessionId: string | null = null;

function randomUuid(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** One UUID per app process — matches StreamLux ranked feed shuffle contract. */
export function getFeedSessionId(): string {
  if (!sessionId) sessionId = randomUuid();
  return sessionId;
}

export function resetFeedSessionIdForTests(): void {
  sessionId = null;
}
