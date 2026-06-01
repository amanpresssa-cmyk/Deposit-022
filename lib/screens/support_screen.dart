import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../constants/colors.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SupportScreen extends StatefulWidget {
  const SupportScreen({Key? key}) : super(key: key);

  @override
  State<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends State<SupportScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final AudioPlayer _audioPlayer = AudioPlayer();
  bool _chatSoundsEnabled = true;

  @override
  void initState() {
    super.initState();
    _loadPreferences();
  }

  Future<void> _loadPreferences() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _chatSoundsEnabled = prefs.getBool('chat_sounds_enabled') ?? true;
    });
  }

  Future<void> _playSound(String assetPath) async {
    if (_chatSoundsEnabled) {
      try {
        await _audioPlayer.play(AssetSource(assetPath));
      } catch (e) {
        debugPrint('Error playing sound: $e');
      }
    }
  }

  final List<Map<String, dynamic>> _messages = [
    {
      'isUser': false,
      'text': 'يا هلا والله ومسهلا بك في منصة عربون! أنا "أنيس"، مستشارك الذكي اللي يخدمك بعيونه. كيف أقدر أساعدك اليوم في تأمين صفقاتك وتعميداتك؟ تفضل طال عمرك.',
      'time': 'الآن',
    }
  ];

  final List<Map<String, String>> _suggestedQuestions = [
    {
      'q': 'كيف أسوي طلب تعميد جديد؟',
      'a': 'أبشر ولا يهمك! كل اللي عليك تروح لقائمة "تعميد جديد" من تحت، وتحط تفاصيل صفقتك وقيمتها والمدة. فلوسك بتنحفظ في مكان آمن عندنا بمجرد ما تدفع، وما توصل للطرف الثاني لين تتأكد إن شغلك تمام وتستلمه.'
    },
    {
      'q': 'أنا بائع، كيف أضمن حقي؟',
      'a': 'حقك محفوظ في الحفظ والصون! المنصة تجمد فلوس المشتري عندنا قبل لا تبدأ شغل. وبمجرد ما تسلم شغلك والمشتري يعتمد، أو تخلص مدة الفحص بدون اعتراض، الرصيد ينزل لك فوراً في حسابك وتقدر تسحبه لأي بنك.'
    },
    {
      'q': 'وش يصير لو اختلفنا؟',
      'a': 'لا سمح الله لو صار خلاف، تقدر ترفع نزاع رسمي من شاشة الطلب. المنصة وقتها بتوقف الطلب وتكلف مستشار بشري من عندنا يراجع العقد والمستندات عشان يحكم بالعدل ويرجع لكل ذي حق حقه.'
    },
    {
      'q': 'هل التوثيق بنفاذ ضروري؟',
      'a': 'إي نعم طال عمرك، التوثيق عبر النفاذ الوطني (أبشر) إلزامي للكل، وهذا عشان نحمي الكل من الحسابات الوهمية ونضمن لك بيئة تجارية آمنة وقانونية 100%.'
    }
  ];

  void _sendMessage(String text, {String? simulatedReply}) {
    if (text.trim().isEmpty) return;
    
    _playSound('sounds/sent.wav');
    setState(() {
      _messages.add({
        'isUser': true,
        'text': text,
        'time': 'الآن',
      });
    });

    _messageController.clear();
    _scrollToBottom();

    // Simulate smart AI reply after 800ms
    Future.delayed(const Duration(milliseconds: 800), () {
      if (!mounted) return;
      
      String reply = 'حياك الله أخوي، استفسارك في محله. كوني المستشار الذكي لعربون، أطمنك إننا نطبق أعلى معايير الحماية البنكية في السعودية، وكل تعميداتك هنا في أمان تام وموثوقية عالية.';
      
      if (simulatedReply != null) {
        reply = simulatedReply;
      } else {
        // Fallback checks for custom queries
        final query = text.toLowerCase();
        if (query.contains('سحب') || query.contains('رصيد') || query.contains('أرباح')) {
          reply = 'عشان تسحب أرباحك طال عمرك، روح لتبويب الإعدادات من تحت، وسجل اسم بنكك والآيبان. بعدها حدد المبلغ واضغط إرسال. بنعالج طلبك ونحول لك دايركت خلال ساعات عمل بسيطة.';
        } else if (query.contains('توثيق') || query.contains('نفاذ') || query.contains('أبشر')) {
          reply = 'التوثيق عن طريق نفاذ (أبشر) يحمي حسابك من أي تلاعب ويعطيك شارة التوثيق. تقدر توثق حسابك بثواني من الإعدادات، بس حط رقم هويتك واقبل الطلب في تطبيق نفاذ وتصير أمورك طيبة.';
        } else if (query.contains('عمولة') || query.contains('رسوم') || query.contains('كم')) {
          reply = 'منصة عربون تاخذ عمولة بسيطة وثابتة 3% بس من قيمة الصفقة كرسوم حماية وضمان. المشتري يتحملها تلقائياً وقت الدفع، عشان نضمن تجميد وحفظ الفلوس بأمان إلين يخلص الشغل.';
        }
      }

      _playSound('sounds/received.wav');
      setState(() {
        _messages.add({
          'isUser': false,
          'text': reply,
          'time': 'الآن',
        });
      });
      _scrollToBottom();
    });
  }

  void _scrollToBottom() {
    Future.delayed(const Duration(milliseconds: 100), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      body: SafeArea(
        child: Column(
          children: [
            // Gorgeous glowing AI Status Header
            _buildAIHeader(),

            // Chat content area
            Expanded(
              child: _messages.isEmpty
                  ? _buildEmptyState()
                  : ListView.builder(
                      controller: _scrollController,
                      physics: const BouncingScrollPhysics(),
                      padding: const EdgeInsets.all(20),
                      itemCount: _messages.length,
                      itemBuilder: (context, index) {
                        final msg = _messages[index];
                        return _buildChatBubble(msg);
                      },
                    ),
            ),

            // Predefined suggested questions horizontally scrollable
            _buildSuggestedQuestionsList(),

            // Message Input bar
            _buildInputBar(),
          ],
        ),
      ),
    );
  }

  Widget _buildAIHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      decoration: BoxDecoration(
        color: AppColors.cardDark,
        border: Border(
          bottom: BorderSide(
            color: AppColors.textMuted.withOpacity(0.08),
            width: 1.5,
          ),
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.accentGold.withOpacity(0.1),
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.accentGold.withOpacity(0.3), width: 1.5),
            ),
            child: const Icon(Icons.psychology_outlined, color: AppColors.accentGold, size: 28),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        'أنيس المستشار المالي والتحكيمي الذكي',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.cairo(
                          color: AppColors.textLight,
                          fontSize: 13,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.accentGold.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        'AI',
                        style: GoogleFonts.outfit(
                          color: AppColors.accentGold,
                          fontSize: 9,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                  ],
                ),
                Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: AppColors.success,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'نشط ومتصل بالذكاء الاصطناعي الفوري',
                      style: GoogleFonts.cairo(
                        color: AppColors.textMuted,
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.forum_outlined, size: 64, color: AppColors.textMuted),
          const SizedBox(height: 16),
          Text(
            'ابدأ المحادثة الفورية مع أنيس',
            style: GoogleFonts.cairo(color: AppColors.textLight, fontSize: 14, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }

  Widget _buildChatBubble(Map<String, dynamic> msg) {
    final isUser = msg['isUser'] as bool;
    return Align(
      alignment: isUser ? Alignment.centerLeft : Alignment.centerRight,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 6),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.78,
        ),
        decoration: BoxDecoration(
          color: isUser ? AppColors.accentGold : AppColors.cardDark,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(20),
            topRight: const Radius.circular(20),
            bottomLeft: isUser ? Radius.zero : const Radius.circular(20),
            bottomRight: isUser ? const Radius.circular(20) : Radius.zero,
          ),
          border: Border.all(
            color: isUser ? Colors.transparent : AppColors.textMuted.withOpacity(0.06),
            width: 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              msg['text'] as String,
              style: GoogleFonts.cairo(
                color: isUser ? AppColors.primaryDark : AppColors.textLight,
                fontSize: 12,
                fontWeight: isUser ? FontWeight.w900 : FontWeight.bold,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 4),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  msg['time'] as String,
                  style: GoogleFonts.cairo(
                    color: isUser ? AppColors.primaryDark.withOpacity(0.5) : AppColors.textMuted,
                    fontSize: 8,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSuggestedQuestionsList() {
    return Container(
      height: 46,
      margin: const EdgeInsets.only(bottom: 8),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 20),
        itemCount: _suggestedQuestions.length,
        itemBuilder: (context, index) {
          final item = _suggestedQuestions[index];
          return GestureDetector(
            onTap: () => _sendMessage(item['q']!, simulatedReply: item['a']!),
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 6),
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(
                color: AppColors.cardDark,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.accentGold.withOpacity(0.3), width: 1),
              ),
              alignment: Alignment.center,
              child: Text(
                item['q']!,
                style: GoogleFonts.cairo(
                  color: AppColors.accentGold,
                  fontSize: 10,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildInputBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.cardDark,
        border: Border(
          top: BorderSide(
            color: AppColors.textMuted.withOpacity(0.08),
            width: 1.5,
          ),
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _messageController,
              onSubmitted: (val) => _sendMessage(val),
              style: GoogleFonts.cairo(color: AppColors.textLight, fontSize: 13, fontWeight: FontWeight.bold),
              decoration: InputDecoration(
                hintText: 'اسأل أنيس عن شروط الضمان والتحكيم والعمولات...',
                hintStyle: GoogleFonts.cairo(color: AppColors.textMuted.withOpacity(0.4), fontSize: 10),
                border: InputBorder.none,
              ),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.send_rounded, color: AppColors.accentGold, size: 24),
            onPressed: () => _sendMessage(_messageController.text),
          ),
        ],
      ),
    );
  }
}
