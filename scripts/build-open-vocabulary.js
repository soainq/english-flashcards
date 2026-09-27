#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const readline = require('node:readline');
const { execFileSync } = require('node:child_process');

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, list) => {
  if (value.startsWith('--')) pairs.push([value.slice(2), list[index + 1]]);
  return pairs;
}, []));
const wordnetZip = args.wordnet || '/private/tmp/english-wordnet-2025-json.zip';
const wiktionaryGzip = args.wiktionary || '/private/tmp/viwiktionary-raw.jsonl.gz';
const outputFile = args.output || path.join(__dirname, '..', 'public', 'simple', 'open-vocabulary.js');

const themes = [
  {
    id: 'open-food', title: 'Đồ ăn & thức uống', category: 'Đời sống',
    description: 'Từ vựng thực tế để đi chợ, nấu ăn, gọi món và mô tả hương vị.',
    days: [
      ['Trái cây', 'apple banana orange grape mango lemon pineapple watermelon strawberry peach'],
      ['Rau củ', 'potato tomato carrot onion garlic cabbage cucumber mushroom corn bean'],
      ['Bữa ăn', 'breakfast lunch dinner meal snack bread rice soup salad sandwich'],
      ['Đồ uống', 'water coffee tea milk juice soda wine beer lemonade smoothie'],
      ['Hương vị', 'sweet sour salty bitter spicy fresh hot cold delicious hungry'],
      ['Nấu ăn', 'recipe ingredient oven stove fridge plate bowl cup spoon fork'],
      ['Ăn ngoài', 'restaurant menu order waiter bill table reservation tip buffet dessert']
    ]
  },
  {
    id: 'open-travel', title: 'Địa điểm & du lịch', category: 'Đời sống',
    description: 'Những từ cần thiết để di chuyển, hỏi đường, đi sân bay và lưu trú.',
    days: [
      ['Trong thành phố', 'street road bridge park market bank hospital school library museum'],
      ['Phương tiện', 'bus train car bicycle taxi subway station ticket driver passenger'],
      ['Tại sân bay', 'airport flight plane passport luggage suitcase gate terminal departure arrival'],
      ['Tại khách sạn', 'hotel room key reception elevator lobby guest booking towel balcony'],
      ['Chỉ đường', 'left right straight north south east west near far corner'],
      ['Điểm đến', 'beach mountain river forest island village country map camera guide'],
      ['Hoạt động chuyến đi', 'travel visit explore drive ride fly walk stay pack return']
    ]
  }
].map((theme) => ({ ...theme, days: theme.days.map(([title, words]) => ({ title, words: words.split(' ') })) }));

const targets = new Set(themes.flatMap((theme) => theme.days.flatMap((day) => day.words)));
const editorialFallbacks = {
  banana: { meaning: 'quả chuối' },
  mango: { ipa: '/ˈmæŋ.ɡoʊ/' },
  lemon: { meaning: 'quả chanh', ipa: '/ˈlem.ən/' },
  tomato: { meaning: 'quả cà chua' },
  garlic: { ipa: '/ˈɡɑːr.lɪk/' },
  corn: { meaning: 'ngô; bắp' },
  meal: { meaning: 'bữa ăn' },
  snack: { meaning: 'bữa ăn nhẹ', ipa: '/snæk/' },
  bread: { meaning: 'bánh mì' },
  tea: { meaning: 'trà' },
  soda: { meaning: 'nước ngọt có ga', ipa: '/ˈsoʊ.də/' },
  lemonade: { ipa: '/ˌlem.əˈneɪd/' },
  smoothie: { meaning: 'sinh tố' },
  salty: { meaning: 'có vị mặn', ipa: '/ˈsɔːl.ti/' },
  spicy: { meaning: 'cay; có nhiều gia vị', ipa: '/ˈspaɪ.si/' },
  ingredient: { ipa: '/ɪnˈɡriː.di.ənt/' },
  fridge: { meaning: 'tủ lạnh', ipa: '/frɪdʒ/' },
  plate: { meaning: 'cái đĩa' },
  order: { meaning: 'gọi món; đơn gọi món' },
  bill: { meaning: 'hóa đơn' },
  reservation: { meaning: 'việc đặt chỗ', ipa: '/ˌrez.ɚˈveɪ.ʃən/' },
  buffet: { meaning: 'bữa ăn tự chọn', ipa: '/bəˈfeɪ/' },
  school: { ipa: '/skuːl/' },
  bridge: { meaning: 'cây cầu' },
  bank: { meaning: 'ngân hàng' },
  driver: { ipa: '/ˈdraɪ.vɚ/' },
  flight: { meaning: 'chuyến bay' },
  plane: { meaning: 'máy bay' },
  luggage: { ipa: '/ˈlʌɡ.ɪdʒ/' },
  elevator: { meaning: 'thang máy', ipa: '/ˈel.ə.veɪ.t̬ɚ/' },
  reception: { meaning: 'quầy lễ tân' },
  lobby: { meaning: 'sảnh chờ', ipa: '/ˈlɑː.bi/' },
  booking: { meaning: 'việc đặt chỗ', ipa: '/ˈbʊk.ɪŋ/' },
  map: { ipa: '/mæp/' },
  right: { meaning: 'bên phải' },
  beach: { meaning: 'bãi biển' },
  travel: { meaning: 'đi du lịch' },
  visit: { meaning: 'thăm; ghé thăm' },
  drive: { meaning: 'lái xe' },
  ride: { meaning: 'đi xe; cưỡi' },
  fly: { meaning: 'bay' },
  walk: { meaning: 'đi bộ' },
  stay: { meaning: 'ở lại; lưu trú' },
  pack: { meaning: 'đóng gói hành lý', ipa: '/pæk/' },
  return: { meaning: 'quay về; trở lại' },
  stove: { meaning: 'bếp nấu', ipa: '/stoʊv/' },
  table: { meaning: 'cái bàn', ipa: '/ˈteɪ.bəl/' }
};

