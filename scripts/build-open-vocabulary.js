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

const editorialTranslations = {
  hungry: ['Tôi đói sau quãng đường đi bộ dài.', 'Bây giờ bạn có đói không?', 'Chúng tôi thấy đói khi đang chờ tàu.'],
  delicious: ['Món súp này rất ngon.', 'Bữa ăn có mùi rất ngon.', 'Mọi thứ đều tươi và ngon.'],
  restaurant: ['Chúng tôi đã ăn tại một nhà hàng nhỏ.', 'Nhà hàng ở gần khách sạn.', 'Bạn có thể giới thiệu một nhà hàng ngon không?'],
  menu: ['Cho tôi xem thực đơn được không?', 'Thực đơn có một số món chay.', 'Món này không có trong thực đơn.'],
  order: ['Tôi đã sẵn sàng gọi món.', 'Món chúng tôi gọi sẽ sớm được chuẩn bị xong.', 'Tôi có thể thay đổi món đã gọi không?'],
  bill: ['Cho chúng tôi xin hóa đơn được không?', 'Hóa đơn đã bao gồm phí phục vụ.', 'Tôi đã thanh toán hóa đơn bằng thẻ.'],
  reservation: ['Tôi có đặt bàn cho hai người.', 'Chúng tôi đã đặt chỗ trực tuyến.', 'Bạn có thể xác nhận việc đặt chỗ của tôi không?'],
  left: ['Rẽ trái ở con phố tiếp theo.', 'Ngân hàng ở bên trái của bạn.', 'Đi về bên trái tại chỗ đường rẽ.'],
  right: ['Rẽ phải ở đèn giao thông.', 'Khách sạn ở bên phải của bạn.', 'Đi về bên phải tại chỗ đường rẽ.'],
  straight: ['Đi thẳng hai dãy nhà.', 'Tiếp tục đi thẳng qua ngân hàng.', 'Nhà ga ở ngay phía trước.'],
  north: ['Khách sạn nằm về phía bắc nhà ga.', 'Chúng tôi đang đi về phía bắc.', 'Con đường nào đi về phía bắc?'],
  south: ['Bãi biển nằm về phía nam thành phố.', 'Chúng tôi đang đi về phía nam.', 'Con đường nào đi về phía nam?'],
  east: ['Sân bay nằm về phía đông của nơi này.', 'Chúng tôi đang đi về phía đông.', 'Con đường nào đi về phía đông?'],
  west: ['Ngôi làng nằm về phía tây con sông.', 'Chúng tôi đang đi về phía tây.', 'Con đường nào đi về phía tây?'],
  near: ['Khách sạn ở gần sân bay.', 'Nhà ga có gần đây không?', 'Ngân hàng ở gần khu chợ.'],
  far: ['Bảo tàng ở xa nơi này.', 'Sân bay có xa không?', 'Khách sạn không xa bãi biển.'],
  corner: ['Rẽ phải ở góc đường.', 'Quán cà phê nằm ở góc đường.', 'Tôi sẽ đợi bạn ở góc đường.'],
  travel: ['Tôi thích đi du lịch bằng tàu hỏa.', 'Chúng tôi dự định đi du lịch vào mùa hè này.', 'Du lịch giúp chúng ta tìm hiểu về những nền văn hóa mới.'],
  visit: ['Tôi muốn ghé thăm bảo tàng.', 'Hôm qua chúng tôi đã ghé thăm khu phố cổ.', 'Ngày mai chúng ta có thể ghé thăm khu chợ không?'],
  explore: ['Hãy cùng đi bộ khám phá thành phố.', 'Chúng tôi đã khám phá một ngôi làng yên tĩnh.', 'Tôi muốn khám phá hòn đảo.'],
  drive: ['Tôi có thể lái xe đến sân bay.', 'Chúng tôi đã lái xe dọc bờ biển.', 'Bạn có thấy thoải mái khi lái xe ở đây không?'],
  ride: ['Tôi đi xe đạp đến nơi làm việc.', 'Chúng tôi đã đi xe buýt vào thị trấn.', 'Bạn có muốn đi cùng chúng tôi không?'],
  fly: ['Ngày mai chúng tôi bay đến Singapore.', 'Máy bay đang bay qua thành phố.', 'Tôi chưa bao giờ bay một mình.'],
  walk: ['Chúng ta có thể đi bộ đến nhà ga.', 'Tôi đã đi bộ quanh khu phố cổ.', 'Hãy cùng đi bộ dọc bãi biển.'],
  stay: ['Chúng tôi sẽ ở tại khách sạn này.', 'Bạn sẽ ở lại bao lâu?', 'Tôi đã ở gần sân bay.'],
  pack: ['Tôi cần đóng gói hành lý vào va-li.', 'Hãy mang ít đồ cho chuyến đi ngắn.', 'Bạn đã cất hộ chiếu vào hành lý chưa?'],
  return: ['Chúng tôi trở về nhà vào Chủ nhật.', 'Vui lòng trả lại chìa khóa phòng.', 'Tôi muốn quay lại vào năm sau.']
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

function fallbackTranslations(word, meaning, themeId, dayIndex) {
  if (editorialTranslations[word]) return editorialTranslations[word];
  const capitalized = `${meaning.charAt(0).toUpperCase()}${meaning.slice(1)}`;
  if (themeId === 'open-food') {
    if (dayIndex <= 1) return [`Hôm nay tôi đã mua một ít ${meaning}.`, `${capitalized} trông rất tươi.`, `Bạn có muốn dùng một ít ${meaning} không?`];
    if (dayIndex === 3) return [`Tôi muốn gọi ${meaning}, làm ơn.`, `${capitalized} này có vị ngon.`, `Cho tôi thêm ${meaning} được không?`];
    if (dayIndex === 4) return [`Món ăn có vị ${meaning}.`, `Nó có vị hơi ${meaning}.`, `Bạn có thích đồ ăn ${meaning} không?`];
    return [`Chúng tôi đã nói về ${meaning} trong bữa tối.`, `Tôi cần ${meaning}, làm ơn.`, `Tôi có thể tìm thấy ${meaning} ở đâu?`];
  }
  if (dayIndex === 4) return [`Rẽ ${meaning} ở con phố tiếp theo.`, `Từ đây đến đó có ${meaning} không?`, `Địa điểm đó ở ${meaning} nhà ga.`];
  if (dayIndex === 6) return [`Tôi muốn ${meaning} vào mùa hè này.`, `Chúng tôi dự định ${meaning} vào ngày mai.`, `Từ đây rất dễ ${meaning}.`];
  return [`${capitalized} ở đâu?`, `Từ đây tôi có thể nhìn thấy ${meaning}.`, `Bạn có thể chỉ cho tôi ${meaning} trên bản đồ không?`];
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
        const examples = fallbackExamples(word, theme.id, dayIndex);
        const exampleTranslations = fallbackTranslations(word, vi?.meaning || word, theme.id, dayIndex);
        return {
          id: `open:${theme.id}:${dayIndex}:${wordIndex}`,
          word,
          ipa: vi?.ipa || '',
          meaning: vi?.meaning || word,
          examples,
          exampleTranslations,
          translation: `Từ “${word}” có nghĩa là “${vi?.meaning || word}”.`,
          audioPath: `/audio/open/${theme.id}-${dayIndex + 1}-${wordIndex + 1}.mp3`,
          exampleAudioPaths: [1, 2, 3].map((number) => `/audio/open/${theme.id}-${dayIndex + 1}-${wordIndex + 1}-example-${number}.mp3`),
          category: theme.category,
          topic: theme.title,
          subtopic: day.title,
          introducedDay: dayIndex,
          source: 'Wiktionary/Kaikki + câu mẫu biên tập'
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
