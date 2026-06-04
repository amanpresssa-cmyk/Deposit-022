import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../constants/colors.dart';
import '../models/user.dart';

class VerificationScreen extends StatefulWidget {
  final UserProfile mockUser;

  const VerificationScreen({
    Key? key,
    required this.mockUser,
  }) : super(key: key);

  @override
  State<VerificationScreen> createState() => _VerificationScreenState();
}

class _VerificationScreenState extends State<VerificationScreen> {
  int _step = 0; // 0 = Info/Intro, 1 = Form ID, 2 = OTP, 3 = Success
  final TextEditingController _idController = TextEditingController();
  final TextEditingController _otpController = TextEditingController();
  bool _loading = false;
  int _timer = 0;
  Timer? _countdownTimer;

  void _startTimer() {
    setState(() => _timer = 120);
    _countdownTimer?.cancel();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_timer > 0) {
        setState(() => _timer--);
      } else {
        _countdownTimer?.cancel();
      }
    });
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    _idController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  void _sendVerificationOTP() async {
    if (_idController.text.trim().length != 10) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors.alert,
          content: Text(
            'يرجى إدخال رقم هوية أو إقامة صحيح مكون من 10 أرقام',
            textAlign: TextAlign.center,
            style: GoogleFonts.cairo(fontWeight: FontWeight.bold),
          ),
        ),
      );
      return;
    }

    setState(() => _loading = true);
    
    // Simulate API connection latency to Yamamah Absher mediator
    await Future.delayed(const Duration(milliseconds: 2000));
    
    setState(() {
      _loading = false;
      _step = 2;
    });
    
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors.info,
          content: Text(
            'تم إرسال الرمز لجوالك بأبشر. (للتجربة، رمز المحاكاة هو 1234)',
            textAlign: TextAlign.center,
            style: GoogleFonts.cairo(fontWeight: FontWeight.bold, color: Colors.white),
          ),
        ),
      );
    }
    
    _startTimer();
  }

  void _verifyOTP() async {
    if (_otpController.text.trim().length != 4) return;

    if (_otpController.text.trim() != '1234') {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors.alert,
          content: Text(
            'رمز التحقق غير صحيح! للتجربة استخدم رمز المحاكاة 1234',
            textAlign: TextAlign.center,
            style: GoogleFonts.cairo(fontWeight: FontWeight.bold),
          ),
        ),
      );
      return;
    }

    setState(() => _loading = true);
    
    try {
      // Simulate verification checking latency
      await Future.delayed(const Duration(milliseconds: 1500));
      
      final FirebaseFirestore db = FirebaseFirestore.instanceFor(
        app: Firebase.app(),
        databaseId: "ai-studio-ee0a8e94-5852-438b-93d7-9755da859ebc",
      );

      await db.collection('users').doc(widget.mockUser.uid).update({
        'isVerified': true,
        'verificationStatus': 'verified',
        'idNumber': _idController.text.trim(),
        'updatedAt': FieldValue.serverTimestamp(),
      });

      setState(() {
        _loading = false;
        _step = 3;
      });
    } catch (e) {
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors.alert,
          content: Text(
            'حدث خطأ أثناء حفظ التوثيق، يرجى المحاولة لاحقاً',
            textAlign: TextAlign.center,
            style: GoogleFonts.cairo(fontWeight: FontWeight.bold),
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: AppColors.textLight, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Expanded(
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 300),
                  child: _buildActiveStep(),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildActiveStep() {
    switch (_step) {
      case 0:
        return _buildIntroStep();
      case 1:
        return _buildFormStep();
      case 2:
        return _buildOtpStep();
      case 3:
        return _buildSuccessStep();
      default:
        return Container();
    }
  }

  Widget _buildIntroStep() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: AppColors.accentGold.withOpacity(0.08),
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.shield_outlined, color: AppColors.accentGold, size: 64),
        ),
        const SizedBox(height: 30),
        Text(
          'التوثيق المالي الرقمي الموحد',
          textAlign: TextAlign.center,
          style: GoogleFonts.cairo(color: AppColors.textLight, fontSize: 20, fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 12),
        Text(
          'لرفع مستوى ثقة حسابك للحد الأقصى وتمكين كافة خدمات الضمان المالي والسداد والتقسيط، يرجى ربط حسابك رسمياً بالهوية الوطنية عبر نفاذ وأبشر.',
          textAlign: TextAlign.center,
          style: GoogleFonts.cairo(
            color: AppColors.textMuted,
            fontSize: 12,
            fontWeight: FontWeight.bold,
            height: 1.8,
          ),
        ),
        const SizedBox(height: 40),
        ElevatedButton(
          onPressed: () => setState(() => _step = 1),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.accentGold,
            foregroundColor: AppColors.primaryDark,
            minimumSize: const Size(double.infinity, 56),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            elevation: 0,
          ),
          child: Text(
            'بدء التوثيق الآمن',
            style: GoogleFonts.cairo(fontWeight: FontWeight.w900, fontSize: 13),
          ),
        ),
      ],
    );
  }

  Widget _buildFormStep() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          'أدخل رقم الهوية أو الإقامة',
          style: GoogleFonts.cairo(color: AppColors.textLight, fontSize: 18, fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 6),
        Text(
          'سيتم الاستعلام آلياً وإرسال كود التحقق لجوالك المعتمد في أبشر',
          textAlign: TextAlign.center,
          style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 30),
        TextField(
          controller: _idController,
          keyboardType: TextInputType.number,
          maxLength: 10,
          textAlign: TextAlign.center,
          style: GoogleFonts.outfit(
            color: AppColors.textLight,
            fontSize: 26,
            fontWeight: FontWeight.w900,
            letterSpacing: 8,
          ),
          decoration: InputDecoration(
            counterText: '',
            hintText: '1000000000',
            hintStyle: GoogleFonts.outfit(color: AppColors.textMuted.withOpacity(0.3), letterSpacing: 8),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(20),
              borderSide: const BorderSide(color: AppColors.cardDark, width: 2),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(20),
              borderSide: const BorderSide(color: AppColors.accentGold, width: 2),
            ),
            filled: true,
            fillColor: AppColors.cardDark,
          ),
        ),
        const SizedBox(height: 30),
        ElevatedButton(
          onPressed: _loading ? null : _sendVerificationOTP,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.accentGold,
            foregroundColor: AppColors.primaryDark,
            minimumSize: const Size(double.infinity, 56),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            elevation: 0,
            disabledBackgroundColor: AppColors.accentGold.withOpacity(0.3),
          ),
          child: _loading
              ? const SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(color: AppColors.primaryDark, strokeWidth: 3),
                )
              : Text(
                  'إرسال طلب التحقق',
                  style: GoogleFonts.cairo(fontWeight: FontWeight.w900, fontSize: 13),
                ),
        ),
      ],
    );
  }

  Widget _buildOtpStep() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          'أدخل رمز التحقق المكون من 4 أرقام',
          style: GoogleFonts.cairo(color: AppColors.textLight, fontSize: 18, fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 6),
        Text(
          'تم إرسال كود التوثيق لجوالك المسجل بنظام أبشر',
          textAlign: TextAlign.center,
          style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 30),
        TextField(
          controller: _otpController,
          keyboardType: TextInputType.number,
          maxLength: 4,
          textAlign: TextAlign.center,
          style: GoogleFonts.outfit(
            color: AppColors.textLight,
            fontSize: 32,
            fontWeight: FontWeight.w900,
            letterSpacing: 16,
          ),
          decoration: InputDecoration(
            counterText: '',
            hintText: '----',
            hintStyle: GoogleFonts.outfit(color: AppColors.textMuted.withOpacity(0.3), letterSpacing: 16),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(20),
              borderSide: const BorderSide(color: AppColors.cardDark, width: 2),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(20),
              borderSide: const BorderSide(color: AppColors.accentGold, width: 2),
            ),
            filled: true,
            fillColor: AppColors.cardDark,
          ),
        ),
        const SizedBox(height: 20),
        Text(
          _timer > 0 ? 'إعادة الإرسال متاحة خلال $_timer ثانية' : 'إمكانية إعادة طلب الرمز متاحة الآن',
          style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 30),
        ElevatedButton(
          onPressed: _loading ? null : _verifyOTP,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.accentGold,
            foregroundColor: AppColors.primaryDark,
            minimumSize: const Size(double.infinity, 56),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            elevation: 0,
            disabledBackgroundColor: AppColors.accentGold.withOpacity(0.3),
          ),
          child: _loading
              ? const SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(color: AppColors.primaryDark, strokeWidth: 3),
                )
              : Text(
                  'تأكيد الاعتماد النهائي',
                  style: GoogleFonts.cairo(fontWeight: FontWeight.w900, fontSize: 13),
                ),
        ),
      ],
    );
  }

  Widget _buildSuccessStep() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: AppColors.success.withOpacity(0.08),
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.verified, color: AppColors.success, size: 64),
        ),
        const SizedBox(height: 30),
        Text(
          'تم ربط وتوثيق الحساب بنجاح!',
          textAlign: TextAlign.center,
          style: GoogleFonts.cairo(color: AppColors.textLight, fontSize: 20, fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 12),
        Text(
          'تهانينا! حسابك الآن يحمل شارة التوثيق الوطنية "موثوق" بنسبة أمان 100%. يمكنك الآن استخدام محرك الضمان والعمليات المالية وإتمام المعاملات فورياً.',
          textAlign: TextAlign.center,
          style: GoogleFonts.cairo(
            color: AppColors.textMuted,
            fontSize: 12,
            fontWeight: FontWeight.bold,
            height: 1.8,
          ),
        ),
        const SizedBox(height: 40),
        ElevatedButton(
          onPressed: () => Navigator.pop(context),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.success,
            foregroundColor: AppColors.primaryDark,
            minimumSize: const Size(double.infinity, 56),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            elevation: 0,
          ),
          child: Text(
            'العودة للوحة التحكم',
            style: GoogleFonts.cairo(fontWeight: FontWeight.w900, fontSize: 13),
          ),
        ),
      ],
    );
  }
}
