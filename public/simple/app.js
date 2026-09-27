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
  const STATE_VERSION = 3;
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

  function parseJson(value, fallback) {
    try { return JSON.parse(value); } catch { return fallback; }
  }

  function freshState() {
    return { version: STATE_VERSION, daily: {}, cards: {}, updatedAt: new Date().toISOString() };
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
    return { version: STATE_VERSION, daily, cards, updatedAt: new Date().toISOString() };
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
    if (sync && profile) scheduleSync();
    renderNavigation();
  }

  function scheduleSync() {
    clearTimeout(syncTimer);
    setSyncStatus('Đang lưu…', false);
    syncTimer = setTimeout(syncProgress, 500);
  }

  async function syncProgress() {
    if (!profile || !navigator.onLine) return setSyncStatus('Trên máy', false);
    try {
      const response = await fetch('/api/simple-progress', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ progress: state })
      });
      if (response.status === 401) return setSyncStatus('Đăng nhập', false);
      if (!response.ok) throw new Error('SYNC');
      state = mergeState(state, (await response.json()).progress);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setSyncStatus('Đã lưu', true);
    } catch {
      setSyncStatus('Trên máy', false);
    }
  }

  function setSyncStatus(label, synced) {
    $('#syncText').textContent = label;
    $('#profileButton').classList.toggle('synced', synced);
    $('#profileButton').setAttribute('aria-label', `${label} — hồ sơ và đồng bộ`);
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

  function setAudioVisualState(id, status) {
    currentAudioId = id || '';
    audioState = status;
    $$('[data-audio-id]').forEach((button) => {
      const active = button.dataset.audioId === currentAudioId && ['loading', 'playing'].includes(audioState);
      button.classList.toggle('loading', active && audioState === 'loading');
      button.classList.toggle('playing', active && audioState === 'playing');
      button.setAttribute('aria-pressed', String(active && audioState === 'playing'));
      const word = allWords.get(button.dataset.audioId)?.word || 'từ này';
      button.setAttribute('aria-label', active && audioState === 'playing' ? `Đang phát âm ${word}` : `Nghe phát âm ${word}`);
    });
  }

  function publicAssetUrl(path) {
    if (/^(?:https?:)?\/\//.test(path)) return path;
    return new URL(`../${String(path).replace(/^\/+/, '')}`, document.baseURI).href;
  }

  function playWord(item) {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }
    const audioPath = item.audioPath || `/audio/${item.sourceDay + 1}-${item.sourceIndex + 1}-word.mp3`;
    const audio = new Audio(publicAssetUrl(audioPath));
    currentAudio = audio;
    audio.playbackRate = audioSpeed;
    setAudioVisualState(item.id, 'loading');
    audio.addEventListener('playing', () => setAudioVisualState(item.id, 'playing'), { once: true });
    audio.addEventListener('ended', () => setAudioVisualState('', 'idle'), { once: true });
    audio.addEventListener('error', () => {
      setAudioVisualState('', 'idle');
      showToast('Không phát được giọng mẫu. Hãy kiểm tra kết nối.');
    }, { once: true });
    audio.play().catch(() => {
      setAudioVisualState('', 'idle');
      showToast('Trình duyệt đang chặn âm thanh. Hãy chạm lại nút loa.');
    });
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
            <button type="button" class="study-face study-back flip-surface" data-flip data-study-face="back" aria-hidden="${!revealed}" ${revealed ? '' : 'inert'}>
              <span class="meaning-view">
              <span class="meaning-word">${item.word}</span><span class="ipa">${item.ipa}</span>
              <strong>${item.meaning}</strong>
              <span class="example-list" role="list">${item.examples.slice(0, 5).map((example, index) => `<span role="listitem"><i aria-hidden="true">${index + 1}</i><span>${example}${index === 0 && item.translation ? `<small class="first-translation">${item.translation}</small>` : ''}</span></span>`).join('')}</span>
              <small class="flip-label">CHẠM ĐỂ QUAY LẠI MẶT TỪ</small>
              </span>
            </button>
          </div>
        </div>
        <div class="audio-controls">
          <button type="button" class="voice-button" data-audio-id="${escapeAttribute(item.id)}" aria-pressed="false" aria-label="Nghe phát âm ${escapeAttribute(item.word)}">${voiceIcon}</button>
          <button type="button" class="speed-button" data-audio-speed aria-label="Tốc độ phát âm ${speedLabel}. Chạm để đổi tốc độ">${speedLabel}</button>
        </div>
      </div>
      <div class="card-actions">
        <button type="button" class="again-button" data-again>Chưa nhớ · bỏ qua tạm</button>
        <button type="button" class="remember-button" data-learn>${studyMode === 'new' ? 'Đã nhớ · đưa vào ôn' : 'Đã ôn · hoàn tất từ'}</button>
      </div>
      </div>`;
    setAudioVisualState(currentAudioId, audioState);
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
          <button type="button" class="deck-flip-surface deck-back-content" data-card-flip>
            <span class="meaning-label">NGHĨA CỦA ${item.word}</span>
            <strong class="deck-meaning">${item.meaning}</strong>
            <span class="deck-examples" role="list">${item.examples.slice(0, 5).map((example, index) => `<span role="listitem"><i aria-hidden="true">${index + 1}</i><span>${example}${index === 0 && item.translation ? `<small>${item.translation}</small>` : ''}</span></span>`).join('')}</span>
            <small class="deck-back-hint">CHẠM ĐỂ XEM LẠI TỪ</small>
          </button>
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
    deckIndex = Math.max(0, Math.min(deckIndex, Math.max(0, filtered.length - 1)));
    const visibleCards = filtered.slice(deckIndex, deckIndex + 3);
    $('#weekCardSummary').textContent = `${filtered.length}/${allWeekCards.length} từ · ${topic.title}`;
    $('#flashcardGrid').innerHTML = visibleCards.length ? `<div class="deck-stack">${visibleCards.map((item, depth) => renderDeckCard(item, depth, deckIndex + depth)).reverse().join('')}</div>` : `<div class="empty-state"><div><h2>Không tìm thấy thẻ phù hợp</h2><p>${allWeekCards.length ? 'Thử xóa từ khóa hoặc đổi bộ lọc.' : 'Chọn “Đã nhớ” ở màn Hôm nay, từ sẽ tự xuất hiện tại đây.'}</p></div></div>`;

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
    if (!card || event.target.closest('[data-audio-id]') || (event.pointerType === 'mouse' && event.button !== 0)) return;
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
      const response = await fetch('/api/auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: $('#displayNameInput').value.trim(), profileId: $('#profileIdInput').value.trim(), pin: $('#pinInput').value })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Không thể kết nối.');
      profile = { profileId: result.profileId, displayName: result.displayName };
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      const remote = await fetch('/api/simple-progress');
      if (remote.ok) state = mergeState(state, (await remote.json()).progress);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      await syncProgress();
      sessionDate = '';
      $('#profileDialog').close();
      showToast('Đã kết nối và hợp nhất tiến độ trên các thiết bị.');
      renderToday();
    } catch (reason) {
      error.textContent = reason.message === 'Failed to fetch' ? 'Không kết nối được máy chủ.' : reason.message;
    } finally {
      submit.disabled = false;
      submit.textContent = 'Kết nối và đồng bộ';
    }
  }

  async function restoreSession() {
    if (!profile) return;
    setSyncStatus('Đang lưu…', false);
    try {
      const response = await fetch('/api/simple-progress');
      if (!response.ok) return setSyncStatus('Đăng nhập', false);
      state = mergeState(state, (await response.json()).progress);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setSyncStatus('Đã lưu', true);
      sessionDate = '';
      renderToday();
      renderNavigation();
    } catch {
      setSyncStatus('Trên máy', false);
    }
  }

  document.addEventListener('click', (event) => {
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
      const item = allWords.get(audio.dataset.audioId);
      if (item) playWord(item);
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
    if (event.target.closest('[data-learn]')) { answerCurrent('known'); return; }
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
    $('#profileIdInput').disabled = Boolean(profile);
    $('#logoutButton').classList.toggle('hidden', !profile);
    $('#profileDialog').showModal();
  });
  $('#closeProfile').addEventListener('click', () => $('#profileDialog').close());
  $('#profileForm').addEventListener('submit', handleProfile);
  $('#logoutButton').addEventListener('click', async () => {
    try { await fetch('/api/logout', { method: 'POST' }); } catch { /* local logout */ }
    profile = null;
    localStorage.removeItem(PROFILE_KEY);
    setSyncStatus('Trên máy', false);
    $('#profileDialog').close();
  });
  window.addEventListener('online', () => profile && scheduleSync());
  window.addEventListener('offline', () => setSyncStatus('Trên máy', false));

  ensureToday();
  renderNavigation();
  switchView(location.hash.slice(1) && $(`#view-${location.hash.slice(1)}`) ? location.hash.slice(1) : 'today');
  restoreSession();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const root = new URL('../', document.baseURI);
      navigator.serviceWorker.register(new URL('sw.js', root), { scope: root.pathname }).catch(() => {});
    });
  }
})();
