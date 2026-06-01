import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../constants/colors.dart';
import '../models/user.dart';
import 'login_screen.dart';
import 'services_screen.dart';

class LandingScreen extends StatelessWidget {
  final Function(UserProfile) loginCallback;

  const LandingScreen({Key? key, required this.loginCallback}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Spacer(flex: 1),
              // App Logo or Icon
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
                style: GoogleFonts.cairo(color: AppColors.textLight, fontSize: 28, fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 16),
              Text(
                'المنصة السعودية الأولى لضمان وحماية التعاملات المالية والخدمات المستقلة بطريقة قانونية آمنة.',
                textAlign: TextAlign.center,
                style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 14, height: 1.6),
              ),
              const SizedBox(height: 32),
              
              _buildFeatureRow(Icons.security, 'ضمان مالي 100% لجميع الأطراف'),
              _buildFeatureRow(Icons.gavel, 'عقود إلكترونية موثقة وملزمة قانونياً'),
              _buildFeatureRow(Icons.verified, 'بائعون موثقون عبر النفاذ الوطني'),
              
              const Spacer(flex: 2),
              ElevatedButton(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => LoginScreen(onLoginSuccess: loginCallback)),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.accentGold,
                  foregroundColor: AppColors.primaryDark,
                  minimumSize: const Size(double.infinity, 56),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  elevation: 0,
                ),
                child: Text('تسجيل الدخول / البدء', style: GoogleFonts.cairo(fontWeight: FontWeight.w900, fontSize: 16)),
              ),
              const SizedBox(height: 16),
              OutlinedButton(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const ServicesScreen(currentUser: null)),
                  );
                },
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.accentGold,
                  minimumSize: const Size(double.infinity, 56),
                  side: const BorderSide(color: AppColors.accentGold),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                child: Text('تصفح الخدمات كزائر', style: GoogleFonts.cairo(fontWeight: FontWeight.bold, fontSize: 14)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFeatureRow(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0, horizontal: 16),
      child: Row(
        children: [
          Icon(icon, color: AppColors.accentGold, size: 20),
          const SizedBox(width: 16),
          Expanded(child: Text(text, style: GoogleFonts.cairo(color: AppColors.textLight, fontSize: 12, fontWeight: FontWeight.bold))),
        ],
      ),
    );
  }
}
