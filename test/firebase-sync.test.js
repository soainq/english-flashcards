const test = require('node:test');
const assert = require('node:assert/strict');
const Firebase = require('../public/firebase-sync');

const config = {
  apiKey: 'public-key',
  authDomain: 'vocab-test.firebaseapp.com',
  databaseURL: 'https://vocab-test-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'vocab-test',
  appId: '1:123:web:abc'
};

function fakeSDK(initialRemote = null) {
  let remote = initialRemote;
  let authListener;
  const user = { uid: 'user-1', displayName: 'An', email: 'an@example.com' };
  const snapshot = () => ({ val: () => remote });
  const sdk = {
    app: { getApps: () => [], initializeApp: () => ({}) },
    auth: {
      browserLocalPersistence: {},
      getAuth: () => ({}),
      setPersistence: async () => {},
      getRedirectResult: async () => null,
      onAuthStateChanged: (_auth, callback) => { authListener = callback; callback(user); },
      GoogleAuthProvider: class { setCustomParameters() {} },
      signInWithPopup: async () => ({ user }),
      signInWithRedirect: async () => {},
      signOut: async () => authListener(null)
    },
    database: {
      getDatabase: () => ({}),
      ref: (_database, path) => ({ path }),
      runTransaction: async (_ref, update) => {
        remote = update(remote);
        return { committed: true, snapshot: snapshot() };
      }
    }
  };
  return { sdk, remote: () => remote };
}

test('detects whether Firebase has the required public configuration', () => {
  assert.equal(Firebase.isConfigured(config), true);
  assert.equal(Firebase.isConfigured({ apiKey: 'only-one-field' }), false);
  assert.equal(Firebase.parseProgress('{"cards":{}}').cards instanceof Object, true);
  assert.equal(Firebase.parseProgress('<html>'), null);
});

test('atomically merges local and remote progress under the signed-in uid', async () => {
  const remote = { cards: { remote: { learned: true } }, exampleHistory: ['remote'] };
  const local = { cards: { local: { learned: true } }, exampleHistory: ['local'] };
  const fake = fakeSDK(JSON.stringify(remote));
  const received = [];
  const statuses = [];
  const client = Firebase.create({ config, sdkLoader: async () => fake.sdk, online: () => true });
  await client.initialize({
    getLocal: () => local,
    merge: (left, right) => ({
      cards: { ...(right?.cards || {}), ...(left?.cards || {}) },
      exampleHistory: Array.from(new Set([...(right?.exampleHistory || []), ...(left?.exampleHistory || [])]))
    }),
    onRemote: (progress) => received.push(progress),
    onStatus: (status) => statuses.push(status.state)
  });
  await client.syncNow(local);
  const stored = JSON.parse(fake.remote());
  assert.deepEqual(Object.keys(stored.cards).sort(), ['local', 'remote']);
  assert.deepEqual([...stored.exampleHistory].sort(), ['local', 'remote']);
  assert.deepEqual(received.at(-1).cards, stored.cards);
  assert.deepEqual([...received.at(-1).exampleHistory].sort(), ['local', 'remote']);
  assert.equal(statuses.at(-1), 'synced');
  assert.equal(client.currentUser().uid, 'user-1');
  await client.signOut();
  assert.equal(client.currentUser(), null);
});

test('an unconfigured Firebase client remains a safe local-only no-op', async () => {
  const statuses = [];
  const client = Firebase.create({ config: null });
  assert.equal(await client.initialize({ onStatus: (status) => statuses.push(status.state) }), false);
  assert.deepEqual(statuses, ['unconfigured']);
  assert.equal(await client.syncNow({ cards: {} }), false);
});

test('maps Firebase setup and connection errors to useful Vietnamese messages', () => {
  assert.match(Firebase.friendlyError({ code: 'auth/unauthorized-domain' }), /Authorized domains/);
  assert.match(Firebase.friendlyError({ code: 'database/permission-denied' }), /Rules/);
  assert.match(Firebase.friendlyError({ code: 'auth/network-request-failed' }), /thiết bị/);
});
