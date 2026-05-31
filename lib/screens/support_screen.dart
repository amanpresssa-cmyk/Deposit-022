import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../constants/colors.dart';

class SupportScreen extends StatefulWidget {
  const SupportScreen({Key? key}) : super(key: key);

  @override
  State<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends State<SupportScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  
  final List<Map<String, dynamic>> _messages = [
    {
      'isUser': false,
      'text': 'أهلاً بك في الدعم الذكي لمنصة عربون المكتوبة بأحدث تقنيات الأمان المالي. أنا "أنيس" مستشارك ومحكمك الذكي. كيف يمكنني مساعدتك اليوم في إدارة ضماناتك وتعميداتك؟',
      'time': 'الآن',
    }
  ];

  final List<Map<String, String>> _suggestedQuestions = [
    {
      'q': 'كيف أقوم بطلب تعميد وضمان جديد؟',
      'a': 'لطلب تعميد جديد، انتقل إلى علامة التبويب "تعميد جديد" من الشريط السفلي، وأدخل تفاصيل الصفقة، المبلغ، ومدة التسليم، بالإضافة إلى وسيلة الاتصال بالطرف الآخر (بريد أو جوال). سيتم حجز الأموال في ضمان عربون الآمن بمجرد سدادك للمبلغ عبر بوابة الدفع.'
    },
    {
      'q': 'كيف أضمن استلام أرباحي كبائع؟',
      'a': 'تضمن منصة عربون حقك كبائع من خلال تجميد المبلغ بالكامل من المشتري قبل بدء العمل. بعد تسليم الخدمة أو البضاعة وتأكيد المشتري للاستلام (أو انتهاء مدة الفحص دون اعتراض)، يتم تحرير الرصيد فوراً إلى أرباحك المتاحة للتسوية لتتمكن من سحبها لحسابك البنكي.'
    },
    {
      'q': 'ماذا يحدث في حال حدوث خلاف بين الطرفين؟',
      'a': 'في حال حدوث خلاف، يمكنك رفع نزاع رسمي من صفحة تفاصيل الصفقة. ستقوم المنصة بتجميد التعميد بالكامل وتعيين مستشار بشري لمراجعة المستندات والاتفاقية الرقمية الموقعة بين الطرفين لإصدار القرار العادل والنهائي وحفظ حقوق الجميع.'
    },
    {
      'q': 'هل توثيق نفاذ الوطني إلزامي؟',
      'a': 'نعم، توثيق الحساب عبر نظام نفاذ الوطني الموحد (أبشر) إلزامي لجميع الأطراف لضمان أمان وموثوقية الصفقات وتجنب الحسابات الوهمية، وهو ما يضمن الحماية القانونية الكاملة لتعاملاتك المالية.'
    }
  ];

  void _sendMessage(String text, {String? simulatedReply}) {
    if (text.trim().isEmpty) return;
    
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
      
      String reply = 'شكراً لطرحك هذا الاستفسار. بصفتي المستشار الذكي، يسعدني إفادتك بأن منصة عربون تطبق أعلى معايير الحماية والتشفير البنكي المالي المعتمد، ويمكنك دائماً الاعتماد على أنظمتنا لضمان صفقاتك بكل موثوقية.';
      
      if (simulatedReply != null) {
        reply = simulatedReply;
      } else {
        // Fallback checks for custom queries
        final query = text.toLowerCase();
        if (query.contains('سحب') || query.contains('رصيد') || query.contains('أرباح')) {
          reply = 'لسحب أرباحك، توجه إلى تبويب الإعدادات من الشريط السفلي، وأدخل اسم البنك والآيبان الخاص بك ثم حدد المبلغ المطلوب واضغط إرسال. تتم معالجة التسويات والتحويل المالي المباشر إلى حسابك خلال ساعات عمل قصيرة بنجاح.';
        } else if (query.contains('توثيق') || query.contains('نفاذ') || query.contains('أبشر')) {
          reply = 'التوثيق عبر نفاذ يحمي حسابك من الاحتيال ويمنحك شارة التوثيق الخضراء. انتقل إلى الإعدادات واضغط على "توثيق الآن" لإتمام التوثيق في ثوانٍ معدودة عبر إدخال رمز التحقق الحكومي.';
        } else if (query.contains('عمولة') || query.contains('رسوم') || query.contains('كم')) {
          reply = 'تتقاضى منصة عربون عمولة حماية وضمان ثابتة تبلغ 3% فقط من إجمالي قيمة الصفقة، ويتحملها المشتري تلقائياً عند الدفع لضمان حفظ وتجميد الأموال بشكل آمن طوال فترة التعاقد.';
        }
      }

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
                    Text(
                      'أنيس - المستشار المالي والتحكيمي الذكي',
                      style: GoogleFonts.cairo(
                        color: AppColors.textLight,
                        fontSize: 13,
                        fontWeight: FontWeight.w900,
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
