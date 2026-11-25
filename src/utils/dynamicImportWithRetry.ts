/**
 * Wraps a Vite dynamic `import()` thunk with a brief automatic retry so transient
 * network hiccups or Vite dev-server dep re-optimization responses recover seamlessly.
 */
export async function dynamicImportWithRetry<T>(
  loader: () => Promise<T>,
  maxRetries = 2,
  delayMs = 350
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await loader();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
      }
    }
  }
  throw lastError;
}
