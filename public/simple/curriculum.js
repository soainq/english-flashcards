(function () {
  const objectExamples = (word, meaning) => ({
    examples: [`I can see the ${word}.`, `I use the ${word} every day.`, `Please put the ${word} back in its place.`],
    translation: `Tôi có thể thấy ${meaning}.`
  });
  const animalExamples = (word, meaning) => {
    const article = /^[aeiou]/i.test(word) ? 'an' : 'a';
    return {
      examples: [`The ${word} is moving quietly.`, `I saw ${article} ${word} in a picture.`, `Can you describe the ${word}?`],
      translation: `${meaning.charAt(0).toUpperCase()}${meaning.slice(1)} đang di chuyển nhẹ nhàng.`
    };
  };
  const activityExamples = (word, meaning) => ({
    examples: [`I ${word} every day.`, `I usually ${word} as part of my routine.`, `I try to ${word} without rushing.`],
    translation: `Tôi ${meaning} mỗi ngày.`
  });

  const buildDays = (topicId, type, days) => days.map((day, dayIndex) => ({
    title: day[0],
    words: day[1].map(([word, ipa, meaning], wordIndex) => ({
      id: `theme:${topicId}:${dayIndex}:${wordIndex}`,
      word,
      ipa,
      meaning,
      audioPath: `/audio/themes/${topicId}-${dayIndex + 1}-${wordIndex + 1}.mp3`,
      ...(type === 'object' ? objectExamples(word, meaning) : type === 'animal' ? animalExamples(word, meaning) : activityExamples(word, meaning))
    }))
  }));

  const objects = {
    id: 'objects',
    title: 'Đồ vật quanh ta',
    description: 'Gọi tên và mô tả những đồ vật quen thuộc ở nhà, nơi làm việc và khi ra ngoài.',
    category: 'Đời sống',
    days: buildDays('objects', 'object', [
      ['Đồ dùng cá nhân', [
        ['wallet', '/ˈwɑː.lɪt/', 'chiếc ví'], ['key', '/kiː/', 'chìa khóa'], ['phone', '/foʊn/', 'điện thoại'], ['bag', '/bæɡ/', 'chiếc túi'], ['umbrella', '/ʌmˈbrel.ə/', 'chiếc ô'],
        ['watch', '/wɑːtʃ/', 'đồng hồ đeo tay'], ['glasses', '/ˈɡlæs.ɪz/', 'kính mắt'], ['notebook', '/ˈnoʊt.bʊk/', 'sổ tay'], ['pen', '/pen/', 'bút mực'], ['bottle', '/ˈbɑː.t̬əl/', 'cái chai']
      ]],
      ['Phòng khách', [
        ['sofa', '/ˈsoʊ.fə/', 'ghế sofa'], ['chair', '/tʃer/', 'cái ghế'], ['table', '/ˈteɪ.bəl/', 'cái bàn'], ['lamp', '/læmp/', 'đèn bàn'], ['television', '/ˈtel.ə.vɪʒ.ən/', 'ti vi'],
        ['remote', '/rɪˈmoʊt/', 'điều khiển từ xa'], ['cushion', '/ˈkʊʃ.ən/', 'gối tựa'], ['carpet', '/ˈkɑːr.pɪt/', 'thảm'], ['curtain', '/ˈkɝː.tən/', 'rèm cửa'], ['shelf', '/ʃelf/', 'cái kệ']
      ]],
      ['Trong bếp', [
        ['plate', '/pleɪt/', 'cái đĩa'], ['bowl', '/boʊl/', 'cái bát'], ['cup', '/kʌp/', 'cái cốc'], ['glass', '/ɡlæs/', 'ly thủy tinh'], ['spoon', '/spuːn/', 'cái thìa'],
        ['fork', '/fɔːrk/', 'cái nĩa'], ['knife', '/naɪf/', 'con dao'], ['pan', '/pæn/', 'cái chảo'], ['kettle', '/ˈket̬.əl/', 'ấm đun nước'], ['refrigerator', '/rɪˈfrɪdʒ.ə.reɪ.t̬ɚ/', 'tủ lạnh']
      ]],
      ['Phòng ngủ', [
        ['bed', '/bed/', 'cái giường'], ['pillow', '/ˈpɪl.oʊ/', 'cái gối'], ['blanket', '/ˈblæŋ.kɪt/', 'chăn'], ['sheet', '/ʃiːt/', 'ga giường'], ['wardrobe', '/ˈwɔːr.droʊb/', 'tủ quần áo'],
        ['drawer', '/drɔːr/', 'ngăn kéo'], ['mirror', '/ˈmɪr.ɚ/', 'gương'], ['hanger', '/ˈhæŋ.ɚ/', 'móc áo'], ['alarm clock', '/əˈlɑːrm klɑːk/', 'đồng hồ báo thức'], ['fan', '/fæn/', 'quạt']
      ]],
      ['Phòng tắm', [
        ['towel', '/ˈtaʊ.əl/', 'khăn tắm'], ['toothbrush', '/ˈtuːθ.brʌʃ/', 'bàn chải đánh răng'], ['toothpaste', '/ˈtuːθ.peɪst/', 'kem đánh răng'], ['soap', '/soʊp/', 'xà phòng'], ['shampoo', '/ʃæmˈpuː/', 'dầu gội'],
        ['comb', '/koʊm/', 'cái lược'], ['razor', '/ˈreɪ.zɚ/', 'dao cạo'], ['shower', '/ˈʃaʊ.ɚ/', 'vòi sen'], ['sink', '/sɪŋk/', 'bồn rửa'], ['tissue', '/ˈtɪʃ.uː/', 'khăn giấy']
      ]],
      ['Bàn làm việc', [
        ['laptop', '/ˈlæp.tɑːp/', 'máy tính xách tay'], ['keyboard', '/ˈkiː.bɔːrd/', 'bàn phím'], ['mouse', '/maʊs/', 'chuột máy tính'], ['monitor', '/ˈmɑː.nə.t̬ɚ/', 'màn hình'], ['charger', '/ˈtʃɑːr.dʒɚ/', 'bộ sạc'],
        ['cable', '/ˈkeɪ.bəl/', 'dây cáp'], ['printer', '/ˈprɪn.t̬ɚ/', 'máy in'], ['folder', '/ˈfoʊl.dɚ/', 'thư mục'], ['document', '/ˈdɑː.kjə.mənt/', 'tài liệu'], ['calendar', '/ˈkæl.ən.dɚ/', 'lịch']
      ]],
      ['Công cụ & thiết bị', [
        ['hammer', '/ˈhæm.ɚ/', 'cái búa'], ['screwdriver', '/ˈskruːˌdraɪ.vɚ/', 'tua vít'], ['scissors', '/ˈsɪz.ɚz/', 'cái kéo'], ['tape', '/teɪp/', 'băng dính'], ['battery', '/ˈbæt̬.ɚ.i/', 'pin'],
        ['flashlight', '/ˈflæʃ.laɪt/', 'đèn pin'], ['camera', '/ˈkæm.rə/', 'máy ảnh'], ['speaker', '/ˈspiː.kɚ/', 'loa'], ['headphones', '/ˈhed.foʊnz/', 'tai nghe'], ['tablet', '/ˈtæb.lət/', 'máy tính bảng']
      ]]
    ])
  };

  const animals = {
    id: 'animals',
    title: 'Động vật',
    description: 'Học tên các loài vật theo môi trường sống và những nhóm dễ liên tưởng.',
    category: 'Đời sống',
    days: buildDays('animals', 'animal', [
      ['Thú cưng', [
        ['cat', '/kæt/', 'con mèo'], ['dog', '/dɔːɡ/', 'con chó'], ['rabbit', '/ˈræb.ɪt/', 'con thỏ'], ['hamster', '/ˈhæm.stɚ/', 'chuột hamster'], ['parrot', '/ˈper.ət/', 'con vẹt'],
        ['goldfish', '/ˈɡoʊld.fɪʃ/', 'cá vàng'], ['turtle', '/ˈtɝː.t̬əl/', 'con rùa'], ['puppy', '/ˈpʌp.i/', 'chó con'], ['kitten', '/ˈkɪt̬.ən/', 'mèo con'], ['guinea pig', '/ˈɡɪn.i pɪɡ/', 'chuột lang']
      ]],
      ['Động vật trang trại', [
        ['cow', '/kaʊ/', 'con bò'], ['pig', '/pɪɡ/', 'con lợn'], ['horse', '/hɔːrs/', 'con ngựa'], ['sheep', '/ʃiːp/', 'con cừu'], ['goat', '/ɡoʊt/', 'con dê'],
        ['chicken', '/ˈtʃɪk.ɪn/', 'con gà'], ['duck', '/dʌk/', 'con vịt'], ['goose', '/ɡuːs/', 'con ngỗng'], ['donkey', '/ˈdɑːŋ.ki/', 'con lừa'], ['rooster', '/ˈruː.stɚ/', 'gà trống']
      ]],
      ['Động vật hoang dã', [
        ['lion', '/ˈlaɪ.ən/', 'sư tử'], ['tiger', '/ˈtaɪ.ɡɚ/', 'hổ'], ['elephant', '/ˈel.ə.fənt/', 'voi'], ['giraffe', '/dʒəˈræf/', 'hươu cao cổ'], ['zebra', '/ˈziː.brə/', 'ngựa vằn'],
        ['monkey', '/ˈmʌŋ.ki/', 'khỉ'], ['bear', '/ber/', 'gấu'], ['wolf', '/wʊlf/', 'sói'], ['fox', '/fɑːks/', 'cáo'], ['deer', '/dɪr/', 'hươu']
      ]],
      ['Sinh vật biển', [
        ['whale', '/weɪl/', 'cá voi'], ['dolphin', '/ˈdɑːl.fɪn/', 'cá heo'], ['shark', '/ʃɑːrk/', 'cá mập'], ['octopus', '/ˈɑːk.tə.pəs/', 'bạch tuộc'], ['seal', '/siːl/', 'hải cẩu'],
        ['crab', '/kræb/', 'cua'], ['lobster', '/ˈlɑːb.stɚ/', 'tôm hùm'], ['jellyfish', '/ˈdʒel.i.fɪʃ/', 'sứa'], ['penguin', '/ˈpeŋ.ɡwɪn/', 'chim cánh cụt'], ['seahorse', '/ˈsiː.hɔːrs/', 'cá ngựa']
      ]],
      ['Các loài chim', [
        ['eagle', '/ˈiː.ɡəl/', 'đại bàng'], ['owl', '/aʊl/', 'cú'], ['sparrow', '/ˈsper.oʊ/', 'chim sẻ'], ['pigeon', '/ˈpɪdʒ.ən/', 'chim bồ câu'], ['swan', '/swɑːn/', 'thiên nga'],
        ['peacock', '/ˈpiː.kɑːk/', 'con công'], ['crow', '/kroʊ/', 'quạ'], ['flamingo', '/fləˈmɪŋ.ɡoʊ/', 'hồng hạc'], ['woodpecker', '/ˈwʊdˌpek.ɚ/', 'chim gõ kiến'], ['seagull', '/ˈsiː.ɡʌl/', 'mòng biển']
      ]],
      ['Côn trùng & sinh vật nhỏ', [
        ['butterfly', '/ˈbʌt̬.ɚ.flaɪ/', 'bướm'], ['bee', '/biː/', 'ong'], ['ant', '/ænt/', 'kiến'], ['mosquito', '/məˈskiː.t̬oʊ/', 'muỗi'], ['fly', '/flaɪ/', 'ruồi'],
        ['beetle', '/ˈbiː.t̬əl/', 'bọ cánh cứng'], ['dragonfly', '/ˈdræɡ.ən.flaɪ/', 'chuồn chuồn'], ['grasshopper', '/ˈɡræsˌhɑː.pɚ/', 'châu chấu'], ['ladybug', '/ˈleɪ.di.bʌɡ/', 'bọ rùa'], ['spider', '/ˈspaɪ.dɚ/', 'nhện']
      ]],
      ['Động vật nổi bật', [
        ['kangaroo', '/ˌkæŋ.ɡəˈruː/', 'chuột túi'], ['koala', '/koʊˈɑː.lə/', 'gấu koala'], ['panda', '/ˈpæn.də/', 'gấu trúc'], ['crocodile', '/ˈkrɑː.kə.daɪl/', 'cá sấu'], ['hippopotamus', '/ˌhɪp.əˈpɑː.t̬ə.məs/', 'hà mã'],
        ['rhinoceros', '/raɪˈnɑː.sɚ.əs/', 'tê giác'], ['camel', '/ˈkæm.əl/', 'lạc đà'], ['cheetah', '/ˈtʃiː.t̬ə/', 'báo săn'], ['gorilla', '/ɡəˈrɪl.ə/', 'khỉ đột'], ['snake', '/sneɪk/', 'rắn']
      ]]
    ])
  };

  const activities = {
    id: 'activities',
    title: 'Hoạt động hằng ngày',
    description: 'Học các cụm động từ theo trình tự một ngày để dễ đưa vào giao tiếp.',
    category: 'Đời sống',
    days: buildDays('activities', 'activity', [
      ['Buổi sáng', [
        ['wake up', '/weɪk ʌp/', 'thức dậy'], ['get out of bed', '/ɡet aʊt əv bed/', 'ra khỏi giường'], ['brush my teeth', '/brʌʃ maɪ tiːθ/', 'đánh răng'], ['wash my face', '/wɑːʃ maɪ feɪs/', 'rửa mặt'], ['take a shower', '/teɪk ə ˈʃaʊ.ɚ/', 'tắm'],
        ['get dressed', '/ɡet drest/', 'mặc quần áo'], ['make breakfast', '/meɪk ˈbrek.fəst/', 'làm bữa sáng'], ['drink water', '/drɪŋk ˈwɔː.t̬ɚ/', 'uống nước'], ['check my phone', '/tʃek maɪ foʊn/', 'kiểm tra điện thoại'], ['leave home', '/liːv hoʊm/', 'rời khỏi nhà']
      ]],
      ['Việc nhà', [
        ['make the bed', '/meɪk ðə bed/', 'dọn giường'], ['wash the dishes', '/wɑːʃ ðə ˈdɪʃ.ɪz/', 'rửa bát'], ['do the laundry', '/duː ðə ˈlɔːn.dri/', 'giặt quần áo'], ['sweep the floor', '/swiːp ðə flɔːr/', 'quét nhà'], ['mop the floor', '/mɑːp ðə flɔːr/', 'lau nhà'],
        ['clean the room', '/kliːn ðə ruːm/', 'dọn phòng'], ['take out the trash', '/teɪk aʊt ðə træʃ/', 'đổ rác'], ['water the plants', '/ˈwɔː.t̬ɚ ðə plænts/', 'tưới cây'], ['cook dinner', '/kʊk ˈdɪn.ɚ/', 'nấu bữa tối'], ['organize my desk', '/ˈɔːr.ɡə.naɪz maɪ desk/', 'sắp xếp bàn làm việc']
      ]],
      ['Di chuyển', [
        ['walk to work', '/wɔːk tə wɝːk/', 'đi bộ đến nơi làm việc'], ['ride a bicycle', '/raɪd ə ˈbaɪ.sɪ.kəl/', 'đi xe đạp'], ['catch the bus', '/kætʃ ðə bʌs/', 'bắt xe buýt'], ['drive a car', '/draɪv ə kɑːr/', 'lái ô tô'], ['wait for the train', '/weɪt fər ðə treɪn/', 'đợi tàu'],
        ['cross the street', '/krɔːs ðə striːt/', 'băng qua đường'], ['ask for directions', '/æsk fər dəˈrek.ʃənz/', 'hỏi đường'], ['buy a ticket', '/baɪ ə ˈtɪk.ɪt/', 'mua vé'], ['get off the bus', '/ɡet ɔːf ðə bʌs/', 'xuống xe buýt'], ['arrive at work', '/əˈraɪv æt wɝːk/', 'đến nơi làm việc']
      ]],
      ['Tại nơi làm việc', [
        ['check my email', '/tʃek maɪ ˈiː.meɪl/', 'kiểm tra email'], ['join a meeting', '/dʒɔɪn ə ˈmiː.t̬ɪŋ/', 'tham gia cuộc họp'], ['take notes', '/teɪk noʊts/', 'ghi chú'], ['plan my tasks', '/plæn maɪ tæsks/', 'lên kế hoạch công việc'], ['discuss an idea', '/dɪˈskʌs ən aɪˈdiː.ə/', 'thảo luận ý tưởng'],
        ['solve a problem', '/sɑːlv ə ˈprɑː.bləm/', 'giải quyết vấn đề'], ['send a message', '/send ə ˈmes.ɪdʒ/', 'gửi tin nhắn'], ['review a document', '/rɪˈvjuː ə ˈdɑː.kjə.mənt/', 'xem lại tài liệu'], ['meet a deadline', '/miːt ə ˈded.laɪn/', 'kịp hạn chót'], ['take a break', '/teɪk ə breɪk/', 'nghỉ giải lao']
      ]],
      ['Học tập', [
        ['read a book', '/riːd ə bʊk/', 'đọc sách'], ['learn new words', '/lɝːn nuː wɝːdz/', 'học từ mới'], ['practice speaking', '/ˈpræk.tɪs ˈspiː.kɪŋ/', 'luyện nói'], ['listen to a podcast', '/ˈlɪs.ən tə ə ˈpɑːd.kæst/', 'nghe podcast'], ['watch a lesson', '/wɑːtʃ ə ˈles.ən/', 'xem bài học'],
        ['write a sentence', '/raɪt ə ˈsen.təns/', 'viết một câu'], ['ask a question', '/æsk ə ˈkwes.tʃən/', 'đặt câu hỏi'], ['answer a question', '/ˈæn.sɚ ə ˈkwes.tʃən/', 'trả lời câu hỏi'], ['review my notes', '/rɪˈvjuː maɪ noʊts/', 'ôn lại ghi chú'], ['take a test', '/teɪk ə test/', 'làm bài kiểm tra']
      ]],
      ['Vận động & gặp gỡ', [
        ['go for a walk', '/ɡoʊ fər ə wɔːk/', 'đi dạo'], ['go running', '/ɡoʊ ˈrʌn.ɪŋ/', 'đi chạy'], ['stretch my body', '/stretʃ maɪ ˈbɑː.di/', 'giãn cơ'], ['lift weights', '/lɪft weɪts/', 'nâng tạ'], ['play football', '/pleɪ ˈfʊt.bɔːl/', 'chơi bóng đá'],
        ['swim in the pool', '/swɪm ɪn ðə puːl/', 'bơi trong hồ'], ['meet a friend', '/miːt ə frend/', 'gặp bạn'], ['go shopping', '/ɡoʊ ˈʃɑː.pɪŋ/', 'đi mua sắm'], ['visit my family', '/ˈvɪz.ɪt maɪ ˈfæm.əl.i/', 'thăm gia đình'], ['take a photo', '/teɪk ə ˈfoʊ.t̬oʊ/', 'chụp ảnh']
      ]],
      ['Buổi tối', [
        ['finish work', '/ˈfɪn.ɪʃ wɝːk/', 'kết thúc công việc'], ['go home', '/ɡoʊ hoʊm/', 'về nhà'], ['prepare dinner', '/prɪˈper ˈdɪn.ɚ/', 'chuẩn bị bữa tối'], ['watch television', '/wɑːtʃ ˈtel.ə.vɪʒ.ən/', 'xem ti vi'], ['listen to music', '/ˈlɪs.ən tə ˈmjuː.zɪk/', 'nghe nhạc'],
        ['read the news', '/riːd ðə nuːz/', 'đọc tin tức'], ['plan tomorrow', '/plæn təˈmɑːr.oʊ/', 'lên kế hoạch ngày mai'], ['turn off the lights', '/tɝːn ɔːf ðə laɪts/', 'tắt đèn'], ['go to bed', '/ɡoʊ tə bed/', 'đi ngủ'], ['fall asleep', '/fɔːl əˈsliːp/', 'ngủ thiếp đi']
      ]]
    ])
  };

  const uiux = {
    id: 'uiux',
    title: 'UI/UX trong công việc',
    description: 'Từ chuyên ngành được nhóm theo quy trình thiết kế và cách cộng tác thực tế.',
    category: 'UI/UX',
    sourceDays: [
      ['Thành phần giao diện', ['button', 'navigation', 'dropdown', 'toggle', 'modal', 'layout', 'hierarchy', 'spacing', 'alignment', 'balance']],
      ['Màu sắc & luồng', ['contrast', 'palette', 'typeface', 'weight', 'legible', 'flow', 'entry point', 'friction', 'complete', 'drop off']],
      ['Nghiên cứu người dùng', ['interview', 'participant', 'behavior', 'insight', 'assumption', 'need', 'pain point', 'goal', 'context', 'constraint']],
      ['Prototype & kiểm thử', ['wireframe', 'prototype', 'fidelity', 'iterate', 'interaction', 'usability', 'scenario', 'observe', 'confusing', 'finding']],
      ['Accessibility & trình bày', ['accessible', 'disability', 'screen reader', 'alternative', 'inclusive', 'present', 'rationale', 'highlight', 'trade-off', 'decision']],
      ['Họp & phản hồi', ['agenda', 'discuss', 'clarify', 'suggest', 'agree', 'feedback', 'specific', 'improve', 'consider', 'appreciate']],
      ['Giải quyết vấn đề & sự nghiệp', ['identify', 'approach', 'feasible', 'prioritize', 'outcome', 'experience', 'responsible', 'collaborate', 'challenge', 'achievement']]
    ]
  };

  window.THEMED_CURRICULUM = [objects, animals, activities, uiux];
})();
