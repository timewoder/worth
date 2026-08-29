const RATE_API = 'https://open.er-api.com/v6/latest/USD';
const SUPPORTED = ['USD', 'CNY', 'EUR', 'GBP', 'JPY', 'KRW', 'AUD', 'CAD', 'SGD', 'HKD', 'TWD'];

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': status === 200 ? 'public, max-age=3600' : 'no-store',
    'X-Content-Type-Options': 'nosniff'
  }
});

async function exchangeRates(request, ctx) {
  const cache = caches.default;
  const cacheKey = new Request(new URL('/api/rates', request.url), request);
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(RATE_API, {
      headers: { Accept: 'application/json', 'User-Agent': 'WorthCalculator/1.0' }
    });
    if (!response.ok) throw new Error(`ExchangeRate-API returned ${response.status}`);

    const source = await response.json();
    if (source.result !== 'success' || !source.rates?.CNY) throw new Error('Invalid exchange-rate response');

    const cnyPerUsd = Number(source.rates.CNY);
    const rates = Object.fromEntries(SUPPORTED.map((code) => [
      code,
      code === 'CNY' ? 1 : cnyPerUsd / Number(source.rates[code])
    ]));
    const result = json({
      provider: 'ExchangeRate-API',
      updated: source.time_last_update_utc,
      next_update: source.time_next_update_utc,
      rates
    });
    ctx.waitUntil(cache.put(cacheKey, result.clone()));
    return result;
  } catch (error) {
    return json({ error: 'rate_provider_unavailable', detail: error.message }, 502);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/rates') return exchangeRates(request, ctx);
    return env.ASSETS.fetch(request);
  }
};
