(function () {
  'use strict';

  const content = window.LEARNING_CONTENT;
  const lessons = content.lessons;
  const STORAGE_KEY = 'fluent-uiux-progress-v1';
  const PROFILE_KEY = 'fluent-uiux-profile-v1';
  const DAY = 24 * 60 * 60 * 1000;

  const icons = {
    home: '<path d="M3 10.5 12 3l9 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-5v-6h-5v6h-5A1.5 1.5 0 0 1 3 19.5z"/>',
    map: '<path d="m3 6 5-2 8 3 5-2v13l-5 2-8-3-5 2zM8 4v13m8-10v13"/>',
    cards: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 8h6m-6 4h6M3 7v11a2 2 0 0 0 2 2"/>',
    mic: '<rect x="8" y="3" width="8" height="12" rx="4"/><path d="M5 11a7 7 0 0 0 14 0m-7 7v3m-4 0h8"/>',
    chart: '<path d="M4 20V10m6 10V4m6 16v-7m5 7H2"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    play: '<path d="m8 5 11 7-11 7z"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    volume: '<path d="M5 10H2v4h3l4 3V7zm8-1a4 4 0 0 1 0 6m2-9a8 8 0 0 1 0 12"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    cloud: '<path d="M7 18h11a4 4 0 0 0 .4-8A6 6 0 0 0 7 8.5 4.7 4.7 0 0 0 7 18Z"/><path d="m9 13 3-3 3 3m-3-3v7"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    book: '<path d="M4 5a3 3 0 0 1 3-2h5v17H7a3 3 0 0 0-3 2zm16 0a3 3 0 0 0-3-2h-5v17h5a3 3 0 0 1 3 2z"/>',
    fire: '<path d="M12 22c4 0 7-3 7-7 0-5-4-8-6-12 0 4-2 6-4 8-1-2-2-3-3-4 0 2-2 5-2 8 0 4 4 7 8 7Z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4m8-4v4M3 10h18"/>',
    shuffle: '<path d="M16 3h5v5m0-5-6.5 6.5a5 5 0 0 1-7 0L3 5m13 16h5v-5m0 5-6.5-6.5a5 5 0 0 0-7 0L3 19"/>'
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const isoDate = (date = new Date()) => {
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
  };

  function freshState() {
    return {
      version: 1,
      displayName: 'Bạn',
      currentLesson: 0,
      mastered: {},
      completed: [],
      activity: {},
      reviewHistory: [],
      playbackSpeed: 0.9,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return saved && saved.version === 1 ? { ...freshState(), ...saved } : freshState();
    } catch {
      return freshState();
    }
  }

  function mergeProgress(local, remote) {
    if (!remote) return local;
    const localIsNewer = new Date(local.updatedAt || 0) >= new Date(remote.updatedAt || 0);
    const mastered = { ...(remote.mastered || {}) };
    Object.entries(local.mastered || {}).forEach(([key, value]) => {
      const existing = mastered[key];
      const localTime = new Date(value.lastReviewed || value.learnedAt || 0).getTime();
      const remoteTime = new Date(existing?.lastReviewed || existing?.learnedAt || 0).getTime();
      if (!existing || localTime >= remoteTime) mastered[key] = value;
    });
    const activity = { ...(remote.activity || {}) };
    Object.entries(local.activity || {}).forEach(([date, value]) => { activity[date] = Math.max(activity[date] || 0, value || 0); });
    const history = [...(remote.reviewHistory || []), ...(local.reviewHistory || [])];
    return {
      ...freshState(),
      ...(localIsNewer ? remote : local),
      ...(localIsNewer ? local : remote),
      mastered,
      completed: Array.from(new Set([...(remote.completed || []), ...(local.completed || [])])),
      activity,
      reviewHistory: Array.from(new Map(history.map((item) => [`${item.key}:${item.grade}:${item.at}`, item])).values()).slice(-500),
      startedAt: new Date(local.startedAt || Date.now()) < new Date(remote.startedAt || Date.now()) ? local.startedAt : remote.startedAt,
      updatedAt: new Date().toISOString()
    };
  }

  let state = loadState();
  let profile = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null');
  let syncTimer = null;
  let lessonStep = 0;
  let activeWordIndex = 0;
  let phraseLesson = -1;
  let phraseSelection = [];
  let currentAudio = null;
  let reviewQueue = [];
  let reviewIndex = 0;
  let reviewRevealed = false;

  function icon(name) {
    return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || ''}</svg>`;
  }

  function injectIcons(root = document) {
    $$('[data-icon]', root).forEach((node) => {
      node.innerHTML = icon(node.dataset.icon);
    });
  }

  function saveState({ sync = true, activity = false } = {}) {
    state.updatedAt = new Date().toISOString();
    if (activity) {
      const today = isoDate();
      state.activity[today] = Math.min(3, (state.activity[today] || 0) + 1);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (sync && profile) scheduleSync();
    renderShell();
  }

  function scheduleSync() {
    clearTimeout(syncTimer);
    setSyncStatus('Đang đồng bộ…');
    syncTimer = setTimeout(syncProgress, 650);
  }

  async function syncProgress() {
    if (!profile || !navigator.onLine) {
      setSyncStatus(profile ? 'Chờ kết nối mạng' : 'Chỉ lưu trên máy');
      return;
    }
    try {
      const response = await fetch('/api/progress', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress: state })
      });
      if (response.status === 401) {
        profile = null;
        localStorage.removeItem(PROFILE_KEY);
        setSyncStatus('Cần đăng nhập lại');
        return;
      }
      if (!response.ok) throw new Error('SYNC_FAILED');
      const result = await window.SyncAPI.readJSON(response);
      if (result.progress) {
        state = mergeProgress(state, result.progress);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }
      setSyncStatus('Đã đồng bộ');
    } catch {
      setSyncStatus('Đã lưu trên máy');
    }
  }

  function setSyncStatus(label) {
    $('#syncLabel').textContent = label;
  }

  function showToast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  function bestSystemVoice() {
    const voices = speechSynthesis.getVoices().filter((voice) => voice.lang.toLowerCase().startsWith('en'));
    const preferred = ['premium', 'enhanced', 'natural', 'ava', 'samantha', 'google us english', 'microsoft aria'];
    return voices.sort((a, b) => {
      const score = (voice) => preferred.reduce((total, name, index) => total + (voice.name.toLowerCase().includes(name) ? 100 - index : 0), voice.lang === 'en-US' ? 20 : 0);
      return score(b) - score(a);
    })[0] || null;
  }

  function speak(text, rate = state.playbackSpeed || 0.9, audioPath = '') {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }
    if (audioPath) {
      currentAudio = new Audio(audioPath);
      currentAudio.playbackRate = rate;
      currentAudio.preservesPitch = true;
      currentAudio.play().catch(() => speak(text, rate));
      return;
    }
    if (!('speechSynthesis' in window)) {
      showToast('Trình duyệt này chưa hỗ trợ giọng đọc.');
      return;
    }
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = rate;
    utterance.voice = bestSystemVoice();
    speechSynthesis.speak(utterance);
  }

  function audioPath(day, index, type) {
    return `/audio/${day + 1}-${index + 1}-${type}.mp3`;
  }

  function phrasePool(day) {
    const lesson = lessons[day];
    const exact = lessons.flatMap((item, lessonDay) => item.level === lesson.level
      ? item.words.map((word, index) => ({ ...word, day: lessonDay, index, topic: item.title })) : []);
    if (exact.length >= 9) return exact;
    const band = lesson.level.split('·')[0].trim();
    return lessons.flatMap((item, lessonDay) => item.level.startsWith(band)
      ? item.words.map((word, index) => ({ ...word, day: lessonDay, index, topic: item.title })) : []);
  }

  function chooseRandomPhrases(force = false) {
    if (!force && phraseLesson === state.currentLesson && phraseSelection.length) return;
    const previous = new Set(phraseSelection.map((item) => `${item.day}:${item.index}`));
    const pool = phrasePool(state.currentLesson);
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const fresh = shuffled.filter((item) => !previous.has(`${item.day}:${item.index}`));
    phraseSelection = [...fresh, ...shuffled].slice(0, 3);
    phraseLesson = state.currentLesson;
  }

  function greeting() {
    const hour = new Date().getHours();
    if (hour < 11) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  }

  function currentLesson() {
    return lessons[Math.max(0, Math.min(lessons.length - 1, state.currentLesson))];
  }

  function wordKey(day, index) {
    return `${day}:${index}`;
  }

  function masteredCount(day = state.currentLesson) {
    return lessons[day].words.filter((_, index) => state.mastered[wordKey(day, index)]).length;
  }

  function totalMastered() {
    return Object.keys(state.mastered).length;
  }

  function computeStreak() {
    let streak = 0;
    const cursor = new Date();
    if (!state.activity[isoDate(cursor)]) cursor.setDate(cursor.getDate() - 1);
    while (state.activity[isoDate(cursor)]) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  function dueWords() {
    const now = Date.now();
    return Object.entries(state.mastered)
      .filter(([, record]) => !record.due || record.due <= now)
      .map(([key, record]) => {
        const [day, index] = key.split(':').map(Number);
        return { key, day, index, record, ...lessons[day].words[index] };
      })
      .filter((item) => item.word);
  }

  function renderShell() {
    const name = state.displayName || profile?.displayName || 'Bạn';
    $('#profileName').textContent = name;
    $('#greetingName').textContent = name.toLowerCase() === 'bạn' ? 'bạn' : name;
    $('#avatar').textContent = name.trim().charAt(0).toUpperCase() || 'B';
    $('#streakTop').textContent = computeStreak();
    const reviewTotal = dueWords().length;
    $('#reviewCount').textContent = reviewTotal;
    $('#reviewCount').classList.toggle('hidden', reviewTotal === 0);
    if (profile) setSyncStatus($('#syncLabel').textContent === 'Đang đồng bộ…' ? 'Đang đồng bộ…' : 'Đã đồng bộ');
    renderToday();
    if ($('#view-practice').classList.contains('active')) renderPractice();
    if ($('#view-progress').classList.contains('active')) renderProgress();
  }

  function renderToday() {
    const lesson = currentLesson();
    const day = state.currentLesson;
    const completed = state.completed.includes(day);
    $('#dateLabel').textContent = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()).toUpperCase();
    $('#todayTitle').firstChild.textContent = `${greeting()}, `;
    $('#lessonLevel').textContent = lesson.level;
    $('#lessonNumber').textContent = `BÀI HỌC ${String(day + 1).padStart(2, '0')} / ${lessons.length}`;
    $('#lessonTitle').textContent = lesson.title;
    $('#lessonDescription').textContent = lesson.description;
    $('#previousDay').disabled = day === 0;
    $('#nextDay').disabled = day === lessons.length - 1;
    $('#startLessonText').textContent = masteredCount(day) ? 'Tiếp tục bài học' : 'Bắt đầu bài học';
    $('#wordProgress').textContent = `${masteredCount(day)}/${lesson.words.length} từ đã nhớ`;
    activeWordIndex = Math.min(activeWordIndex, lesson.words.length - 1);
    const word = lesson.words[activeWordIndex];
    const key = wordKey(day, activeWordIndex);
    const isMastered = Boolean(state.mastered[key]);
    $('#wordGrid').innerHTML = `<article class="word-focus-card ${isMastered ? 'mastered' : ''}">
      <div class="word-focus-main">
        <div class="word-focus-count"><span>TỪ ${activeWordIndex + 1} / ${lesson.words.length}</span><span class="part">${word.part}</span></div>
        <div class="word-focus-heading"><div><h3>${word.word}</h3><span class="ipa">${word.ipa}</span><p>${word.meaning}</p></div><button class="listen-large" data-speak="${escapeAttribute(word.word)}" data-audio="${audioPath(day, activeWordIndex, 'word')}" aria-label="Nghe từ ${escapeAttribute(word.word)}">${icon('volume')}<small>Nghe từ</small></button></div>
        <div class="word-example"><span>CÂU VÍ DỤ</span><b>${word.example}</b><i>${word.exampleIpa}</i><p>${word.translation}</p><button data-speak="${escapeAttribute(word.example)}" data-audio="${audioPath(day, activeWordIndex, 'sentence')}">${icon('volume')} Nghe cả câu</button></div>
      </div>
      <div class="word-focus-footer">
        <button class="word-nav-button" data-word-step="-1" ${activeWordIndex === 0 ? 'disabled' : ''}>${icon('left')} Từ trước</button>
        <div class="word-dots" aria-label="Chọn từ">${lesson.words.map((item, index) => `<button class="${index === activeWordIndex ? 'active' : ''} ${state.mastered[wordKey(day, index)] ? 'done' : ''}" data-word-index="${index}" aria-label="Từ ${index + 1}: ${item.word}"></button>`).join('')}</div>
        <button class="word-master-button ${isMastered ? 'done' : ''}" data-toggle-current-word>${isMastered ? `${icon('check')} Đã nhớ` : 'Đánh dấu đã nhớ'}</button>
        <button class="word-nav-button" data-word-step="1" ${activeWordIndex === lesson.words.length - 1 ? 'disabled' : ''}>Từ tiếp ${icon('right')}</button>
      </div>
    </article>`;
    chooseRandomPhrases();
    $('#phraseList').innerHTML = phraseSelection.map((item, index) => `<article class="phrase-card">
      <span class="phrase-number">0${index + 1}</span><blockquote><b>${item.example}</b><span class="ipa">${item.exampleIpa}</span><small>${item.translation}</small><em>${item.topic}</em></blockquote>
      <button class="audio-button" data-speak="${escapeAttribute(item.example)}" data-audio="${audioPath(item.day, item.index, 'sentence')}" aria-label="Nghe câu mẫu">${icon('volume')}</button>
    </article>`).join('');
    const completeCard = $('.complete-card');
    completeCard.classList.toggle('done', completed);
    $('#completeTitle').textContent = completed ? 'Bài học đã hoàn thành' : 'Hoàn thành bài học hôm nay';
    $('#completeHint').textContent = completed ? 'Tuyệt vời! Hãy quay lại ôn đúng lịch để ghi nhớ lâu.' : 'Học các từ và luyện câu mẫu trước khi đánh dấu hoàn thành.';
    $('#completeLesson').textContent = completed ? 'Đã hoàn thành ✓' : 'Đánh dấu hoàn thành';
  }

  function escapeAttribute(text) {
    return String(text).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  function toggleWord(index) {
    const key = wordKey(state.currentLesson, index);
    if (state.mastered[key]) {
      delete state.mastered[key];
      showToast('Đã bỏ khỏi danh sách từ đã nhớ.');
    } else {
      state.mastered[key] = { box: 0, due: Date.now(), learnedAt: new Date().toISOString() };
      showToast('Đã thêm vào bộ từ cần ôn.');
    }
    saveState({ activity: true });
  }

  function renderRoadmap() {
    const completedLessons = state.completed.length;
    const target = lessons.length;
    $('#roadmapSummary').innerHTML = `<article class="summary-card accent"><p class="eyebrow">ĐÍCH ĐẾN</p><h3>IELTS 6.5 trong 24 tuần</h3><p>Mục tiêu thực tế khi duy trì 35–45 phút/ngày, 6 ngày/tuần. Sau mỗi 4 tuần có bài đánh giá và điều chỉnh.</p></article>
      <article class="summary-card"><p class="eyebrow">NHỊP HỌC GỢI Ý</p><h3>${completedLessons}/${target} bài khởi động</h3><div class="weekly-mini">${content.weeklyRoutine.map(([day, topic, time]) => `<div title="${topic}"><b>${day}</b><small>${time.replace(' phút', '′')}</small></div>`).join('')}</div></article>`;
    $('#roadmapList').innerHTML = content.roadmap.map((phase, index) => `<article class="phase-card">
      <div class="phase-side ${phase.color}"><span>${phase.phase}</span><b>${phase.weeks}</b></div>
      <div class="phase-main"><div class="phase-heading"><h3>${phase.title}</h3><span>${phase.level}</span></div><p>${phase.outcome}</p><div class="phase-items">${phase.items.map((item) => `<div>${item}</div>`).join('')}</div></div>
    </article>`).join('');
  }

  function renderPractice(reset = false) {
    if (reset || reviewQueue.length === 0) {
      reviewQueue = dueWords();
      reviewIndex = 0;
      reviewRevealed = false;
    }
    const shell = $('#practiceShell');
    if (reviewQueue.length === 0 || reviewIndex >= reviewQueue.length) {
      shell.innerHTML = `<div class="empty-state"><div><div class="empty-illustration">✓</div><h2>Đã ôn xong hôm nay</h2><p>Không có từ nào đến hạn. Học thêm từ mới hoặc quay lại vào ngày mai để hệ thống nhắc đúng lúc.</p><button class="primary-button" data-go="today">Học bài hôm nay</button></div></div>`;
      return;
    }
    const item = reviewQueue[reviewIndex];
    shell.innerHTML = `<div class="flashcard-wrap"><div class="review-meta"><span>Đang ôn ${reviewIndex + 1}/${reviewQueue.length}</span><span>Bài ${item.day + 1} · ${lessons[item.day].title}</span></div><progress class="review-progress" value="${reviewIndex + 1}" max="${reviewQueue.length}"></progress>
      <article class="flashcard" id="flashcard" tabindex="0"><div><button class="audio-button" data-speak="${escapeAttribute(item.word)}" data-audio="${audioPath(item.day, item.index, 'word')}" aria-label="Nghe từ">${icon('volume')}</button><h2>${item.word}</h2><span class="big-ipa">${item.ipa}</span>
        ${reviewRevealed ? `<div class="flashcard-answer"><strong>${item.meaning}</strong><p>${item.example}</p><span class="big-ipa">${item.exampleIpa}</span><small>${item.translation}</small></div>` : '<p class="reveal-hint">Chạm thẻ hoặc nhấn Space để xem đáp án</p>'}</div></article>
      ${reviewRevealed ? '<div class="review-actions"><button data-grade="again">Chưa nhớ · 1 ngày</button><button data-grade="hard">Hơi khó · 3 ngày</button><button data-grade="easy">Đã nhớ · 7 ngày</button></div>' : ''}</div>`;
  }

  function gradeReview(grade) {
    const item = reviewQueue[reviewIndex];
    if (!item) return;
    const intervals = { again: 1, hard: 3, easy: Math.min(30, 7 + (item.record.box || 0) * 4) };
    const record = state.mastered[item.key];
    record.box = grade === 'again' ? 0 : (record.box || 0) + 1;
    record.due = Date.now() + intervals[grade] * DAY;
    record.lastReviewed = new Date().toISOString();
    state.reviewHistory.push({ key: item.key, grade, at: record.lastReviewed });
    reviewIndex += 1;
    reviewRevealed = false;
    saveState({ activity: true });
    renderPractice();
  }

  function renderPronunciation() {
    const lesson = currentLesson();
    const sentences = lesson.words.slice(0, 3);
    $('#pronunciationContent').innerHTML = `<article class="pron-card"><p class="eyebrow">TRỌNG TÂM BÀI ${state.currentLesson + 1}</p><h2>${lesson.focus}</h2><p>Nghe ở tốc độ chậm, quan sát vị trí lưỡi và môi, rồi bắt chước cả nhịp câu.</p><div class="sound-focus"><span class="sound-symbol">${lesson.focus.split(' và ')[0]}</span><div><b>Quy trình 3 lượt</b><p>Lượt 1 chỉ nghe · Lượt 2 nghe và nhìn IPA · Lượt 3 nhại lại không nhìn chữ.</p></div></div></article>
      <article class="pron-card"><p class="eyebrow">GIỌNG MẪU MỚI</p><h2>Samantha · English (US)</h2><p>Âm thanh được thu sẵn đồng nhất, không còn phụ thuộc giọng mặc định chất lượng thấp của từng trình duyệt.</p><div class="speed-control"><span>Tốc độ nghe</span>${[0.75, 0.9, 1].map((speed) => `<button class="${state.playbackSpeed === speed ? 'active' : ''}" data-speed="${speed}">${speed === 0.75 ? 'Chậm' : speed === 0.9 ? 'Học' : 'Tự nhiên'} · ${speed}×</button>`).join('')}</div></article>
      <article class="pron-card"><p class="eyebrow">KHẨU HÌNH & NHỊP</p><h2>Đừng đọc từng chữ</h2><ol class="pron-steps"><li><span>1</span><div><b>Nhấn từ mang nghĩa</b><br>Danh từ, động từ chính và tính từ thường được nhấn.</div></li><li><span>2</span><div><b>Làm nhẹ từ chức năng</b><br>“to”, “a”, “the” thường ngắn và nhẹ thành /tə/, /ə/, /ðə/.</div></li><li><span>3</span><div><b>Thu âm rồi so sánh</b><br>Ưu tiên rõ âm cuối và đúng trọng âm hơn tốc độ.</div></li></ol></article>
      <article class="pron-card wide"><p class="eyebrow">SHADOWING HÔM NAY</p><h2>Nghe một câu, nhại một câu</h2><p>Bấm loa, nghe hai lần rồi nói đè theo giọng mẫu. Mỗi câu lặp lại 3–5 lần.</p><div class="shadow-list">${sentences.map((word, index) => `<div class="shadow-row"><span class="phrase-number">0${index + 1}</span><div><b>${word.example}</b><small>${word.exampleIpa}</small></div><button class="audio-button" data-speak="${escapeAttribute(word.example)}" data-audio="${audioPath(state.currentLesson, index, 'sentence')}" aria-label="Nghe câu">${icon('volume')}</button></div>`).join('')}</div><button class="record-button" id="recordButton">● Bắt đầu luyện nói với micro</button><div class="speech-result" id="speechResult">Trình duyệt sẽ chuyển lời bạn nói thành chữ để bạn tự kiểm tra.</div></article>`;
  }

  function renderProgress() {
    const totalWords = lessons.reduce((sum, lesson) => sum + lesson.words.length, 0);
    const stats = [
      ['book', totalMastered(), 'từ đã học'],
      ['fire', computeStreak(), 'ngày liên tiếp'],
      ['check', state.completed.length, 'bài hoàn thành'],
      ['target', `${Math.round((totalMastered() / totalWords) * 100)}%`, 'thư viện 34 ngày']
    ];
    $('#statGrid').innerHTML = stats.map(([symbol, value, label]) => `<article class="stat-card"><span class="stat-icon">${icon(symbol)}</span><strong>${value}</strong><small>${label}</small></article>`).join('');
    const days = [];
    for (let offset = 27; offset >= 0; offset -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - offset);
      const key = isoDate(date);
      const level = state.activity[key] || 0;
      days.push(`<span class="activity-day level-${level}" data-label="${new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(date)} · ${level ? 'Có học' : 'Chưa học'}"></span>`);
    }
    $('#activityGrid').innerHTML = days.join('');
    $('#syncCta').textContent = profile ? 'Đã kết nối' : 'Thiết lập đồng bộ';
  }

  function openLesson(startAt = 0) {
    lessonStep = Math.max(0, Math.min(currentLesson().words.length - 1, startAt));
    renderLessonDialog();
    $('#lessonDialog').showModal();
  }

  function renderLessonDialog() {
    const lesson = currentLesson();
    const word = lesson.words[lessonStep];
    const key = wordKey(state.currentLesson, lessonStep);
    $('#lessonDialogContent').innerHTML = `<p class="lesson-step-label">TỪ ${lessonStep + 1} / ${lesson.words.length}</p><h2>${lesson.title}</h2><div class="dialog-progress">${lesson.words.map((_, index) => `<i class="${index <= lessonStep ? 'active' : ''}"></i>`).join('')}</div>
      <article class="study-card"><div><h3>${word.word}</h3><span class="ipa">${word.ipa}</span><p class="meaning">${word.meaning}</p><div class="example-box"><b>${word.example}</b><span class="ipa">${word.exampleIpa}</span><small>${word.translation}</small></div></div></article>
      <div class="study-controls"><button class="secondary-button" id="studyPrevious" ${lessonStep === 0 ? 'disabled' : ''}>Quay lại</button><button class="study-listen" data-speak="${escapeAttribute(word.example)}" data-audio="${audioPath(state.currentLesson, lessonStep, 'sentence')}">${icon('volume')} Nghe câu mẫu</button><button class="primary-button" id="studyNext">${lessonStep === lesson.words.length - 1 ? (state.mastered[key] ? 'Hoàn tất' : 'Đã nhớ · Hoàn tất') : 'Đã nhớ · Tiếp'}</button></div>`;
  }

  function advanceStudy() {
    const key = wordKey(state.currentLesson, lessonStep);
    if (!state.mastered[key]) state.mastered[key] = { box: 0, due: Date.now(), learnedAt: new Date().toISOString() };
    if (lessonStep < currentLesson().words.length - 1) {
      lessonStep += 1;
      saveState({ activity: true });
      renderLessonDialog();
    } else {
      if (!state.completed.includes(state.currentLesson)) state.completed.push(state.currentLesson);
      saveState({ activity: true });
      $('#lessonDialog').close();
      showToast('Hoàn thành! Từ mới đã được thêm vào lịch ôn.');
    }
  }

  function switchView(view) {
    $$('.view').forEach((section) => section.classList.toggle('active', section.id === `view-${view}`));
    $$('.nav-item[data-view]').forEach((button) => button.classList.toggle('active', button.dataset.view === view));
    if (view === 'roadmap') renderRoadmap();
    if (view === 'practice') renderPractice(true);
    if (view === 'pronunciation') renderPronunciation();
    if (view === 'progress') renderProgress();
    history.replaceState(null, '', `#${view}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('button[type="submit"]');
    const error = $('#profileError');
    error.textContent = '';
    submit.disabled = true;
    submit.textContent = 'Đang kết nối…';
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: $('#displayNameInput').value.trim(),
          profileId: $('#profileIdInput').value.trim(),
          pin: $('#pinInput').value
        })
      });
      const result = await window.SyncAPI.readJSON(response);
      if (!response.ok) throw new Error(result.error || 'Không thể kết nối.');
      profile = { profileId: result.profileId, displayName: result.displayName };
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      state = mergeProgress(state, result.progress);
      state.displayName = result.displayName || state.displayName;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      await syncProgress();
      showToast(result.progress ? 'Đã hợp nhất tiến độ từ các thiết bị.' : 'Hồ sơ đã kết nối và tiến độ đã được lưu.');
      $('#profileDialog').close();
      updateProfileDialog();
      renderShell();
    } catch (err) {
      error.textContent = err.message === 'Failed to fetch' ? 'Không kết nối được máy chủ. Tiến độ vẫn an toàn trên thiết bị này.' : err.message;
    } finally {
      submit.disabled = false;
      submit.innerHTML = `${icon('cloud')} Kết nối & đồng bộ`;
    }
  }

  function updateProfileDialog() {
    $('#displayNameInput').value = state.displayName === 'Bạn' ? '' : state.displayName;
    $('#profileIdInput').value = profile?.profileId || '';
    $('#profileIdInput').disabled = Boolean(profile);
    $('#pinInput').value = '';
    $('#logoutButton').classList.toggle('hidden', !profile);
  }

  async function logout() {
    try { await fetch('/api/logout', { method: 'POST' }); } catch { /* local logout still works */ }
    profile = null;
    localStorage.removeItem(PROFILE_KEY);
    $('#profileDialog').close();
    setSyncStatus('Chỉ lưu trên máy');
    updateProfileDialog();
    showToast('Đã đăng xuất. Tiến độ vẫn còn trên thiết bị này.');
  }

  function startSpeechRecognition() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      $('#speechResult').textContent = 'Trình duyệt này chưa hỗ trợ nhận diện giọng nói. Bạn vẫn có thể dùng ứng dụng Ghi âm của thiết bị để tự nghe lại.';
      return;
    }
    const recognition = new Recognition();
    const button = $('#recordButton');
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    button.classList.add('listening');
    button.textContent = '● Đang nghe… hãy nói câu mẫu';
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map((result) => result[0].transcript).join('');
      $('#speechResult').textContent = `Máy nghe được: “${transcript}”`;
    };
    recognition.onerror = () => { $('#speechResult').textContent = 'Chưa nghe rõ. Hãy kiểm tra quyền micro rồi thử lại.'; };
    recognition.onend = () => {
      button.classList.remove('listening');
      button.textContent = '● Thử nói lại';
    };
    recognition.start();
  }

  async function restoreSession() {
    if (!profile) return;
    setSyncStatus('Đang đồng bộ…');
    try {
      const response = await fetch('/api/progress');
      if (!response.ok) {
        if (response.status === 401) setSyncStatus('Cần đăng nhập lại');
        return;
      }
      const result = await window.SyncAPI.readJSON(response);
      if (result.progress) {
        state = mergeProgress(state, result.progress);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }
      if (state.updatedAt) scheduleSync();
      setSyncStatus('Đã đồng bộ');
      renderShell();
    } catch {
      setSyncStatus('Đã lưu trên máy');
    }
  }

  document.addEventListener('click', (event) => {
    const nav = event.target.closest('[data-view]');
    if (nav) switchView(nav.dataset.view);
    const go = event.target.closest('[data-go]');
    if (go) switchView(go.dataset.go);
    const audio = event.target.closest('[data-speak]');
    if (audio) { event.stopPropagation(); speak(audio.dataset.speak, state.playbackSpeed, audio.dataset.audio); }
    const wordDot = event.target.closest('.word-dots [data-word-index]');
    if (wordDot) { activeWordIndex = Number(wordDot.dataset.wordIndex); renderToday(); }
    const wordStep = event.target.closest('[data-word-step]');
    if (wordStep) {
      activeWordIndex = Math.max(0, Math.min(currentLesson().words.length - 1, activeWordIndex + Number(wordStep.dataset.wordStep)));
      renderToday();
    }
    if (event.target.closest('[data-toggle-current-word]')) toggleWord(activeWordIndex);
    const speed = event.target.closest('[data-speed]');
    if (speed) {
      state.playbackSpeed = Number(speed.dataset.speed);
      saveState();
      renderPronunciation();
      showToast(`Tốc độ nghe: ${speed.textContent.trim()}`);
    }
    const grade = event.target.closest('[data-grade]');
    if (grade) gradeReview(grade.dataset.grade);
    if (event.target.closest('[data-close-dialog]')) event.target.closest('dialog').close();
    if (event.target.closest('#flashcard') && !event.target.closest('button') && !reviewRevealed) { reviewRevealed = true; renderPractice(); }
    if (event.target.closest('#studyNext')) advanceStudy();
    if (event.target.closest('#studyPrevious') && lessonStep > 0) { lessonStep -= 1; renderLessonDialog(); }
    if (event.target.closest('#recordButton')) startSpeechRecognition();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === ' ' && event.target.closest('#flashcard') && !reviewRevealed) { event.preventDefault(); reviewRevealed = true; renderPractice(); }
  });

  $('#previousDay').addEventListener('click', () => { if (state.currentLesson > 0) { state.currentLesson -= 1; activeWordIndex = 0; phraseLesson = -1; saveState({ sync: false }); renderPronunciation(); } });
  $('#nextDay').addEventListener('click', () => { if (state.currentLesson < lessons.length - 1) { state.currentLesson += 1; activeWordIndex = 0; phraseLesson = -1; saveState({ sync: false }); renderPronunciation(); } });
  $('#startLesson').addEventListener('click', () => openLesson(activeWordIndex));
  $('#shufflePhrases').addEventListener('click', () => { chooseRandomPhrases(true); renderToday(); showToast('Đã chọn 3 câu mới cho bạn.'); });
  $('#completeLesson').addEventListener('click', () => {
    const index = state.completed.indexOf(state.currentLesson);
    if (index >= 0) state.completed.splice(index, 1);
    else state.completed.push(state.currentLesson);
    saveState({ activity: index < 0 });
    showToast(index < 0 ? 'Bài học đã được hoàn thành!' : 'Đã bỏ đánh dấu hoàn thành.');
  });
  ['profileButton', 'mobileProfileButton', 'syncCta'].forEach((id) => $(`#${id}`).addEventListener('click', () => { updateProfileDialog(); $('#profileDialog').showModal(); }));
  $('#profileForm').addEventListener('submit', handleProfileSubmit);
  $('#logoutButton').addEventListener('click', logout);
  window.addEventListener('online', () => profile && scheduleSync());
  window.addEventListener('offline', () => setSyncStatus('Đã lưu trên máy'));

  injectIcons();
  renderRoadmap();
  renderPronunciation();
  renderShell();
  updateProfileDialog();
  switchView(location.hash.slice(1) && $(`#view-${location.hash.slice(1)}`) ? location.hash.slice(1) : 'today');
  restoreSession();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
  }
})();
