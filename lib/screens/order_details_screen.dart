import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../constants/colors.dart';
import '../models/order.dart';
import '../services/firebase_service.dart';

class OrderDetailsScreen extends StatefulWidget {
  final OrderModel order;
  final String currentUserId;

  const OrderDetailsScreen({
    Key? key,
    required this.order,
    required this.currentUserId,
  }) : super(key: key);

  @override
  State<OrderDetailsScreen> createState() => _OrderDetailsScreenState();
}

class _OrderDetailsScreenState extends State<OrderDetailsScreen> {
  int _activeTab = 0; // 0 = التفاصيل والخط الزمني, 1 = المحادثة اللحظية, 2 = العقد الرقمي
  final TextEditingController _messageController = TextEditingController();
  bool _isLoadingAction = false;

  void _sendMessage() async {
    final text = _messageController.text.trim();
    if (text.isEmpty) return;
    _messageController.clear();
    await FirebaseService().sendChatMessage(widget.order.id, widget.currentUserId, text);
  }

  void _signContract(OrderModel order) async {
    setState(() => _isLoadingAction = true);
    try {
      final profile = await FirebaseService().fetchProfileByUid(widget.currentUserId);
      final isBuyer = order.buyerId == widget.currentUserId;
      await FirebaseService().signContract(
        orderId: order.id,
        fullName: profile?.displayName ?? 'مستخدم',
        phone: profile?.phoneNumber ?? '',
        nationalId: profile?.idNumber ?? '',
        isBuyer: isBuyer,
      );
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors.success,
          content: Text(
            'تم توقيع العقد قانونياً وتأكيده بنجاح!',
            textAlign: TextAlign.center,
            style: GoogleFonts.cairo(fontWeight: FontWeight.bold),
          ),
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('حدث خطأ أثناء التوقيع')));
    } finally {
      setState(() => _isLoadingAction = false);
    }
  }

  Future<void> _updateStatus(String newStatus, {String? comment}) async {
    setState(() => _isLoadingAction = true);
    try {
      // Simulate fake payment ref if escrowed
      String? paymentRef;
      if (newStatus == 'escrowed') paymentRef = 'SIM-\${DateTime.now().millisecondsSinceEpoch}';
      
      await FirebaseService().updateOrderStatus(widget.order.id, newStatus, comment: comment, paymentRef: paymentRef);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(backgroundColor: AppColors.success, content: Text('تم تحديث حالة الطلب بنجاح!')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('فشل تحديث الحالة: $e')));
    } finally {
      setState(() => _isLoadingAction = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final shortId = widget.order.id.substring(0, 4).toUpperCase();

    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      appBar: AppBar(
        backgroundColor: AppColors.cardDark,
        elevation: 0,
        centerTitle: true,
        title: Column(
          children: [
            Text(
              'تفاصيل الضمان الآمن',
              style: GoogleFonts.cairo(color: AppColors.textLight, fontWeight: FontWeight.w900, fontSize: 14),
            ),
            Text(
              '#ARB-$shortId',
              style: GoogleFonts.outfit(color: AppColors.accentGold, fontWeight: FontWeight.bold, fontSize: 11, letterSpacing: 1),
            ),
          ],
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: AppColors.textLight, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: StreamBuilder<OrderModel?>(
        stream: FirebaseService().streamOrder(widget.order.id),
        initialData: widget.order,
        builder: (context, snapshot) {
          if (!snapshot.hasData || snapshot.data == null) {
            return const Center(child: CircularProgressIndicator(color: AppColors.accentGold));
          }
          final liveOrder = snapshot.data!;
          final isBuyer = liveOrder.buyerId == widget.currentUserId;
          final isSeller = liveOrder.sellerId == widget.currentUserId;

          return Column(
            children: [
              _buildTabBarSwitcher(),
              Expanded(
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 300),
                  child: _buildActiveTabContent(liveOrder, isBuyer, isSeller),
                ),
              ),
              // Action Buttons Bottom Bar based on lifecycle
              _buildLifecycleActionButtons(liveOrder, isBuyer, isSeller),
            ],
          );
        },
      ),
    );
  }

  Widget _buildTabBarSwitcher() {
    return Container(
      color: AppColors.cardDark,
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
      child: Container(
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          color: AppColors.backgroundDark,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          children: [
            _buildTabButton(0, 'حالة الضمان', Icons.track_changes_outlined),
            _buildTabButton(1, 'المحادثة اللحظية', Icons.chat_bubble_outline),
            _buildTabButton(2, 'العقد الرقمي', Icons.history_edu_outlined),
          ],
        ),
      ),
    );
  }

  Widget _buildTabButton(int index, String title, IconData icon) {
    final isActive = _activeTab == index;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _activeTab = index),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: isActive ? AppColors.accentGold : Colors.transparent,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: isActive ? AppColors.primaryDark : AppColors.textMuted, size: 14),
              const SizedBox(width: 4),
              Flexible(
                child: Text(
                  title,
                  style: GoogleFonts.cairo(
                    color: isActive ? AppColors.primaryDark : AppColors.textMuted,
                    fontSize: 9,
                    fontWeight: FontWeight.w900,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildActiveTabContent(OrderModel order, bool isBuyer, bool isSeller) {
    switch (_activeTab) {
      case 0: return _buildTimelineContent(order);
      case 1: return _buildChatContent(order, isBuyer, isSeller);
      case 2: return _buildContractContent(order, isBuyer, isSeller);
      default: return Container();
    }
  }

  Widget _buildTimelineContent(OrderModel order) {
    final steps = [
      {
        'title': 'إنشاء وتوثيق الاتفاقية',
        'desc': 'تم كتابة ومطابقة شروط الصفقة المالية وحساب العمولات بنجاح.',
        'completed': true,
      },
      {
        'title': 'تجميد وحجز مبلغ الضمان',
        'desc': order.status != 'pending' ? 'تم استلام وتأمين قيمة الصفقة بالضمان بنسبة 100%.' : 'بانتظار سداد الضمان لتجميد الرصيد والبدء بالعمل.',
        'completed': order.status != 'pending' && order.status != 'awaiting_acceptance',
      },
      {
        'title': 'تسليم وشحن العمل المكتمل',
        'desc': ['delivered', 'rating', 'completed'].contains(order.status) ? 'أتم البائع العمل وقام برفع إثبات التوريد والتسليم.' : 'البائع قيد تجهيز العمل الآن لشحنه وتسليمه بالوقت المحدد.',
        'completed': ['delivered', 'rating', 'completed'].contains(order.status),
      },
      {
        'title': 'تحرير المبلغ للبائع نهائياً',
        'desc': order.status == 'completed' ? 'أكد المشتري الاستلام وتم تحرير الرصيد وحفظ الحقوق.' : 'سيتم فك تجميد المبلغ فورياً فور اعتماد المشتري للاستلام.',
        'completed': order.status == 'completed',
      },
    ];

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.cardDark,
              borderRadius: BorderRadius.circular(28),
              border: Border.all(color: AppColors.textMuted.withOpacity(0.05)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(order.title, style: GoogleFonts.cairo(color: AppColors.textLight, fontWeight: FontWeight.w900, fontSize: 16)),
                const SizedBox(height: 8),
                Text(order.description, style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.bold)),
                const Divider(color: AppColors.textMuted, height: 24, thickness: 0.1),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('قيمة الصفقة الإجمالية', style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 9, fontWeight: FontWeight.bold)),
                          FittedBox(fit: BoxFit.scaleDown, child: Text('\${order.amount} ر.س', style: GoogleFonts.outfit(color: AppColors.accentGold, fontSize: 20, fontWeight: FontWeight.w900))),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text('مدة التوريد', style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 9, fontWeight: FontWeight.bold)),
                          FittedBox(fit: BoxFit.scaleDown, child: Text('\${order.deliveryDays} أيام', style: GoogleFonts.cairo(color: AppColors.textLight, fontSize: 14, fontWeight: FontWeight.w900))),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          Text('حالة مسيرة الطلب', style: GoogleFonts.cairo(color: AppColors.textLight, fontWeight: FontWeight.w900, fontSize: 14)),
          const SizedBox(height: 16),
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: steps.length,
            itemBuilder: (context, index) {
              final step = steps[index];
              final isCompleted = step['completed'] as bool;
              final isLast = index == steps.length - 1;

              return Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Column(
                    children: [
                      Container(
                        width: 24, height: 24,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: isCompleted ? AppColors.success : AppColors.cardDark,
                          border: Border.all(color: isCompleted ? AppColors.success : AppColors.textMuted.withOpacity(0.3), width: 2),
                        ),
                        child: isCompleted ? const Icon(Icons.check, color: AppColors.primaryDark, size: 14) : null,
                      ),
                      if (!isLast) Container(width: 2, height: 60, color: isCompleted ? AppColors.success : AppColors.textMuted.withOpacity(0.2)),
                    ],
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.only(top: 2),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(step['title'] as String, style: GoogleFonts.cairo(color: isCompleted ? AppColors.textLight : AppColors.textMuted, fontWeight: FontWeight.w900, fontSize: 12)),
                          const SizedBox(height: 4),
                          Text(step['desc'] as String, style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildChatContent(OrderModel order, bool isBuyer, bool isSeller) {
    return Column(
      children: [
        Expanded(
          child: StreamBuilder<List<Map<String, dynamic>>>(
            stream: FirebaseService().streamOrderMessages(order.id),
            builder: (context, snapshot) {
              if (!snapshot.hasData) return const Center(child: CircularProgressIndicator(color: AppColors.accentGold));
              final messages = snapshot.data!;
              if (messages.isEmpty) return Center(child: Text('لا توجد رسائل حتى الآن.', style: GoogleFonts.cairo(color: AppColors.textMuted)));
              
              return ListView.builder(
                padding: const EdgeInsets.all(24),
                physics: const BouncingScrollPhysics(),
                itemCount: messages.length,
                itemBuilder: (context, index) {
                  final msg = messages[index];
                  final isSystem = msg['isSystem'] == true;
                  
                  if (isSystem) {
                    return Container(
                      margin: const EdgeInsets.symmetric(vertical: 12),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(color: AppColors.accentGold.withOpacity(0.06), borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.accentGold.withOpacity(0.1))),
                      child: Row(
                        children: [
                          const Icon(Icons.security, color: AppColors.accentGold, size: 20),
                          const SizedBox(width: 12),
                          Expanded(child: Text(msg['text'] as String, style: GoogleFonts.cairo(color: AppColors.accentGold, fontSize: 10, fontWeight: FontWeight.bold, height: 1.6))),
                        ],
                      ),
                    );
                  }

                  final isMe = msg['senderId'] == widget.currentUserId;
                  return Align(
                    alignment: isMe ? Alignment.centerLeft : Alignment.centerRight,
                    child: Container(
                      margin: const EdgeInsets.symmetric(vertical: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
                      decoration: BoxDecoration(
                        color: isMe ? AppColors.accentGold : AppColors.cardDark,
                        borderRadius: BorderRadius.only(
                          topLeft: const Radius.circular(20), topRight: const Radius.circular(20),
                          bottomLeft: isMe ? Radius.zero : const Radius.circular(20),
                          bottomRight: isMe ? const Radius.circular(20) : Radius.zero,
                        ),
                      ),
                      child: Text(
                        msg['text'] as String,
                        style: GoogleFonts.cairo(color: isMe ? AppColors.primaryDark : AppColors.textLight, fontWeight: FontWeight.bold, fontSize: 12, height: 1.5),
                      ),
                    ),
                  );
                },
              );
            },
          ),
        ),
        Container(
          padding: const EdgeInsets.all(16),
          color: AppColors.cardDark,
          child: Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  decoration: BoxDecoration(color: AppColors.backgroundDark, borderRadius: BorderRadius.circular(16)),
                  child: TextField(
                    controller: _messageController,
                    style: GoogleFonts.cairo(color: AppColors.textLight, fontSize: 13),
                    decoration: InputDecoration(hintText: 'اكتب رسالتك لدردشة الضمان...', hintStyle: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 11), border: InputBorder.none),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              InkWell(
                onTap: _sendMessage,
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: const BoxDecoration(color: AppColors.accentGold, shape: BoxShape.circle),
                  child: const Icon(Icons.send_rounded, color: AppColors.primaryDark, size: 20),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildContractContent(OrderModel order, bool isBuyer, bool isSeller) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(color: AppColors.cardDark, borderRadius: BorderRadius.circular(28), border: Border.all(color: AppColors.textMuted.withOpacity(0.05))),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            const Icon(Icons.history_edu, color: AppColors.accentGold, size: 48),
            const SizedBox(height: 16),
            Text('عقد الوساطة والضمان المالي المشترك', style: GoogleFonts.cairo(color: AppColors.textLight, fontWeight: FontWeight.w900, fontSize: 14)),
            Text('المسجل برقم مرجعي: ARB-\${order.id.toUpperCase().substring(0,6)}', style: GoogleFonts.outfit(color: AppColors.accentGold, fontSize: 10, fontWeight: FontWeight.bold)),
            const Divider(color: AppColors.textMuted, height: 32, thickness: 0.1),
            Text('يقر ووافق المشتري على توقيع وتأمين قيمة الصفقة بالضمان لصالح البائع...', textAlign: TextAlign.center, style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.bold, height: 1.8)),
            const SizedBox(height: 24),
            if (order.isContractSigned)
              Container(
                padding: const EdgeInsets.all(16), width: double.infinity,
                decoration: BoxDecoration(color: AppColors.success.withOpacity(0.06), borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.success.withOpacity(0.15))),
                child: Column(
                  children: [
                    const Icon(Icons.verified, color: AppColors.success, size: 28),
                    const SizedBox(height: 6),
                    Text('تم توقيع العقد قانونياً', style: GoogleFonts.cairo(color: AppColors.success, fontSize: 11, fontWeight: FontWeight.w900)),
                  ],
                ),
              )
            else
              ElevatedButton(
                onPressed: _isLoadingAction ? null : () => _signContract(order),
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.accentGold, foregroundColor: AppColors.primaryDark, minimumSize: const Size(double.infinity, 54), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)), elevation: 0),
                child: _isLoadingAction 
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: AppColors.primaryDark, strokeWidth: 2))
                  : Text('التوقيع والتأكيد الإلكتروني', style: GoogleFonts.cairo(fontWeight: FontWeight.w900, fontSize: 12)),
              ),
          ],
        ),
      ),
    );
  }

  // Action Buttons Area (Matching Web Platform Logic)
  Widget _buildLifecycleActionButtons(OrderModel order, bool isBuyer, bool isSeller) {
    if (_activeTab != 0) return const SizedBox.shrink(); // Only show in timeline tab
    
    Widget? actionButton;
    
    if (order.status == 'pending' && isBuyer) {
      actionButton = ElevatedButton.icon(
        icon: const Icon(Icons.credit_card, size: 20),
        label: const FittedBox(fit: BoxFit.scaleDown, child: Text('سداد وتعميد مبلغ الضمان')),
        style: _actionBtnStyle(AppColors.success),
        onPressed: () => _showPaymentSimulation(order),
      );
    } 
    else if (order.status == 'escrowed' && isSeller) {
      actionButton = ElevatedButton.icon(
        icon: const Icon(Icons.check_circle_outline, size: 20),
        label: const FittedBox(fit: BoxFit.scaleDown, child: Text('تسليم العمل النهائي')),
        style: _actionBtnStyle(AppColors.accentGold, textColor: AppColors.primaryDark),
        onPressed: () => _updateStatus('delivered', comment: 'تم تسليم العمل بنجاح بواسطة البائع من خلال التطبيق.'),
      );
    }
    else if (order.status == 'delivered' && isBuyer) {
      actionButton = ElevatedButton.icon(
        icon: const Icon(Icons.thumb_up_alt_outlined, size: 20),
        label: const FittedBox(fit: BoxFit.scaleDown, child: Text('قبول العمل وتحرير المبلغ')),
        style: _actionBtnStyle(AppColors.success),
        onPressed: () => _updateStatus('completed'),
      );
    }

    if (actionButton == null) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.cardDark,
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 10, offset: const Offset(0, -5))],
      ),
      child: SizedBox(
        width: double.infinity,
        height: 54,
        child: _isLoadingAction
            ? const Center(child: CircularProgressIndicator(color: AppColors.accentGold))
            : actionButton,
      ),
    );
  }

  void _showPaymentSimulation(OrderModel order) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        bool isProcessing = false;
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom + 24,
                top: 32,
                left: 24,
                right: 24,
              ),
              decoration: const BoxDecoration(
                color: AppColors.cardDark,
                borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 48,
                    height: 4,
                    decoration: BoxDecoration(
                      color: AppColors.textMuted.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    'سداد ضمان التعميد',
                    style: GoogleFonts.cairo(
                      color: AppColors.textLight,
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'المبلغ المطلوب: ${order.amount} ر.س',
                    style: GoogleFonts.outfit(
                      color: AppColors.accentGold,
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 32),
                  // Mock Card Input
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    decoration: BoxDecoration(
                      color: AppColors.backgroundDark,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.textMuted.withOpacity(0.2)),
                    ),
                    child: TextField(
                      keyboardType: TextInputType.number,
                      style: GoogleFonts.outfit(color: AppColors.textLight, letterSpacing: 2),
                      decoration: InputDecoration(
                        border: InputBorder.none,
                        hintText: '0000 0000 0000 0000',
                        hintStyle: GoogleFonts.outfit(color: AppColors.textMuted),
                        prefixIcon: const Icon(Icons.credit_card, color: AppColors.textMuted),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          decoration: BoxDecoration(
                            color: AppColors.backgroundDark,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: AppColors.textMuted.withOpacity(0.2)),
                          ),
                          child: TextField(
                            keyboardType: TextInputType.number,
                            style: GoogleFonts.outfit(color: AppColors.textLight, letterSpacing: 2),
                            decoration: InputDecoration(
                              border: InputBorder.none,
                              hintText: 'MM/YY',
                              hintStyle: GoogleFonts.outfit(color: AppColors.textMuted),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          decoration: BoxDecoration(
                            color: AppColors.backgroundDark,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: AppColors.textMuted.withOpacity(0.2)),
                          ),
                          child: TextField(
                            keyboardType: TextInputType.number,
                            style: GoogleFonts.outfit(color: AppColors.textLight, letterSpacing: 2),
                            decoration: InputDecoration(
                              border: InputBorder.none,
                              hintText: 'CVC',
                              hintStyle: GoogleFonts.outfit(color: AppColors.textMuted),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 32),
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: ElevatedButton(
                      onPressed: isProcessing ? null : () async {
                        setModalState(() => isProcessing = true);
                        // Simulate network delay
                        await Future.delayed(const Duration(seconds: 2));
                        if (context.mounted) {
                          Navigator.pop(context); // Close bottom sheet
                          _updateStatus('escrowed'); // Call real update
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.success,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      child: isProcessing
                          ? const CircularProgressIndicator(color: Colors.white)
                          : Text(
                              'تأكيد الدفع',
                              style: GoogleFonts.cairo(
                                color: Colors.white,
                                fontSize: 16,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  ButtonStyle _actionBtnStyle(Color bg, {Color textColor = Colors.white}) {
    return ElevatedButton.styleFrom(
      backgroundColor: bg,
      foregroundColor: textColor,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      elevation: 0,
      textStyle: GoogleFonts.cairo(fontWeight: FontWeight.w900, fontSize: 14),
    );
  }
}
