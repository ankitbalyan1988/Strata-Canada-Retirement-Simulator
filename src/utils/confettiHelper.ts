/**
 * Dynamically loads and triggers canvas-confetti on demand
 * to keep the library out of the critical path and initial bundle chunk.
 */
export async function triggerConfetti(options?: {
  particleCount?: number;
  spread?: number;
  origin?: { x?: number; y?: number };
}): Promise<void> {
  try {
    const confettiModule = await import('canvas-confetti');
    const confetti = confettiModule.default || confettiModule;
    confetti(options);
  } catch (e) {
    // Non-blocking in headless/test environments
  }
}