const editorialExamples = {
  hungry: ['I am hungry after the long walk.', 'Are you hungry now?', 'We got hungry while waiting for the train.'],
  delicious: ['This soup is delicious.', 'The meal smells delicious.', 'Everything was fresh and delicious.'],
  restaurant: ['We ate at a small restaurant.', 'The restaurant is near the hotel.', 'Can you recommend a good restaurant?'],
  menu: ['Could I see the menu, please?', 'The menu has several vegetarian dishes.', 'This item is not on the menu.'],
  order: ['I am ready to order.', 'Our order will be ready soon.', 'Could I change my order?'],
  bill: ['Could we have the bill, please?', 'The bill includes service.', 'I paid the bill by card.'],
  reservation: ['I have a reservation for two.', 'We made the reservation online.', 'Could you confirm my reservation?'],
  left: ['Turn left at the next street.', 'The bank is on your left.', 'Keep left at the fork.'],
  right: ['Turn right at the traffic lights.', 'The hotel is on your right.', 'Keep right at the fork.'],
  straight: ['Go straight for two blocks.', 'Continue straight past the bank.', 'The station is straight ahead.'],
  north: ['The hotel is north of the station.', 'We are travelling north.', 'Which road goes north?'],
  south: ['The beach is south of the city.', 'We are travelling south.', 'Which road goes south?'],
  east: ['The airport is east of here.', 'We are travelling east.', 'Which road goes east?'],
  west: ['The village is west of the river.', 'We are travelling west.', 'Which road goes west?'],
  near: ['The hotel is near the airport.', 'Is the station near here?', 'The bank is near the market.'],
  far: ['The museum is far from here.', 'Is the airport far away?', 'The hotel is not far from the beach.'],
  corner: ['Turn right at the corner.', 'The café is on the corner.', 'I will wait for you at the corner.'],
  travel: ['I love to travel by train.', 'We plan to travel this summer.', 'Travel teaches us about new cultures.'],
  visit: ['I want to visit the museum.', 'We visited the old town yesterday.', 'Can we visit the market tomorrow?'],
  explore: ['Let us explore the city on foot.', 'We explored a quiet village.', 'I want to explore the island.'],
  drive: ['I can drive to the airport.', 'We drove along the coast.', 'Do you feel comfortable driving here?'],
  ride: ['I ride my bicycle to work.', 'We rode the bus into town.', 'Would you like to ride with us?'],
  fly: ['We fly to Singapore tomorrow.', 'The plane is flying over the city.', 'I have never flown alone.'],
  walk: ['We can walk to the station.', 'I walked around the old town.', 'Let us walk along the beach.'],
  stay: ['We will stay at this hotel.', 'How long are you staying?', 'I stayed near the airport.'],
  pack: ['I need to pack my suitcase.', 'Pack light for the short trip.', 'Have you packed your passport?'],
  return: ['We return home on Sunday.', 'Please return the room key.', 'I would like to return next year.']
};

