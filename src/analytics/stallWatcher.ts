const STALL_THRESHOLD_MS = 3000;
const POLL_MS = 500;

export const createStallWatcher = (readBytes: () => number, thresholdMs = STALL_THRESHOLD_MS) => {
  let lastBytes = readBytes();
  let lastMovedAt = performance.now();
  let stallCount = 0;
  let longestStallMs = 0;
  let inStall = false;

  const timer = window.setInterval(() => {
    const bytes = readBytes();
    const now = performance.now();

    if (bytes > lastBytes) {
      lastBytes = bytes;
      lastMovedAt = now;
      inStall = false;
      return;
    }

    const idleMs = now - lastMovedAt;
    if (idleMs < thresholdMs) return;
    if (!inStall) {
      inStall = true;
      stallCount += 1;
    }
    if (idleMs > longestStallMs) longestStallMs = idleMs;
  }, POLL_MS);

  return {
    stop: () => window.clearInterval(timer),
    summary: () => ({
      stall_count: stallCount,
      longest_stall_ms: Math.round(longestStallMs),
    }),
  };
};
