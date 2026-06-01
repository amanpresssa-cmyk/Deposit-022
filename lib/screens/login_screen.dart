import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter/gestures.dart';
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
        if (mounted) Navigator.pop(context);
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
        if (mounted) Navigator.pop(context);
      } else {
        setState(() => _errorMessage = 'تم رفض التسجيل من جوجل لأن التطبيق يحتاج لتوثيق (SHA-1).');
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

  void _switchAccount() async {
    _identifierController.clear();
    try {
      await FirebaseService().signOutGoogle();
    } catch (_) {}
    setState(() {
      _errorMessage = 'تم مسح البيانات، يمكنك الآن تسجيل الدخول بحساب آخر.';
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [AppColors.backgroundDark, AppColors.cardDark],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 48),
                Center(
                  child: Image.asset(
                    'assets/images/logo.png',
                    width: 120,
                    height: 120,
                    fit: BoxFit.contain,
                  ),
                ),
                const SizedBox(height: 32),
                Text(
                  'مرحباً بك في عربون',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.cairo(color: AppColors.textLight, fontSize: 26, fontWeight: FontWeight.w900, letterSpacing: 0.5),
                ),
                const SizedBox(height: 8),
                Text(
                  'سجل دخولك لمتابعة صفقاتك المضمونة',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 13, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 48),

                if (_errorMessage != null)
                  Container(
                    margin: const EdgeInsets.only(bottom: 24),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.alert.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.alert.withOpacity(0.3)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.error_outline, color: AppColors.alert, size: 24),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            _errorMessage!,
                            style: GoogleFonts.cairo(color: AppColors.textLight, fontSize: 12, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                  ),

                Container(
                  decoration: BoxDecoration(
                    color: AppColors.cardDark.withOpacity(0.6),
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: AppColors.textMuted.withOpacity(0.1)),
                  ),
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'بيانات الدخول',
                        style: GoogleFonts.cairo(color: AppColors.textLight, fontSize: 14, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 16),
                      TextField(
                        controller: _identifierController,
                        keyboardType: TextInputType.emailAddress,
                        style: GoogleFonts.outfit(color: AppColors.textLight, fontSize: 15),
                        decoration: InputDecoration(
                          hintText: 'البريد الإلكتروني أو رقم الجوال',
                          hintStyle: GoogleFonts.cairo(color: AppColors.textMuted.withOpacity(0.5), fontSize: 12),
                          prefixIcon: const Icon(Icons.person_outline, color: AppColors.accentGold),
                          filled: true,
                          fillColor: AppColors.backgroundDark,
                          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: AppColors.textMuted.withOpacity(0.1))),
                          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: AppColors.accentGold, width: 2)),
                        ),
                      ),
                      const SizedBox(height: 24),
                      ElevatedButton(
                        onPressed: _loading ? null : _handleLogin,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.accentGold,
                          foregroundColor: AppColors.primaryDark,
                          minimumSize: const Size(double.infinity, 54),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          elevation: 0,
                        ),
                        child: _loading
                            ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: AppColors.primaryDark, strokeWidth: 2))
                            : Text('دخول سريع', style: GoogleFonts.cairo(fontWeight: FontWeight.w900, fontSize: 15)),
                      ),
                    ],
                  ),
                ),
                
                const SizedBox(height: 32),
                Row(
                  children: [
                    Expanded(child: Divider(color: AppColors.textMuted.withOpacity(0.2))),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Text('أو عبر', style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 12, fontWeight: FontWeight.bold)),
                    ),
                    Expanded(child: Divider(color: AppColors.textMuted.withOpacity(0.2))),
                  ],
                ),
                const SizedBox(height: 32),

                OutlinedButton.icon(
                  onPressed: _loading ? null : _handleGoogleLogin,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.textLight,
                    minimumSize: const Size(double.infinity, 54),
                    side: BorderSide(color: AppColors.textMuted.withOpacity(0.3)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    backgroundColor: AppColors.cardDark,
                  ),
                  icon: SvgPicture.string(
                    '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>''',
                    width: 20,
                  ),
                  label: Text('المتابعة بحساب Google', style: GoogleFonts.cairo(fontWeight: FontWeight.bold, fontSize: 13)),
                ),

                const SizedBox(height: 16),
                TextButton(
                  onPressed: _switchAccount,
                  child: Text(
                    'تبديل الحساب / تسجيل الخروج المسبق',
                    style: GoogleFonts.cairo(color: AppColors.accentGold, fontSize: 12, fontWeight: FontWeight.bold, decoration: TextDecoration.underline),
                  ),
                ),
                
                const SizedBox(height: 32),
                Center(
                  child: RichText(
                    textAlign: TextAlign.center,
                    text: TextSpan(
                      style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 10, height: 1.6),
                      children: [
                        const TextSpan(text: 'بتسجيلك للدخول، أنت توافق على '),
                        TextSpan(
                          text: 'شروط الاستخدام',
                          style: const TextStyle(color: AppColors.accentGold, decoration: TextDecoration.underline),
                          recognizer: TapGestureRecognizer()..onTap = () {
                            launchUrl(Uri.parse('https://arboon.sa/terms'));
                          },
                        ),
                        const TextSpan(text: ' و '),
                        TextSpan(
                          text: 'سياسة الخصوصية',
                          style: const TextStyle(color: AppColors.accentGold, decoration: TextDecoration.underline),
                          recognizer: TapGestureRecognizer()..onTap = () {
                            launchUrl(Uri.parse('https://arboon.sa/privacy'));
                          },
                        ),
                        const TextSpan(text: ' الخاصة بمنصة عربون'),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
