(function () {
  const W = (word, ipa, meaning, example, exampleIpa, translation, part = 'từ') => ({ word, ipa, meaning, example, exampleIpa, translation, part });
  const D = (title, description, level, focus, words) => ({ title, description, level, focus, words });

  window.LEARNING_CONTENT = {
    lessons: [
      D('Chào hỏi & làm quen', 'Mở đầu một cuộc trò chuyện ngắn, tự nhiên và lịch sự.', 'A1 · NỀN TẢNG', '/h/ và /aɪ/', [
        W('hello', '/həˈloʊ/', 'xin chào', 'Hello, it is nice to meet you.', '/həˈloʊ, ɪt ɪz naɪs tə miːt juː/', 'Xin chào, rất vui được gặp bạn.'),
        W('name', '/neɪm/', 'tên', 'My name is Minh.', '/maɪ neɪm ɪz mɪn/', 'Tên tôi là Minh.'),
        W('meet', '/miːt/', 'gặp', 'It is great to meet you.', '/ɪt ɪz ɡreɪt tə miːt juː/', 'Thật vui khi được gặp bạn.'),
        W('welcome', '/ˈwel.kəm/', 'chào mừng', 'Welcome to our design team.', '/ˈwel.kəm tə aʊər dɪˈzaɪn tiːm/', 'Chào mừng bạn đến với đội thiết kế.'),
        W('introduce', '/ˌɪn.trəˈduːs/', 'giới thiệu', 'Let me introduce myself.', '/let miː ˌɪn.trəˈduːs maɪˈself/', 'Để tôi tự giới thiệu.')
      ]),
      D('Giới thiệu bản thân', 'Nói về quê quán, nghề nghiệp và sở thích bằng câu đơn.', 'A1 · NỀN TẢNG', '/aɪ/ và trọng âm từ', [
        W('live', '/lɪv/', 'sống', 'I live in Ho Chi Minh City.', '/aɪ lɪv ɪn hoʊ tʃiː mɪn ˈsɪti/', 'Tôi sống ở Thành phố Hồ Chí Minh.'),
        W('work', '/wɝːk/', 'làm việc', 'I work as a UI designer.', '/aɪ wɝːk æz ə juː aɪ dɪˈzaɪnər/', 'Tôi làm việc với vai trò nhà thiết kế UI.'),
        W('learn', '/lɝːn/', 'học', 'I am learning English every day.', '/aɪ æm ˈlɝːnɪŋ ˈɪŋɡlɪʃ ˈevri deɪ/', 'Tôi đang học tiếng Anh mỗi ngày.'),
        W('enjoy', '/ɪnˈdʒɔɪ/', 'thích, tận hưởng', 'I enjoy solving design problems.', '/aɪ ɪnˈdʒɔɪ ˈsɑːlvɪŋ dɪˈzaɪn ˈprɑːbləmz/', 'Tôi thích giải quyết các vấn đề thiết kế.'),
        W('hobby', '/ˈhɑː.bi/', 'sở thích', 'Photography is my favorite hobby.', '/fəˈtɑːɡrəfi ɪz maɪ ˈfeɪvərɪt ˈhɑːbi/', 'Nhiếp ảnh là sở thích yêu thích của tôi.')
      ]),
      D('Thói quen buổi sáng', 'Mô tả các hoạt động thường ngày bằng thì hiện tại đơn.', 'A1 · ĐỜI SỐNG', '/iː/ và /ɪ/', [
        W('wake up', '/weɪk ʌp/', 'thức dậy', 'I wake up at seven.', '/aɪ weɪk ʌp æt ˈsevən/', 'Tôi thức dậy lúc bảy giờ.', 'cụm từ'),
        W('prepare', '/prɪˈper/', 'chuẩn bị', 'I prepare a quick breakfast.', '/aɪ prɪˈper ə kwɪk ˈbrekfəst/', 'Tôi chuẩn bị một bữa sáng nhanh.'),
        W('usually', '/ˈjuː.ʒu.ə.li/', 'thường xuyên', 'I usually check my schedule.', '/aɪ ˈjuːʒuəli tʃek maɪ ˈskedʒuːl/', 'Tôi thường kiểm tra lịch trình.'),
        W('commute', '/kəˈmjuːt/', 'đi làm, đi học', 'My commute takes thirty minutes.', '/maɪ kəˈmjuːt teɪks ˈθɝːti ˈmɪnɪts/', 'Quãng đường đi làm của tôi mất ba mươi phút.'),
        W('routine', '/ruːˈtiːn/', 'thói quen', 'A simple routine keeps me focused.', '/ə ˈsɪmpəl ruːˈtiːn kiːps miː ˈfoʊkəst/', 'Một thói quen đơn giản giúp tôi tập trung.')
      ]),
      D('Thời gian & lịch hẹn', 'Hỏi giờ, sắp xếp và xác nhận một cuộc hẹn.', 'A1 · GIAO TIẾP', '/t/ cuối từ', [
        W('available', '/əˈveɪ.lə.bəl/', 'rảnh, có sẵn', 'Are you available this afternoon?', '/ɑːr juː əˈveɪləbəl ðɪs ˌæftərˈnuːn/', 'Bạn có rảnh chiều nay không?'),
        W('schedule', '/ˈskedʒ.uːl/', 'lịch trình', 'Let me check my schedule.', '/let miː tʃek maɪ ˈskedʒuːl/', 'Để tôi kiểm tra lịch.'),
        W('early', '/ˈɝː.li/', 'sớm', 'I arrived ten minutes early.', '/aɪ əˈraɪvd ten ˈmɪnɪts ˈɝːli/', 'Tôi đến sớm mười phút.'),
        W('delay', '/dɪˈleɪ/', 'trì hoãn', 'Can we delay the meeting?', '/kæn wiː dɪˈleɪ ðə ˈmiːtɪŋ/', 'Chúng ta có thể hoãn cuộc họp không?'),
        W('confirm', '/kənˈfɝːm/', 'xác nhận', 'Please confirm the time by email.', '/pliːz kənˈfɝːm ðə taɪm baɪ ˈiːmeɪl/', 'Vui lòng xác nhận thời gian qua email.')
      ]),
      D('Gia đình & bạn bè', 'Nói về những người gần gũi và các mối quan hệ.', 'A1 · ĐỜI SỐNG', '/ð/ trong “the”', [
        W('family', '/ˈfæm.əl.i/', 'gia đình', 'My family lives near the coast.', '/maɪ ˈfæməli lɪvz nɪr ðə koʊst/', 'Gia đình tôi sống gần bờ biển.'),
        W('parent', '/ˈper.ənt/', 'cha hoặc mẹ', 'My parents are very supportive.', '/maɪ ˈperənts ɑːr ˈveri səˈpɔːrtɪv/', 'Cha mẹ tôi rất ủng hộ tôi.'),
        W('close', '/kloʊs/', 'thân thiết', 'We have been close friends for years.', '/wiː hæv bɪn kloʊs frendz fər jɪrz/', 'Chúng tôi đã là bạn thân nhiều năm.'),
        W('visit', '/ˈvɪz.ɪt/', 'thăm', 'I visit my grandparents on Sundays.', '/aɪ ˈvɪzɪt maɪ ˈɡrænperənts ɑːn ˈsʌndeɪz/', 'Tôi thăm ông bà vào Chủ nhật.'),
        W('together', '/təˈɡeð.ər/', 'cùng nhau', 'We often cook together.', '/wiː ˈɔːfən kʊk təˈɡeðər/', 'Chúng tôi thường nấu ăn cùng nhau.')
      ]),
      D('Đồ ăn & gọi món', 'Gọi món, hỏi nguyên liệu và nói về sở thích ăn uống.', 'A1 · ĐỜI SỐNG', '/ʃ/ và /tʃ/', [
        W('menu', '/ˈmen.juː/', 'thực đơn', 'Could I see the menu, please?', '/kʊd aɪ siː ðə ˈmenjuː pliːz/', 'Cho tôi xem thực đơn được không?'),
        W('order', '/ˈɔːr.dər/', 'gọi món', 'I would like to order the noodles.', '/aɪ wʊd laɪk tə ˈɔːrdər ðə ˈnuːdəlz/', 'Tôi muốn gọi món mì.'),
        W('ingredient', '/ɪnˈɡriː.di.ənt/', 'nguyên liệu', 'Does this dish contain peanuts?', '/dʌz ðɪs dɪʃ kənˈteɪn ˈpiːnʌts/', 'Món này có đậu phộng không?'),
        W('delicious', '/dɪˈlɪʃ.əs/', 'ngon', 'The soup is really delicious.', '/ðə suːp ɪz ˈriːəli dɪˈlɪʃəs/', 'Món súp thật sự rất ngon.'),
        W('bill', '/bɪl/', 'hóa đơn', 'Could we have the bill, please?', '/kʊd wiː hæv ðə bɪl pliːz/', 'Cho chúng tôi xin hóa đơn nhé?')
      ]),
      D('Mua sắm & thanh toán', 'Hỏi giá, kích cỡ và xử lý các tình huống ở cửa hàng.', 'A1 · ĐỜI SỐNG', '/s/ và /z/', [
        W('price', '/praɪs/', 'giá', 'What is the price of this bag?', '/wʌt ɪz ðə praɪs əv ðɪs bæɡ/', 'Chiếc túi này có giá bao nhiêu?'),
        W('size', '/saɪz/', 'kích cỡ', 'Do you have this in a larger size?', '/duː juː hæv ðɪs ɪn ə ˈlɑːrdʒər saɪz/', 'Bạn có cỡ lớn hơn không?'),
        W('try on', '/traɪ ɑːn/', 'mặc thử', 'Can I try this jacket on?', '/kæn aɪ traɪ ðɪs ˈdʒækɪt ɑːn/', 'Tôi có thể thử chiếc áo khoác này không?', 'cụm từ'),
        W('receipt', '/rɪˈsiːt/', 'biên lai', 'Please keep your receipt.', '/pliːz kiːp jʊr rɪˈsiːt/', 'Vui lòng giữ lại biên lai.'),
        W('afford', '/əˈfɔːrd/', 'có đủ tiền mua', 'I cannot afford it right now.', '/aɪ ˈkænɑːt əˈfɔːrd ɪt raɪt naʊ/', 'Hiện tại tôi chưa đủ tiền mua nó.')
      ]),
      D('Đi lại trong thành phố', 'Hỏi đường và sử dụng phương tiện công cộng.', 'A2 · GIAO TIẾP', '/r/ và /l/', [
        W('direction', '/dəˈrek.ʃən/', 'phương hướng, chỉ đường', 'Could you give me directions?', '/kʊd juː ɡɪv miː dəˈrekʃənz/', 'Bạn có thể chỉ đường cho tôi không?'),
        W('straight', '/streɪt/', 'thẳng', 'Go straight for two blocks.', '/ɡoʊ streɪt fər tuː blɑːks/', 'Đi thẳng qua hai dãy nhà.'),
        W('corner', '/ˈkɔːr.nər/', 'góc đường', 'Turn left at the corner.', '/tɝːn left æt ðə ˈkɔːrnər/', 'Rẽ trái ở góc đường.'),
        W('station', '/ˈsteɪ.ʃən/', 'nhà ga, trạm', 'The station is across the street.', '/ðə ˈsteɪʃən ɪz əˈkrɔːs ðə striːt/', 'Nhà ga ở bên kia đường.'),
        W('fare', '/fer/', 'giá vé', 'How much is the bus fare?', '/haʊ mʌtʃ ɪz ðə bʌs fer/', 'Giá vé xe buýt là bao nhiêu?')
      ]),
      D('Cảm xúc & sức khỏe', 'Mô tả cảm giác, triệu chứng và nhu cầu nghỉ ngơi.', 'A2 · ĐỜI SỐNG', '/θ/ và /ð/', [
        W('tired', '/ˈtaɪərd/', 'mệt', 'I feel tired after a long day.', '/aɪ fiːl ˈtaɪərd ˈæftər ə lɔːŋ deɪ/', 'Tôi thấy mệt sau một ngày dài.'),
        W('worried', '/ˈwɝː.id/', 'lo lắng', 'I am worried about the deadline.', '/aɪ æm ˈwɝːid əˈbaʊt ðə ˈdedlaɪn/', 'Tôi lo về hạn chót.'),
        W('relaxed', '/rɪˈlækst/', 'thư giãn', 'Music helps me feel relaxed.', '/ˈmjuːzɪk helps miː fiːl rɪˈlækst/', 'Âm nhạc giúp tôi thấy thư giãn.'),
        W('headache', '/ˈhed.eɪk/', 'đau đầu', 'I have a slight headache.', '/aɪ hæv ə slaɪt ˈhedeɪk/', 'Tôi hơi đau đầu.'),
        W('rest', '/rest/', 'nghỉ ngơi', 'You should get some rest.', '/juː ʃʊd ɡet sʌm rest/', 'Bạn nên nghỉ ngơi một chút.')
      ]),
      D('Không gian làm việc', 'Mô tả nơi làm việc và các hoạt động văn phòng cơ bản.', 'A2 · CÔNG VIỆC', 'phụ âm cuối', [
        W('workspace', '/ˈwɝːk.speɪs/', 'không gian làm việc', 'My workspace is quiet and bright.', '/maɪ ˈwɝːkspeɪs ɪz ˈkwaɪət ænd braɪt/', 'Không gian làm việc của tôi yên tĩnh và sáng.'),
        W('colleague', '/ˈkɑː.liːɡ/', 'đồng nghiệp', 'I asked a colleague for feedback.', '/aɪ æskt ə ˈkɑːliːɡ fər ˈfiːdbæk/', 'Tôi đã hỏi một đồng nghiệp xin góp ý.'),
        W('task', '/tæsk/', 'nhiệm vụ', 'This task is my top priority.', '/ðɪs tæsk ɪz maɪ tɑːp praɪˈɔːrəti/', 'Nhiệm vụ này là ưu tiên hàng đầu của tôi.'),
        W('deadline', '/ˈded.laɪn/', 'hạn chót', 'The deadline is next Friday.', '/ðə ˈdedlaɪn ɪz nekst ˈfraɪdeɪ/', 'Hạn chót là thứ Sáu tới.'),
        W('focus', '/ˈfoʊ.kəs/', 'tập trung', 'I need to focus on this screen.', '/aɪ niːd tə ˈfoʊkəs ɑːn ðɪs skriːn/', 'Tôi cần tập trung vào màn hình này.')
      ]),
      D('Họp & cộng tác', 'Tham gia cuộc họp, xin làm rõ và đóng góp ý kiến.', 'A2 · CÔNG VIỆC', 'ngữ điệu câu hỏi', [
        W('agenda', '/əˈdʒen.də/', 'chương trình họp', 'What is on today’s agenda?', '/wʌt ɪz ɑːn təˈdeɪz əˈdʒendə/', 'Chương trình họp hôm nay có gì?'),
        W('discuss', '/dɪˈskʌs/', 'thảo luận', 'Let us discuss the user flow.', '/let ʌs dɪˈskʌs ðə ˈjuːzər floʊ/', 'Hãy thảo luận về luồng người dùng.'),
        W('clarify', '/ˈkler.ə.faɪ/', 'làm rõ', 'Could you clarify that point?', '/kʊd juː ˈklerəfaɪ ðæt pɔɪnt/', 'Bạn có thể làm rõ điểm đó không?'),
        W('suggest', '/səˈdʒest/', 'đề xuất', 'I suggest testing both options.', '/aɪ səˈdʒest ˈtestɪŋ boʊθ ˈɑːpʃənz/', 'Tôi đề xuất thử cả hai phương án.'),
        W('agree', '/əˈɡriː/', 'đồng ý', 'I agree with your approach.', '/aɪ əˈɡriː wɪð jʊr əˈproʊtʃ/', 'Tôi đồng ý với cách tiếp cận của bạn.')
      ]),
      D('Phản hồi chuyên nghiệp', 'Đưa và nhận phản hồi rõ ràng mà không gây phòng thủ.', 'A2 · CÔNG VIỆC', 'nhấn từ khóa', [
        W('feedback', '/ˈfiːd.bæk/', 'phản hồi', 'Thank you for the helpful feedback.', '/θæŋk juː fər ðə ˈhelpfəl ˈfiːdbæk/', 'Cảm ơn phản hồi hữu ích của bạn.'),
        W('specific', '/spəˈsɪf.ɪk/', 'cụ thể', 'Could you be more specific?', '/kʊd juː biː mɔːr spəˈsɪfɪk/', 'Bạn có thể nói cụ thể hơn không?'),
        W('improve', '/ɪmˈpruːv/', 'cải thiện', 'This change improves readability.', '/ðɪs tʃeɪndʒ ɪmˈpruːvz ˌriːdəˈbɪləti/', 'Thay đổi này cải thiện khả năng đọc.'),
        W('consider', '/kənˈsɪd.ər/', 'cân nhắc', 'We should consider another layout.', '/wiː ʃʊd kənˈsɪdər əˈnʌðər ˈleɪaʊt/', 'Chúng ta nên cân nhắc bố cục khác.'),
        W('appreciate', '/əˈpriː.ʃi.eɪt/', 'trân trọng', 'I appreciate your honest opinion.', '/aɪ əˈpriːʃieɪt jʊr ˈɑːnɪst əˈpɪnjən/', 'Tôi trân trọng ý kiến chân thành của bạn.')
      ]),
      D('Thành phần giao diện', 'Gọi tên và mô tả những thành phần UI phổ biến.', 'B1 · UI/UX', '/b/ và /p/', [
        W('button', '/ˈbʌt.ən/', 'nút bấm', 'The primary button needs more contrast.', '/ðə ˈpraɪmeri ˈbʌtən niːdz mɔːr ˈkɑːntræst/', 'Nút chính cần độ tương phản cao hơn.'),
        W('navigation', '/ˌnæv.əˈɡeɪ.ʃən/', 'điều hướng', 'The navigation should feel familiar.', '/ðə ˌnævəˈɡeɪʃən ʃʊd fiːl fəˈmɪljər/', 'Phần điều hướng nên tạo cảm giác quen thuộc.'),
        W('dropdown', '/ˈdrɑːp.daʊn/', 'danh sách thả xuống', 'Use a dropdown for long option lists.', '/juːz ə ˈdrɑːpdaʊn fər lɔːŋ ˈɑːpʃən lɪsts/', 'Dùng danh sách thả xuống cho nhiều lựa chọn.'),
        W('toggle', '/ˈtɑː.ɡəl/', 'công tắc', 'This toggle controls notifications.', '/ðɪs ˈtɑːɡəl kənˈtroʊlz ˌnoʊtəfəˈkeɪʃənz/', 'Công tắc này điều khiển thông báo.'),
        W('modal', '/ˈmoʊ.dəl/', 'hộp thoại nổi', 'The modal interrupts the main task.', '/ðə ˈmoʊdəl ˌɪntəˈrʌpts ðə meɪn tæsk/', 'Hộp thoại nổi làm gián đoạn nhiệm vụ chính.')
      ]),
      D('Bố cục & phân cấp', 'Giải thích cách tổ chức thông tin trên màn hình.', 'B1 · UI/UX', '/h/ đầu từ', [
        W('layout', '/ˈleɪ.aʊt/', 'bố cục', 'The layout adapts to small screens.', '/ðə ˈleɪaʊt əˈdæpts tə smɔːl skriːnz/', 'Bố cục thích ứng với màn hình nhỏ.'),
        W('hierarchy', '/ˈhaɪə.rɑːr.ki/', 'phân cấp', 'Clear hierarchy guides the eye.', '/klɪr ˈhaɪərɑːrki ɡaɪdz ðiː aɪ/', 'Phân cấp rõ ràng dẫn hướng mắt nhìn.'),
        W('spacing', '/ˈspeɪ.sɪŋ/', 'khoảng cách', 'Consistent spacing makes scanning easier.', '/kənˈsɪstənt ˈspeɪsɪŋ meɪks ˈskænɪŋ ˈiːziər/', 'Khoảng cách nhất quán giúp quét nội dung dễ hơn.'),
        W('alignment', '/əˈlaɪn.mənt/', 'căn chỉnh', 'The text alignment feels uneven.', '/ðə tekst əˈlaɪnmənt fiːlz ʌnˈiːvən/', 'Cách căn chữ tạo cảm giác không đều.'),
        W('balance', '/ˈbæl.əns/', 'sự cân bằng', 'White space creates visual balance.', '/waɪt speɪs kriˈeɪts ˈvɪʒuəl ˈbæləns/', 'Khoảng trắng tạo sự cân bằng thị giác.')
      ]),
      D('Màu sắc & kiểu chữ', 'Trao đổi về lựa chọn thị giác bằng từ ngữ chính xác.', 'B1 · UI/UX', '/k/ và /ɡ/', [
        W('contrast', '/ˈkɑːn.træst/', 'độ tương phản', 'Check the color contrast for accessibility.', '/tʃek ðə ˈkʌlər ˈkɑːntræst fər əkˌsesəˈbɪləti/', 'Hãy kiểm tra độ tương phản màu cho khả năng tiếp cận.'),
        W('palette', '/ˈpæl.ət/', 'bảng màu', 'The palette feels warm and friendly.', '/ðə ˈpælət fiːlz wɔːrm ænd ˈfrendli/', 'Bảng màu tạo cảm giác ấm áp và thân thiện.'),
        W('typeface', '/ˈtaɪp.feɪs/', 'kiểu chữ', 'This typeface works well for headlines.', '/ðɪs ˈtaɪpfeɪs wɝːks wel fər ˈhedlaɪnz/', 'Kiểu chữ này phù hợp với tiêu đề.'),
        W('weight', '/weɪt/', 'độ đậm chữ', 'Use a heavier weight for emphasis.', '/juːz ə ˈheviər weɪt fər ˈemfəsɪs/', 'Dùng độ đậm lớn hơn để nhấn mạnh.'),
        W('legible', '/ˈledʒ.ə.bəl/', 'dễ đọc', 'The label must remain legible.', '/ðə ˈleɪbəl mʌst rɪˈmeɪn ˈledʒəbəl/', 'Nhãn phải luôn dễ đọc.')
      ]),
      D('Luồng người dùng', 'Mô tả từng bước người dùng hoàn thành một mục tiêu.', 'B1 · UI/UX', 'nối âm', [
        W('flow', '/floʊ/', 'luồng', 'This flow has too many steps.', '/ðɪs floʊ hæz tuː ˈmeni steps/', 'Luồng này có quá nhiều bước.'),
        W('entry point', '/ˈen.tri pɔɪnt/', 'điểm bắt đầu', 'Search is the main entry point.', '/sɝːtʃ ɪz ðə meɪn ˈentri pɔɪnt/', 'Tìm kiếm là điểm bắt đầu chính.', 'cụm từ'),
        W('friction', '/ˈfrɪk.ʃən/', 'trở ngại trong trải nghiệm', 'The extra field creates friction.', '/ðiː ˈekstrə fiːld kriˈeɪts ˈfrɪkʃən/', 'Trường nhập thêm tạo ra trở ngại.'),
        W('complete', '/kəmˈpliːt/', 'hoàn thành', 'Users can complete checkout quickly.', '/ˈjuːzərz kæn kəmˈpliːt ˈtʃekaʊt ˈkwɪkli/', 'Người dùng có thể hoàn tất thanh toán nhanh.'),
        W('drop off', '/drɑːp ɔːf/', 'rời bỏ giữa chừng', 'Many users drop off at this step.', '/ˈmeni ˈjuːzərz drɑːp ɔːf æt ðɪs step/', 'Nhiều người dùng rời đi ở bước này.', 'cụm từ')
      ]),
      D('Nghiên cứu người dùng', 'Đặt câu hỏi và nói về dữ liệu nghiên cứu định tính.', 'B1 · UI/UX', '/w/ và /v/', [
        W('interview', '/ˈɪn.tər.vjuː/', 'phỏng vấn', 'We interviewed eight customers.', '/wiː ˈɪntərvjuːd eɪt ˈkʌstəmərz/', 'Chúng tôi đã phỏng vấn tám khách hàng.'),
        W('participant', '/pɑːrˈtɪs.ə.pənt/', 'người tham gia', 'The participant shared a clear example.', '/ðə pɑːrˈtɪsəpənt ʃerd ə klɪr ɪɡˈzæmpəl/', 'Người tham gia đã chia sẻ một ví dụ rõ ràng.'),
        W('behavior', '/bɪˈheɪ.vjər/', 'hành vi', 'We observed their actual behavior.', '/wiː əbˈzɝːvd ðer ˈæktʃuəl bɪˈheɪvjər/', 'Chúng tôi quan sát hành vi thực tế của họ.'),
        W('insight', '/ˈɪn.saɪt/', 'phát hiện sâu sắc', 'The interviews revealed a key insight.', '/ðiː ˈɪntərvjuːz rɪˈviːld ə kiː ˈɪnsaɪt/', 'Các cuộc phỏng vấn hé lộ một phát hiện quan trọng.'),
        W('assumption', '/əˈsʌmp.ʃən/', 'giả định', 'We need to test this assumption.', '/wiː niːd tə test ðɪs əˈsʌmpʃən/', 'Chúng ta cần kiểm chứng giả định này.')
      ]),
      D('Vấn đề & nhu cầu', 'Tổng hợp nghiên cứu thành nhu cầu và vấn đề thiết kế.', 'B1 · UI/UX', 'trọng âm câu', [
        W('need', '/niːd/', 'nhu cầu', 'Users need a faster way to search.', '/ˈjuːzərz niːd ə ˈfæstər weɪ tə sɝːtʃ/', 'Người dùng cần cách tìm kiếm nhanh hơn.'),
        W('pain point', '/ˈpeɪn pɔɪnt/', 'điểm khó chịu', 'Slow loading is a major pain point.', '/sloʊ ˈloʊdɪŋ ɪz ə ˈmeɪdʒər peɪn pɔɪnt/', 'Tải chậm là một điểm khó chịu lớn.', 'cụm từ'),
        W('goal', '/ɡoʊl/', 'mục tiêu', 'Their main goal is to save time.', '/ðer meɪn ɡoʊl ɪz tə seɪv taɪm/', 'Mục tiêu chính của họ là tiết kiệm thời gian.'),
        W('context', '/ˈkɑːn.tekst/', 'bối cảnh', 'Context changes how people use the app.', '/ˈkɑːntekst ˈtʃeɪndʒɪz haʊ ˈpiːpəl juːz ðiː æp/', 'Bối cảnh làm thay đổi cách mọi người dùng ứng dụng.'),
        W('constraint', '/kənˈstreɪnt/', 'ràng buộc', 'Budget is an important constraint.', '/ˈbʌdʒɪt ɪz ən ɪmˈpɔːrtənt kənˈstreɪnt/', 'Ngân sách là một ràng buộc quan trọng.')
      ]),
      D('Wireframe & prototype', 'Trình bày ý tưởng ở các mức độ hoàn thiện khác nhau.', 'B1 · UI/UX', '/f/ và /v/', [
        W('wireframe', '/ˈwaɪər.freɪm/', 'khung sườn', 'The wireframe shows the basic structure.', '/ðə ˈwaɪərfreɪm ʃoʊz ðə ˈbeɪsɪk ˈstrʌktʃər/', 'Khung sườn thể hiện cấu trúc cơ bản.'),
        W('prototype', '/ˈproʊ.t̬ə.taɪp/', 'nguyên mẫu', 'The prototype feels close to the final app.', '/ðə ˈproʊtətaɪp fiːlz kloʊs tə ðə ˈfaɪnəl æp/', 'Nguyên mẫu khá giống ứng dụng cuối.'),
        W('fidelity', '/fəˈdel.ə.ti/', 'độ hoàn thiện', 'Start with a low-fidelity sketch.', '/stɑːrt wɪð ə loʊ fəˈdeləti sketʃ/', 'Bắt đầu với bản phác thảo độ hoàn thiện thấp.'),
        W('iterate', '/ˈɪt̬.ə.reɪt/', 'lặp lại để cải tiến', 'We will test and iterate quickly.', '/wiː wɪl test ænd ˈɪtəreɪt ˈkwɪkli/', 'Chúng ta sẽ thử nghiệm và cải tiến nhanh.'),
        W('interaction', '/ˌɪn.t̬ərˈæk.ʃən/', 'tương tác', 'This interaction needs a clear response.', '/ðɪs ˌɪntərˈækʃən niːdz ə klɪr rɪˈspɑːns/', 'Tương tác này cần phản hồi rõ ràng.')
      ]),
      D('Usability testing', 'Điều phối kiểm thử và mô tả quan sát trung lập.', 'B1 · UI/UX', '/z/ số nhiều', [
        W('usability', '/ˌjuː.zəˈbɪl.ə.ti/', 'tính dễ sử dụng', 'We are testing the product’s usability.', '/wiː ɑːr ˈtestɪŋ ðə ˈprɑːdʌkts ˌjuːzəˈbɪləti/', 'Chúng tôi đang kiểm thử tính dễ sử dụng của sản phẩm.'),
        W('scenario', '/səˈner.i.oʊ/', 'tình huống giả định', 'Read the scenario before you begin.', '/riːd ðə səˈnerioʊ bɪˈfɔːr juː bɪˈɡɪn/', 'Hãy đọc tình huống trước khi bắt đầu.'),
        W('observe', '/əbˈzɝːv/', 'quan sát', 'I will observe without helping.', '/aɪ wɪl əbˈzɝːv wɪˈðaʊt ˈhelpɪŋ/', 'Tôi sẽ quan sát mà không trợ giúp.'),
        W('confusing', '/kənˈfjuː.zɪŋ/', 'gây bối rối', 'Was anything confusing on this page?', '/wʌz ˈeniθɪŋ kənˈfjuːzɪŋ ɑːn ðɪs peɪdʒ/', 'Có điều gì gây bối rối trên trang này không?'),
        W('finding', '/ˈfaɪn.dɪŋ/', 'kết quả nghiên cứu', 'We grouped the findings by theme.', '/wiː ɡruːpt ðə ˈfaɪndɪŋz baɪ θiːm/', 'Chúng tôi nhóm các kết quả theo chủ đề.')
      ]),
      D('Khả năng tiếp cận', 'Thiết kế bao trùm cho nhiều năng lực và hoàn cảnh.', 'B1 · UI/UX', 'âm tiết dài', [
        W('accessible', '/əkˈses.ə.bəl/', 'có thể tiếp cận', 'The form must be keyboard accessible.', '/ðə fɔːrm mʌst biː ˈkiːbɔːrd əkˈsesəbəl/', 'Biểu mẫu phải truy cập được bằng bàn phím.'),
        W('disability', '/ˌdɪs.əˈbɪl.ə.ti/', 'tình trạng khuyết tật', 'Disability can be permanent or temporary.', '/ˌdɪsəˈbɪləti kæn biː ˈpɝːmənənt ɔːr ˈtempəreri/', 'Khuyết tật có thể vĩnh viễn hoặc tạm thời.'),
        W('screen reader', '/ˈskriːn ˌriː.dər/', 'trình đọc màn hình', 'A screen reader announces the label.', '/ə skriːn ˈriːdər əˈnaʊnsɪz ðə ˈleɪbəl/', 'Trình đọc màn hình đọc nhãn lên.', 'cụm từ'),
        W('alternative', '/ɔːlˈtɝː.nə.t̬ɪv/', 'thay thế', 'Provide alternative text for images.', '/prəˈvaɪd ɔːlˈtɝːnətɪv tekst fər ˈɪmɪdʒɪz/', 'Cung cấp văn bản thay thế cho hình ảnh.'),
        W('inclusive', '/ɪnˈkluː.sɪv/', 'bao trùm', 'Inclusive design benefits everyone.', '/ɪnˈkluːsɪv dɪˈzaɪn ˈbenəfɪts ˈevriwʌn/', 'Thiết kế bao trùm mang lợi ích cho mọi người.')
      ]),
      D('Trình bày thiết kế', 'Dẫn dắt một buổi review từ bối cảnh đến quyết định.', 'B1 · UI/UX', 'ngắt cụm ý', [
        W('present', '/prɪˈzent/', 'trình bày', 'I will present two design directions.', '/aɪ wɪl prɪˈzent tuː dɪˈzaɪn dəˈrekʃənz/', 'Tôi sẽ trình bày hai hướng thiết kế.'),
        W('rationale', '/ˌræʃ.əˈnæl/', 'lý do đằng sau quyết định', 'Let me explain the design rationale.', '/let miː ɪkˈspleɪn ðə dɪˈzaɪn ˌræʃəˈnæl/', 'Để tôi giải thích cơ sở của thiết kế.'),
        W('highlight', '/ˈhaɪ.laɪt/', 'nhấn mạnh', 'I want to highlight one key change.', '/aɪ wɑːnt tə ˈhaɪlaɪt wʌn kiː tʃeɪndʒ/', 'Tôi muốn nhấn mạnh một thay đổi chính.'),
        W('trade-off', '/ˈtreɪd ɔːf/', 'sự đánh đổi', 'Every solution has a trade-off.', '/ˈevri səˈluːʃən hæz ə ˈtreɪd ɔːf/', 'Mỗi giải pháp đều có sự đánh đổi.'),
        W('decision', '/dɪˈsɪʒ.ən/', 'quyết định', 'The research supports this decision.', '/ðə rɪˈsɝːtʃ səˈpɔːrts ðɪs dɪˈsɪʒən/', 'Nghiên cứu ủng hộ quyết định này.')
      ]),
      D('Nói qua điện thoại', 'Mở đầu, xin nhắc lại và kết thúc cuộc gọi lịch sự.', 'B1 · GIAO TIẾP', 'nhịp điệu tự nhiên', [
        W('calling', '/ˈkɔː.lɪŋ/', 'đang gọi', 'I am calling about our appointment.', '/aɪ æm ˈkɔːlɪŋ əˈbaʊt aʊər əˈpɔɪntmənt/', 'Tôi gọi về cuộc hẹn của chúng ta.'),
        W('hold', '/hoʊld/', 'giữ máy', 'Could you hold for a moment?', '/kʊd juː hoʊld fər ə ˈmoʊmənt/', 'Bạn giữ máy một lát được không?'),
        W('repeat', '/rɪˈpiːt/', 'lặp lại', 'Could you repeat that more slowly?', '/kʊd juː rɪˈpiːt ðæt mɔːr ˈsloʊli/', 'Bạn có thể nhắc lại chậm hơn không?'),
        W('connection', '/kəˈnek.ʃən/', 'kết nối', 'The connection is not very clear.', '/ðə kəˈnekʃən ɪz nɑːt ˈveri klɪr/', 'Đường truyền không rõ lắm.'),
        W('message', '/ˈmes.ɪdʒ/', 'lời nhắn', 'Can I leave a message?', '/kæn aɪ liːv ə ˈmesɪdʒ/', 'Tôi có thể để lại lời nhắn không?')
      ]),
      D('Du lịch & khách sạn', 'Làm thủ tục, yêu cầu hỗ trợ và xử lý thay đổi.', 'B1 · ĐỜI SỐNG', '/tʃ/ và /dʒ/', [
        W('reservation', '/ˌrez.ərˈveɪ.ʃən/', 'đặt chỗ', 'I have a reservation under Nguyen.', '/aɪ hæv ə ˌrezərˈveɪʃən ˈʌndər nɡwiːn/', 'Tôi có đặt phòng dưới tên Nguyễn.'),
        W('check in', '/tʃek ɪn/', 'làm thủ tục nhận phòng', 'What time can we check in?', '/wʌt taɪm kæn wiː tʃek ɪn/', 'Mấy giờ chúng tôi có thể nhận phòng?', 'cụm từ'),
        W('luggage', '/ˈlʌɡ.ɪdʒ/', 'hành lý', 'Could you store our luggage?', '/kʊd juː stɔːr aʊər ˈlʌɡɪdʒ/', 'Bạn có thể giữ hành lý giúp chúng tôi không?'),
        W('cancel', '/ˈkæn.səl/', 'hủy', 'I need to cancel my booking.', '/aɪ niːd tə ˈkænsəl maɪ ˈbʊkɪŋ/', 'Tôi cần hủy đặt chỗ.'),
        W('recommend', '/ˌrek.əˈmend/', 'gợi ý', 'Can you recommend a local restaurant?', '/kæn juː ˌrekəˈmend ə ˈloʊkəl ˈrestərɑːnt/', 'Bạn có thể gợi ý một nhà hàng địa phương không?')
      ]),
      D('Nêu quan điểm', 'Trình bày và bảo vệ ý kiến với ngôn ngữ cân bằng.', 'B1 · IELTS', 'ngữ điệu nhấn mạnh', [
        W('opinion', '/əˈpɪn.jən/', 'quan điểm', 'In my opinion, clarity comes first.', '/ɪn maɪ əˈpɪnjən ˈklerəti kʌmz fɝːst/', 'Theo tôi, sự rõ ràng là ưu tiên đầu tiên.'),
        W('believe', '/bɪˈliːv/', 'tin rằng', 'I believe this is the better option.', '/aɪ bɪˈliːv ðɪs ɪz ðə ˈbetər ˈɑːpʃən/', 'Tôi tin đây là lựa chọn tốt hơn.'),
        W('evidence', '/ˈev.ə.dəns/', 'bằng chứng', 'The evidence supports our argument.', '/ðiː ˈevədəns səˈpɔːrts aʊər ˈɑːrɡjəmənt/', 'Bằng chứng ủng hộ lập luận của chúng ta.'),
        W('however', '/haʊˈev.ər/', 'tuy nhiên', 'However, the sample was quite small.', '/haʊˈevər ðə ˈsæmpəl wʌz kwaɪt smɔːl/', 'Tuy nhiên, mẫu nghiên cứu khá nhỏ.'),
        W('perspective', '/pərˈspek.tɪv/', 'góc nhìn', 'I understand your perspective.', '/aɪ ˌʌndərˈstænd jʊr pərˈspektɪv/', 'Tôi hiểu góc nhìn của bạn.')
      ]),
      D('So sánh & đối chiếu', 'Dùng ngôn ngữ so sánh cho IELTS và design critique.', 'B1 · IELTS', 'đuôi so sánh', [
        W('similar', '/ˈsɪm.ə.lər/', 'tương tự', 'The two concepts are quite similar.', '/ðə tuː ˈkɑːnsepts ɑːr kwaɪt ˈsɪmələr/', 'Hai ý tưởng khá tương tự nhau.'),
        W('difference', '/ˈdɪf.ər.əns/', 'sự khác biệt', 'The main difference is the navigation.', '/ðə meɪn ˈdɪfərəns ɪz ðə ˌnævəˈɡeɪʃən/', 'Khác biệt chính nằm ở điều hướng.'),
        W('whereas', '/werˈæz/', 'trong khi', 'Option A is simple, whereas B is flexible.', '/ˈɑːpʃən eɪ ɪz ˈsɪmpəl werˈæz biː ɪz ˈfleksəbəl/', 'Phương án A đơn giản, trong khi B linh hoạt.'),
        W('advantage', '/ədˈvæn.tɪdʒ/', 'lợi thế', 'Speed is the biggest advantage.', '/spiːd ɪz ðə ˈbɪɡəst ədˈvæntɪdʒ/', 'Tốc độ là lợi thế lớn nhất.'),
        W('outweigh', '/ˌaʊtˈweɪ/', 'quan trọng hơn, vượt trội', 'The benefits outweigh the risks.', '/ðə ˈbenəfɪts ˌaʊtˈweɪ ðə rɪsks/', 'Lợi ích lớn hơn rủi ro.')
      ]),
      D('Mô tả số liệu', 'Nói về xu hướng, tỷ lệ và thay đổi cho IELTS Writing Task 1.', 'B2 · IELTS', 'số và phần trăm', [
        W('increase', '/ɪnˈkriːs/', 'tăng', 'Mobile usage increased by twenty percent.', '/ˈmoʊbəl ˈjuːsɪdʒ ɪnˈkriːst baɪ ˈtwenti pərˈsent/', 'Mức sử dụng di động tăng hai mươi phần trăm.'),
        W('decline', '/dɪˈklaɪn/', 'giảm', 'The error rate declined steadily.', '/ðiː ˈerər reɪt dɪˈklaɪnd ˈstedəli/', 'Tỷ lệ lỗi giảm đều.'),
        W('remain', '/rɪˈmeɪn/', 'duy trì', 'The figure remained stable in June.', '/ðə ˈfɪɡjər rɪˈmeɪnd ˈsteɪbəl ɪn dʒuːn/', 'Con số duy trì ổn định trong tháng Sáu.'),
        W('approximately', '/əˈprɑːk.sə.mət.li/', 'xấp xỉ', 'Approximately half chose option A.', '/əˈprɑːksəmətli hæf tʃoʊz ˈɑːpʃən eɪ/', 'Khoảng một nửa chọn phương án A.'),
        W('significant', '/sɪɡˈnɪf.ə.kənt/', 'đáng kể', 'There was a significant improvement.', '/ðer wʌz ə sɪɡˈnɪfɪkənt ɪmˈpruːvmənt/', 'Đã có một sự cải thiện đáng kể.')
      ]),
      D('Công nghệ & xã hội', 'Xây ý cho chủ đề IELTS phổ biến bằng từ vựng học thuật.', 'B2 · IELTS', 'từ nhiều âm tiết', [
        W('innovation', '/ˌɪn.əˈveɪ.ʃən/', 'sự đổi mới', 'Innovation can improve public services.', '/ˌɪnəˈveɪʃən kæn ɪmˈpruːv ˈpʌblɪk ˈsɝːvɪsɪz/', 'Đổi mới có thể cải thiện dịch vụ công.'),
        W('privacy', '/ˈpraɪ.və.si/', 'quyền riêng tư', 'People are concerned about online privacy.', '/ˈpiːpəl ɑːr kənˈsɝːnd əˈbaʊt ˈɑːnlaɪn ˈpraɪvəsi/', 'Mọi người lo ngại về quyền riêng tư trực tuyến.'),
        W('impact', '/ˈɪm.pækt/', 'tác động', 'Technology has a major social impact.', '/tekˈnɑːlədʒi hæz ə ˈmeɪdʒər ˈsoʊʃəl ˈɪmpækt/', 'Công nghệ có tác động xã hội lớn.'),
        W('dependence', '/dɪˈpen.dəns/', 'sự phụ thuộc', 'Digital dependence may reduce attention.', '/ˈdɪdʒɪtəl dɪˈpendəns meɪ rɪˈduːs əˈtenʃən/', 'Sự phụ thuộc kỹ thuật số có thể làm giảm chú ý.'),
        W('ethical', '/ˈeθ.ɪ.kəl/', 'thuộc đạo đức', 'AI raises important ethical questions.', '/eɪ aɪ ˈreɪzɪz ɪmˈpɔːrtənt ˈeθɪkəl ˈkwestʃənz/', 'AI đặt ra những câu hỏi đạo đức quan trọng.')
      ]),
      D('Giáo dục & học tập', 'Thảo luận sâu hơn về kỹ năng, trường học và học suốt đời.', 'B2 · IELTS', '/dʒ/ và /ʒ/', [
        W('curriculum', '/kəˈrɪk.jə.ləm/', 'chương trình học', 'The curriculum should include practical skills.', '/ðə kəˈrɪkjələm ʃʊd ɪnˈkluːd ˈpræktɪkəl skɪlz/', 'Chương trình học nên bao gồm kỹ năng thực tế.'),
        W('access', '/ˈæk.ses/', 'quyền tiếp cận', 'Every child deserves access to education.', '/ˈevri tʃaɪld dɪˈzɝːvz ˈækses tʊ ˌedʒəˈkeɪʃən/', 'Mọi trẻ em đều xứng đáng được tiếp cận giáo dục.'),
        W('develop', '/dɪˈvel.əp/', 'phát triển', 'Group work develops communication skills.', '/ɡruːp wɝːk dɪˈveləps kəˌmjuːnəˈkeɪʃən skɪlz/', 'Làm việc nhóm phát triển kỹ năng giao tiếp.'),
        W('assessment', '/əˈses.mənt/', 'sự đánh giá', 'Assessment should measure real understanding.', '/əˈsesmənt ʃʊd ˈmeʒər riːl ˌʌndərˈstændɪŋ/', 'Đánh giá nên đo lường sự hiểu biết thực sự.'),
        W('lifelong', '/ˈlaɪf.lɔːŋ/', 'suốt đời', 'Curiosity supports lifelong learning.', '/ˌkjʊriˈɑːsəti səˈpɔːrts ˈlaɪflɔːŋ ˈlɝːnɪŋ/', 'Sự tò mò hỗ trợ việc học suốt đời.')
      ]),
      D('Môi trường & thành phố', 'Phát triển câu trả lời IELTS về phát triển bền vững.', 'B2 · IELTS', 'cụm phụ âm', [
        W('sustainable', '/səˈsteɪ.nə.bəl/', 'bền vững', 'Cities need sustainable transport systems.', '/ˈsɪtiz niːd səˈsteɪnəbəl ˈtrænspɔːrt ˈsɪstəmz/', 'Các thành phố cần hệ thống giao thông bền vững.'),
        W('pollution', '/pəˈluː.ʃən/', 'ô nhiễm', 'Air pollution affects public health.', '/er pəˈluːʃən əˈfekts ˈpʌblɪk helθ/', 'Ô nhiễm không khí ảnh hưởng sức khỏe cộng đồng.'),
        W('resource', '/ˈriː.sɔːrs/', 'tài nguyên', 'Water is a limited resource.', '/ˈwɔːtər ɪz ə ˈlɪmɪtɪd ˈriːsɔːrs/', 'Nước là một tài nguyên hữu hạn.'),
        W('preserve', '/prɪˈzɝːv/', 'bảo tồn', 'We must preserve natural habitats.', '/wiː mʌst prɪˈzɝːv ˈnætʃərəl ˈhæbɪtæts/', 'Chúng ta phải bảo tồn môi trường sống tự nhiên.'),
        W('responsibility', '/rɪˌspɑːn.səˈbɪl.ə.ti/', 'trách nhiệm', 'Governments and citizens share responsibility.', '/ˈɡʌvərnmənts ænd ˈsɪtɪzənz ʃer rɪˌspɑːnsəˈbɪləti/', 'Chính phủ và người dân cùng chia sẻ trách nhiệm.')
      ]),
      D('Kể một trải nghiệm', 'Xây câu trả lời IELTS Speaking Part 2 mạch lạc và sinh động.', 'B2 · IELTS', 'thì quá khứ', [
        W('memorable', '/ˈmem.ər.ə.bəl/', 'đáng nhớ', 'It was one of my most memorable trips.', '/ɪt wʌz wʌn əv maɪ moʊst ˈmemərəbəl trɪps/', 'Đó là một trong những chuyến đi đáng nhớ nhất của tôi.'),
        W('initially', '/ɪˈnɪʃ.ə.li/', 'ban đầu', 'Initially, I felt a little nervous.', '/ɪˈnɪʃəli aɪ felt ə ˈlɪtəl ˈnɝːvəs/', 'Ban đầu, tôi cảm thấy hơi lo.'),
        W('eventually', '/ɪˈven.tʃu.ə.li/', 'cuối cùng', 'Eventually, we found the right solution.', '/ɪˈventʃuəli wiː faʊnd ðə raɪt səˈluːʃən/', 'Cuối cùng, chúng tôi tìm được giải pháp đúng.'),
        W('realize', '/ˈriː.ə.laɪz/', 'nhận ra', 'I realized how much I had learned.', '/aɪ ˈriːəlaɪzd haʊ mʌtʃ aɪ hæd lɝːnd/', 'Tôi nhận ra mình đã học được rất nhiều.'),
        W('inspire', '/ɪnˈspaɪər/', 'truyền cảm hứng', 'The experience inspired me to change.', '/ðiː ɪkˈspɪriəns ɪnˈspaɪərd miː tə tʃeɪndʒ/', 'Trải nghiệm đó truyền cảm hứng để tôi thay đổi.')
      ]),
      D('Giải quyết vấn đề', 'Diễn đạt nguyên nhân, lựa chọn và giải pháp một cách thuyết phục.', 'B2 · CÔNG VIỆC', 'âm yếu /ə/', [
        W('identify', '/aɪˈden.t̬ə.faɪ/', 'xác định', 'First, we need to identify the root cause.', '/fɝːst wiː niːd tə aɪˈdentəfaɪ ðə ruːt kɔːz/', 'Trước tiên, chúng ta cần xác định nguyên nhân gốc.'),
        W('approach', '/əˈproʊtʃ/', 'cách tiếp cận', 'We tried a different approach.', '/wiː traɪd ə ˈdɪfərənt əˈproʊtʃ/', 'Chúng tôi đã thử một cách tiếp cận khác.'),
        W('feasible', '/ˈfiː.zə.bəl/', 'khả thi', 'Is this solution technically feasible?', '/ɪz ðɪs səˈluːʃən ˈteknɪkli ˈfiːzəbəl/', 'Giải pháp này có khả thi về kỹ thuật không?'),
        W('prioritize', '/praɪˈɔːr.ə.taɪz/', 'ưu tiên', 'We prioritized the highest user risk.', '/wiː praɪˈɔːrətaɪzd ðə ˈhaɪəst ˈjuːzər rɪsk/', 'Chúng tôi ưu tiên rủi ro người dùng cao nhất.'),
        W('outcome', '/ˈaʊt.kʌm/', 'kết quả', 'The outcome exceeded our expectations.', '/ðiː ˈaʊtkʌm ɪkˈsiːdɪd aʊər ˌekspekˈteɪʃənz/', 'Kết quả vượt quá mong đợi của chúng tôi.')
      ]),
      D('Phỏng vấn xin việc UI/UX', 'Tóm tắt kinh nghiệm và nói về quy trình thiết kế tự tin.', 'B2 · SỰ NGHIỆP', 'nói theo cụm', [
        W('experience', '/ɪkˈspɪr.i.əns/', 'kinh nghiệm', 'I have three years of product design experience.', '/aɪ hæv θriː jɪrz əv ˈprɑːdʌkt dɪˈzaɪn ɪkˈspɪriəns/', 'Tôi có ba năm kinh nghiệm thiết kế sản phẩm.'),
        W('responsible', '/rɪˈspɑːn.sə.bəl/', 'chịu trách nhiệm', 'I was responsible for the mobile experience.', '/aɪ wʌz rɪˈspɑːnsəbəl fər ðə ˈmoʊbəl ɪkˈspɪriəns/', 'Tôi chịu trách nhiệm về trải nghiệm di động.'),
        W('collaborate', '/kəˈlæb.ə.reɪt/', 'cộng tác', 'I collaborate closely with engineers.', '/aɪ kəˈlæbəreɪt ˈkloʊsli wɪð ˌendʒəˈnɪrz/', 'Tôi cộng tác chặt chẽ với các kỹ sư.'),
        W('challenge', '/ˈtʃæl.ɪndʒ/', 'thử thách', 'The biggest challenge was limited data.', '/ðə ˈbɪɡəst ˈtʃælɪndʒ wʌz ˈlɪmɪtɪd ˈdeɪtə/', 'Thử thách lớn nhất là dữ liệu hạn chế.'),
        W('achievement', '/əˈtʃiːv.mənt/', 'thành tựu', 'I am proud of this achievement.', '/aɪ æm praʊd əv ðɪs əˈtʃiːvmənt/', 'Tôi tự hào về thành tựu này.')
      ]),
      D('Tổng kết & cam kết', 'Nhìn lại chặng đầu và đặt mục tiêu học bền vững.', 'B2 · TỔNG KẾT', 'độ trôi chảy', [
        W('progress', '/ˈprɑː.ɡres/', 'tiến bộ', 'I can see steady progress in my speaking.', '/aɪ kæn siː ˈstedi ˈprɑːɡres ɪn maɪ ˈspiːkɪŋ/', 'Tôi có thể thấy tiến bộ đều trong kỹ năng nói.'),
        W('consistent', '/kənˈsɪs.tənt/', 'đều đặn', 'Consistent practice builds confidence.', '/kənˈsɪstənt ˈpræktɪs bɪldz ˈkɑːnfədəns/', 'Luyện tập đều đặn xây dựng sự tự tin.'),
        W('reflect', '/rɪˈflekt/', 'chiêm nghiệm', 'Take a moment to reflect on your week.', '/teɪk ə ˈmoʊmənt tə rɪˈflekt ɑːn jʊr wiːk/', 'Hãy dành một chút để nhìn lại tuần của bạn.'),
        W('commit', '/kəˈmɪt/', 'cam kết', 'I commit to thirty minutes a day.', '/aɪ kəˈmɪt tə ˈθɝːti ˈmɪnɪts ə deɪ/', 'Tôi cam kết học ba mươi phút mỗi ngày.'),
        W('confident', '/ˈkɑːn.fə.dənt/', 'tự tin', 'I feel more confident speaking English.', '/aɪ fiːl mɔːr ˈkɑːnfədənt ˈspiːkɪŋ ˈɪŋɡlɪʃ/', 'Tôi thấy tự tin hơn khi nói tiếng Anh.')
      ])
    ],

    roadmap: [
      {
        phase: 'Chặng 1', weeks: 'Tuần 1–4', title: 'Dựng lại nền móng', level: 'A0 → A1', color: 'coral',
        outcome: 'Giới thiệu bản thân, xử lý tình huống đời sống cơ bản và đọc đúng IPA.',
        items: ['Tuần 1 · Âm cơ bản, chào hỏi, đại từ & động từ to be', 'Tuần 2 · Hiện tại đơn, thói quen, giờ giấc', 'Tuần 3 · Danh từ, số lượng, ăn uống & mua sắm', 'Tuần 4 · Hỏi đường, gia đình, sức khỏe + bài kiểm tra A1']
      },
      {
        phase: 'Chặng 2', weeks: 'Tuần 5–10', title: 'Giao tiếp có phản xạ', level: 'A1 → A2', color: 'amber',
        outcome: 'Duy trì hội thoại 3–5 phút, viết email ngắn và nghe được ý chính.',
        items: ['Tuần 5–6 · Quá khứ, tương lai & kể trải nghiệm', 'Tuần 7–8 · Công việc, họp, email & phản hồi', 'Tuần 9 · Du lịch, điện thoại & tình huống bất ngờ', 'Tuần 10 · Ôn A2 + nói 5 phút không chuẩn bị']
      },
      {
        phase: 'Chặng 3', weeks: 'Tuần 11–16', title: 'English for UI/UX', level: 'A2 → B1', color: 'teal',
        outcome: 'Trình bày case study, điều phối user interview và tham gia design critique.',
        items: ['Tuần 11 · UI components, layout & visual hierarchy', 'Tuần 12 · User flow, IA & interaction patterns', 'Tuần 13 · Research, interview & insight synthesis', 'Tuần 14 · Wireframe, prototype & usability testing', 'Tuần 15 · Accessibility, design system & handoff', 'Tuần 16 · Portfolio presentation + mock interview']
      },
      {
        phase: 'Chặng 4', weeks: 'Tuần 17–24', title: 'Bứt phá IELTS 6.5', level: 'B1 → B2', color: 'navy',
        outcome: 'Đạt nền tảng mục tiêu Listening/Reading 6.5–7.0, Writing/Speaking 6.0–6.5.',
        items: ['Tuần 17–18 · Listening theo dạng bài + ghi chú', 'Tuần 19–20 · Reading: skimming, scanning, paraphrase', 'Tuần 21 · Writing Task 1: số liệu & quy trình', 'Tuần 22 · Writing Task 2: lập luận 4 đoạn', 'Tuần 23 · Speaking Part 1–3 + sửa phát âm', 'Tuần 24 · 2 mock tests, phân tích lỗi & kế hoạch thi']
      }
    ],

    weeklyRoutine: [
      ['T2', 'Từ vựng + phát âm', '35 phút'],
      ['T3', 'Ngữ pháp trong ngữ cảnh', '40 phút'],
      ['T4', 'Nghe chủ động + chép chính tả', '35 phút'],
      ['T5', 'UI/UX English + nói', '45 phút'],
      ['T6', 'Đọc hoặc viết có sửa lỗi', '45 phút'],
      ['T7', 'Hội thoại + shadowing', '35 phút'],
      ['CN', 'Ôn SRS + kiểm tra tuần', '30 phút']
    ]
  };
})();
