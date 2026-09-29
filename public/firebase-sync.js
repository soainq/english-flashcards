(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FirebaseSync = api.create({ config: root.VOCAB_FIREBASE_CONFIG });
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';

  const SDK_VERSION = '12.19.0';
  const MAX_PROGRESS_BYTES = 5_000_000;

  async function loadFirebaseSDK() {
    const base = `https://www.gstatic.com/firebasejs/${SDK_VERSION}`;
    const [app, auth, database] = await Promise.all([
      import(`${base}/firebase-app.js`),
      import(`${base}/firebase-auth.js`),
      import(`${base}/firebase-database.js`)
    ]);
    return { app, auth, database };
  }

  function isConfigured(config) {
    return Boolean(config?.apiKey && config?.authDomain && config?.databaseURL && config?.projectId && config?.appId);
  }

  function parseProgress(value) {
    if (typeof value !== 'string' || !value) return null;
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    } catch { return null; }
  }

  function friendlyError(error) {
    const messages = {
      'auth/popup-closed-by-user': 'Bạn đã đóng cửa sổ đăng nhập Google.',
      'auth/cancelled-popup-request': 'Yêu cầu đăng nhập trước đã bị hủy.',
      'auth/unauthorized-domain': 'Tên miền này chưa được thêm vào Authorized domains trong Firebase Authentication.',
      'auth/operation-not-allowed': 'Hãy bật phương thức đăng nhập Google trong Firebase Authentication.',
      'auth/network-request-failed': 'Không kết nối được Firebase. Tiến độ vẫn được giữ trên thiết bị.',
      'database/permission-denied': 'Firebase từ chối truy cập. Hãy kiểm tra Realtime Database Rules.'
    };
    return messages[error?.code] || error?.message || 'Không thể đồng bộ Firebase lúc này.';
  }

  function create({ config, sdkLoader = loadFirebaseSDK, timer = globalThis, online = () => typeof navigator === 'undefined' || navigator.onLine !== false } = {}) {
    let sdk;
    let auth;
    let database;
    let user = null;
    let progressRef = null;
    let callbacks = {};
    let initPromise = null;
    let saveTimer = null;
    let syncChain = Promise.resolve();
    let lastSynced = '';

    const notify = (state, label, synced = false) => callbacks.onStatus?.({ state, label, synced });

    function schedule(progress) {
      if (!user || !progressRef) return;
      timer.clearTimeout(saveTimer);
      saveTimer = timer.setTimeout(() => enqueue(progress), 650);
    }

    function enqueue(progress) {
      syncChain = syncChain.catch(() => {}).then(() => syncNow(progress));
      return syncChain;
    }

    async function syncNow(progress = callbacks.getLocal?.()) {
      if (!user || !progressRef || !progress) return false;
      if (!online()) {
        notify('offline', 'Chờ có mạng', false);
        return false;
      }
      notify('saving', 'Đang đồng bộ…', false);
      try {
        const result = await sdk.database.runTransaction(progressRef, (remoteValue) => {
          const remote = parseProgress(remoteValue);
          const local = callbacks.getLocal?.() || progress;
          const merged = callbacks.merge(local, remote);
          const serialized = JSON.stringify(merged);
          if (serialized.length > MAX_PROGRESS_BYTES) throw new Error('Dữ liệu tiến độ vượt quá 5 MB.');
          return serialized;
        }, { applyLocally: false });
        if (!result.committed) throw new Error('Firebase chưa ghi nhận thay đổi.');
        const merged = parseProgress(result.snapshot.val());
        const serialized = JSON.stringify(merged);
        if (merged && serialized !== lastSynced) {
          lastSynced = serialized;
          callbacks.onRemote?.(merged);
        }
        notify('synced', 'Đã đồng bộ', true);
        return true;
      } catch (error) {
        notify('error', friendlyError(error), false);
        return false;
      }
    }

    async function initialize(options = {}) {
      callbacks = options;
      if (!isConfigured(config)) {
        notify('unconfigured', 'Chưa cấu hình Firebase', false);
        callbacks.onUser?.(null);
        return false;
      }
      if (initPromise) return initPromise;
      initPromise = (async () => {
        notify('loading', 'Đang kết nối…', false);
        try {
          sdk = await sdkLoader();
          const firebaseApp = sdk.app.getApps().length ? sdk.app.getApp() : sdk.app.initializeApp(config);
          auth = sdk.auth.getAuth(firebaseApp);
          database = sdk.database.getDatabase(firebaseApp);
          await sdk.auth.setPersistence(auth, sdk.auth.browserLocalPersistence);
          await sdk.auth.getRedirectResult(auth).catch(() => null);
          sdk.auth.onAuthStateChanged(auth, (nextUser) => {
            user = nextUser;
            progressRef = user ? sdk.database.ref(database, `users/${user.uid}/progress`) : null;
            callbacks.onUser?.(user ? {
              uid: user.uid,
              displayName: user.displayName || user.email || 'Tài khoản Google',
              email: user.email || '',
              photoURL: user.photoURL || ''
            } : null);
            if (user) enqueue(callbacks.getLocal?.());
            else notify('signed-out', 'Trên máy', false);
          });
          if (typeof window !== 'undefined') {
            window.addEventListener('online', () => user && enqueue(callbacks.getLocal?.()));
            window.addEventListener('focus', () => user && enqueue(callbacks.getLocal?.()));
          }
          return true;
        } catch (error) {
          initPromise = null;
          notify('error', friendlyError(error), false);
          return false;
        }
      })();
      return initPromise;
    }

    async function signIn() {
      if (!await initialize(callbacks)) return false;
      try {
        const provider = new sdk.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        await sdk.auth.signInWithPopup(auth, provider);
        return true;
      } catch (error) {
        if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment'].includes(error?.code)) {
          await sdk.auth.signInWithRedirect(auth, new sdk.auth.GoogleAuthProvider());
          return true;
        }
        notify('error', friendlyError(error), false);
        return false;
      }
    }

    async function signOut() {
      if (!auth || !sdk) return;
      timer.clearTimeout(saveTimer);
      await syncChain.catch(() => {});
      await sdk.auth.signOut(auth);
    }

    return {
      configured: () => isConfigured(config),
      initialize,
      signIn,
      signOut,
      save: schedule,
      syncNow: (progress) => enqueue(progress || callbacks.getLocal?.()),
      currentUser: () => user,
      parseProgress
    };
  }

  return { create, isConfigured, parseProgress, friendlyError, MAX_PROGRESS_BYTES };
});
