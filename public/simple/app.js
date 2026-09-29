(function () {
  'use strict';

  const content = window.SIMPLE_CONTENT;
  const openTopics = window.OPEN_VOCABULARY?.curriculum || [];
  const curriculum = [...content.curriculum, ...openTopics].map((topic) => ({
    ...topic,
    days: topic.days.map((day, dayIndex) => ({
      ...day,
      words: day.words.map((word) => ({
        ...word,
        topicId: topic.id,
        topic: topic.title,
        category: word.category || topic.category || 'Đời sống',
        subtopic: word.subtopic || day.title,
        introducedDay: Number.isInteger(word.introducedDay) ? word.introducedDay : dayIndex
      }))
    }))
  }));
  const allItems = curriculum.flatMap((topic) => topic.days.flatMap((day) => day.words));
  const allWords = new Map(allItems.map((item) => [item.id, item]));

  document.documentElement.dataset.curriculumTopics = String(curriculum.length);
  document.documentElement.dataset.openVocabularyWords = String(openTopics.flatMap((topic) => topic.days.flatMap((day) => day.words)).length);

  const STORAGE_KEY = 'daily-deck-progress-v2';
  const PROFILE_KEY = 'fluent-uiux-profile-v1';
  const AUDIO_SPEED_KEY = 'vocab-audio-speed-v1';
  const STATE_VERSION = 4;
  const NEW_WORDS_PER_DAY = 10;
  const WEEKLY_NEW_WORDS = 70;
  const TOPIC_PLAN_VERSION = 'weekly-queues-v4';
  const AUDIO_SPEEDS = [0.5, 0.75, 1];
  const voiceIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 10H2v4h3l4 3V7zm8-1a4 4 0 0 1 0 6m2-9a8 8 0 0 1 0 12"/></svg>';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  let state = loadState();
  let profile = parseJson(localStorage.getItem(PROFILE_KEY), null);
  let activeIndex = 0;
  let revealed = false;
  let studyMode = 'new';
  let sessionDate = '';
  let sessionQueues = { new: [], review: [] };
  let sessionReviewTargets = new Set();
  let sessionComplete = false;
  let studyTransitioning = false;
  let studyTransitionToken = 0;
  let cardFilter = 'all';
  let cardStatusFilter = 'all';
  let cardSearch = '';
  let deckIndex = 0;
  let currentDeckCards = [];
  let deckPointer = null;
  let deckDidDrag = false;
  let selectedWeek = weekKey(new Date());
  let syncTimer = null;
  let currentAudio = null;
  let currentAudioId = '';
  let audioState = 'idle';
  const storedAudioSpeed = Number(localStorage.getItem(AUDIO_SPEED_KEY));
  let audioSpeed = AUDIO_SPEEDS.includes(storedAudioSpeed) ? storedAudioSpeed : 0.75;
  let toastActionCallback = null;
  let quiz = null;
  let syncInFlight = null;
  let syncGeneration = 0;
  let cloudUser = null;
  let cloudState = 'idle';
  const SYNC_SERVER_KEY = 'vocab-sync-server-v1';
  const isPages = location.hostname.endsWith('.github.io');
  const examples = window.ExampleBank.create({
    storage: localStorage, items: allItems, seen: () => state.exampleHistory,
    remember: (keys) => { state.exampleHistory = Array.from(new Set([...state.exampleHistory, ...keys])); persist(); }
  });

  function parseJson(value, fallback) {
    try { return JSON.parse(value); } catch { return fallback; }
  }

  function freshState() {
    return { version: STATE_VERSION, daily: {}, cards: {}, recalls: {}, exampleHistory: [], updatedAt: new Date().toISOString() };
  }

  function localDate(date = new Date()) {
    const copy = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return copy.toISOString().slice(0, 10);
  }

  function dateFromKey(key) {
    return new Date(`${key}T12:00:00`);
  }

  function startOfWeek(date) {
    const copy = new Date(date);
    copy.setHours(12, 0, 0, 0);
    copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7));
    return copy;
  }

  function weekKey(date) {
    return localDate(startOfWeek(date));
  }

  function addDays(date, amount) {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + amount);
    return copy;
  }

  function topicForDate(dateKey) {
    const monday = weekKey(dateFromKey(dateKey));
    const [year, month, day] = monday.split('-').map(Number);
    const serialWeek = Math.floor(Date.UTC(year, month - 1, day) / 604_800_000);
    const planStartWeek = Math.floor(Date.UTC(2026, 8, 21) / 604_800_000);
    const index = ((serialWeek - planStartWeek) % curriculum.length + curriculum.length) % curriculum.length;
    return curriculum[index];
  }

  function planForDate(dateKey) {
    const date = dateFromKey(dateKey);
    const dayIndex = (date.getDay() + 6) % 7;
    const topic = topicForDate(dateKey);
    const newWords = topic.days[dayIndex].words;
    const reviewWords = topic.days.slice(0, dayIndex).flatMap((day) => day.words);
    return { topic, dayIndex, newWords, reviewWords, words: [...newWords, ...reviewWords] };
  }

  function normalizeState(saved) {
    const next = freshState();
    if (!saved || typeof saved !== 'object') return next;
    next.updatedAt = saved.updatedAt || next.updatedAt;
    next.exampleHistory = Array.isArray(saved.exampleHistory) ? Array.from(new Set(saved.exampleHistory.filter((value) => typeof value === 'string' && value.length <= 200))) : [];
    Object.entries(saved.recalls || {}).forEach(([id, recall]) => {
      if (allWords.has(id) && recall && typeof recall === 'object') next.recalls[id] = {
        attempts: Math.max(0, Math.min(3, Number(recall.attempts) || 0)), needsStudy: Boolean(recall.needsStudy),
        passedAt: recall.passedAt || null, updatedAt: recall.updatedAt || new Date(0).toISOString()
      };
    });

    Object.entries(saved.daily || {}).forEach(([date, rawEntry]) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !rawEntry) return;
      let fallbackPlan;
      try { fallbackPlan = planForDate(date); } catch { return; }
      const learned = Array.from(new Set(rawEntry.learned || [])).filter((id) => allWords.has(id));
      const again = Array.from(new Set(rawEntry.again || [])).filter((id) => allWords.has(id));
      const reviewIds = new Set(fallbackPlan.reviewWords.map((item) => item.id));
      const reviewed = Array.from(new Set(rawEntry.reviewed || learned.filter((id) => reviewIds.has(id)))).filter((id) => allWords.has(id));
      const answers = { ...(rawEntry.answers || {}) };
      learned.forEach((id) => {
        if (!answers[id]) answers[id] = { result: 'known', at: rawEntry.updatedAt || `${date}T12:00:00.000Z` };
      });
      again.forEach((id) => {
        if (!answers[id]) answers[id] = { result: 'again', at: rawEntry.updatedAt || `${date}T12:00:00.000Z` };
      });
      next.daily[date] = {
        ...rawEntry,
        words: (rawEntry.words || fallbackPlan.words.map((item) => item.id)).filter((id) => allWords.has(id)),
        newWords: (rawEntry.newWords || fallbackPlan.newWords.map((item) => item.id)).filter((id) => allWords.has(id)),
        learned,
        again,
        reviewed,
        difficult: Array.from(new Set(rawEntry.difficult || again)).filter((id) => allWords.has(id)),
        answers,
        topicId: rawEntry.topicId || fallbackPlan.topic.id,
        dayIndex: Number.isInteger(rawEntry.dayIndex) ? rawEntry.dayIndex : fallbackPlan.dayIndex,
        updatedAt: rawEntry.updatedAt || `${date}T12:00:00.000Z`
      };

      learned.forEach((id) => {
        const item = allWords.get(id);
        if (!item || next.cards[id]) return;
        next.cards[id] = {
          id,
          topicId: item.topicId,
          introducedDay: item.introducedDay,
          learnedAt: `${date}T12:00:00.000Z`,
          learnedWeek: weekKey(dateFromKey(date)),
          lastReviewed: `${date}T12:00:00.000Z`,
          nextReview: localDate(addDays(dateFromKey(date), 1)),
          intervalDays: 1,
          learned: true,
          difficulty: 'learning',
          updatedAt: rawEntry.updatedAt || `${date}T12:00:00.000Z`
        };
      });
    });

    Object.entries(saved.cards || {}).forEach(([id, card]) => {
      const item = allWords.get(id);
      if (!item || !card) return;
      next.cards[id] = {
        ...next.cards[id],
        ...card,
        id,
        topicId: card.topicId || item.topicId,
        introducedDay: Number.isInteger(card.introducedDay) ? card.introducedDay : item.introducedDay,
        learnedWeek: card.learnedWeek || weekKey(dateFromKey(localDate(new Date(card.learnedAt || Date.now()))))
      };
    });
    return next;
  }

  function loadState() {
    return normalizeState(parseJson(localStorage.getItem(STORAGE_KEY), null));
  }

  function latestValue(left, right) {
    if (!left) return right;
    if (!right) return left;
    return new Date(right.updatedAt || right.at || 0) >= new Date(left.updatedAt || left.at || 0) ? right : left;
  }

  function mergeDailyEntry(base = {}, incoming = {}) {
    const answers = { ...(base.answers || {}) };
    Object.entries(incoming.answers || {}).forEach(([id, answer]) => { answers[id] = latestValue(answers[id], answer); });
    const learned = new Set([...(base.learned || []), ...(incoming.learned || [])]);
    const again = new Set([...(base.again || []), ...(incoming.again || [])]);
    const reviewed = new Set([...(base.reviewed || []), ...(incoming.reviewed || [])]);
    Object.entries(answers).forEach(([id, answer]) => {
      if (answer.result === 'known') { learned.add(id); again.delete(id); }
      if (answer.result === 'again') again.add(id);
      if (answer.result === 'failed') { learned.delete(id); reviewed.delete(id); again.add(id); }
    });
    const newer = latestValue(base, incoming) || incoming;
    return {
      ...base,
      ...incoming,
      words: newer.words?.length ? newer.words : (base.words || incoming.words || []),
      newWords: newer.newWords?.length ? newer.newWords : (base.newWords || incoming.newWords || []),
      learned: Array.from(learned),
      again: Array.from(again),
      reviewed: Array.from(reviewed),
      difficult: Array.from(new Set([...(base.difficult || []), ...(incoming.difficult || [])])),
      answers,
      updatedAt: newer.updatedAt || new Date().toISOString()
    };
  }

  function mergeState(local, remote) {
    const left = normalizeState(local);
    const right = normalizeState(remote);
    const daily = { ...left.daily };
    Object.entries(right.daily).forEach(([date, entry]) => { daily[date] = mergeDailyEntry(daily[date], entry); });
    const cards = { ...left.cards };
    Object.entries(right.cards).forEach(([id, card]) => { cards[id] = latestValue(cards[id], card); });
    const recalls = { ...left.recalls };
    Object.entries(right.recalls).forEach(([id, recall]) => { recalls[id] = latestValue(recalls[id], recall); });
    return { version: STATE_VERSION, daily, cards, recalls,
      exampleHistory: Array.from(new Set([...left.exampleHistory, ...right.exampleHistory])), updatedAt: new Date().toISOString() };
  }

  function learnedCount(entry) {
    if (!entry) return 0;
    const currentWords = new Set(entry.words || []);
    return (entry.learned || []).filter((id) => currentWords.has(id)).length;
  }

  function ensureToday() {
    const today = localDate();
    const plan = planForDate(today);
    const validIds = new Set(plan.words.map((item) => item.id));
    const existing = state.daily[today];
    if (!existing || existing.planVersion !== TOPIC_PLAN_VERSION || existing.topicId !== plan.topic.id) {
      const answers = Object.fromEntries(Object.entries(existing?.answers || {}).filter(([id]) => validIds.has(id)));
      state.daily[today] = {
        ...existing,
        words: plan.words.map((item) => item.id),
        newWords: plan.newWords.map((item) => item.id),
        learned: (existing?.learned || []).filter((id) => validIds.has(id)),
        again: (existing?.again || []).filter((id) => validIds.has(id)),
        reviewed: (existing?.reviewed || []).filter((id) => validIds.has(id)),
        difficult: (existing?.difficult || []).filter((id) => validIds.has(id)),
        answers,
        topicId: plan.topic.id,
        dayIndex: plan.dayIndex,
        planVersion: TOPIC_PLAN_VERSION,
        openedAt: existing?.openedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      persist();
    }
    return state.daily[today];
  }

  function persist(sync = true) {
    state.version = STATE_VERSION;
    state.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (sync && profile && (!isPages || profile.server)) scheduleSync();
    if (sync) window.FirebaseSync?.save(state);
    renderNavigation();
  }

  function scheduleSync() {
    clearTimeout(syncTimer);
    setSyncStatus('Đang lưu…', false);
    syncTimer = setTimeout(syncProgress, 500);
  }

  function syncClient(target = profile) {
    return window.SyncAPI.create({ origin: target?.server || '', token: target?.token || '' });
  }

  async function syncProgress() {
    if (syncInFlight) { await syncInFlight; return syncProgress(); }
    if (!profile || !navigator.onLine || (isPages && !profile.server)) { setSyncStatus('Trên máy', false); return false; }
    const generation = syncGeneration;
    syncInFlight = (async () => {
      try {
        const result = await syncClient()('simple-progress', { method: 'PUT', body: JSON.stringify({ progress: state }) });
        if (generation !== syncGeneration) return false;
        if (!result.progress || typeof result.progress !== 'object') throw new Error('Không nhận được tiến độ từ máy chủ.');
        state = mergeState(state, result.progress);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        setSyncStatus('Đã lưu', true);
        return true;
      } catch (error) {
        if (generation === syncGeneration) setSyncStatus(error.status === 401 ? 'Đăng nhập' : 'Chưa đồng bộ', false);
        return false;
      } finally { syncInFlight = null; }
    })();
    return syncInFlight;
  }

  function setSyncStatus(label, synced) {
    $('#syncText').textContent = label;
    $('#profileButton').classList.toggle('synced', synced);
    $('#profileButton').setAttribute('aria-label', `${label} — hồ sơ và đồng bộ`);
  }

  function renderCloudControls() {
    const configured = Boolean(window.FirebaseSync?.configured());
    const button = $('#googleSyncButton');
    button.disabled = !configured || cloudState === 'loading' || cloudState === 'saving';
    button.textContent = cloudUser ? (cloudState === 'saving' ? 'Đang đồng bộ…' : 'Đồng bộ ngay') : 'Đăng nhập Google';
    $('#cloudLogoutButton').classList.toggle('hidden', !cloudUser);
    $('#cloudAccount').textContent = cloudUser
      ? `${cloudUser.displayName}${cloudUser.email ? ` · ${cloudUser.email}` : ''}`
      : configured ? 'Đăng nhập cùng tài khoản trên mọi thiết bị.' : 'Chưa có thông tin kết nối Firebase.';
    $('#syncAvailability').textContent = configured
      ? 'Tiến độ luôn được giữ trên thiết bị. Khi có mạng, lịch sử được hợp nhất với Firebase và các thiết bị khác.'
      : 'Chưa cấu hình Firebase. Làm theo mục “Đồng bộ Firebase” trong README; trong lúc đó bạn vẫn có thể chuyển tiến độ bằng tệp sao lưu.';
  }

  function applyCloudProgress(remote) {
    state = mergeState(state, remote);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    sessionDate = '';
    renderNavigation();
    if (!$('#quizDialog').open && !$('#profileDialog').open) {
      const view = document.body.dataset.activeView || 'today';
      if (view === 'today') renderToday();
      if (view === 'cards') renderCards();
      if (view === 'week') renderWeek();
    }
  }

  function initializeCloudSync() {
    renderCloudControls();
    window.FirebaseSync?.initialize({
      getLocal: () => state,
      merge: mergeState,
      onRemote: applyCloudProgress,
      onUser: (user) => {
        cloudUser = user;
        renderCloudControls();
      },
      onStatus: ({ state: nextState, label, synced }) => {
        cloudState = nextState;
        const message = $('#cloudMessage');
        message.textContent = label;
        message.classList.toggle('error', nextState === 'error');
        message.classList.toggle('success', nextState === 'synced');
        if (cloudUser || ['loading', 'saving', 'synced'].includes(nextState)) setSyncStatus(label, synced);
        renderCloudControls();
      }
    });
  }

  function showToast(text, options = {}) {
    const toast = $('#toast');
    const action = $('#toastAction');
    $('#toastText').textContent = text;
    toastActionCallback = options.action || null;
    action.textContent = options.actionLabel || '';
    action.classList.toggle('hidden', !toastActionCallback);
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => {
      toast.classList.remove('show');
      toastActionCallback = null;
    }, toastActionCallback ? 6000 : 2600);
  }

  function escapeAttribute(text) {
    return String(text).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function exampleRows(item, listClass) {
    return `<span class="example-container" data-example-word="${escapeAttribute(item.id)}" data-list-class="${listClass}"><span class="example-status">Câu mẫu mới sẽ xuất hiện khi lật thẻ.</span></span>`;
  }

  async function activateExamples(root) {
    for (const container of $$('[data-example-word]', root)) {
      if (container.dataset.loaded) continue;
      const item = allWords.get(container.dataset.exampleWord);
      if (!item) continue;
      container.dataset.loaded = 'loading';
      container.innerHTML = '<span class="example-status" role="status">Đang tìm câu mẫu mới…</span>';
      const result = await examples.get(item);
      if (!container.isConnected || ($('#quizDialog').open && !container.closest('#quizDialog')) || container.closest('[aria-hidden="true"]') || container.closest('.view:not(.active)')) { delete container.dataset.loaded; continue; }
      container.dataset.loaded = 'ready';
      examples.commit(result.rows);
      container.innerHTML = `<span class="${container.dataset.listClass}" role="list">${result.rows.map((row, index) => {
        const translation = row.translation || row.translations?.[0]?.text || '';
        const source = row.source ? `<a class="example-source" href="${escapeAttribute(row.source)}" target="_blank" rel="noopener noreferrer" title="${escapeAttribute(`${row.author} · ${row.license}`)}">Tatoeba · ${escapeAttribute(row.author)} · ${escapeAttribute(row.license)}</a>` : '';
        const translationSource = row.translations?.[0] ? `<a class="example-source" href="${escapeAttribute(row.translations[0].source)}" target="_blank" rel="noopener noreferrer" title="${escapeAttribute(row.translations[0].license)}">Dịch: ${escapeAttribute(row.translations[0].author)} · ${escapeAttribute(row.translations[0].license)}</a>` : '';
        return `<span class="example-row" role="listitem"><i aria-hidden="true">${index + 1}</i><span class="example-copy"><span>${escapeAttribute(row.text)}</span>${translation ? `<small>${escapeAttribute(translation)}</small>` : ''}${source}${translationSource}</span><button type="button" class="example-voice" data-sentence="${escapeAttribute(row.text)}" data-sentence-audio="${escapeAttribute(row.audio || '')}" aria-label="Nghe câu mẫu ${index + 1}">${voiceIcon}</button></span>`;
      }).join('')}</span>${result.rows.length < 3 ? `<span class="example-status" role="status">${result.offline ? 'Chưa tải được đủ câu mới. Kiểm tra mạng rồi thử lại.' : 'Chưa có đủ câu mới cho từ này. Những câu đã xem sẽ không được lặp lại.'}</span>` : ''}<button type="button" class="new-examples" data-new-examples>${result.rows.length ? 'Đổi câu mẫu' : 'Tìm câu mới'}</button>`;
    }
  }

  function playSentence(button) {
    if (button.dataset.sentenceAudio) return playAudioClip('example', 'câu mẫu', button.dataset.sentenceAudio);
    if (!('speechSynthesis' in window)) return showToast('Thiết bị chưa hỗ trợ đọc câu mẫu này.');
    currentAudio?.pause();
    speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(button.dataset.sentence);
    speech.lang = 'en-US';
    speech.rate = audioSpeed;
    speech.onerror = () => showToast('Không đọc được câu mẫu trên thiết bị này.');
    speechSynthesis.speak(speech);
  }

  function setAudioVisualState(id, status) {
    currentAudioId = id || '';
    audioState = status;
    $$('[data-audio-id]').forEach((button) => {
      const active = button.dataset.audioId === currentAudioId && ['loading', 'playing'].includes(audioState);
      button.classList.toggle('loading', active && audioState === 'loading');
      button.classList.toggle('playing', active && audioState === 'playing');
      button.setAttribute('aria-pressed', String(active && audioState === 'playing'));
      const word = allWords.get(button.dataset.audioId)?.word;
      const label = button.dataset.audioLabel || (word ? `phát âm ${word}` : 'âm thanh');
      button.setAttribute('aria-label', active && audioState === 'playing' ? `Đang phát ${label}` : `Nghe ${label}`);
    });
  }

  function publicAssetUrl(path) {
    if (/^(?:https?:)?\/\//.test(path)) return path;
    return new URL(`../${String(path).replace(/^\/+/, '')}`, document.baseURI).href;
  }

  function playAudioClip(id, label, audioPath) {
    window.speechSynthesis?.cancel();
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }
    const audio = new Audio(publicAssetUrl(audioPath));
    currentAudio = audio;
    audio.playbackRate = audioSpeed;
    setAudioVisualState(id, 'loading');
    audio.addEventListener('playing', () => setAudioVisualState(id, 'playing'), { once: true });
    audio.addEventListener('ended', () => setAudioVisualState('', 'idle'), { once: true });
    audio.addEventListener('error', () => {
      setAudioVisualState('', 'idle');
      showToast(`Không phát được ${label}. Hãy kiểm tra kết nối.`);
    }, { once: true });
    audio.play().catch(() => {
      setAudioVisualState('', 'idle');
      showToast('Trình duyệt đang chặn âm thanh. Hãy chạm lại nút loa.');
    });
  }

  function playWord(item) {
    const audioPath = item.audioPath || `/audio/${item.sourceDay + 1}-${item.sourceIndex + 1}-word.mp3`;
    playAudioClip(item.id, `phát âm ${item.word}`, audioPath);
  }

  function cycleAudioSpeed() {
    const currentIndex = Math.max(0, AUDIO_SPEEDS.findIndex((speed) => speed === audioSpeed));
    audioSpeed = AUDIO_SPEEDS[(currentIndex + 1) % AUDIO_SPEEDS.length];
    localStorage.setItem(AUDIO_SPEED_KEY, String(audioSpeed));
    if (currentAudio) currentAudio.playbackRate = audioSpeed;
    $$('[data-audio-speed]').forEach((button) => {
      button.textContent = `${audioSpeed}×`;
      button.setAttribute('aria-label', `Tốc độ phát âm ${button.textContent}. Chạm để đổi tốc độ`);
    });
    showToast(`Tốc độ phát âm: ${audioSpeed}×`);
  }

  function ensureSession(plan, entry = ensureToday()) {
    const today = localDate();
    if (sessionDate === today) return;
    sessionDate = today;
    const learned = new Set(entry.learned || []);
    const reviewed = new Set(entry.reviewed || []);
    const newIds = plan.newWords.map((item) => item.id);
    const reviewTargets = Array.from(new Set([
      ...plan.reviewWords.map((item) => item.id),
      ...newIds.filter((id) => learned.has(id))
    ]));
    sessionQueues = {
      new: newIds.filter((id) => !learned.has(id)),
      review: reviewTargets.filter((id) => !reviewed.has(id))
    };
    sessionReviewTargets = new Set(reviewTargets);
    activeIndex = 0;
    studyMode = sessionQueues.new.length ? 'new' : 'review';
    sessionComplete = !sessionQueues.new.length && !sessionQueues.review.length;
  }

  function wordsForMode(plan) {
    ensureSession(plan);
    return (sessionQueues[studyMode] || []).map((id) => allWords.get(id)).filter(Boolean);
  }

  function selectAvailableMode() {
    if (sessionQueues[studyMode]?.length) return;
    const fallback = studyMode === 'new' ? 'review' : 'new';
    if (sessionQueues[fallback]?.length) {
      studyMode = fallback;
      activeIndex = 0;
      return;
    }
    sessionComplete = true;
  }

  function renderNavigation() {
    $('#cardCount').textContent = Object.values(state.cards || {}).filter((card) => card.learned).length;
  }

  function updateProgress(element, value) {
    const percent = Math.max(0, Math.min(100, Math.round(value)));
    element.value = percent;
  }

  function renderCompletion(entry) {
    const hardIds = Array.from(new Set(entry.difficult || [])).filter((id) => allWords.has(id));
    $('#deckLabel').textContent = 'Hoàn thành';
    $('#deckCounter').textContent = '✓';
    updateProgress($('#deckProgressBar'), 100);
    $('#learnCard').innerHTML = `
      <div class="study-card-sheet">
      <section class="completion-panel" tabindex="-1" aria-labelledby="completionTitle">
        <span class="completion-icon" aria-hidden="true">✓</span>
        <p class="eyebrow">HOÀN THÀNH BUỔI HỌC</p>
        <h2 id="completionTitle">Bạn đã đi hết bài hôm nay</h2>
        <p>${learnedCount(entry)} từ đã được ghi nhận. Ngày mai hệ thống sẽ tiếp tục với 10 từ mới và phần ôn lũy tiến.</p>
        <div class="completion-actions">
          ${hardIds.length ? `<button type="button" class="secondary-button" data-review-hard>Ôn lại ${hardIds.length} từ từng thấy khó</button>` : ''}
          <button type="button" class="primary-button" data-view="cards">Mở thư viện flashcard</button>
        </div>
      </section>
      </div>`;
    requestAnimationFrame(() => $('.completion-panel')?.focus());
  }

  function renderToday(options = {}) {
    const today = localDate();
    const entry = ensureToday();
    const plan = planForDate(today);
    ensureSession(plan, entry);
    if (!sessionComplete) selectAvailableMode();
    const words = wordsForMode(plan);
    const completed = learnedCount(entry);

    $('#todayDate').textContent = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()).toUpperCase();
    $('#todayDay').textContent = `Ngày ${plan.dayIndex + 1} / 7`;
    $('#todayTitle').textContent = plan.topic.title;
    $('#todayDescription').textContent = `${plan.topic.days[plan.dayIndex].title} · ${plan.newWords.length} từ mới${sessionReviewTargets.size ? ` + ${sessionReviewTargets.size} từ cần ôn` : ''}`;
    $('#learnedToday').textContent = `${completed}/${plan.words.length}`;
    updateProgress($('#todayProgressBar'), completed / plan.words.length * 100);
    $('#newWordCount').textContent = sessionQueues.new.length;
    $('#reviewWordCount').textContent = sessionQueues.review.length;
    $$('[data-mode]').forEach((button) => {
      const active = button.dataset.mode === studyMode && !sessionComplete;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
      button.disabled = sessionComplete || !sessionQueues[button.dataset.mode]?.length;
    });

    if (sessionComplete) {
      renderCompletion(entry);
      return;
    }

    activeIndex = Math.max(0, Math.min(activeIndex, words.length - 1));
    const item = words[activeIndex];
    examples.get(item);
    const modeTotal = studyMode === 'new' ? plan.newWords.length : sessionReviewTargets.size;
    const modeCompleted = Math.max(0, modeTotal - sessionQueues[studyMode].length);
    $('#deckLabel').textContent = studyMode === 'new' ? 'Từ mới hôm nay' : 'Cần ôn hôm nay';
    $('#deckCounter').textContent = `${modeCompleted} / ${modeTotal}`;
    updateProgress($('#deckProgressBar'), modeTotal ? modeCompleted / modeTotal * 100 : 0);

    const label = studyMode === 'new' ? item.subtopic : `Ôn ngày ${item.introducedDay + 1}`;
    const speedLabel = `${audioSpeed}×`;
    $('#learnCard').innerHTML = `
      <div class="study-card-sheet">
      <div class="card-stage">
        <div class="card-topline">
          <span class="category ${item.category === 'UI/UX' ? 'uiux' : ''}">${label}</span>
          <button type="button" class="previous-button" data-step="-1" ${activeIndex === 0 ? 'disabled' : ''} aria-label="Quay lại từ trước">←</button>
        </div>
        <div class="study-flip-card ${revealed ? 'flipped' : ''}">
          <div class="study-flip-inner">
            <button type="button" class="study-face study-front flip-surface" data-flip data-study-face="front" aria-hidden="${revealed}" ${revealed ? 'inert' : ''}>
              <span class="word-display">
                <strong>${item.word}</strong>
                <span class="ipa">${item.ipa}</span>
                <small class="flip-label">CHẠM ĐỂ XEM NGHĨA VÀ CÂU MẪU</small>
              </span>
            </button>
            <div class="study-face study-back flip-surface" data-flip data-study-face="back" tabindex="0" role="button" aria-label="Mặt sau của thẻ. Chạm để quay lại từ." aria-hidden="${!revealed}" ${revealed ? '' : 'inert'}>
              <span class="meaning-view">
              <span class="meaning-word">${item.word}</span><span class="ipa">${item.ipa}</span>
              <strong>${item.meaning}</strong>
              ${exampleRows(item, 'example-list')}
              <small class="flip-label">CHẠM ĐỂ QUAY LẠI MẶT TỪ</small>
              </span>
            </div>
          </div>
        </div>
        <div class="audio-controls">
          <button type="button" class="voice-button" data-audio-id="${escapeAttribute(item.id)}" aria-pressed="false" aria-label="Nghe phát âm ${escapeAttribute(item.word)}">${voiceIcon}</button>
          <button type="button" class="speed-button" data-audio-speed aria-label="Tốc độ phát âm ${speedLabel}. Chạm để đổi tốc độ">${speedLabel}</button>
        </div>
      </div>
      <div class="card-actions">
        <button type="button" class="again-button" data-again>Chưa nhớ · bỏ qua tạm</button>
        <button type="button" class="remember-button" data-learn>${studyMode === 'new' ? 'Kiểm tra ghi nhớ' : 'Kiểm tra ôn tập'}</button>
      </div>
      </div>`;
    setAudioVisualState(currentAudioId, audioState);
    if (revealed) activateExamples($('#learnCard'));
    if (options.focus === 'flip') requestAnimationFrame(() => $(`[data-study-face="${revealed ? 'back' : 'front'}"]`)?.focus());
  }

  function toggleStudyCard() {
    if (studyTransitioning) return;
    const card = $('.study-flip-card');
    if (!card) return;
    revealed = !revealed;
    card.classList.toggle('flipped', revealed);
    const front = $('.study-front', card);
    const back = $('.study-back', card);
    front.setAttribute('aria-hidden', String(revealed));
    back.setAttribute('aria-hidden', String(!revealed));
    front.toggleAttribute('inert', revealed);
    back.toggleAttribute('inert', !revealed);
    if (revealed) activateExamples(back);
    requestAnimationFrame(() => (revealed ? back : front).focus());
  }

  function currentStudyItem() {
    return wordsForMode(planForDate(localDate()))[activeIndex];
  }

  function cancelStudyTransition() {
    studyTransitionToken += 1;
    studyTransitioning = false;
    const container = $('#learnCard');
    container?.classList.remove('is-transitioning');
    $$('.study-slide-layer', container || document).forEach((element) => element.remove());
    $$('.study-slide-in-next, .study-slide-in-previous', container || document).forEach((element) => {
      element.classList.remove('study-slide-in-next', 'study-slide-in-previous');
    });
  }

  function transitionStudyWord(direction, update) {
    if (studyTransitioning) return false;
    const container = $('#learnCard');
    const outgoing = container ? $('.study-card-sheet', container) : null;
    if (!container || !outgoing || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      update();
      return true;
    }

    const clone = outgoing.cloneNode(true);
    clone.classList.add('study-slide-layer', direction < 0 ? 'study-slide-out-previous' : 'study-slide-out-next');
    clone.setAttribute('aria-hidden', 'true');
    clone.toggleAttribute('inert', true);

    studyTransitioning = true;
    const token = ++studyTransitionToken;
    update();

    const incoming = $('.study-card-sheet', container);
    incoming?.classList.add(direction < 0 ? 'study-slide-in-previous' : 'study-slide-in-next');
    container.classList.add('is-transitioning');
    container.prepend(clone);

    let finished = false;
    const finish = () => {
      if (finished || token !== studyTransitionToken) return;
      finished = true;
      clone.remove();
      incoming?.classList.remove('study-slide-in-next', 'study-slide-in-previous');
      container.classList.remove('is-transitioning');
      studyTransitioning = false;
    };
    clone.addEventListener('animationend', finish, { once: true });
    window.setTimeout(finish, 420);
    return true;
  }

  function nextWord(options = {}) {
    const queue = sessionQueues[studyMode] || [];
    const changed = transitionStudyWord(1, () => {
      if (queue.length > 1) activeIndex = (activeIndex + 1) % queue.length;
      else activeIndex = 0;
      revealed = false;
      renderToday({ focus: 'flip' });
    });
    if (changed && !options.silent) showToast('Đã chuyển sang từ tiếp theo.');
  }

  function removeCurrentAndContinue() {
    transitionStudyWord(1, () => {
      const queue = sessionQueues[studyMode] || [];
      queue.splice(activeIndex, 1);
      if (activeIndex >= queue.length) activeIndex = 0;
      selectAvailableMode();
      revealed = false;
      renderToday({ focus: sessionComplete ? '' : 'flip' });
    });
  }

  function changeWord(step) {
    const words = wordsForMode(planForDate(localDate()));
    const nextIndex = Math.max(0, Math.min(words.length - 1, activeIndex + step));
    if (nextIndex === activeIndex) return;
    transitionStudyWord(step, () => {
      activeIndex = nextIndex;
      revealed = false;
      sessionComplete = false;
      renderToday({ focus: 'flip' });
    });
  }

  function updateCardSchedule(item, result) {
    const now = new Date();
    const previous = state.cards[item.id] ? { ...state.cards[item.id] } : null;
    const existingInterval = Number(previous?.intervalDays) || 0;
    const intervalDays = result === 'again' ? 0 : previous?.difficulty === 'hard' ? 1 : existingInterval ? Math.min(30, Math.max(1, Math.round(existingInterval * 2))) : 1;
    state.cards[item.id] = {
      ...previous,
      id: item.id,
      topicId: item.topicId,
      introducedDay: item.introducedDay,
      learnedAt: previous?.learnedAt || now.toISOString(),
      learnedWeek: previous?.learnedWeek || weekKey(now),
      lastReviewed: now.toISOString(),
      nextReview: result === 'again' ? localDate() : localDate(addDays(now, intervalDays)),
      intervalDays,
      learned: result === 'known' || Boolean(previous?.learned),
      difficulty: result === 'again' ? 'hard' : 'learning',
      updatedAt: now.toISOString()
    };
    return previous;
  }

  function answerCurrent(result) {
    if (studyTransitioning) return;
    const entry = ensureToday();
    const item = currentStudyItem();
    if (!item) return;
    const before = {
      learned: [...(entry.learned || [])],
      again: [...(entry.again || [])],
      difficult: [...(entry.difficult || [])],
      reviewed: [...(entry.reviewed || [])],
      answer: entry.answers?.[item.id] ? { ...entry.answers[item.id] } : null,
      card: state.cards[item.id] ? { ...state.cards[item.id] } : null,
      mode: studyMode,
      index: activeIndex,
      queues: { new: [...sessionQueues.new], review: [...sessionQueues.review] },
      reviewTargets: [...sessionReviewTargets],
      sessionComplete
    };
    const at = new Date().toISOString();
    entry.answers = { ...(entry.answers || {}), [item.id]: { result, at } };
    entry.updatedAt = at;
    entry.learned = Array.from(new Set(entry.learned || []));
    entry.again = Array.from(new Set(entry.again || []));
    entry.difficult = Array.from(new Set(entry.difficult || []));
    entry.reviewed = Array.from(new Set(entry.reviewed || []));

    if (result === 'known') {
      if (!entry.learned.includes(item.id)) entry.learned.push(item.id);
      entry.again = entry.again.filter((id) => id !== item.id);
      if (studyMode === 'new') {
        sessionReviewTargets.add(item.id);
        if (!entry.reviewed.includes(item.id) && !sessionQueues.review.includes(item.id)) sessionQueues.review.push(item.id);
      } else if (!entry.reviewed.includes(item.id)) {
        entry.reviewed.push(item.id);
      }
    } else {
      if (!entry.again.includes(item.id)) entry.again.push(item.id);
      if (!entry.difficult.includes(item.id)) entry.difficult.push(item.id);
    }

    updateCardSchedule(item, result);
    persist();
    if (result === 'known') removeCurrentAndContinue();
    else nextWord({ silent: true });
    const resultMessage = result === 'known'
      ? before.mode === 'new'
        ? `Đã nhớ “${item.word}” và chuyển vào phần ôn.`
        : `Đã hoàn tất ôn “${item.word}”.`
      : `Tạm bỏ qua “${item.word}”. Tiến trình được giữ nguyên.`;
    showToast(resultMessage, {
      actionLabel: 'Hoàn tác',
      action: () => {
        cancelStudyTransition();
        const target = state.daily[localDate()];
        target.learned = before.learned;
        target.again = before.again;
        target.difficult = before.difficult;
        target.reviewed = before.reviewed;
        target.answers = { ...(target.answers || {}) };
        if (before.answer) target.answers[item.id] = before.answer;
        else delete target.answers[item.id];
        target.updatedAt = new Date().toISOString();
        if (before.card) state.cards[item.id] = before.card;
        else delete state.cards[item.id];
        studyMode = before.mode;
        activeIndex = before.index;
        sessionQueues = { new: [...before.queues.new], review: [...before.queues.review] };
        sessionReviewTargets = new Set(before.reviewTargets);
        sessionComplete = before.sessionComplete;
        revealed = false;
        persist();
        renderToday({ focus: 'flip' });
        showToast('Đã hoàn tác thay đổi.');
      }
    });
  }

  function reviewHardWords() {
    const entry = ensureToday();
    const difficult = Array.from(new Set(entry.difficult || [])).filter((id) => allWords.has(id));
    if (!difficult.length) return;
    sessionQueues.review = difficult;
    difficult.forEach((id) => sessionReviewTargets.add(id));
    studyMode = 'review';
    activeIndex = 0;
    sessionComplete = false;
    revealed = false;
    renderToday({ focus: 'flip' });
  }

  function startQuiz(ids, source) {
    if (studyTransitioning) return;
    const queue = window.ExampleBank.shuffle(ids.filter((id) => allWords.has(id)));
    if (!queue.length) return;
    quiz = { ids: queue, index: 0, source, date: localDate(), mode: studyMode };
    currentAudio?.pause();
    window.speechSynthesis?.cancel();
    renderQuiz();
    $('#quizDialog').showModal();
  }

  function renderQuiz() {
    const item = allWords.get(quiz.ids[quiz.index]);
    const recall = state.recalls[item.id] || {};
    $('#quizProgress').textContent = `KIỂM TRA · ${quiz.index + 1} / ${quiz.ids.length}`;
    $('#quizTitle').textContent = recall.needsStudy ? 'Học lại trước khi thử tiếp' : 'Nhớ từ qua nghĩa';
    if (recall.needsStudy) {
      $('#quizBody').innerHTML = `<div class="restudy-panel"><p>Bạn đã sai 3 lần. Hãy xem lại từ, nghe phát âm và đọc câu mẫu.</p><strong class="restudy-word">${escapeAttribute(item.word)}</strong><span>${escapeAttribute(item.ipa)}</span><h3>${escapeAttribute(item.meaning)}</h3><button type="button" class="secondary-button" data-audio-id="${escapeAttribute(item.id)}">Nghe phát âm</button>${exampleRows(item, 'deck-examples')}<button type="button" class="primary-button" id="retryQuiz">Đã học lại · kiểm tra lại</button></div>`;
      activateExamples($('#quizBody'));
      $('#retryQuiz').addEventListener('click', () => {
        state.recalls[item.id] = window.Recall.restudied(recall);
        persist();
        renderQuiz();
      });
    } else {
      const mask = window.Recall.mask(item.word);
      const lengths = item.word.split(/\s+/).map((word) => Array.from(word).filter((letter) => /[\p{L}\p{N}]/u.test(letter)).length);
      $('#quizBody').innerHTML = `<p class="quiz-meaning">${escapeAttribute(item.meaning)}</p><p class="answer-mask" aria-hidden="true">${escapeAttribute(mask)}</p><p id="answerHint">${lengths.length} từ · ${lengths.join(' – ')} ký tự. Mỗi gạch là một ký tự.</p><form id="answerForm"><label for="quizAnswer">Nhập từ hoặc cụm từ tiếng Anh</label><input id="quizAnswer" type="text" required autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" aria-describedby="answerHint quizFeedback"><p id="quizFeedback" class="quiz-feedback" role="status">Còn ${3 - (recall.attempts || 0)} lần thử.</p><button type="submit" class="primary-button">Kiểm tra đáp án</button></form>`;
      $('#answerForm').addEventListener('submit', submitQuiz);
      requestAnimationFrame(() => $('#quizAnswer')?.focus());
    }
  }

  function failRecall(item) {
    const at = new Date().toISOString();
    updateCardSchedule(item, 'again');
    const entry = ensureToday();
    if (entry.words.includes(item.id)) {
      entry.learned = entry.learned.filter((id) => id !== item.id);
      entry.reviewed = entry.reviewed.filter((id) => id !== item.id);
      entry.again = Array.from(new Set([...entry.again, item.id]));
      entry.difficult = Array.from(new Set([...entry.difficult, item.id]));
      entry.answers[item.id] = { result: 'failed', at };
      entry.updatedAt = at;
    }
    persist();
  }

  function submitQuiz(event) {
    event.preventDefault();
    const item = allWords.get(quiz.ids[quiz.index]);
    const answer = $('#quizAnswer').value;
    if (!window.Recall.normalizeAnswer(answer)) return;
    const previous = state.recalls[item.id] || {};
    const at = new Date().toISOString();
    const next = window.Recall.submit(previous, answer, item.word, at);
    state.recalls[item.id] = next;
    const correct = window.Recall.normalizeAnswer(answer) === window.Recall.normalizeAnswer(item.word) && !previous.needsStudy;
    if (!correct) {
      if (next.needsStudy) { failRecall(item); renderQuiz(); }
      else {
        persist();
        $('#quizFeedback').textContent = `Chưa đúng. Còn ${3 - next.attempts} lần thử.`;
        $('#quizAnswer').setAttribute('aria-invalid', 'true');
        $('#quizAnswer').select();
      }
      return;
    }
    persist();
    // Only a correct typed answer can complete either a new or a review card.
    if (quiz.source === 'study' && quiz.date === localDate() && currentStudyItem()?.id === item.id) {
      answerCurrent('known');
    } else {
      updateCardSchedule(item, 'known');
      const entry = ensureToday();
      if (entry.words.includes(item.id)) {
        entry.learned = Array.from(new Set([...entry.learned, item.id]));
        entry.reviewed = Array.from(new Set([...entry.reviewed, item.id]));
        entry.again = entry.again.filter((id) => id !== item.id);
        entry.answers[item.id] = { result: 'known', at };
        entry.updatedAt = at;
      }
      sessionDate = '';
      persist();
    }
    quiz.index += 1;
    if (quiz.index < quiz.ids.length) renderQuiz();
    else {
      const count = quiz.ids.length;
      $('#quizTitle').textContent = 'Đã hoàn thành bài kiểm tra';
      $('#quizBody').innerHTML = `<p class="quiz-meaning">Bạn đã gõ đúng ${count}/${count} từ.</p><p>Lịch ôn tập đã được cập nhật.</p><button type="button" class="primary-button" id="finishQuiz">Tiếp tục học</button>`;
      $('#finishQuiz').addEventListener('click', () => $('#quizDialog').close());
      requestAnimationFrame(() => $('#finishQuiz')?.focus());
    }
  }

  function learnedCardsForWeek(key) {
    const topicId = topicForDate(key).id;
    return Object.values(state.cards || {})
      .filter((card) => card.learned && card.learnedWeek === key && card.topicId === topicId)
      .map((card) => ({ ...allWords.get(card.id), ...card }))
      .filter((item) => item.word);
  }

  function formatWeek(key) {
    const start = dateFromKey(key);
    const end = addDays(start, 6);
    const short = (date) => new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(date);
    return `${short(start)} – ${short(end)}`;
  }

  function availableWeeks() {
    const keys = [weekKey(new Date()), ...Object.keys(state.daily).map((date) => weekKey(dateFromKey(date))), ...Object.values(state.cards || {}).map((card) => card.learnedWeek).filter(Boolean)];
    return Array.from(new Set(keys)).sort().reverse();
  }

  function isDue(card) {
    return !card.nextReview || card.nextReview <= localDate();
  }

  function renderDeckCard(item, depth, absoluteIndex) {
    const active = depth === 0;
    const dueLabel = isDue(item) ? '<span class="due-badge">Cần ôn</span>' : '';
    return `<article class="deck-card ${active ? 'is-active' : ''}" data-card-id="${escapeAttribute(item.id)}" data-deck-index="${absoluteIndex}" style="--deck-depth:${depth}" aria-hidden="${!active}" ${active ? '' : 'inert'}>
      <div class="deck-card-inner">
        <section class="deck-face deck-front" aria-hidden="false">
          <div class="flash-meta"><span class="category ${item.category === 'UI/UX' ? 'uiux' : ''}">${item.subtopic || item.topic}</span><span class="counter">Ngày ${(item.introducedDay ?? 0) + 1}</span></div>
          ${dueLabel}
          <button type="button" class="deck-flip-surface" data-card-flip>
            <span class="flash-word"><strong>${item.word}</strong><span class="ipa">${item.ipa}</span><small>CHẠM ĐỂ LẬT THẺ</small></span>
          </button>
          <button type="button" class="voice-mini deck-voice" data-audio-id="${escapeAttribute(item.id)}" aria-pressed="false" aria-label="Nghe phát âm ${escapeAttribute(item.word)}">${voiceIcon}</button>
        </section>
        <section class="deck-face deck-back" aria-hidden="true" inert>
          <div class="deck-flip-surface deck-back-content" data-card-flip tabindex="0" role="button" aria-label="Mặt sau của thẻ. Chạm để xem lại từ.">
            <span class="meaning-label">NGHĨA CỦA ${item.word}</span>
            <strong class="deck-meaning">${item.meaning}</strong>
            ${exampleRows(item, 'deck-examples')}
            <small class="deck-back-hint">CHẠM ĐỂ XEM LẠI TỪ</small>
          </div>
        </section>
      </div>
    </article>`;
  }

  function renderCards() {
    const weeks = availableWeeks();
    if (!weeks.includes(selectedWeek)) selectedWeek = weeks[0];
    $('#weekSelect').innerHTML = weeks.map((key) => `<option value="${key}" ${key === selectedWeek ? 'selected' : ''}>${key === weekKey(new Date()) ? 'Tuần này · ' : ''}${formatWeek(key)}</option>`).join('');
    const topic = topicForDate(selectedWeek);
    $('#cardFilters').innerHTML = `<button type="button" class="${cardFilter === 'all' ? 'active' : ''}" data-filter="all" aria-pressed="${cardFilter === 'all'}">Tất cả</button>${topic.days.map((day, index) => `<button type="button" class="${cardFilter === `day-${index}` ? 'active' : ''}" data-filter="day-${index}" aria-pressed="${cardFilter === `day-${index}`}" title="${escapeAttribute(day.title)}">Ngày ${index + 1}</button>`).join('')}`;

    const allWeekCards = learnedCardsForWeek(selectedWeek);
    const dueCount = allWeekCards.filter(isDue).length;
    const dueButton = $('[data-status-filter="due"]');
    dueButton.textContent = `Cần ôn${dueCount ? ` · ${dueCount}` : ''}`;
    $$('[data-status-filter]').forEach((button) => {
      const active = button.dataset.statusFilter === cardStatusFilter;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    const query = cardSearch.trim().toLocaleLowerCase('vi');
    const filtered = allWeekCards
      .filter((item) => cardFilter === 'all' || `day-${item.introducedDay}` === cardFilter)
      .filter((item) => cardStatusFilter !== 'due' || isDue(item))
      .filter((item) => !query || [item.word, item.meaning, item.subtopic, item.topic].some((value) => String(value || '').toLocaleLowerCase('vi').includes(query)))
      .sort((a, b) => (a.introducedDay - b.introducedDay) || a.word.localeCompare(b.word));

    currentDeckCards = filtered;
    $('#startLibraryTest').disabled = !filtered.length;
    $('#startLibraryTest').textContent = `Kiểm tra${filtered.length ? ` ${filtered.length} từ` : ' từ vựng'}`;
    deckIndex = Math.max(0, Math.min(deckIndex, Math.max(0, filtered.length - 1)));
    const visibleCards = filtered.slice(deckIndex, deckIndex + 3);
    $('#weekCardSummary').textContent = `${filtered.length}/${allWeekCards.length} từ · ${topic.title}`;
    $('#flashcardGrid').innerHTML = visibleCards.length ? `<div class="deck-stack">${visibleCards.map((item, depth) => renderDeckCard(item, depth, deckIndex + depth)).reverse().join('')}</div>` : `<div class="empty-state"><div><h2>Không tìm thấy thẻ phù hợp</h2><p>${allWeekCards.length ? 'Thử xóa từ khóa hoặc đổi bộ lọc.' : 'Vượt qua bài kiểm tra ở màn Hôm nay, từ sẽ xuất hiện tại đây.'}</p></div></div>`;

    $('#cardPagination').classList.toggle('hidden', !filtered.length);
    $('#deckHint').classList.toggle('hidden', !filtered.length);
    $('#cardPageSummary').textContent = filtered.length ? `Thẻ ${deckIndex + 1}/${filtered.length}` : 'Không có thẻ';
    $('#previousCardPage').disabled = deckIndex <= 0;
    $('#nextCardPage').disabled = deckIndex >= filtered.length - 1;
    setAudioVisualState(currentAudioId, audioState);
  }

  function flipLibraryCard(card) {
    if (!card || card.dataset.flipping === 'true') return;
    const flipped = !card.classList.contains('flipped');
    const inner = $('.deck-card-inner', card);
    const front = $('.deck-front', card);
    const back = $('.deck-back', card);

    const swapFace = () => {
      card.classList.toggle('flipped', flipped);
      front.setAttribute('aria-hidden', String(flipped));
      back.setAttribute('aria-hidden', String(!flipped));
      front.toggleAttribute('inert', flipped);
      back.toggleAttribute('inert', !flipped);
      if (flipped) activateExamples(back);
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      swapFace();
      requestAnimationFrame(() => $('[data-card-flip]', flipped ? back : front)?.focus());
      return;
    }

    card.dataset.flipping = 'true';
    inner.classList.add('flip-out');
    inner.addEventListener('animationend', () => {
      inner.classList.remove('flip-out');
      swapFace();
      inner.classList.add('flip-in');
      inner.addEventListener('animationend', () => {
        inner.classList.remove('flip-in');
        delete card.dataset.flipping;
        $('[data-card-flip]', flipped ? back : front)?.focus({ preventScroll: true });
      }, { once: true });
    }, { once: true });
  }

  function moveDeck(step, focus = true) {
    const nextIndex = deckIndex + step;
    if (nextIndex < 0 || nextIndex >= currentDeckCards.length) {
      showToast(step > 0 ? 'Bạn đang ở thẻ cuối cùng.' : 'Bạn đang ở thẻ đầu tiên.');
      return;
    }
    deckIndex = nextIndex;
    renderCards();
    if (focus) requestAnimationFrame(() => $('.deck-card.is-active [data-card-flip]')?.focus());
  }

  function startDeckSwipe(event) {
    const card = event.target.closest('.deck-card.is-active');
    if (!card || event.target.closest('button.example-voice, .new-examples, a, [data-audio-id]') || (event.pointerType === 'mouse' && event.button !== 0)) return;
    deckPointer = { id: event.pointerId, startX: event.clientX, startY: event.clientY, card };
    deckDidDrag = false;
    card.setPointerCapture?.(event.pointerId);
  }

  function updateDeckSwipe(event) {
    if (!deckPointer || deckPointer.id !== event.pointerId) return;
    const deltaX = event.clientX - deckPointer.startX;
    const deltaY = event.clientY - deckPointer.startY;
    if (Math.abs(deltaX) < 6 || Math.abs(deltaX) < Math.abs(deltaY)) return;
    event.preventDefault();
    deckDidDrag = true;
    deckPointer.card.classList.add('dragging');
    deckPointer.card.style.setProperty('--drag-x', `${deltaX}px`);
    deckPointer.card.style.setProperty('--drag-y', `${Math.max(-22, Math.min(22, deltaY * 0.15))}px`);
    deckPointer.card.style.setProperty('--drag-rotate', `${deltaX / 22}deg`);
  }

  function endDeckSwipe(event) {
    if (!deckPointer || deckPointer.id !== event.pointerId) return;
    const { card, startX } = deckPointer;
    const deltaX = event.clientX - startX;
    deckPointer = null;
    card.releasePointerCapture?.(event.pointerId);
    card.classList.remove('dragging');
    if (Math.abs(deltaX) >= 72 && deckIndex < currentDeckCards.length - 1) {
      deckDidDrag = true;
      card.classList.add(deltaX < 0 ? 'swipe-left' : 'swipe-right');
      setTimeout(() => {
        moveDeck(1, false);
        setTimeout(() => { deckDidDrag = false; }, 0);
      }, 230);
      return;
    }
    card.style.removeProperty('--drag-x');
    card.style.removeProperty('--drag-y');
    card.style.removeProperty('--drag-rotate');
    if (Math.abs(deltaX) >= 72) showToast('Đây là thẻ cuối cùng trong bộ.');
  }

  function renderWeek() {
    const start = startOfWeek(new Date());
    const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));
    const topic = topicForDate(localDate(start));
    const learnedIds = new Set(days.flatMap((date) => state.daily[localDate(date)]?.learned || []));
    const topicIds = new Set(topic.days.flatMap((day) => day.words.map((item) => item.id)));
    const learned = Array.from(learnedIds).filter((id) => topicIds.has(id)).length;
    const percent = Math.min(100, Math.round(learned / WEEKLY_NEW_WORDS * 100));
    $('#weekTopicName').textContent = topic.title;
    $('#weekTopicDescription').textContent = topic.description;
    $('#weekHero').innerHTML = `<div><p class="eyebrow">MỤC TIÊU ${WEEKLY_NEW_WORDS} TỪ MỚI</p><h2>${learned}/${WEEKLY_NEW_WORDS} từ đã ghi nhớ</h2><p>${learned >= WEEKLY_NEW_WORDS ? 'Bạn đã hoàn thành chủ đề tuần này.' : `Còn ${WEEKLY_NEW_WORDS - learned} từ mới trong chủ đề.`}</p></div><div class="week-ring" role="img" aria-label="Đã hoàn thành ${percent} phần trăm"><svg viewBox="0 0 42 42" aria-hidden="true"><circle cx="21" cy="21" r="16" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="4"/><circle cx="21" cy="21" r="16" fill="none" stroke="#bfe8dc" stroke-width="4" pathLength="100" stroke-dasharray="${percent} 100" stroke-linecap="round" transform="rotate(-90 21 21)"/></svg><strong>${percent}%</strong></div>`;
    const today = localDate();
    $('#dayList').innerHTML = days.map((date) => {
      const key = localDate(date);
      const entry = state.daily[key];
      const count = learnedCount(entry);
      const plan = planForDate(key);
      const target = (plan.dayIndex + 1) * NEW_WORDS_PER_DAY;
      const isFuture = key > today;
      return `<article class="day-item ${key === today ? 'today' : ''} ${isFuture ? 'future' : ''}"><b>${new Intl.DateTimeFormat('vi-VN', { weekday: 'long' }).format(date)}</b><small>${plan.topic.days[plan.dayIndex].title}<br>10 mới${plan.reviewWords.length ? ` + ${plan.reviewWords.length} ôn` : ''}</small><span>${count}/${target}</span><progress class="day-progress" value="${count}" max="${target}" aria-label="${count} trên ${target} từ"></progress></article>`;
    }).join('');
  }

  function switchView(view) {
    document.body.dataset.activeView = view;
    $$('.view').forEach((element) => element.classList.toggle('active', element.id === `view-${view}`));
    $$('.nav-button[data-view]').forEach((button) => {
      const active = button.dataset.view === view;
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    if (view === 'today') renderToday();
    if (view === 'cards') renderCards();
    if (view === 'week') renderWeek();
    history.replaceState(null, '', `#${view}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleProfile(event) {
    event.preventDefault();
    const error = $('#profileError');
    const submit = event.currentTarget.querySelector('[type="submit"]');
    error.textContent = '';
    submit.disabled = true;
    submit.textContent = 'Đang kết nối…';
    try {
      const input = $('#syncServerInput').value.trim();
      if (!input && isPages) throw new Error(window.SyncAPI.unavailable);
      const server = input ? window.SyncAPI.serverOrigin(input) : '';
      const client = window.SyncAPI.create({ origin: server });
      // Check the endpoint before sending the PIN to a static site or wrong URL.
      const health = await client('health');
      if (health.service !== 'vocab-sync' || health.version !== 1) throw new Error(window.SyncAPI.unavailable);
      clearTimeout(syncTimer);
      if (syncInFlight) await syncInFlight;
      syncGeneration += 1;
      const result = await client('auth', { method: 'POST', body: JSON.stringify({
        displayName: $('#displayNameInput').value.trim(), profileId: $('#profileIdInput').value.trim(), pin: $('#pinInput').value
      }) });
      if (!result.profileId || (server && !result.token)) throw new Error('Máy chủ chưa hỗ trợ kết nối từ trang này. Hãy cập nhật máy chủ Vocab.');
      profile = { profileId: result.profileId, displayName: result.displayName, server, token: server ? result.token : '' };
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      localStorage.setItem(SYNC_SERVER_KEY, server);
      $('#pinInput').value = '';
      const remote = await syncClient()('simple-progress');
      state = mergeState(state, remote.progress);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      if (!await syncProgress()) throw new Error('Đã đăng nhập nhưng chưa tải tiến độ lên được. Tiến độ vẫn được giữ trên máy; hãy thử lại.');
      sessionDate = '';
      $('#profileDialog').close();
      showToast('Đã kết nối và hợp nhất tiến độ trên các thiết bị.');
      switchView(document.body.dataset.activeView || 'today');
    } catch (reason) { error.textContent = reason.message; }
    finally { submit.disabled = false; submit.textContent = 'Kết nối và đồng bộ'; }
  }

  async function restoreSession() {
    if (!profile) return;
    if (isPages && !profile.server) return setSyncStatus('Trên máy', false);
    const generation = syncGeneration;
    setSyncStatus('Đang lưu…', false);
    try {
      const result = await syncClient()('simple-progress');
      if (generation !== syncGeneration) return;
      state = mergeState(state, result.progress);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      sessionDate = '';
      switchView(document.body.dataset.activeView || 'today');
      await syncProgress();
    } catch (error) { setSyncStatus(error.status === 401 ? 'Đăng nhập' : 'Chưa đồng bộ', false); }
  }

  function exportProgress() {
    const blob = new Blob([JSON.stringify({ format: 'vocab-backup', version: 1, exportedAt: new Date().toISOString(), progress: state }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vocab-progress-${localDate()}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importProgress(event) {
    const file = event.target.files[0];
    if (!file) return;
    try {
      if (file.size > 5_000_000) throw new Error('Tệp sao lưu quá lớn (tối đa 5 MB).');
      let data;
      try { data = JSON.parse(await file.text()); } catch { throw new Error('Tệp không phải bản sao lưu JSON hợp lệ.'); }
      if (data?.format !== 'vocab-backup' || data.version !== 1 || !data.progress?.daily || !data.progress?.cards) throw new Error('Đây không phải tệp sao lưu Vocab được hỗ trợ.');
      const merged = mergeState(state, data.progress);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      state = merged;
      sessionDate = '';
      persist();
      switchView(document.body.dataset.activeView || 'today');
      $('#profileError').textContent = '';
      showToast('Đã hợp nhất tiến độ từ bản sao lưu.');
    } catch (error) { $('#profileError').textContent = error.message; }
    finally { event.target.value = ''; }
  }

  document.addEventListener('click', (event) => {
    if (event.target.closest('.example-source')) return;
    const sentence = event.target.closest('[data-sentence]');
    if (sentence) { playSentence(sentence); return; }
    const refresh = event.target.closest('[data-new-examples]');
    if (refresh) { const container = refresh.closest('[data-example-word]'); delete container.dataset.loaded; activateExamples(container.parentElement); return; }
    const nav = event.target.closest('[data-view]');
    if (nav) { event.preventDefault(); switchView(nav.dataset.view); return; }
    const mode = event.target.closest('[data-mode]');
    if (mode && !mode.disabled) {
      if (studyTransitioning) return;
      studyMode = mode.dataset.mode;
      activeIndex = 0;
      revealed = false;
      sessionComplete = false;
      renderToday({ focus: 'flip' });
      return;
    }
    const audio = event.target.closest('[data-audio-id]');
    if (audio) {
      if (audio.dataset.audioPath) playAudioClip(audio.dataset.audioId, audio.dataset.audioLabel || 'câu mẫu', audio.dataset.audioPath);
      else {
        const item = allWords.get(audio.dataset.audioId);
        if (item) playWord(item);
      }
      return;
    }
    if (event.target.closest('[data-audio-speed]')) { cycleAudioSpeed(); return; }
    const step = event.target.closest('[data-step]');
    if (step) { changeWord(Number(step.dataset.step)); return; }
    if (event.target.closest('[data-flip]')) {
      toggleStudyCard();
      return;
    }
    if (event.target.closest('[data-again]')) { answerCurrent('again'); return; }
    if (event.target.closest('[data-learn]')) { startQuiz([currentStudyItem()?.id], 'study'); return; }
    if (event.target.closest('[data-review-hard]')) { reviewHardWords(); return; }
    const cardFlip = event.target.closest('[data-card-flip]');
    if (cardFlip) {
      if (deckDidDrag) { deckDidDrag = false; return; }
      flipLibraryCard(cardFlip.closest('.deck-card'));
      return;
    }
    const activeDeckCard = event.target.closest('.deck-card.is-active');
    if (activeDeckCard) {
      if (deckDidDrag) { deckDidDrag = false; return; }
      flipLibraryCard(activeDeckCard);
      return;
    }
    const filter = event.target.closest('[data-filter]');
    if (filter) { cardFilter = filter.dataset.filter; deckIndex = 0; renderCards(); return; }
    const statusFilter = event.target.closest('[data-status-filter]');
    if (statusFilter) { cardStatusFilter = statusFilter.dataset.statusFilter; deckIndex = 0; renderCards(); }
  });

  document.addEventListener('keydown', (event) => {
    if ($('#quizDialog').open) return;
    if ((event.key === ' ' || event.key === 'Enter') && event.target.matches('[data-flip]')) {
      event.preventDefault();
      toggleStudyCard();
      return;
    }
    if ((event.key === ' ' || event.key === 'Enter') && event.target.matches('[data-card-flip]')) {
      event.preventDefault();
      flipLibraryCard(event.target.closest('.deck-card'));
      return;
    }
    if (!$('#view-today').classList.contains('active') || $('#profileDialog').open) return;
    if (event.target.closest('button, input, select, textarea, a')) return;
    if (event.key === 'ArrowLeft') { event.preventDefault(); changeWord(-1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); nextWord(); }
    if (event.key === ' ') {
      event.preventDefault();
      toggleStudyCard();
    }
  });

  $('#weekSelect').addEventListener('change', (event) => {
    selectedWeek = event.target.value;
    cardFilter = 'all';
    deckIndex = 0;
    renderCards();
  });
  $('#cardSearch').addEventListener('input', (event) => { cardSearch = event.target.value; deckIndex = 0; renderCards(); });
  $('#previousCardPage').addEventListener('click', () => moveDeck(-1));
  $('#nextCardPage').addEventListener('click', () => moveDeck(1));
  $('#flashcardGrid').addEventListener('pointerdown', startDeckSwipe);
  $('#flashcardGrid').addEventListener('pointermove', updateDeckSwipe);
  $('#flashcardGrid').addEventListener('pointerup', endDeckSwipe);
  $('#flashcardGrid').addEventListener('pointercancel', endDeckSwipe);
  $('#toastAction').addEventListener('click', () => {
    const action = toastActionCallback;
    toastActionCallback = null;
    if (action) action();
  });
  $('#profileButton').addEventListener('click', () => {
    $('#profileIdInput').value = profile?.profileId || '';
    $('#profileIdInput').disabled = false;
    $('#syncServerInput').value = profile?.server || localStorage.getItem(SYNC_SERVER_KEY) || '';
    renderCloudControls();
    $('#profileError').textContent = '';
    $('#pinInput').value = '';
    $('#logoutButton').classList.toggle('hidden', !profile);
    $('#profileDialog').showModal();
  });
  $('#exportProgress').addEventListener('click', exportProgress);
  $('#importProgress').addEventListener('change', importProgress);
  $('#googleSyncButton').addEventListener('click', async () => {
    if (cloudUser) await window.FirebaseSync.syncNow(state);
    else await window.FirebaseSync.signIn();
  });
  $('#cloudLogoutButton').addEventListener('click', async () => {
    await window.FirebaseSync.signOut();
    setSyncStatus(profile ? 'Máy chủ riêng' : 'Trên máy', false);
  });
  $('#startLibraryTest').addEventListener('click', () => startQuiz(currentDeckCards.map((item) => item.id), 'library'));
  $('#closeQuiz').addEventListener('click', () => $('#quizDialog').close());
  $('#quizDialog').addEventListener('close', () => {
    quiz = null;
    window.speechSynthesis?.cancel();
    currentAudio?.pause();
    if (document.body.dataset.activeView === 'cards') renderCards();
  });
  $('#closeProfile').addEventListener('click', () => $('#profileDialog').close());
  $('#profileForm').addEventListener('submit', handleProfile);
  $('#logoutButton').addEventListener('click', async () => {
    clearTimeout(syncTimer);
    syncGeneration += 1;
    try { await syncClient()('logout', { method: 'POST' }); } catch { /* local logout */ }
    profile = null;
    localStorage.removeItem(PROFILE_KEY);
    setSyncStatus('Trên máy', false);
    $('#profileDialog').close();
  });
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    state = mergeState(state, parseJson(event.newValue, null));
    renderNavigation();
  });
  window.addEventListener('online', () => profile && scheduleSync());
  window.addEventListener('offline', () => setSyncStatus('Trên máy', false));

  ensureToday();
  renderNavigation();
  switchView(location.hash.slice(1) && $(`#view-${location.hash.slice(1)}`) ? location.hash.slice(1) : 'today');
  restoreSession();
  initializeCloudSync();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const root = new URL('../', document.baseURI);
      navigator.serviceWorker.register(new URL('sw.js', root), { scope: root.pathname }).catch(() => {});
    });
  }
})();
