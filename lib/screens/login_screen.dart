import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../constants/colors.dart';
import '../services/firebase_service.dart';
import '../models/user.dart';

const String arboonLogoSvg = '''
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#C5A880" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z" fill="#C5A880" stroke-width="0"/>
  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="white" />
</svg>
''';

class LoginScreen extends StatefulWidget {
  final Function(UserProfile) onLoginSuccess;

  const LoginScreen({Key? key, required this.onLoginSuccess}) : super(key: key);

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _identifierController = TextEditingController();
  bool _loading = false;
  String? _errorMessage;

  void _handleLogin() async {
    final input = _identifierController.text.trim();
    if (input.isEmpty) {
      setState(() => _errorMessage = 'يرجى إدخال البريد الإلكتروني أو رقم الجوال');
      return;
    }

    setState(() {
      _loading = true;
      _errorMessage = null;
    });

    try {
      final profile = await FirebaseService().loginWithIdentifier(input);
      if (profile != null) {
        widget.onLoginSuccess(profile);
      } else {
        setState(() => _errorMessage = 'لم يتم العثور على حساب مرتبط بهذه البيانات. يرجى التأكد من التسجيل في المنصة.');
      }
    } catch (e) {
      setState(() => _errorMessage = 'حدث خطأ أثناء الاتصال بالخادم وقاعدة البيانات');
    } finally {
      setState(() => _loading = false);
    }
  }

  void _handleGoogleLogin() async {
    setState(() {
      _loading = true;
      _errorMessage = null;
    });

    try {
      final profile = await FirebaseService().loginWithGoogle();
      if (profile != null) {
        widget.onLoginSuccess(profile);
      } else {
        setState(() => _errorMessage = 'فشل تسجيل الدخول عبر Google. يرجى التحقق من اتصالك بالإنترنت.');
      }
    } catch (e) {
      setState(() => _errorMessage = 'حدث خطأ أثناء الاتصال بالخادم وقاعدة البيانات');
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _identifierController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Spacer(),
              Center(
                child: Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: AppColors.accentGold.withOpacity(0.08),
                    shape: BoxShape.circle,
                  ),
                  child: SvgPicture.string(
                    arboonLogoSvg,
                    width: 52,
                    height: 52,
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Center(
                child: Text(
                  'منصة عربون للوساطة الآمنة',
                  style: GoogleFonts.cairo(
                    color: AppColors.textLight,
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              Center(
                child: Text(
                  'نظام الدخول الآمن للضمانات والصفقات',
                  style: GoogleFonts.cairo(
                    color: AppColors.textMuted,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(height: 48),

              Text(
                'البريد الإلكتروني أو رقم الهاتف',
                style: GoogleFonts.cairo(
                  color: AppColors.textLight,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _identifierController,
                keyboardType: TextInputType.emailAddress,
                style: GoogleFonts.outfit(color: AppColors.textLight, fontSize: 16),
                decoration: InputDecoration(
                  hintText: 'example@gmail.com أو 05XXXXXXXX',
                  hintStyle: GoogleFonts.cairo(color: AppColors.textMuted.withOpacity(0.4), fontSize: 12),
                  prefixIcon: const Icon(Icons.person_outline, color: AppColors.accentGold),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: const BorderSide(color: AppColors.cardDark, width: 2),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: const BorderSide(color: AppColors.accentGold, width: 2),
                  ),
                  filled: true,
                  fillColor: AppColors.cardDark,
                ),
              ),
              const SizedBox(height: 12),

              if (_errorMessage != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: AppColors.alert.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.alert.withOpacity(0.2)),
                  ),
                  child: Text(
                    _errorMessage!,
                    textAlign: TextAlign.center,
                    style: GoogleFonts.cairo(
                      color: AppColors.alert,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),

              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _loading ? null : _handleLogin,
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
                        'دخول آمن للصفقات',
                        style: GoogleFonts.cairo(fontWeight: FontWeight.w900, fontSize: 13),
                      ),
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(child: Divider(color: AppColors.textMuted.withOpacity(0.15), thickness: 1)),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Text(
                      'أو الدخول السريع عبر',
                      style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.bold),
                    ),
                  ),
                  Expanded(child: Divider(color: AppColors.textMuted.withOpacity(0.15), thickness: 1)),
                ],
              ),
              const SizedBox(height: 16),
              OutlinedButton(
                onPressed: _loading ? null : _handleGoogleLogin,
                style: OutlinedButton.styleFrom(
                  side: BorderSide(color: AppColors.accentGold.withOpacity(0.4), width: 1.5),
                  minimumSize: const Size(double.infinity, 56),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  backgroundColor: AppColors.cardDark,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Image.network(
                      'https://developers.google.com/identity/images/g-logo.png',
                      width: 20,
                      height: 20,
                      errorBuilder: (context, error, stackTrace) => const Icon(Icons.g_mobiledata_rounded, color: AppColors.accentGold, size: 28),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      'تسجيل الدخول باستخدام Google',
                      style: GoogleFonts.cairo(
                        color: AppColors.textLight,
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
              ),
              const Spacer(),
              Center(
                child: Text(
                  'جميع البيانات محمية ومؤمنة بالنفاذ الوطني 🛡️',
                  style: GoogleFonts.cairo(
                    color: AppColors.textMuted,
                    fontSize: 9,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }
}
