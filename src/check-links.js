import { assertCatalog } from './validate.js';

export async function checkSourceLinks(catalog, { fetchImpl = fetch } = {}) {
  assertCatalog(catalog);
  const urls = [...new Set(catalog.channels.flatMap(channel => channel.sources.map(source => source.url)))];
  const results = [];
  for (const url of urls) {
    try {
      const response = await fetchImpl(url, {
        method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(5000),
        headers: { Accept: 'text/html', 'User-Agent': 'canales-agua-peru/0.1 (+https://github.com/Richardsch1/canales-agua-peru)' },
      });
      await response.body?.cancel();
      const state = response.status >= 200 && response.status < 300 ? 'reachable' : response.status >= 300 && response.status < 400 ? 'redirect-review' : [401, 403, 418, 429].includes(response.status) ? 'blocked-manual-review' : 'http-review';
      results.push({ url, httpStatus: response.status, state, contentVerified: false });
    } catch { results.push({ url, httpStatus: null, state: 'network-review', contentVerified: false }); }
  }
  return results;
}
