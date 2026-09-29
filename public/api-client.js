(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SyncAPI = api;
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';
  const unavailable = 'Địa chỉ này không có máy chủ đồng bộ. GitHub Pages chỉ lưu trên thiết bị. Hãy nhập địa chỉ máy chủ Vocab hoặc dùng tệp sao lưu bên dưới.';
  function serverOrigin(value) {
    const url = new URL(value);
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/') {
      throw new Error('Chỉ nhập địa chỉ gốc của máy chủ, ví dụ https://vocab.example.com.');
    }
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) {
      throw new Error('Máy chủ đồng bộ cần dùng HTTPS (localhost có thể dùng HTTP).');
    }
    return url.origin;
  }
  async function readJSON(response) {
    const text = await response.text();
    if (!/\bapplication\/(?:[\w.-]+\+)?json\b/i.test(response.headers.get('content-type') || '') || /^\s*</.test(text)) {
      throw new Error(unavailable);
    }
    let data;
    try { data = JSON.parse(text); } catch { throw new Error('Máy chủ trả về dữ liệu không hợp lệ. Hãy thử lại sau.'); }
    if (!response.ok) {
      const error = new Error(typeof data?.error === 'string' ? data.error : `Không thể đồng bộ (HTTP ${response.status}).`);
      error.status = response.status;
      throw error;
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Máy chủ trả về dữ liệu không hợp lệ.');
    return data;
  }
  function create({ origin = '', token = '', fetcher = globalThis.fetch } = {}) {
    return async function request(path, options = {}) {
      let response;
      try {
        response = await fetcher(`${origin}/api/${path}`, {
          ...options, cache: 'no-store', credentials: origin ? 'omit' : 'same-origin',
          signal: AbortSignal.timeout(12000),
          headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }
        });
      } catch {
        throw new Error('Không kết nối được máy chủ. Kiểm tra mạng, địa chỉ máy chủ và cấu hình cho phép kết nối từ trang này.');
      }
      return readJSON(response);
    };
  }
  return { create, readJSON, serverOrigin, unavailable };
});
