import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'constants/colors.dart';
import 'models/user.dart';
import 'models/order.dart';
import 'services/firebase_service.dart';
import 'screens/login_screen.dart';
import 'screens/dashboard_screen.dart';
import 'package:permission_handler/permission_handler.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Firebase connection immediately at startup
  final firebaseService = FirebaseService();
  await firebaseService.initialize();
  
  runApp(const ArboonMobileApp());
}

class ArboonMobileApp extends StatefulWidget {
  const ArboonMobileApp({Key? key}) : super(key: key);

  @override
  State<ArboonMobileApp> createState() => _ArboonMobileAppState();
}

class _ArboonMobileAppState extends State<ArboonMobileApp> {
  UserProfile? _currentUserProfile;
  bool _isDarkMode = true;
  bool _isLoadingSession = true; // Loading state while restoring session

  @override
  void initState() {
    super.initState();
    _requestPermissions();
    _restoreSession(); // Try to restore saved login session on startup
  }

  Future<void> _requestPermissions() async {
    try {
      await Permission.notification.request();
    } catch (e) {
      debugPrint('Permission request error: $e');
    }
  }

  /// استرجاع الجلسة المحفوظة محلياً عبر SharedPreferences
  Future<void> _restoreSession() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedUid = prefs.getString('saved_uid');
      final savedDark = prefs.getBool('is_dark_mode') ?? true;
      
      setState(() => _isDarkMode = savedDark);

      if (savedUid != null && savedUid.isNotEmpty) {
        // المستخدم سبق له تسجيل الدخول - نسترجع بياناته من Firestore
        final profile = await FirebaseService().fetchProfileByUid(savedUid);
        if (profile != null) {
          setState(() => _currentUserProfile = profile);
          FirebaseService().saveDeviceToken(profile.uid);
        }
      }
    } catch (e) {
      // في حال أي خطأ، نبدأ من شاشة الدخول بشكل طبيعي
      debugPrint('Session restore error: $e');
    } finally {
      setState(() => _isLoadingSession = false);
    }
  }

  /// حفظ uid المستخدم محلياً بعد تسجيل دخول ناجح
  Future<void> _onLoginSuccess(UserProfile profile) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('saved_uid', profile.uid);
    setState(() => _currentUserProfile = profile);
    FirebaseService().saveDeviceToken(profile.uid);
  }

  /// مسح الجلسة المحفوظة عند تسجيل الخروج
  Future<void> _onLogout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('saved_uid');
    setState(() => _currentUserProfile = null);
  }

  /// حفظ حالة الثيم
  Future<void> _toggleTheme() async {
    final prefs = await SharedPreferences.getInstance();
    final newVal = !_isDarkMode;
    await prefs.setBool('is_dark_mode', newVal);
    setState(() => _isDarkMode = newVal);
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'عربون',
      themeMode: _isDarkMode ? ThemeMode.dark : ThemeMode.light,
      theme: ThemeData(
        brightness: Brightness.light,
        scaffoldBackgroundColor: AppColors.backgroundLight,
        primaryColor: AppColors.accentGold,
        colorScheme: const ColorScheme.light(
          primary: AppColors.accentGold,
          secondary: AppColors.accentGold,
          surface: AppColors.cardLight,
          background: AppColors.backgroundLight,
          error: AppColors.alert,
        ),
        textTheme: GoogleFonts.cairoTextTheme(ThemeData.light().textTheme),
      ),
      darkTheme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: AppColors.backgroundDark,
        primaryColor: AppColors.accentGold,
        colorScheme: const ColorScheme.dark(
          primary: AppColors.accentGold,
          secondary: AppColors.accentGold,
          surface: AppColors.cardDark,
          background: AppColors.backgroundDark,
          error: AppColors.alert,
        ),
        textTheme: GoogleFonts.cairoTextTheme(ThemeData.dark().textTheme),
      ),
      locale: const Locale('ar', 'SA'),
      home: Directionality(
        textDirection: TextDirection.rtl,
        child: _isLoadingSession
            // شاشة تحميل الجلسة المحفوظة
            ? _buildSplashLoader()
            : AnimatedSwitcher(
                duration: const Duration(milliseconds: 400),
                child: _currentUserProfile == null
                    ? LoginScreen(
                        key: const ValueKey('login'),
                        onLoginSuccess: _onLoginSuccess,
                      )
                    : StreamBuilder<UserProfile?>(
                        key: ValueKey(_currentUserProfile!.uid),
                        stream: FirebaseService().streamProfile(_currentUserProfile!.uid),
                        initialData: _currentUserProfile,
                        builder: (context, userSnapshot) {
                          final activeUser = userSnapshot.data ?? _currentUserProfile!;
                          
                          return StreamBuilder<List<OrderModel>>(
                            stream: FirebaseService().streamActiveOrders(activeUser.uid),
                            builder: (context, ordersSnapshot) {
                              final activeOrders = ordersSnapshot.data ?? [];
                              
                              return DashboardScreen(
                                mockUser: activeUser,
                                mockOrders: activeOrders,
                                isDarkMode: _isDarkMode,
                                onThemeToggle: _toggleTheme,
                                onLogout: _onLogout,
                              );
                            },
                          );
                        },
                      ),
              ),
      ),
    );
  }

  Widget _buildSplashLoader() {
    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // شعار التطبيق
            Image.asset(
              'assets/images/logo.png',
              width: 120,
              height: 120,
              errorBuilder: (_, __, ___) => const Icon(
                Icons.shield_outlined,
                color: AppColors.accentGold,
                size: 80,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'عربون',
              style: GoogleFonts.cairo(
                color: AppColors.textLight,
                fontSize: 28,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'منصة الوساطة الموثوقة',
              style: GoogleFonts.cairo(
                color: AppColors.textMuted,
                fontSize: 13,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 40),
            const SizedBox(
              width: 32,
              height: 32,
              child: CircularProgressIndicator(
                color: AppColors.accentGold,
                strokeWidth: 2.5,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
