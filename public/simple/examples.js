(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ExampleBank = api;
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';
  const API = 'https://api.tatoeba.org';
  const canonical = (text) => String(text).normalize('NFKC').toLowerCase().replace(/[’‘]/g, "'").replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const containsWord = (text, word) => ` ${canonical(text)} `.includes(` ${canonical(word)} `);
  function shuffle(items, random = Math.random) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  function searchURL(word, translated = true) {
    const url = new URL('/v1/sentences', API);
    url.search = new URLSearchParams({ lang: 'eng', q: `"${word.replace(/["\\]/g, '')}"`, sort: 'relevance',
      word_count: '4-14', is_unapproved: 'no', is_orphan: 'no', 'showtrans:lang': 'vie', limit: '100' });
    if (translated) url.searchParams.set('trans:lang', 'vie');
    return url.href;
  }
  function safeNext(value) {
    if (!value) return null;
    const url = new URL(value, API);
    return url.origin === API && url.pathname === '/v1/sentences' ? url.href : null;
  }
  function fromResponse(data, word) {
    if (!Array.isArray(data?.data)) throw new Error('INVALID_EXAMPLES');
    return data.data.filter((item) => item.lang === 'eng' && !item.is_unapproved && Number.isInteger(item.id)
      && typeof item.text === 'string' && item.text.length <= 140 && containsWord(item.text, word))
      .map((item) => ({ text: item.text, source: `https://tatoeba.org/en/sentences/show/${item.id}`,
        author: item.owner || 'Tatoeba contributors', license: item.license || 'CC BY 2.0 FR',
        translations: (item.translations || []).flat().filter((t) => t.lang === 'vie' && !t.is_unapproved)
          .slice(0, 1).map((t) => ({ text: t.text, author: t.owner || 'Tatoeba contributors',
            source: `https://tatoeba.org/en/sentences/show/${Number(t.id)}`, license: t.license || 'CC BY 2.0 FR' })) }));
  }
  // Remove the old fill-in-the-word templates, including templates shared across topics.
  function localPools(items) {
    const skeletons = new Map();
    for (const item of items) for (const text of item.examples || []) {
      const shape = canonical(text).replaceAll(canonical(item.word), '{word}');
      const words = skeletons.get(shape) || new Set();
      words.add(canonical(item.word));
      skeletons.set(shape, words);
    }
    return new Map(items.map((item) => [item.id, (item.examples || []).flatMap((text, index) => {
      const shape = canonical(text).replaceAll(canonical(item.word), '{word}');
      if (skeletons.get(shape).size >= 3 || text.length > 140) return [];
      return [{ text, translation: item.exampleTranslations?.[index] || '', audio: item.exampleAudioPaths?.[index] || '' }];
    })]));
  }
  function create({ storage, seen, remember, items, fetcher = globalThis.fetch, random = Math.random }) {
    const locals = localPools(items);
    const busy = new Map();
    let cache;
    try { cache = JSON.parse(storage.getItem('vocab-example-pools-v1') || '{}'); } catch { cache = {}; }
    if (!cache || typeof cache !== 'object' || Array.isArray(cache)) cache = {};
    function saveCache() {
      const entries = Object.entries(cache).sort((a, b) => b[1].at - a[1].at).slice(0, 30);
      try { storage.setItem('vocab-example-pools-v1', JSON.stringify(Object.fromEntries(entries))); } catch { /* Optional offline cache. */ }
    }
    async function load(item) {
      const key = canonical(item.word);
      const pool = cache[key] || { rows: [], next: searchURL(item.word), fallback: searchURL(item.word, false), at: 0 };
      cache[key] = pool;
      let offline = false;
      const available = () => [...pool.rows, ...(locals.get(item.id) || [])].filter((row) => !seen().includes(canonical(row.text)));
      // Follow documented cursor links. Do not reset history or silently recycle exhausted examples.
      for (let page = 0; page < 3 && available().length < 3 && pool.next; page++) {
        try {
          const response = await fetcher(safeNext(pool.next), { signal: AbortSignal.timeout(8000), credentials: 'omit' });
          if (!response.ok) throw new Error('EXAMPLES_UNAVAILABLE');
          const data = await response.json();
          pool.rows = Array.from(new Map([...pool.rows, ...fromResponse(data, item.word)].map((row) => [canonical(row.text), row])).values());
          pool.next = safeNext(data.paging?.next);
          if (!pool.next && pool.fallback) { pool.next = pool.fallback; pool.fallback = null; }
          pool.rows = pool.rows.filter((row) => !seen().includes(canonical(row.text)));
        } catch { offline = true; break; }
      }
      const candidates = Array.from(new Map(available().map((row) => [canonical(row.text), row])).values());
      const translated = (row) => row.translation || row.translations?.length;
      const rows = [...shuffle(candidates.filter(translated), random), ...shuffle(candidates.filter((row) => !translated(row)), random)].slice(0, 3);
      pool.at = Date.now();
      saveCache();
      return { rows, offline, exhausted: !pool.next, more: Boolean(pool.next || candidates.length > rows.length) };
    }
    return {
      async get(item) {
        if (!busy.has(item.id)) busy.set(item.id, load(item).finally(() => busy.delete(item.id)));
        return busy.get(item.id);
      },
      commit(rows) { remember(rows.map((row) => canonical(row.text))); }
    };
  }
  return { create, canonical, containsWord, localPools, fromResponse, searchURL, safeNext, shuffle };
});
