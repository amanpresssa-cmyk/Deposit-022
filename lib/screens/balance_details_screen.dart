import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_core/firebase_core.dart';
import '../constants/colors.dart';
import '../models/user.dart';

class BalanceDetailsScreen extends StatefulWidget {
  final UserProfile currentUser;

  const BalanceDetailsScreen({
    Key? key,
    required this.currentUser,
  }) : super(key: key);

  @override
  State<BalanceDetailsScreen> createState() => _BalanceDetailsScreenState();
}

class _BalanceDetailsScreenState extends State<BalanceDetailsScreen> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _amountController = TextEditingController();
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _ibanController = TextEditingController(text: 'SA');
  
  String _withdrawalType = 'standard'; // 'standard' or 'fast_track'
  bool _loading = false;
  bool _showBalances = true;
  double _userBalance = 0.0;

  @override
  void initState() {
    super.initState();
    _userBalance = widget.currentUser.balance;
    _amountController.text = _userBalance.toStringAsFixed(2);
    _nameController.text = widget.currentUser.displayName;
    if (widget.currentUser.payoutIban.isNotEmpty) {
      _ibanController.text = widget.currentUser.payoutIban;
    }
  }

  @override
  void dispose() {
    _amountController.dispose();
    _nameController.dispose();
    _ibanController.dispose();
    super.dispose();
  }

  void _submitWithdrawal() async {
    if (!_formKey.currentState!.validate()) return;

    final double withdrawAmount = double.tryParse(_amountController.text) ?? 0.0;
    if (withdrawAmount <= 0) {
      _showErrorSnackBar('يرجى إدخال مبلغ صحيح للتحويل');
      return;
    }

    if (withdrawAmount > _userBalance) {
      _showErrorSnackBar('المبلغ المطلوب يتجاوز رصيدك المتاح حالياً');
      return;
    }

    final String cleanIban = _ibanController.text.trim().toUpperCase();
    if (cleanIban.length < 24) {
      _showErrorSnackBar('رقم الآيبان غير مكتمل أو غير صحيح');
      return;
    }

    setState(() => _loading = true);

    try {
      final double fee = _withdrawalType == 'fast_track' ? (withdrawAmount * 0.01) : 0.0;
      final double netAmount = withdrawAmount - fee;

      final FirebaseFirestore db = FirebaseFirestore.instanceFor(
        app: Firebase.app(),
        databaseId: "ai-studio-ee0a8e94-5852-438b-93d7-9755da859ebc",
      );

      // 1. Create withdrawal request document
      await db.collection('withdrawals').add({
        'userId': widget.currentUser.uid,
        'userEmail': widget.currentUser.email,
        'userName': widget.currentUser.displayName,
        'amount': withdrawAmount,
        'netAmount': netAmount,
        'fee': fee,
        'type': _withdrawalType,
        'status': 'pending',
        'bankAccount': _nameController.text.trim(),
        'iban': cleanIban,
        'createdAt': FieldValue.serverTimestamp(),
      });

      // 2. Deduct balance from user profile document
      await db.collection('users').doc(widget.currentUser.uid).update({
        'balance': FieldValue.increment(-withdrawAmount),
        'payoutIban': cleanIban,
        'payoutAccountName': _nameController.text.trim(),
      });

      setState(() {
        _userBalance -= withdrawAmount;
        _loading = false;
      });

      _showSuccessDialog(withdrawAmount, _withdrawalType == 'fast_track');
    } catch (e) {
      setState(() => _loading = false);
      _showErrorSnackBar('حدث خطأ أثناء معالجة الطلب، يرجى المحاولة لاحقاً');
    }
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: AppColors.alert,
        content: Text(
          message,
          textAlign: TextAlign.center,
          style: GoogleFonts.cairo(fontWeight: FontWeight.bold, color: Colors.white),
        ),
      ),
    );
  }

  void _showSuccessDialog(double amount, bool isFastTrack) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.cardDark,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.success.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.check_circle_outline_rounded, color: AppColors.success, size: 54),
            ),
            const SizedBox(height: 24),
            Text(
              'تم استلام طلب التحويل!',
              style: GoogleFonts.cairo(color: AppColors.textLight, fontSize: 18, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 10),
            Text(
              isFastTrack 
                  ? 'تمت معالجة طلب التحويل الفوري بنجاح بقيمة $amount ر.س. سيصل المبلغ لحسابك المصرفي خلال ثوانٍ.'
                  : 'تم تسجيل طلب التحويل العادي بنجاح بقيمة $amount ر.س. جاري تدقيق المعاملة والتحويل للحساب خلال 24-48 ساعة.',
              textAlign: TextAlign.center,
              style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 12, height: 1.6),
            ),
            const SizedBox(height: 28),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(ctx); // Close Dialog
                Navigator.pop(context); // Close Balance Screen
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.success,
                minimumSize: const Size(double.infinity, 50),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              child: Text(
                'العودة للرئيسية',
                style: GoogleFonts.cairo(color: AppColors.primaryDark, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text(
          'تفاصيل الرصيد والمالية',
          style: GoogleFonts.cairo(color: AppColors.textLight, fontWeight: FontWeight.bold, fontSize: 16),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: AppColors.textLight, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. Premium Golden Balance Card
                _buildPlatinumCard(),
                const SizedBox(height: 24),

                // 2. Financial Explanatory Text
                _buildExplanatorySection(),
                const SizedBox(height: 28),

                // 3. Bank Account details Section Header
                Row(
                  children: [
                    const Icon(Icons.account_balance, color: AppColors.accentGold, size: 20),
                    const SizedBox(width: 8),
                    Text(
                      'طلب تحويل المستحقات للبنوك السعودية',
                      style: GoogleFonts.cairo(color: AppColors.textLight, fontSize: 13, fontWeight: FontWeight.w900),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // 4. Withdrawal Request Form
                _buildWithdrawalForm(),
                const SizedBox(height: 30),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPlatinumCard() {
    return Container(
      width: double.infinity,
      height: 220,
      decoration: BoxDecoration(
        gradient: AppColors.goldCardGradient,
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(
            color: AppColors.accentGold.withOpacity(0.2),
            blurRadius: 25,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Stack(
        children: [
          Positioned(
            right: -10,
            bottom: -10,
            child: Icon(
              Icons.shield_outlined,
              size: 200,
              color: Colors.white.withOpacity(0.04),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.shield, color: AppColors.accentGold, size: 24),
                        const SizedBox(width: 8),
                        Text(
                          'عربون بلاتينيوم',
                          style: GoogleFonts.cairo(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ],
                    ),
                    Row(
                      children: [
                        GestureDetector(
                          onTap: () => setState(() => _showBalances = !_showBalances),
                          child: Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.1),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              _showBalances ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                              color: Colors.white.withOpacity(0.9),
                              size: 16,
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Icon(Icons.contactless_outlined, color: Colors.white.withOpacity(0.8), size: 22),
                      ],
                    ),
                  ],
                ),
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'الرصيد المتاح للسحب',
                            style: GoogleFonts.cairo(
                              color: Colors.white.withOpacity(0.65),
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.baseline,
                            textBaseline: TextBaseline.alphabetic,
                            children: [
                              Text(
                                _showBalances 
                                    ? _userBalance.toStringAsFixed(2) 
                                    : '••••••',
                                style: GoogleFonts.outfit(
                                  color: Colors.white,
                                  fontSize: 22,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                              const SizedBox(width: 4),
                              Text(
                                'ر.س',
                                style: GoogleFonts.cairo(
                                  color: Colors.white.withOpacity(0.9),
                                  fontSize: 11,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    Container(
                      width: 1,
                      height: 40,
                      color: Colors.white.withOpacity(0.15),
                    ),
                    const SizedBox(width: 20),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'الرصيد المحجوز بالضمان',
                            style: GoogleFonts.cairo(
                              color: Colors.white.withOpacity(0.65),
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.baseline,
                            textBaseline: TextBaseline.alphabetic,
                            children: [
                              Text(
                                _showBalances 
                                    ? widget.currentUser.pendingBalance.toStringAsFixed(2) 
                                    : '••••••',
                                style: GoogleFonts.outfit(
                                  color: AppColors.accentGold,
                                  fontSize: 22,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                              const SizedBox(width: 4),
                              Text(
                                'ر.س',
                                style: GoogleFonts.cairo(
                                  color: AppColors.accentGold,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.currentUser.displayName,
                          style: GoogleFonts.cairo(
                            color: Colors.white,
                            fontSize: 13,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'ARB - ${widget.currentUser.userShortId.toUpperCase().padRight(5, 'X').split('').join('  ')}',
                          style: GoogleFonts.outfit(
                            color: Colors.white.withOpacity(0.6),
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1.2,
                          ),
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: widget.currentUser.isVerified 
                            ? AppColors.success.withOpacity(0.2) 
                            : AppColors.alert.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: widget.currentUser.isVerified 
                              ? AppColors.success.withOpacity(0.3) 
                              : AppColors.alert.withOpacity(0.3),
                          width: 1,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            widget.currentUser.isVerified ? Icons.verified : Icons.error_outline,
                            color: widget.currentUser.isVerified ? AppColors.success : AppColors.alert,
                            size: 12,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            widget.currentUser.isVerified ? 'موثق نفاذ' : 'غير موثق',
                            style: GoogleFonts.cairo(
                              color: widget.currentUser.isVerified ? AppColors.success : AppColors.alert,
                              fontSize: 9,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ],
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

  Widget _buildExplanatorySection() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.cardDark,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.textMuted.withOpacity(0.06)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.info_outline, color: AppColors.info, size: 20),
              const SizedBox(width: 8),
              Text(
                'فهم تفاصيل الأرصدة المالية',
                style: GoogleFonts.cairo(color: AppColors.textLight, fontWeight: FontWeight.bold, fontSize: 13),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            '• الرصيد المتاح للسحب: هو مجموع الأرباح الصافية المحررة التي تم تسليمها واعتمادها بالكامل من قبل عملائك، وهي جاهزة تماماً للتحويل البنكي الفوري لحسابك.',
            style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 11, height: 1.8),
          ),
          const SizedBox(height: 8),
          Text(
            '• الرصيد المحجوز بالضمان: هو إجمالي المبالغ المؤمنة قيد التنفيذ حالياً في صفقات عربون المعلقة. يتم تحرير هذه المبالغ فوراً إلى رصيدك المتاح بمجرد موافقة المشتري على تسليم العمل.',
            style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 11, height: 1.8),
          ),
        ],
      ),
    );
  }

  Widget _buildWithdrawalForm() {
    final double withdrawAmt = double.tryParse(_amountController.text) ?? 0.0;
    final double fastTrackFee = _withdrawalType == 'fast_track' ? (withdrawAmt * 0.01) : 0.0;
    final double netAmt = withdrawAmt - fastTrackFee;

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.cardDark,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.textMuted.withOpacity(0.06)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Withdrawal Amount
          Text(
            'المبلغ المطلوب تحويله (ر.س)',
            style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          TextFormField(
            controller: _amountController,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            style: GoogleFonts.outfit(color: AppColors.textLight, fontSize: 20, fontWeight: FontWeight.bold),
            onChanged: (val) => setState(() {}),
            validator: (val) {
              if (val == null || val.trim().isEmpty) return 'يرجى إدخال المبلغ';
              final d = double.tryParse(val);
              if (d == null || d <= 0) return 'مبلغ غير صحيح';
              if (d > _userBalance) return 'المبلغ يتجاوز الرصيد المتاح';
              return null;
            },
            decoration: InputDecoration(
              filled: true,
              fillColor: AppColors.backgroundDark,
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: AppColors.textMuted.withOpacity(0.1))),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: AppColors.accentGold)),
              suffixIcon: TextButton(
                onPressed: () {
                  setState(() {
                    _amountController.text = _userBalance.toStringAsFixed(2);
                  });
                },
                child: Text('تحويل الكل', style: GoogleFonts.cairo(color: AppColors.accentGold, fontWeight: FontWeight.bold, fontSize: 11)),
              ),
            ),
          ),
          const SizedBox(height: 20),

          // 2. Withdrawal Type Selector
          Text(
            'خيار سرعة معالجة التحويل',
            style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 10),
          _buildWithdrawOption(
            type: 'standard',
            title: 'تحويل مجاني (عادي)',
            desc: 'يتم تحويل الأرباح مجاناً ودون أي عمولة خلال 24-48 ساعة عمل.',
            icon: Icons.access_time_rounded,
            color: AppColors.accentGold,
          ),
          const SizedBox(height: 10),
          _buildWithdrawOption(
            type: 'fast_track',
            title: 'تحويل فوري (Fast-Track) ⚡',
            desc: 'عمولة تحويل 1% فقط، وسيتم تحويل الأرباح فورياً إلى حسابك خلال ثوانٍ!',
            icon: Icons.bolt_outlined,
            color: AppColors.info,
          ),
          const SizedBox(height: 20),

          // 3. Bank Account Name
          Text(
            'اسم المستفيد (مطابق للبنك)',
            style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          TextFormField(
            controller: _nameController,
            style: GoogleFonts.cairo(color: AppColors.textLight, fontSize: 14, fontWeight: FontWeight.bold),
            validator: (val) {
              if (val == null || val.trim().isEmpty) return 'يرجى إدخال الاسم';
              return null;
            },
            decoration: InputDecoration(
              filled: true,
              fillColor: AppColors.backgroundDark,
              prefixIcon: const Icon(Icons.person_outline, color: AppColors.textMuted),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: AppColors.textMuted.withOpacity(0.1))),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: AppColors.accentGold)),
            ),
          ),
          const SizedBox(height: 20),

          // 4. Bank IBAN
          Text(
            'رقم الآيبان (IBAN)',
            style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          TextFormField(
            controller: _ibanController,
            style: GoogleFonts.outfit(color: AppColors.textLight, fontSize: 14, fontWeight: FontWeight.bold, letterSpacing: 1.5),
            validator: (val) {
              if (val == null || val.trim().isEmpty) return 'يرجى إدخال الآيبان';
              if (!val.trim().toUpperCase().startsWith('SA') || val.trim().length != 24) return 'الآيبان السعودي يجب أن يبدأ بـ SA ويتكون من 24 حرف ورقم';
              return null;
            },
            decoration: InputDecoration(
              filled: true,
              fillColor: AppColors.backgroundDark,
              prefixIcon: const Icon(Icons.credit_card_outlined, color: AppColors.textMuted),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: AppColors.textMuted.withOpacity(0.1))),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: AppColors.accentGold)),
            ),
          ),
          const SizedBox(height: 24),

          // 5. Fast-track Calculation Display
          if (_withdrawalType == 'fast_track' && withdrawAmt > 0) ...[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.info.withOpacity(0.08),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.info.withOpacity(0.2)),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('المبلغ المسحوب:', style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 11)),
                      Text('${withdrawAmt.toStringAsFixed(2)} ر.س', style: GoogleFonts.outfit(color: AppColors.textLight, fontSize: 12, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('رسوم التحويل الفوري (1%):', style: GoogleFonts.cairo(color: AppColors.alert, fontSize: 11)),
                      Text('- ${fastTrackFee.toStringAsFixed(2)} ر.س', style: GoogleFonts.outfit(color: AppColors.alert, fontSize: 12, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const Divider(height: 16, thickness: 0.5, color: Colors.white10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('المبلغ الصافي المحول:', style: GoogleFonts.cairo(color: AppColors.textLight, fontSize: 12, fontWeight: FontWeight.bold)),
                      Text('${netAmt.toStringAsFixed(2)} ر.س', style: GoogleFonts.outfit(color: AppColors.success, fontSize: 14, fontWeight: FontWeight.w900)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
          ],

          // 6. Submit Button
          ElevatedButton(
            onPressed: _loading || _userBalance <= 0 || withdrawAmt <= 0 ? null : _submitWithdrawal,
            style: ElevatedButton.styleFrom(
              backgroundColor: _withdrawalType == 'fast_track' ? AppColors.info : AppColors.success,
              foregroundColor: AppColors.primaryDark,
              minimumSize: const Size(double.infinity, 56),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              disabledBackgroundColor: Colors.white10,
              elevation: 0,
            ),
            child: _loading
                ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: AppColors.primaryDark, strokeWidth: 3))
                : Text(
                    'تأكيد طلب تحويل المستحقات',
                    style: GoogleFonts.cairo(fontWeight: FontWeight.w900, fontSize: 13),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildWithdrawOption({
    required String type,
    required String title,
    required String desc,
    required IconData icon,
    required Color color,
  }) {
    final isSelected = _withdrawalType == type;
    return InkWell(
      onTap: () => setState(() => _withdrawalType = type),
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected ? color.withOpacity(0.08) : AppColors.backgroundDark,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? color : AppColors.textMuted.withOpacity(0.1),
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: isSelected ? color.withOpacity(0.15) : Colors.white.withOpacity(0.03),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: isSelected ? color : AppColors.textMuted, size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        title,
                        style: GoogleFonts.cairo(color: AppColors.textLight, fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                      if (isSelected) ...[
                        const SizedBox(width: 8),
                        Icon(Icons.check_circle, color: color, size: 14),
                      ],
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    desc,
                    style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 10, height: 1.5),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
