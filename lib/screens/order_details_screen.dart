import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:image_picker/image_picker.dart';
import '../constants/colors.dart';
import '../models/order.dart';
import '../models/user.dart';
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
  final AudioPlayer _audioPlayer = AudioPlayer();

  UserProfile? _buyerProfile;
  UserProfile? _sellerProfile;
  String? _fetchedBuyerId;
  String? _fetchedSellerId;

  void _fetchProfilesIfNeeded(String buyerId, String sellerId) {
    if (_fetchedBuyerId == buyerId && _fetchedSellerId == sellerId) return;
    
    _fetchedBuyerId = buyerId;
    _fetchedSellerId = sellerId;
    
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      try {
        final buyer = await FirebaseService().fetchProfileByUid(buyerId);
        if (mounted && buyer != null) {
          setState(() => _buyerProfile = buyer);
        }
        if (sellerId != 'unknown' && sellerId.isNotEmpty) {
          final seller = await FirebaseService().fetchProfileByUid(sellerId);
          if (mounted && seller != null) {
            setState(() => _sellerProfile = seller);
          }
        }
      } catch (e) {
        debugPrint('Error fetching profiles: $e');
      }
    });
  }

  Future<void> _playSound(String assetPath) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final soundsEnabled = prefs.getBool('chat_sounds_enabled') ?? true;
      if (soundsEnabled) {
        await _audioPlayer.play(AssetSource(assetPath));
      }
    } catch (e) {
      debugPrint('Error playing sound: $e');
    }
  }

  void _sendMessage() async {
    final text = _messageController.text.trim();
    if (text.isEmpty) return;
    _messageController.clear();
    _playSound('sounds/sent.wav');
    await FirebaseService().sendChatMessage(widget.order.id, widget.currentUserId, text);
  }

  void _signContract(OrderModel order) async {
    // 1. Show OTP Dialog to simulate sending and verifying an OTP
    final otpController = TextEditingController();
    final bool? isConfirmed = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return AlertDialog(
          backgroundColor: AppColors.cardDark,
          title: Text('توثيق التوقيع', style: GoogleFonts.cairo(color: AppColors.textLight, fontWeight: FontWeight.bold)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('تم إرسال رمز تحقق (OTP) إلى هاتفك المسجل، يرجى إدخاله لإتمام التوقيع القانوني.', style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 12)),
              const SizedBox(height: 16),
              TextField(
                controller: otpController,
                keyboardType: TextInputType.number,
                style: GoogleFonts.outfit(color: AppColors.textLight, letterSpacing: 8, fontSize: 24, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
                maxLength: 4,
                decoration: InputDecoration(
                  hintText: '----',
                  hintStyle: GoogleFonts.outfit(color: AppColors.textMuted.withOpacity(0.5)),
                  counterText: '',
                  filled: true,
                  fillColor: AppColors.backgroundDark,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: Text('إلغاء', style: GoogleFonts.cairo(color: AppColors.textMuted, fontWeight: FontWeight.bold)),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(context, true),
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.accentGold, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
              child: Text('تأكيد التوقيع', style: GoogleFonts.cairo(color: AppColors.primaryDark, fontWeight: FontWeight.bold)),
            ),
          ],
        );
      },
    );

    if (isConfirmed != true || otpController.text.length < 4) return;

    setState(() => _isLoadingAction = true);
    try {
      final profile = await FirebaseService().fetchProfileByUid(widget.currentUserId);
      final isBuyer = order.buyerId == widget.currentUserId;
      
      // Simulate fetching real IP address
      final String capturedIp = '10.0.2.${DateTime.now().millisecond % 255}'; // Simulated dynamic IP
      
      await FirebaseService().signContract(
        orderId: order.id,
        fullName: profile?.displayName ?? 'مستخدم',
        phone: profile?.phoneNumber ?? '',
        nationalId: profile?.idNumber ?? '',
        isBuyer: isBuyer,
        ipAddress: capturedIp,
        otpUsed: otpController.text,
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
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('حدث خطأ أثناء التوقيع', style: GoogleFonts.cairo())));
    } finally {
      if (mounted) setState(() => _isLoadingAction = false);
    }
  }

  Future<void> _updateStatus(String newStatus, {String? comment, List<String>? attachmentUrls}) async {
    setState(() => _isLoadingAction = true);
    try {
      // Simulate fake payment ref if escrowed
      String? paymentRef;
      if (newStatus == 'escrowed') paymentRef = 'SIM-${DateTime.now().millisecondsSinceEpoch}';
      
      await FirebaseService().updateOrderStatus(
        widget.order.id,
        newStatus,
        comment: comment,
        paymentRef: paymentRef,
        attachmentUrls: attachmentUrls,
        currentUserId: widget.currentUserId,
      );
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

          _fetchProfilesIfNeeded(liveOrder.buyerId, liveOrder.sellerId);

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
                          FittedBox(fit: BoxFit.scaleDown, child: Text('${order.amount} ر.س', style: GoogleFonts.outfit(color: AppColors.accentGold, fontSize: 20, fontWeight: FontWeight.w900))),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text('مدة التوريد', style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 9, fontWeight: FontWeight.bold)),
                          FittedBox(fit: BoxFit.scaleDown, child: Text('${order.deliveryDays} أيام', style: GoogleFonts.cairo(color: AppColors.textLight, fontSize: 14, fontWeight: FontWeight.w900))),
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
          if (['delivered', 'rating', 'completed'].contains(order.status) &&
              (order.deliveryNote != null || (order.deliveryAttachmentUrls != null && order.deliveryAttachmentUrls!.isNotEmpty) || order.deliveryAttachmentUrl != null))
            _buildDeliveryDetailsCard(order),
          const SizedBox(height: 24),
          _buildPartiesSection(order),
        ],
      ),
    );
  }

  Widget _buildDeliveryDetailsCard(OrderModel order) {
    final urls = order.deliveryAttachmentUrls ?? (order.deliveryAttachmentUrl != null ? [order.deliveryAttachmentUrl!] : []);
    
    return Container(
      margin: const EdgeInsets.only(top: 24),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.cardDark,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: AppColors.success.withOpacity(0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.verified, color: AppColors.success, size: 24),
              const SizedBox(width: 8),
              Text(
                'تفاصيل تسليم العمل',
                style: GoogleFonts.cairo(
                  color: AppColors.textLight,
                  fontSize: 14,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
          const Divider(color: AppColors.textMuted, height: 24, thickness: 0.1),
          if (order.deliveryNote != null && order.deliveryNote!.isNotEmpty) ...[
            Text(
              'ملاحظة البائع:',
              style: GoogleFonts.cairo(
                color: AppColors.textMuted,
                fontSize: 10,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              order.deliveryNote!,
              style: GoogleFonts.cairo(
                color: AppColors.textLight,
                fontSize: 12,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 16),
          ],
          if (urls.isNotEmpty) ...[
            Text(
              'مرفقات التسليم:',
              style: GoogleFonts.cairo(
                color: AppColors.textMuted,
                fontSize: 10,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: List.generate(urls.length, (index) {
                final url = urls[index];
                return InkWell(
                  onTap: () async {
                    final uri = Uri.parse(url);
                    if (await canLaunchUrl(uri)) {
                      await launchUrl(uri, mode: LaunchMode.externalApplication);
                    } else {
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('تعذر فتح الرابط.')),
                        );
                      }
                    }
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: AppColors.backgroundDark,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.textMuted.withOpacity(0.2)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.file_present_outlined, color: AppColors.success, size: 16),
                        const SizedBox(width: 6),
                        Text(
                          'تحميل مرفق ${index + 1}',
                          style: GoogleFonts.cairo(
                            color: AppColors.textLight,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildPartiesSection(OrderModel order) {
    final buyerName = _buyerProfile?.displayName ?? 'جاري التحميل...';
    String sellerName = 'غير معروف';
    if (_sellerProfile != null) {
      sellerName = _sellerProfile!.displayName;
    } else if (order.sellerId == 'unknown') {
      if (order.sellerEmail != null && order.sellerEmail!.isNotEmpty) {
        sellerName = order.sellerEmail!;
      } else if (order.sellerPhone != null && order.sellerPhone!.isNotEmpty) {
        sellerName = order.sellerPhone!;
      } else {
        sellerName = 'غير معروف (بانتظار الربط)';
      }
    } else {
      sellerName = 'جاري التحميل...';
    }

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.cardDark,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: AppColors.textMuted.withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.people_outline, color: AppColors.accentGold, size: 20),
              const SizedBox(width: 8),
              Text(
                'أطراف الصفقة',
                style: GoogleFonts.cairo(
                  color: AppColors.textLight,
                  fontWeight: FontWeight.w900,
                  fontSize: 14,
                ),
              ),
            ],
          ),
          const Divider(color: AppColors.textMuted, height: 24, thickness: 0.1),
          
          // Buyer row
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppColors.info.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.person, color: AppColors.info, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'الطرف الأول (المشتري)',
                      style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.bold),
                    ),
                    Text(
                      buyerName,
                      style: GoogleFonts.cairo(color: AppColors.textLight, fontSize: 13, fontWeight: FontWeight.w900),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          
          // Seller row
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppColors.success.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.person, color: AppColors.success, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'الطرف الثاني (البائع/المنفذ)',
                      style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.bold),
                    ),
                    Text(
                      sellerName,
                      style: GoogleFonts.cairo(color: AppColors.textLight, fontSize: 13, fontWeight: FontWeight.w900),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDigitalSeals(OrderModel order) {
    final buyerSig = order.buyerSignature;
    final sellerSig = order.sellerSignature;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 24),
        Text(
          'التوثيق والتوقيعات الرقمية المعتمدة',
          style: GoogleFonts.cairo(
            color: AppColors.textLight,
            fontWeight: FontWeight.bold,
            fontSize: 12,
          ),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            // Buyer signature box
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(12),
                height: 160,
                decoration: BoxDecoration(
                  color: buyerSig?.signed == true
                      ? AppColors.success.withOpacity(0.05)
                      : AppColors.backgroundDark,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: buyerSig?.signed == true
                        ? AppColors.success.withOpacity(0.2)
                        : AppColors.textMuted.withOpacity(0.1),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'توقيع المشتري الرقمي',
                      style: GoogleFonts.cairo(
                        color: AppColors.textMuted,
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    if (buyerSig?.signed == true) ...[
                      Expanded(
                        child: SingleChildScrollView(
                          physics: const NeverScrollableScrollPhysics(),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const SizedBox(height: 4),
                              Text(
                                'الموقع: ${buyerSig!.fullName}',
                                style: GoogleFonts.cairo(color: AppColors.textLight, fontSize: 9, fontWeight: FontWeight.bold),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              Text(
                                'الجوال: ${buyerSig.phone}',
                                style: GoogleFonts.outfit(color: AppColors.textLight, fontSize: 9),
                              ),
                              Text(
                                'الهوية: ${buyerSig.nationalId ?? ''}',
                                style: GoogleFonts.outfit(color: AppColors.textLight, fontSize: 9),
                              ),
                              if (buyerSig.signedAt != null)
                                Text(
                                  'التاريخ: ${buyerSig.signedAt!.toLocal().toString().substring(0, 16)}',
                                  style: GoogleFonts.outfit(color: AppColors.textLight, fontSize: 8),
                                ),
                              Text(
                                'الـ IP: ${buyerSig.ipAddress ?? ''}',
                                style: GoogleFonts.outfit(color: AppColors.textMuted, fontSize: 8),
                              ),
                              if (buyerSig.otpUsed != null)
                                Container(
                                  margin: const EdgeInsets.only(top: 2),
                                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                  decoration: BoxDecoration(
                                    color: AppColors.success.withOpacity(0.15),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    'OTP: #${buyerSig.otpUsed}',
                                    style: GoogleFonts.outfit(color: AppColors.success, fontSize: 8, fontWeight: FontWeight.bold),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                      Align(
                        alignment: Alignment.bottomLeft,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                          decoration: BoxDecoration(
                            border: Border.all(color: AppColors.success, width: 1),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.verified_user, color: AppColors.success, size: 8),
                              const SizedBox(width: 2),
                              Text(
                                'مُوثق عَرَبون',
                                style: GoogleFonts.cairo(color: AppColors.success, fontSize: 7, fontWeight: FontWeight.w900),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ] else ...[
                      Expanded(
                        child: Center(
                          child: Text(
                            'بانتظار توقيع الطرف الأول',
                            style: GoogleFonts.cairo(
                              color: AppColors.textMuted.withOpacity(0.6),
                              fontSize: 9,
                              fontStyle: FontStyle.italic,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(width: 12),
            // Seller signature box
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(12),
                height: 160,
                decoration: BoxDecoration(
                  color: sellerSig?.signed == true
                      ? AppColors.success.withOpacity(0.05)
                      : AppColors.backgroundDark,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: sellerSig?.signed == true
                        ? AppColors.success.withOpacity(0.2)
                        : AppColors.textMuted.withOpacity(0.1),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'توقيع البائع الرقمي',
                      style: GoogleFonts.cairo(
                        color: AppColors.textMuted,
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    if (sellerSig?.signed == true) ...[
                      Expanded(
                        child: SingleChildScrollView(
                          physics: const NeverScrollableScrollPhysics(),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const SizedBox(height: 4),
                              Text(
                                'الموقع: ${sellerSig!.fullName}',
                                style: GoogleFonts.cairo(color: AppColors.textLight, fontSize: 9, fontWeight: FontWeight.bold),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              Text(
                                'الجوال: ${sellerSig.phone}',
                                style: GoogleFonts.outfit(color: AppColors.textLight, fontSize: 9),
                              ),
                              Text(
                                'الهوية: ${sellerSig.nationalId ?? ''}',
                                style: GoogleFonts.outfit(color: AppColors.textLight, fontSize: 9),
                              ),
                              if (sellerSig.signedAt != null)
                                Text(
                                  'التاريخ: ${sellerSig.signedAt!.toLocal().toString().substring(0, 16)}',
                                  style: GoogleFonts.outfit(color: AppColors.textLight, fontSize: 8),
                                ),
                              Text(
                                'الـ IP: ${sellerSig.ipAddress ?? ''}',
                                style: GoogleFonts.outfit(color: AppColors.textMuted, fontSize: 8),
                              ),
                              if (sellerSig.otpUsed != null)
                                Container(
                                  margin: const EdgeInsets.only(top: 2),
                                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                  decoration: BoxDecoration(
                                    color: AppColors.success.withOpacity(0.15),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    'OTP: #${sellerSig.otpUsed}',
                                    style: GoogleFonts.outfit(color: AppColors.success, fontSize: 8, fontWeight: FontWeight.bold),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                      Align(
                        alignment: Alignment.bottomLeft,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                          decoration: BoxDecoration(
                            border: Border.all(color: AppColors.success, width: 1),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.verified_user, color: AppColors.success, size: 8),
                              const SizedBox(width: 2),
                              Text(
                                'مُوثق عَرَبون',
                                style: GoogleFonts.cairo(color: AppColors.success, fontSize: 7, fontWeight: FontWeight.w900),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ] else ...[
                      Expanded(
                        child: Center(
                          child: Text(
                            'بانتظار توقيع الطرف الثاني',
                            style: GoogleFonts.cairo(
                              color: AppColors.textMuted.withOpacity(0.6),
                              fontSize: 9,
                              fontStyle: FontStyle.italic,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
        if (order.isContractSigned && order.contractHash != null) ...[
          const SizedBox(height: 16),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.info.withOpacity(0.05),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.info.withOpacity(0.15)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.verified, color: AppColors.info, size: 16),
                    const SizedBox(width: 6),
                    Text(
                      'وثيقة معتمدة ومسجلة رسمياً',
                      style: GoogleFonts.cairo(color: AppColors.textLight, fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  'يقر الأطراف بصحة التوقيعات أعلاه وسلامتها القانونية كوثيقة سارية وبموجب أنظمة السندات الرقمية.',
                  style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 9, height: 1.4),
                ),
                const SizedBox(height: 6),
                SelectableText(
                  'REF: ${order.contractHash}',
                  style: GoogleFonts.outfit(color: AppColors.info, fontSize: 9, fontWeight: FontWeight.bold, letterSpacing: 1),
                ),
              ],
            ),
          ),
        ],
      ],
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
                  final isBuyer = msg['senderId'] == widget.order.buyerId;
                  final roleText = isBuyer ? 'المشتري' : 'البائع';
                  final meText = isMe ? ' (أنت)' : '';

                  return Align(
                    alignment: isMe ? Alignment.centerLeft : Alignment.centerRight,
                    child: Container(
                      margin: const EdgeInsets.symmetric(vertical: 8),
                      constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
                      child: Column(
                        crossAxisAlignment: isMe ? CrossAxisAlignment.start : CrossAxisAlignment.end,
                        children: [
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
                            child: Text(
                              '$roleText$meText',
                              style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.bold),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
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
                        ],
                      ),
                    ),
                  );
                },
              );
            },
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          color: AppColors.cardDark,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                height: 32,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  physics: const BouncingScrollPhysics(),
                  children: ['السلام عليكم', 'العمل جاهز للتسليم', 'بانتظار تأكيدك', 'أحتاج توضيح', 'شكراً لك'].map((reply) {
                    return Padding(
                      padding: const EdgeInsets.only(left: 8.0),
                      child: ActionChip(
                        label: Text(reply, style: GoogleFonts.cairo(color: AppColors.textLight, fontSize: 10, fontWeight: FontWeight.bold)),
                        backgroundColor: AppColors.backgroundDark,
                        side: const BorderSide(color: AppColors.accentGold, width: 0.5),
                        onPressed: () {
                          _messageController.text = reply;
                        },
                      ),
                    );
                  }).toList(),
                ),
              ),
              const SizedBox(height: 8),
              Row(
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
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(child: const Icon(Icons.history_edu, color: AppColors.accentGold, size: 48)),
            const SizedBox(height: 16),
            Center(child: Text('عقد الوساطة والضمان المالي المشترك', style: GoogleFonts.cairo(color: AppColors.textLight, fontWeight: FontWeight.w900, fontSize: 14))),
            Center(child: Text('المسجل برقم مرجعي: ARB-${order.id.toUpperCase().substring(0,6)}', style: GoogleFonts.outfit(color: AppColors.accentGold, fontSize: 10, fontWeight: FontWeight.bold))),
            const Divider(color: AppColors.textMuted, height: 32, thickness: 0.1),
            
            Text('تفاصيل الاتفاقية:', style: GoogleFonts.cairo(color: AppColors.textLight, fontWeight: FontWeight.bold, fontSize: 12)),
            const SizedBox(height: 8),
            _buildContractRow('وصف الخدمة:', order.title),
            _buildContractRow('قيمة الضمان:', '${order.amount} ر.س'),
            _buildContractRow('مدة التنفيذ:', '${order.deliveryDays} يوم/أيام'),
            
            const SizedBox(height: 24),
            Text('أطراف الاتفاقية:', style: GoogleFonts.cairo(color: AppColors.textLight, fontWeight: FontWeight.bold, fontSize: 12)),
            const SizedBox(height: 8),
            
            // Buyer details card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.backgroundDark,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.textMuted.withOpacity(0.1)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'الطرف الأول (المشتري):',
                    style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _buyerProfile?.displayName ?? 'غير معروف',
                    style: GoogleFonts.cairo(color: AppColors.textLight, fontSize: 13, fontWeight: FontWeight.bold),
                  ),
                  if (order.buyerSignature?.nationalId != null && order.buyerSignature!.nationalId!.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Text('رقم الهوية الوطنية/الإقامة: ', style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 11)),
                        Text(order.buyerSignature!.nationalId!, style: GoogleFonts.outfit(color: AppColors.textLight, fontSize: 11, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ] else if (_buyerProfile?.idNumber != null && _buyerProfile!.idNumber!.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Text('رقم الهوية الوطنية/الإقامة: ', style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 11)),
                        Text(_buyerProfile!.idNumber!, style: GoogleFonts.outfit(color: AppColors.textLight, fontSize: 11, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ],
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Text('رقم الجوال: ', style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 11)),
                      Text(
                        order.buyerSignature?.phone.isNotEmpty == true 
                            ? order.buyerSignature!.phone 
                            : (_buyerProfile?.phoneNumber ?? 'غير متوفر'), 
                        style: GoogleFonts.outfit(color: AppColors.textLight, fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            
            // Seller details card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.backgroundDark,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.textMuted.withOpacity(0.1)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'الطرف الثاني (البائع/المنفذ):',
                    style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _sellerProfile?.displayName ?? 
                      (order.sellerEmail != null && order.sellerEmail!.isNotEmpty 
                          ? order.sellerEmail! 
                          : (order.sellerPhone != null && order.sellerPhone!.isNotEmpty 
                              ? order.sellerPhone! 
                              : 'غير معروف')),
                    style: GoogleFonts.cairo(color: AppColors.textLight, fontSize: 13, fontWeight: FontWeight.bold),
                  ),
                  if (order.sellerSignature?.nationalId != null && order.sellerSignature!.nationalId!.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Text('رقم الهوية الوطنية/الإقامة: ', style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 11)),
                        Text(order.sellerSignature!.nationalId!, style: GoogleFonts.outfit(color: AppColors.textLight, fontSize: 11, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ] else if (_sellerProfile?.idNumber != null && _sellerProfile!.idNumber!.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Text('رقم الهوية الوطنية/الإقامة: ', style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 11)),
                        Text(_sellerProfile!.idNumber!, style: GoogleFonts.outfit(color: AppColors.textLight, fontSize: 11, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ],
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Text('رقم الجوال: ', style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 11)),
                      Text(
                        order.sellerSignature?.phone.isNotEmpty == true 
                            ? order.sellerSignature!.phone 
                            : (_sellerProfile?.phoneNumber ?? 'غير متوفر'), 
                        style: GoogleFonts.outfit(color: AppColors.textLight, fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 24),
            Text('البنود والشروط:', style: GoogleFonts.cairo(color: AppColors.textLight, fontWeight: FontWeight.bold, fontSize: 12)),
            const SizedBox(height: 4),
            Text('1. يقر ووافق المشتري على توقيع وتأمين قيمة الصفقة بالضمان لصالح البائع.\n2. يلتزم البائع بتسليم العمل بالوقت المحدد وبحسب الوصف المتفق عليه.\n3. يحق للمشتري استرجاع المبلغ في حال عدم التزام البائع بالمتفق عليه.\n4. تعتبر منصة عربون وسيطاً مالياً لضمان حقوق الطرفين.', style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.bold, height: 1.8)),
            
            _buildDigitalSeals(order),
            const SizedBox(height: 24),
            if (order.isContractSigned) ...[
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
              ),
              const SizedBox(height: 16),
              OutlinedButton.icon(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('جاري تجهيز ملف PDF للطباعة...', style: GoogleFonts.cairo())));
                },
                icon: const Icon(Icons.picture_as_pdf, color: AppColors.accentGold),
                label: Text('طباعة العقد (PDF)', style: GoogleFonts.cairo(color: AppColors.accentGold, fontWeight: FontWeight.bold)),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 50),
                  side: const BorderSide(color: AppColors.accentGold),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
              ),
            ] else ...[
              ElevatedButton(
                onPressed: _isLoadingAction ? null : () => _signContract(order),
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.accentGold, foregroundColor: AppColors.primaryDark, minimumSize: const Size(double.infinity, 54), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)), elevation: 0),
                child: _isLoadingAction 
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: AppColors.primaryDark, strokeWidth: 2))
                  : Text('التوقيع والتأكيد الإلكتروني', style: GoogleFonts.cairo(fontWeight: FontWeight.w900, fontSize: 12)),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildContractRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 11)),
          const SizedBox(width: 8),
          Expanded(child: Text(value, style: GoogleFonts.cairo(color: AppColors.textLight, fontSize: 11, fontWeight: FontWeight.bold))),
        ],
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
        onPressed: () => _showDeliverySheet(order),
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

  void _showDeliverySheet(OrderModel order) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        final commentController = TextEditingController();
        List<XFile> selectedFiles = [];
        bool isProcessing = false;
        double uploadProgress = 0.0;

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
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(
                        width: 48,
                        height: 4,
                        decoration: BoxDecoration(
                          color: AppColors.textMuted.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    Center(
                      child: Text(
                        'تسليم العمل النهائي للمشتري',
                        style: GoogleFonts.cairo(
                          color: AppColors.textLight,
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    Text(
                      'ملاحظات وبنود التسليم',
                      style: GoogleFonts.cairo(
                        color: AppColors.textLight,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      decoration: BoxDecoration(
                        color: AppColors.backgroundDark,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.textMuted.withOpacity(0.2)),
                      ),
                      child: TextField(
                        controller: commentController,
                        maxLines: 4,
                        style: GoogleFonts.cairo(color: AppColors.textLight, fontSize: 13),
                        decoration: InputDecoration(
                          border: InputBorder.none,
                          hintText: 'اكتب مواصفات وشروط تسليم العمل والروابط الخارجية إن وجدت...',
                          hintStyle: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 11),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'المرفقات وإثبات التوريد',
                          style: GoogleFonts.cairo(
                            color: AppColors.textLight,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        TextButton.icon(
                          onPressed: isProcessing ? null : () async {
                            final picker = ImagePicker();
                            final images = await picker.pickMultiImage();
                            if (images.isNotEmpty) {
                              setModalState(() {
                                selectedFiles.addAll(images);
                              });
                            }
                          },
                          icon: const Icon(Icons.add_photo_alternate_outlined, color: AppColors.accentGold, size: 18),
                          label: Text(
                            'إرفاق صور',
                            style: GoogleFonts.cairo(color: AppColors.accentGold, fontSize: 12, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    if (selectedFiles.isEmpty)
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(vertical: 24),
                        decoration: BoxDecoration(
                          color: AppColors.backgroundDark,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppColors.textMuted.withOpacity(0.1)),
                        ),
                        child: Column(
                          children: [
                            Icon(Icons.cloud_upload_outlined, color: AppColors.textMuted.withOpacity(0.4), size: 36),
                            const SizedBox(height: 8),
                            Text(
                              'لا توجد ملفات مرفقة للتسليم بعد',
                              style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      )
                    else
                      Container(
                        height: 80,
                        child: ListView.builder(
                          scrollDirection: Axis.horizontal,
                          itemCount: selectedFiles.length,
                          itemBuilder: (context, idx) {
                            final file = selectedFiles[idx];
                            return Stack(
                              children: [
                                Container(
                                  width: 80,
                                  height: 80,
                                  margin: const EdgeInsets.only(left: 8),
                                  decoration: BoxDecoration(
                                    color: AppColors.backgroundDark,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(color: AppColors.textMuted.withOpacity(0.2)),
                                  ),
                                  child: ClipRRect(
                                    borderRadius: BorderRadius.circular(12),
                                    child: Image.file(
                                      File(file.path),
                                      fit: BoxFit.cover,
                                      errorBuilder: (context, error, stackTrace) {
                                        return const Center(
                                          child: Icon(Icons.image_outlined, color: AppColors.accentGold),
                                        );
                                      },
                                    ),
                                  ),
                                ),
                                if (!isProcessing)
                                  Positioned(
                                    right: 2,
                                    top: 2,
                                    child: GestureDetector(
                                      onTap: () {
                                        setModalState(() {
                                          selectedFiles.removeAt(idx);
                                        });
                                      },
                                      child: Container(
                                        padding: const EdgeInsets.all(2),
                                        decoration: const BoxDecoration(color: AppColors.alert, shape: BoxShape.circle),
                                        child: const Icon(Icons.close, color: Colors.white, size: 12),
                                      ),
                                    ),
                                  ),
                              ],
                            );
                          },
                        ),
                      ),
                    const SizedBox(height: 32),
                    if (isProcessing) ...[
                      Center(
                        child: Text(
                          'جاري رفع الملفات وإرسال التسليم...',
                          style: GoogleFonts.cairo(color: AppColors.accentGold, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ),
                      const SizedBox(height: 12),
                      LinearProgressIndicator(
                        value: uploadProgress == 0.0 ? null : uploadProgress,
                        backgroundColor: AppColors.backgroundDark,
                        color: AppColors.success,
                        minHeight: 6,
                        borderRadius: BorderRadius.circular(3),
                      ),
                      const SizedBox(height: 24),
                    ],
                    SizedBox(
                      width: double.infinity,
                      height: 56,
                      child: ElevatedButton(
                        onPressed: isProcessing || (commentController.text.trim().isEmpty && selectedFiles.isEmpty)
                            ? null
                            : () async {
                                setModalState(() {
                                  isProcessing = true;
                                });
                                
                                List<String> uploadedUrls = [];
                                try {
                                  for (int i = 0; i < selectedFiles.length; i++) {
                                    setModalState(() {
                                      uploadProgress = (i + 1) / selectedFiles.length;
                                    });
                                    final img = selectedFiles[i];
                                    final bytes = await img.readAsBytes();
                                    final url = await FirebaseService().uploadDeliveryAttachment(
                                      orderId: order.id,
                                      fileName: img.name,
                                      fileBytes: bytes,
                                    );
                                    if (url != null) {
                                      uploadedUrls.add(url);
                                    }
                                  }
                                  
                                  // Update order status with attachment URLs
                                  await _updateStatus(
                                    'delivered',
                                    comment: commentController.text.trim().isEmpty
                                        ? 'تم تسليم العمل بنجاح بواسطة البائع من خلال التطبيق.'
                                        : commentController.text.trim(),
                                    attachmentUrls: uploadedUrls,
                                  );
                                  
                                  if (context.mounted) {
                                    Navigator.pop(context); // Close bottom sheet
                                  }
                                } catch (err) {
                                  print('Error delivering work: $err');
                                  if (context.mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(content: Text('حدث خطأ أثناء رفع المرفقات: $err')),
                                    );
                                  }
                                } finally {
                                  setModalState(() {
                                    isProcessing = false;
                                  });
                                }
                              },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.success,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                        child: Text(
                          'تأكيد إرسال التسليم',
                          style: GoogleFonts.cairo(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
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
