(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Recall = api;
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';
  function normalizeAnswer(value) {
    return String(value).normalize('NFKC').trim().toLowerCase()
      .replace(/[’‘]/g, "'").replace(/[‐‑–—]/g, '-').replace(/\s+/g, ' ');
  }
  function mask(word) {
    return Array.from(word).map((letter) => /[\p{L}\p{N}]/u.test(letter) ? '_' : letter).join('');
  }
  function submit(previous = {}, answer, word, at = new Date().toISOString()) {
    if (previous.needsStudy || !normalizeAnswer(answer)) return previous;
    if (normalizeAnswer(answer) === normalizeAnswer(word)) {
      return { attempts: 0, needsStudy: false, passedAt: at, updatedAt: at };
    }
    const attempts = Math.min(3, (Number(previous.attempts) || 0) + 1);
    return { ...previous, attempts, needsStudy: attempts >= 3, updatedAt: at };
  }
  function restudied(previous, at = new Date().toISOString()) {
    return { ...previous, attempts: 0, needsStudy: false, updatedAt: at };
  }
  return { normalizeAnswer, mask, submit, restudied };
});
