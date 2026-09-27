#!/usr/bin/env node

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

global.window = {};
require('../public/content.js');
require('../public/simple/curriculum.js');
const openVocabularyFile = path.join(__dirname, '..', 'public', 'simple', 'open-vocabulary.js');
if (fs.existsSync(openVocabularyFile)) require(openVocabularyFile);
require('../public/simple/content.js');

const lessons = global.window.LEARNING_CONTENT.lessons;
const themedTopics = global.window.THEMED_CURRICULUM.filter((topic) => topic.days);
const openTopics = global.window.OPEN_VOCABULARY?.curriculum || [];
const simpleTopics = global.window.SIMPLE_CONTENT?.curriculum || [];
const outputDir = path.join(__dirname, '..', 'public', 'audio');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fluent-audio-'));
const voice = process.env.TTS_VOICE || 'Samantha';
const rate = process.env.TTS_RATE || '155';

fs.mkdirSync(outputDir, { recursive: true });

function generate(text, basename) {
  const aiff = path.join(tempDir, `${basename.replaceAll('/', '-')}.aiff`);
  const mp3 = path.join(outputDir, `${basename}.mp3`);
  if (fs.existsSync(mp3) && fs.statSync(mp3).size >= 2_000 && !process.env.FORCE_AUDIO) return;
  fs.mkdirSync(path.dirname(mp3), { recursive: true });

  const spoken = spawnSync('say', ['-v', voice, '-r', rate, '-o', aiff, text], { encoding: 'utf8' });
  if (spoken.status !== 0) throw new Error(spoken.stderr || `Không thể tạo ${basename}`);

  const converted = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', aiff, '-codec:a', 'libmp3lame', '-qscale:a', '5', mp3], { encoding: 'utf8' });
  if (converted.status !== 0) throw new Error(converted.stderr || `Không thể chuyển đổi ${basename}`);
  fs.unlinkSync(aiff);
}

function basenameFromAudioPath(audioPath) {
  return String(audioPath).replace(/^\/audio\//, '').replace(/\.mp3$/, '');
}

try {
  lessons.forEach((lesson, day) => {
    lesson.words.forEach((word, index) => {
      const prefix = `${day + 1}-${index + 1}`;
      generate(word.word, `${prefix}-word`);
      generate(word.example, `${prefix}-sentence`);
    });
    process.stdout.write(`\rĐã tạo âm thanh bài ${day + 1}/${lessons.length}`);
  });
  themedTopics.forEach((topic, topicIndex) => {
    topic.days.forEach((day, dayIndex) => {
      day.words.forEach((word, wordIndex) => {
        generate(word.word, `themes/${topic.id}-${dayIndex + 1}-${wordIndex + 1}`);
      });
    });
    process.stdout.write(`\rĐã tạo âm thanh chủ đề ${topicIndex + 1}/${themedTopics.length}`);
  });
  openTopics.forEach((topic, topicIndex) => {
    topic.days.forEach((day, dayIndex) => {
      day.words.forEach((word, wordIndex) => {
        generate(word.word, `open/${topic.id}-${dayIndex + 1}-${wordIndex + 1}`);
      });
    });
    process.stdout.write(`\rĐã tạo âm thanh kho mở ${topicIndex + 1}/${openTopics.length}`);
  });
  const sentenceTopics = [...simpleTopics, ...openTopics];
  sentenceTopics.forEach((topic, topicIndex) => {
    topic.days.forEach((day) => {
      day.words.forEach((word) => {
        word.examples.forEach((example, exampleIndex) => {
          const audioPath = word.exampleAudioPaths?.[exampleIndex];
          if (audioPath) generate(example, basenameFromAudioPath(audioPath));
        });
      });
    });
    process.stdout.write(`\rĐã tạo voice câu mẫu chủ đề ${topicIndex + 1}/${sentenceTopics.length}`);
  });
  process.stdout.write(`\nHoàn tất với giọng ${voice}, tốc độ ${rate}.\n`);
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
