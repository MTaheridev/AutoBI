import http from 'node:http';
import https from 'node:https';
import tls from 'node:tls';

export interface SimpleResponse {
  ok: boolean;
  status: number;
  text(): Promise<string>;
  json(): Promise<unknown>;
}

function getProxyUrl(targetUrl: string): string | undefined {
  const parsed = new URL(targetUrl);
  const host = parsed.hostname.toLowerCase();
  const noProxy = (process.env.NO_PROXY ?? process.env.no_proxy ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    noProxy.some((entry) => entry === '*' || host === entry || host.endsWith(`.${entry}`))
  ) {
    return undefined;
  }
  if (parsed.protocol === 'https:') {
    return (
      process.env.HTTPS_PROXY ??
      process.env.https_proxy ??
      process.env.HTTP_PROXY ??
      process.env.http_proxy
    );
  }
  return process.env.HTTP_PROXY ?? process.env.http_proxy;
}

/**
 * Use global `fetch` when mocked in tests or when no proxy env var is set;
 * otherwise tunnel HTTPS through `HTTPS_PROXY` via HTTP CONNECT so Node
 * servers started without `--use-env-proxy` still reach external AI APIs.
 */
export async function smartFetch(
  url: string,
  init: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
): Promise<SimpleResponse> {
  const isMockedFetch =
    typeof globalThis.fetch === 'function' && 'mock' in globalThis.fetch;
  const proxyRaw = getProxyUrl(url);

  if (isMockedFetch || !proxyRaw || process.env.NODE_USE_ENV_PROXY === '1') {
    const res = await fetch(url, init);
    return {
      ok: res.ok,
      status: res.status,
      text: () => res.text(),
      json: () => res.json(),
    };
  }

  const target = new URL(url);
  const proxy = new URL(proxyRaw);
  const targetPort = Number(target.port || (target.protocol === 'https:' ? 443 : 80));
  const proxyPort = Number(proxy.port || 80);

  return new Promise<SimpleResponse>((resolve, reject) => {
    if (init.signal?.aborted) {
      reject(new Error('Request aborted'));
      return;
    }

    const connectReq = http.request({
      host: proxy.hostname,
      port: proxyPort,
      method: 'CONNECT',
      path: `${target.hostname}:${targetPort}`,
      headers: {
        Host: `${target.hostname}:${targetPort}`,
        ...(proxy.username
          ? {
              'Proxy-Authorization': `Basic ${Buffer.from(
                `${decodeURIComponent(proxy.username)}:${decodeURIComponent(proxy.password)}`,
              ).toString('base64')}`,
            }
          : {}),
      },
    });

    const onAbort = () => {
      connectReq.destroy(new Error('Request aborted'));
    };
    init.signal?.addEventListener('abort', onAbort, { once: true });

    connectReq.on('error', (err) => {
      init.signal?.removeEventListener('abort', onAbort);
      reject(err);
    });

    connectReq.on('connect', (res, socket) => {
      if (res.statusCode !== 200) {
        init.signal?.removeEventListener('abort', onAbort);
        socket.destroy();
        reject(new Error(`Proxy CONNECT failed (${res.statusCode ?? 0})`));
        return;
      }

      const tlsSocket = tls.connect({
        socket,
        servername: target.hostname,
      });

      const bodyBuf = init.body ? Buffer.from(init.body, 'utf8') : undefined;
      const req = https.request(
        {
          hostname: target.hostname,
          port: targetPort,
          path: `${target.pathname}${target.search}`,
          method: init.method ?? 'GET',
          headers: {
            ...(init.headers ?? {}),
            ...(bodyBuf ? { 'Content-Length': String(bodyBuf.byteLength) } : {}),
          },
          createConnection: () => tlsSocket,
        },
        (httpsRes) => {
          const chunks: Buffer[] = [];
          httpsRes.on('data', (c: Buffer) => chunks.push(c));
          httpsRes.on('end', () => {
            init.signal?.removeEventListener('abort', onAbort);
            const rawText = Buffer.concat(chunks).toString('utf8');
            const status = httpsRes.statusCode ?? 500;
            resolve({
              ok: status >= 200 && status < 300,
              status,
              text: async () => rawText,
              json: async () => JSON.parse(rawText) as unknown,
            });
          });
          httpsRes.on('error', (err) => {
            init.signal?.removeEventListener('abort', onAbort);
            reject(err);
          });
        },
      );

      req.on('error', (err) => {
        init.signal?.removeEventListener('abort', onAbort);
        reject(err);
      });

      if (bodyBuf) req.write(bodyBuf);
      req.end();
    });

    connectReq.end();
  });
}
