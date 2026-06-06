import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter/services.dart';
import '../constants/colors.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:io';
import 'dart:convert';

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
  String _selectedCategory = 'الكل';
  bool _isTyping = false;

  static const String geminiSystemPrompt = """
أنت "أنيس المستشار المالي" الذكي الخاص بمنصة عربون (Escrow).
منصة عربون هي منصة وساطة مالية تضمن حقوق البائع والمشتري في المملكة العربية السعودية.

مميزات المنصة:
1. نظام "العربون" (التعميد): يحفظ المشتري مبلغه في المنصة، ولا يتم تحويله للبائع إلا بعد تأكيد استلام الخدمة.
2. التوثيق الوطني: نلزم المستخدمين بتوثيق هويتهم الوطنية عبر نظام نفاذ (أبشر) لضمان الأمان والجدية.
3. معقبين وخدمات محترفة: المنصة تركز بشكل أساسي على التعقيب والخدمات العامة والإلكترونية.
4. الخصوصية والأمان: يجب أن يتم التواصل والدفع بالكامل داخل منصة عربون لضمان الحقوق وتجنب الاحتيال.
5. العمولات: عمولة الحماية والضمان ثابتة بنسبة 3% من قيمة الصفقة ويتحملها المشتري.
6. تسوية سريعة: معالجة سحب الأرباح البنكية تتم مجاناً خلال 24-48 ساعة، أو فورياً برسم 1% عبر خدمة Fast-Track.

قواعدك الاستشارية:
- أجب بلهجة سعودية ودية للغاية ومرحبة ومهذبة ("طال عمرك"، "أبشر"، "يا هلا ومسهلا").
- شجع البائعين دائماً على إتمام توثيق حساباتهم عبر نفاذ لزيادة مستويات الثقة لديهم.
- طمئن المشترين بأن مبالغهم محفوظة بمأمن في الضمان المالي ولن تُحرر للبائع إلا بموافقتهم أو حكم التحكيم.
- عند الاستفسار عن نزاع، اشرح لهم أنهم يستطيعون بضغطة زر طلب مستشار تحكيم بشري حقيقي ليفصل بينهم بالعدل.
- لا تعطي أو تشجع على أي وسائل تواصل خارج منصة عربون (كالواتساب الخاص أو الجوال الشخصي) لتضمن بقاء معاملاتهم تحت مظلة الحماية.
- حافظ على إجاباتك مختصرة ومباشرة ومريحة للقراءة في شاشات الجوال.
""";

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

  final Map<String, List<Map<String, String>>> _categorizedQuestions = {
    'الضمان والتعميد': [
      {
        'q': 'كيف أسوي طلب تعميد جديد؟',
        'a': 'أبشر ولا يهمك! كل اللي عليك تروح لقائمة "تعميد جديد" من شريط التنقل تحت، وتحط تفاصيل صفقتك وقيمتها والمدة. فلوسك بتنحفظ في مكان آمن عندنا بمجرد ما تدفع، وما توصل للطرف الثاني لين تتأكد إن شغلك تمام وتستلمه.'
      },
      {
        'q': 'أنا بائع، كيف أضمن حقي؟',
        'a': 'حقك محفوظ في الحفظ والصون! المنصة تجمد فلوس المشتري عندنا قبل لا تبدأ شغل. وبمجرد ما تسلم شغلك والمشتري يعتمد، أو تخلص مدة الفحص بدون اعتراض، الرصيد ينزل لك فوراً في حسابك المتاح وتقدر تسحبه لأي بنك.'
      },
      {
        'q': 'هل العقود مطابقة لضوابط ساما؟',
        'a': 'نعم، كافة عقود الضمان والتعميد لدينا متوافقة مع أنظمة البنك المركزي السعودي (SAMA) والجهات التنظيمية لضمان الحماية القانونية الكاملة.'
      },
    ],
    'الرسوم والسحب': [
      {
        'q': 'كم عمولة منصة عربون؟',
        'a': 'منصة عربون تاخذ عمولة بسيطة وثابتة 3% بس من قيمة الصفقة كرسوم حماية وضمان. المشتري يتحملها تلقائياً وقت الدفع، عشان نضمن تجميد وحفظ الفلوس بأمان إلين يخلص الشغل.'
      },
      {
        'q': 'ما هي مدة معالجة السحب؟',
        'a': 'يتم تحويل المبالغ لحسابك البنكي خلال 24 إلى 48 ساعة كحد أقصى للتحويل العادي مجاناً، أو فورياً خلال ثوانٍ عبر خدمة التحويل الفوري (Fast-Track) برسم 1%.'
      },
    ],
    'النزاعات والتحكيم': [
      {
        'q': 'وش يصير لو اختلفنا؟',
        'a': 'لا سمح الله لو صار خلاف، تقدر ترفع نزاع رسمي من شاشة الطلب. المنصة وقتها بتوقف الطلب وتكلف مستشار بشري من عندنا يراجع العقد والمستندات عشان يحكم بالعدل ويرجع لكل ذي حق حقه.'
      },
      {
        'q': 'كيف يتدخل المحكم البشري؟',
        'a': 'عند حدوث نزاع، يتدخل محكم بشري حقيقي من فريق الدعم والتحكيم بعربون. يراجع العقد المبرم والدردشة والمخرجات، ويحكم بالعدل لتسوية المعاملة وحماية أموال الأطراف.'
      },
    ],
    'الأمان والخصوصية': [
      {
        'q': 'هل التوثيق بنفاذ ضروري؟',
        'a': 'إي نعم طال عمرك، التوثيق عبر النفاذ الوطني (أبشر) إلزامي للكل، وهذا عشان نحمي الكل من الحسابات الوهمية ونضمن لك بيئة تجارية آمنة وقانونية 100%.'
      },
      {
        'q': 'كيف يتم توثيق الهوية؟',
        'a': 'التوثيق عن طريق نفاذ (أبشر) يتم بثوانٍ من خلال الدخول على شاشة التوثيق، إدخال رقم الهوية، وتأكيد الطلب في تطبيق نفاذ لتفعيل حسابك وإصدار شارة التوثيق.'
      },
    ]
  };

  List<Map<String, String>> _getQuestionsForSelectedCategory() {
    if (_selectedCategory == 'الكل') {
      List<Map<String, String>> all = [];
      _categorizedQuestions.values.forEach((list) => all.addAll(list));
      return all;
    }
    return _categorizedQuestions[_selectedCategory] ?? [];
  }

  Future<String> _getGeminiResponse(String userText) async {
    final client = HttpClient();
    client.connectionTimeout = const Duration(seconds: 12);
    
    try {
      final uri = Uri.parse('http://192.168.8.53:3000/api/support/chat');
      
      final request = await client.postUrl(uri);
      request.headers.contentType = ContentType.json;
      
      final history = <Map<String, dynamic>>[];
      
      // Include last 6 messages for context
      final relevantMessages = _messages.length > 6 
          ? _messages.sublist(_messages.length - 6) 
          : _messages;
          
      for (final m in relevantMessages) {
        history.add({
          'isUser': m['isUser'] as bool,
          'text': m['text'] as String
        });
      }
      
      final body = {
        'message': userText,
        'history': history,
      };
      
      request.write(jsonEncode(body));
      final response = await request.close();
      
      if (response.statusCode == 200) {
        final responseBody = await response.transform(utf8.decoder).join();
        final json = jsonDecode(responseBody);
        
        try {
          final replyText = json['reply'] as String;
          return replyText.trim();
        } catch (e) {
          debugPrint('Error parsing proxy chat response: $e');
          return 'عذراً طال عمرك، لم أستطع معالجة الرد بشكل صحيح حالياً. تقدر تجرب تسألني مرة ثانية؟';
        }
      } else {
        debugPrint('Proxy Chat API returned error code ${response.statusCode}');
        return 'عذراً، أواجه صعوبة في الاتصال بالخادم الآن. هل تود إحالة طلبك لمستشار بشري؟';
      }
    } catch (e) {
      debugPrint('Proxy Chat API network error: $e');
      return 'عذراً، يبدو أن هناك مشكلة في الاتصال بالخادم. يرجى التأكد من تشغيل خادم المنصة طال عمرك.';
    } finally {
      client.close();
    }
  }

  void _sendMessage(String text, {String? simulatedReply}) async {
    if (text.trim().isEmpty) return;
    
    _playSound('sounds/sent.wav');
    setState(() {
      _messages.add({
        'isUser': true,
        'text': text,
        'time': 'الآن',
      });
      _isTyping = true;
    });

    _messageController.clear();
    _scrollToBottom();

    String reply;
    if (simulatedReply != null) {
      await Future.delayed(const Duration(milliseconds: 600));
      reply = simulatedReply;
    } else {
      reply = await _getGeminiResponse(text);
    }

    if (!mounted) return;
    _playSound('sounds/received.wav');
    setState(() {
      _isTyping = false;
      _messages.add({
        'isUser': false,
        'text': reply,
        'time': 'الآن',
      });
    });
    _scrollToBottom();
  }

  void _escalateToHumanArbitrator() {
    _sendMessage(
      'أرغب في إحالة صفقة التعميد إلى مستشار تحكيمي بشري.',
      simulatedReply: 'تم استلام طلبك طال عمرك بنجاح ✅. جاري تحضير ملف العقد والاتفاقيات، وسيتواصل معك مستشار تحكيم بشري مرخص من فريق عربون عبر الهاتف والمنصة خلال أقل من ساعة للفصل في النزاع وتسوية الأرصدة.',
    );
  }

  void _clearChat() {
    setState(() {
      _messages.clear();
      _messages.add({
        'isUser': false,
        'text': 'تم بدء جلسة استشارية جديدة. كيف أقدر أساعدك اليوم في منصة عربون طال عمرك؟',
        'time': 'الآن',
      });
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: AppColors.success,
        content: Text(
          'تم مسح سجل المحادثة بنجاح',
          textAlign: TextAlign.center,
          style: GoogleFonts.cairo(fontWeight: FontWeight.bold),
        ),
      ),
    );
  }

  void _copyChat() {
    final chatText = _messages
        .map((m) => '${(m['isUser'] as bool) ? 'المستخدم' : 'أنيس'}: ${m['text']}')
        .join('\n\n');
    
    // Using standard Flutter Clipboard (without dependency)
    importClipboardAndCopy(chatText);
  }

  void importClipboardAndCopy(String text) async {
    await Clipboard.setData(ClipboardData(text: text));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: AppColors.accentGold,
        content: Text(
          'تم نسخ نص المحادثة إلى الحافظة',
          textAlign: TextAlign.center,
          style: GoogleFonts.cairo(fontWeight: FontWeight.bold, color: AppColors.primaryDark),
        ),
      ),
    );
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
            // Glowing AI Status Header with human arbitrator request
            _buildAIHeader(),

            // Chat categories
            _buildCategoryChips(),

            // Chat content area
            Expanded(
              child: _messages.isEmpty
                  ? _buildEmptyState()
                  : ListView.builder(
                      controller: _scrollController,
                      physics: const BouncingScrollPhysics(),
                      padding: const EdgeInsets.all(20),
                      itemCount: _messages.length + (_isTyping ? 1 : 0),
                      itemBuilder: (context, index) {
                        if (index == _messages.length) {
                          return _buildTypingBubble();
                        }
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
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
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
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.accentGold.withOpacity(0.1),
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.accentGold.withOpacity(0.3), width: 1.5),
            ),
            child: const Icon(Icons.psychology_outlined, color: AppColors.accentGold, size: 24),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        'أنيس المستشار المالي',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.cairo(
                          color: AppColors.textLight,
                          fontSize: 12,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                    const SizedBox(width: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                      decoration: BoxDecoration(
                        color: AppColors.accentGold.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        'AI',
                        style: GoogleFonts.outfit(
                          color: AppColors.accentGold,
                          fontSize: 8,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                  ],
                ),
                Text(
                  'نشط ومتصل بالذكاء الاصطناعي',
                  style: GoogleFonts.cairo(
                    color: AppColors.textMuted,
                    fontSize: 8,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
          // Actions: Arbitrator, Copy, Clear
          Row(
            children: [
              IconButton(
                icon: const Icon(Icons.content_copy_rounded, color: AppColors.textMuted, size: 16),
                tooltip: 'نسخ المحادثة',
                onPressed: _copyChat,
              ),
              IconButton(
                icon: const Icon(Icons.delete_sweep_outlined, color: AppColors.alert, size: 18),
                tooltip: 'مسح المحادثة',
                onPressed: _clearChat,
              ),
              const SizedBox(width: 2),
              ElevatedButton.icon(
                onPressed: _escalateToHumanArbitrator,
                icon: const Icon(Icons.gavel_rounded, size: 10, color: Colors.white),
                label: Text(
                  'طلب مستشار بشري',
                  style: GoogleFonts.cairo(fontSize: 7, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.alert.withOpacity(0.85),
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryChips() {
    final categories = ['الكل', 'الضمان والتعميد', 'الرسوم والسحب', 'النزاعات والتحكيم', 'الأمان والخصوصية'];
    return Container(
      height: 36,
      margin: const EdgeInsets.only(top: 12, bottom: 4),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: categories.length,
        itemBuilder: (context, index) {
          final cat = categories[index];
          final isSelected = _selectedCategory == cat;
          return GestureDetector(
            onTap: () => setState(() => _selectedCategory = cat),
            child: Container(
              margin: const EdgeInsets.only(left: 6),
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                color: isSelected ? AppColors.accentGold.withOpacity(0.12) : AppColors.cardDark,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isSelected ? AppColors.accentGold : AppColors.textMuted.withOpacity(0.08),
                  width: 1,
                ),
              ),
              alignment: Alignment.center,
              child: Text(
                cat,
                style: GoogleFonts.cairo(
                  color: isSelected ? AppColors.accentGold : AppColors.textLight,
                  fontSize: 9,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          );
        },
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

  Widget _buildTypingBubble() {
    return Align(
      alignment: Alignment.centerRight,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 6),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.78,
        ),
        decoration: BoxDecoration(
          color: AppColors.cardDark,
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(20),
            topRight: Radius.circular(20),
            bottomLeft: Radius.circular(20),
            bottomRight: Radius.zero,
          ),
          border: Border.all(
            color: AppColors.textMuted.withOpacity(0.06),
            width: 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'أنيس يكتب لك الآن...',
              style: GoogleFonts.cairo(
                color: AppColors.textMuted,
                fontSize: 10,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(width: 10),
            const SizedBox(
              width: 12,
              height: 12,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation<Color>(AppColors.accentGold),
              ),
            ),
          ],
        ),
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
                fontSize: 11,
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
    final questions = _getQuestionsForSelectedCategory();
    if (questions.isEmpty) return const SizedBox.shrink();
    
    return Container(
      height: 46,
      margin: const EdgeInsets.only(bottom: 8),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 20),
        itemCount: questions.length,
        itemBuilder: (context, index) {
          final item = questions[index];
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
