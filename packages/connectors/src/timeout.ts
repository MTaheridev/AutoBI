import { ConnectorError } from '@autobi/shared';

export async function withQueryTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number | undefined,
  signal?: AbortSignal,
): Promise<T> {
  if (signal?.aborted) {
    throw new ConnectorError('Query aborted');
  }
  if (!timeoutMs || timeoutMs <= 0) {
    return promise;
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;

  try {
    return await new Promise<T>((resolve, reject) => {
      timer = setTimeout(() => {
        reject(new ConnectorError('Query timed out'));
      }, timeoutMs);

      onAbort = () => reject(new ConnectorError('Query aborted'));
      signal?.addEventListener('abort', onAbort, { once: true });

      promise.then(resolve, reject);
    });
  } finally {
    if (timer) clearTimeout(timer);
    if (onAbort && signal) signal.removeEventListener('abort', onAbort);
  }
}