function cleanText(value) {
  return String(value || '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\([^)]*từ thế kỷ[^)]*\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.;:,]+$/, '');
}

function bestIpa(sounds = []) {
  const candidates = sounds.filter((sound) => sound.ipa && /[\/\[]/.test(sound.ipa));
  const us = candidates.find((sound) => (sound.tags || []).some((tag) => /american|us/i.test(tag)));
  return cleanText((us || candidates[0] || sounds.find((sound) => sound.ipa) || {}).ipa);
}

function bestMeaning(senses = []) {
  return senses
    .flatMap((sense) => sense.glosses || [])
    .map(cleanText)
    .find((gloss) => gloss && gloss.length <= 110) || '';
}

async function readVietnameseEntries() {
  const entries = new Map();
  const input = fs.createReadStream(wiktionaryGzip).pipe(zlib.createGunzip());
  const lines = readline.createInterface({ input, crlfDelay: Infinity });
  for await (const line of lines) {
    let entry;
    try { entry = JSON.parse(line); } catch { continue; }
    const word = String(entry.word || '').toLowerCase();
    if (entry.lang_code !== 'en' || !targets.has(word) || entries.has(word)) continue;
    const meaning = bestMeaning(entry.senses);
    if (!meaning) continue;
    entries.set(word, { meaning, ipa: bestIpa(entry.sounds), pos: entry.pos });
  }
  return entries;
}

function readWordNetExamples() {
  const examples = new Map();
  if (!fs.existsSync(wordnetZip)) return examples;
  const files = [
    'noun.food.json', 'noun.location.json', 'noun.artifact.json', 'noun.person.json',
    'noun.communication.json', 'noun.feeling.json', 'verb.motion.json', 'verb.contact.json',
    'verb.consumption.json', 'adj.all.json'
  ];
  for (const filename of files) {
    let raw;
    try {
      raw = execFileSync('unzip', ['-p', wordnetZip, filename], { encoding: 'utf8', maxBuffer: 12 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
    } catch {
      console.warn('Gói WordNet chưa hoàn chỉnh: tiếp tục bằng dữ liệu Wiktionary.');
      return examples;
    }
    for (const synset of Object.values(JSON.parse(raw))) {
      for (const member of synset.members || []) {
        const word = member.replaceAll('_', ' ').toLowerCase();
        if (!targets.has(word) || examples.has(word)) continue;
        examples.set(word, (synset.example || []).map(cleanText).filter(Boolean));
      }
    }
  }
  return examples;
}

function fallbackExamples(word, themeId, dayIndex) {
  if (editorialExamples[word]) return editorialExamples[word];
  if (themeId === 'open-food') {
    if (dayIndex <= 1) return [`I bought some ${word} today.`, `The ${word} looks fresh.`, `Would you like some ${word}?`];
    if (dayIndex === 3) return [`I would like a ${word}, please.`, `This ${word} tastes good.`, `Can I have another ${word}?`];
    if (dayIndex === 4) return [`The food is ${word}.`, `It tastes a little ${word}.`, `Do you like ${word} food?`];
    return [`We talked about ${word} at dinner.`, `I need the ${word}, please.`, `Where can I find the ${word}?`];
  }
  if (dayIndex === 4) return [`Turn ${word} at the next street.`, `Is it ${word} from here?`, `The place is ${word} the station.`];
  if (dayIndex === 6) return [`I want to ${word} this summer.`, `We plan to ${word} tomorrow.`, `It is easy to ${word} from here.`];
  return [`Where is the ${word}?`, `I can see the ${word} from here.`, `Can you show me the ${word} on the map?`];
}

async function main() {
  if (!fs.existsSync(wiktionaryGzip)) throw new Error(`Không tìm thấy nguồn dữ liệu: ${wiktionaryGzip}`);
  if (!fs.existsSync(wordnetZip)) console.warn('Không có gói WordNet: dùng câu mẫu biên tập sẵn và dữ liệu Wiktionary.');
  const [viEntries, wordnetExamples] = await Promise.all([readVietnameseEntries(), Promise.resolve(readWordNetExamples())]);
  const missing = [];
  const curriculum = themes.map((theme) => ({
    id: theme.id,
    title: theme.title,
    description: theme.description,
    category: theme.category,
    days: theme.days.map((day, dayIndex) => ({
      title: day.title,
      words: day.words.map((word, wordIndex) => {
        const vi = { ...(viEntries.get(word) || {}), ...(editorialFallbacks[word] || {}) };
        if (!vi) missing.push(word);
        const examples = [...(wordnetExamples.get(word) || []), ...fallbackExamples(word, theme.id, dayIndex)].slice(0, 3);
        return {
          id: `open:${theme.id}:${dayIndex}:${wordIndex}`,
          word,
          ipa: vi?.ipa || '',
          meaning: vi?.meaning || word,
          examples,
          translation: `Từ “${word}” có nghĩa là “${vi?.meaning || word}”.`,
          audioPath: `/audio/open/${theme.id}-${dayIndex + 1}-${wordIndex + 1}.mp3`,
          category: theme.category,
          topic: theme.title,
          subtopic: day.title,
          introducedDay: dayIndex,
          source: wordnetExamples.has(word) ? 'Open English WordNet + Wiktionary/Kaikki' : 'Wiktionary/Kaikki'
        };
      })
    }))
  }));
  const payload = {
    generatedAt: new Date().toISOString(),
    licenses: ['Open English WordNet — CC BY 4.0', 'Wiktionary/Kaikki — CC BY-SA 3.0 + GFDL'],
    curriculum
  };
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, `window.OPEN_VOCABULARY = ${JSON.stringify(payload, null, 2)};\n`);
  console.log(`Đã tạo ${curriculum.length} chủ đề / ${curriculum.length * 70} từ tại ${outputFile}`);
  if (missing.length) console.warn(`Cần kiểm tra ${missing.length} nghĩa còn thiếu: ${missing.join(', ')}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
