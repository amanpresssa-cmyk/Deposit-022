import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../constants/colors.dart';
import '../models/user.dart';
import '../models/order.dart';
import '../services/firebase_service.dart';
import 'order_details_screen.dart';
import 'verification_screen.dart';
import 'services_screen.dart';
import 'create_order_screen.dart';
import 'support_screen.dart';
import 'settings_screen.dart';
import 'notifications_screen.dart';
import 'balance_details_screen.dart';

class DashboardScreen extends StatefulWidget {
  final UserProfile mockUser;
  final List<OrderModel> mockOrders;
  final bool isDarkMode;
  final VoidCallback onThemeToggle;
  final VoidCallback? onLogout;

  const DashboardScreen({
    Key? key,
    required this.mockUser,
    required this.mockOrders,
    required this.isDarkMode,
    required this.onThemeToggle,
    this.onLogout,
  }) : super(key: key);

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _currentIndex = 0;
  bool _showBalance = true;

  @override
  Widget build(BuildContext context) {
    final List<Widget> pages = widget.mockUser.isAdmin
        ? [
            SettingsScreen(
              currentUser: widget.mockUser,
              isDarkMode: widget.isDarkMode,
              onThemeToggle: widget.onThemeToggle,
              initialTab: 'owner_dashboard',
              onLogout: widget.onLogout,
            ),
            SettingsScreen(
              currentUser: widget.mockUser,
              isDarkMode: widget.isDarkMode,
              onThemeToggle: widget.onThemeToggle,
              initialTab: 'platform',
              onLogout: widget.onLogout,
            ),
          ]
        : [
            _buildHomeContent(),
            ServicesScreen(currentUser: widget.mockUser),
            CreateOrderScreen(currentUser: widget.mockUser),
            const SupportScreen(),
            SettingsScreen(
              currentUser: widget.mockUser,
              isDarkMode: widget.isDarkMode,
              onThemeToggle: widget.onThemeToggle,
              onLogout: widget.onLogout,
            ),
          ];
          
    final safeIndex = _currentIndex >= pages.length ? 0 : _currentIndex;

    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      body: SafeArea(
        child: IndexedStack(
          index: safeIndex,
          children: pages,
        ),
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: AppColors.cardDark,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.3),
              blurRadius: 20,
              offset: const Offset(0, -4),
            ),
          ],
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(28),
            topRight: Radius.circular(28),
          ),
        ),
        child: ClipRRect(
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(28),
            topRight: Radius.circular(28),
          ),
          child: BottomNavigationBar(
            currentIndex: safeIndex,
            onTap: (index) => setState(() => _currentIndex = index),
            backgroundColor: AppColors.cardDark,
            selectedItemColor: AppColors.accentGold,
            unselectedItemColor: AppColors.textMuted,
            type: BottomNavigationBarType.fixed,
            selectedLabelStyle: GoogleFonts.cairo(fontWeight: FontWeight.w900, fontSize: 10),
            unselectedLabelStyle: GoogleFonts.cairo(fontWeight: FontWeight.bold, fontSize: 9),
            items: widget.mockUser.isAdmin
                ? const [
                    BottomNavigationBarItem(
                      icon: Icon(Icons.admin_panel_settings_outlined),
                      activeIcon: Icon(Icons.admin_panel_settings),
                      label: 'لوحة التحكم',
                    ),
                    BottomNavigationBarItem(
                      icon: Icon(Icons.settings_outlined),
                      activeIcon: Icon(Icons.settings),
                      label: 'إعدادات المنصة',
                    ),
                  ]
                : [
                    const BottomNavigationBarItem(
                      icon: Icon(Icons.home_outlined),
                      activeIcon: Icon(Icons.home),
                      label: 'الرئيسية',
                    ),
                    const BottomNavigationBarItem(
                      icon: Icon(Icons.business_center_outlined),
                      activeIcon: Icon(Icons.business_center),
                      label: 'الخدمات',
                    ),
                    BottomNavigationBarItem(
                      icon: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                        decoration: BoxDecoration(
                          color: AppColors.accentGold.withOpacity(0.08),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppColors.accentGold.withOpacity(0.3), width: 1.5),
                        ),
                        child: const Icon(Icons.add_moderator_outlined, color: AppColors.accentGold, size: 20),
                      ),
                      activeIcon: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                        decoration: BoxDecoration(
                          color: AppColors.accentGold,
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.accentGold.withOpacity(0.3),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: const Icon(Icons.add_moderator, color: AppColors.primaryDark, size: 20),
                      ),
                      label: 'تعميد جديد',
                    ),
                    const BottomNavigationBarItem(
                      icon: Icon(Icons.psychology_outlined),
                      activeIcon: Icon(Icons.psychology),
                      label: 'المستشار',
                    ),
                    const BottomNavigationBarItem(
                      icon: Icon(Icons.settings_outlined),
                      activeIcon: Icon(Icons.settings),
                      label: 'الإعدادات',
                    ),
                  ],
          ),
        ),
      ),
    );
  }

  Widget _buildHomeContent() {
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Header Section
          _buildHeader(),

          if (widget.mockUser.isAdmin)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 8.0),
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => SettingsScreen(
                        currentUser: widget.mockUser,
                        isDarkMode: widget.isDarkMode,
                        onThemeToggle: widget.onThemeToggle,
                        initialTab: 'owner_dashboard',
                      ),
                    ),
                  );
                },
                icon: const Icon(Icons.admin_panel_settings, color: Colors.white),
                label: Text(
                  'الدخول للوحة تحكم المالك',
                  style: GoogleFonts.cairo(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.white),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.teal,
                  minimumSize: const Size(double.infinity, 56),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  elevation: 8,
                  shadowColor: Colors.teal.withOpacity(0.5),
                ),
              ),
            ),

          // 2. The Platinum Balance Card
          _buildPlatinumCard(),

          // 3. Locked Funds & Escrow Status Widget
          _buildEscrowStatusWidget(),

          // 4. Quick Actions Grid
          _buildQuickActions(),

          // 5. Active Escrows List Header
          _buildSectionHeader('الصفقات والضمانات النشطة', () {
            setState(() => _currentIndex = 1); // Navigate to Services/Brokers list
          }),

          // 6. Active Escrow List Items
          _buildActiveEscrowList(),
          
          const SizedBox(height: 30),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Row(
              children: [
                Container(
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: AppColors.accentGold, width: 2),
                    image: widget.mockUser.photoURL.isNotEmpty
                        ? DecorationImage(image: NetworkImage(widget.mockUser.photoURL))
                        : null,
                  ),
                  child: widget.mockUser.photoURL.isEmpty
                      ? const Icon(Icons.person, color: AppColors.accentGold, size: 28)
                      : null,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'أهلاً بك، شريكنا المالي',
                        style: GoogleFonts.cairo(
                          color: AppColors.textMuted,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              widget.mockUser.displayName,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.cairo(
                                color: AppColors.textLight,
                                fontSize: 10,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),
                          if (widget.mockUser.isVerified)
                            const Icon(Icons.verified, color: AppColors.success, size: 12)
                          else
                            const Icon(Icons.shield_outlined, color: AppColors.alert, size: 12),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Row(
            children: [
              GestureDetector(
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => NotificationsScreen(currentUser: widget.mockUser),
                    ),
                  );
                },
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: widget.isDarkMode ? AppColors.cardDark : Colors.grey.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.textMuted.withOpacity(0.1)),
                  ),
                  child: StreamBuilder<List<Map<String, dynamic>>>(
                    stream: FirebaseService().streamNotifications(widget.mockUser.uid),
                    builder: (context, snapshot) {
                      final hasUnread = snapshot.hasData && snapshot.data!.any((n) => n['isRead'] != true);
                      return Stack(
                        clipBehavior: Clip.none,
                        children: [
                          Icon(
                            Icons.notifications_none,
                            color: widget.isDarkMode ? AppColors.textLight : AppColors.textDark,
                            size: 24,
                          ),
                          if (hasUnread)
                            Positioned(
                              right: 2,
                              top: 2,
                              child: Container(
                                width: 8,
                                height: 8,
                                decoration: BoxDecoration(
                                  color: AppColors.alert,
                                  shape: BoxShape.circle,
                                  border: Border.all(color: widget.isDarkMode ? AppColors.cardDark : Colors.white, width: 1.5),
                                ),
                              ),
                            ),
                        ],
                      );
                    },
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPlatinumCard() {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => BalanceDetailsScreen(currentUser: widget.mockUser),
          ),
        );
      },
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
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
            // Background decorative shield icon
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
                  // Top row: Logo + Card Title + Chip / Security Icon
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
                            onTap: () => setState(() => _showBalance = !_showBalance),
                            child: Container(
                              padding: const EdgeInsets.all(6),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.1),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                _showBalance ? Icons.visibility_off_outlined : Icons.visibility_outlined,
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
                  
                  // Middle section: Two balances side by side
                  Row(
                    children: [
                      // Balance 1: Available Balance
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
                                  _showBalance 
                                      ? widget.mockUser.balance.toStringAsFixed(2) 
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
                      
                      // Vertical divider line
                      Container(
                        width: 1,
                        height: 40,
                        color: Colors.white.withOpacity(0.15),
                      ),
                      const SizedBox(width: 20),
                      
                      // Balance 2: Frozen / Escrow Balance
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
                                  _showBalance 
                                      ? widget.mockUser.pendingBalance.toStringAsFixed(2) 
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
                  
                  // Bottom row: User Name & Short ID formatted like a card number
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.mockUser.displayName,
                            style: GoogleFonts.cairo(
                              color: Colors.white,
                              fontSize: 13,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'ARB - ${widget.mockUser.userShortId.toUpperCase().padRight(5, 'X').split('').join('  ')}',
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
                          color: widget.mockUser.isVerified 
                              ? AppColors.success.withOpacity(0.2) 
                              : AppColors.alert.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: widget.mockUser.isVerified 
                                ? AppColors.success.withOpacity(0.3) 
                                : AppColors.alert.withOpacity(0.3),
                            width: 1,
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              widget.mockUser.isVerified ? Icons.verified : Icons.error_outline,
                              color: widget.mockUser.isVerified ? AppColors.success : AppColors.alert,
                              size: 12,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              widget.mockUser.isVerified ? 'موثق نفاذ' : 'غير موثق',
                              style: GoogleFonts.cairo(
                                color: widget.mockUser.isVerified ? AppColors.success : AppColors.alert,
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
      ),
    );
  }

  Widget _buildEscrowStatusWidget() {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => BalanceDetailsScreen(currentUser: widget.mockUser),
          ),
        );
      },
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: AppColors.cardDark,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: AppColors.textMuted.withOpacity(0.08)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.accentGold.withOpacity(0.08),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(Icons.account_balance_outlined, color: AppColors.accentGold, size: 24),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'الأرباح المتاحة للتسوية والتحويل البنكي',
                    style: GoogleFonts.cairo(
                      color: AppColors.textMuted,
                      fontSize: 9,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Row(
                    children: [
                      Text(
                        widget.mockUser.balance.toStringAsFixed(2),
                        style: GoogleFonts.outfit(
                          color: AppColors.accentGold,
                          fontSize: 20,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        'ريال',
                        style: GoogleFonts.cairo(
                          color: AppColors.accentGold,
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.success.withOpacity(0.08),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                'تسوية مباشرة',
                style: GoogleFonts.cairo(
                  color: AppColors.success,
                  fontSize: 8,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickActions() {
    final List<Map<String, dynamic>> actions = [
      {
        'title': 'سجل الحساب',
        'icon': Icons.receipt_long_outlined,
        'color': AppColors.accentGold,
        'action': () {
          showModalBottomSheet(
            context: context,
            backgroundColor: AppColors.cardDark,
            shape: const RoundedRectangleBorder(
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(32),
                topRight: Radius.circular(32),
              ),
            ),
            builder: (context) => Padding(
              padding: const EdgeInsets.all(28),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'سجل معاملات الحساب المالي',
                    style: GoogleFonts.cairo(color: AppColors.textLight, fontWeight: FontWeight.w900, fontSize: 16),
                  ),
                  const SizedBox(height: 16),
                  _buildRecordItem('إجمالي الضمانات الجارية', '${widget.mockUser.pendingBalance.toStringAsFixed(2)} ر.س', Icons.lock_outline, AppColors.info),
                  _buildRecordItem('الأرباح المتاحة للتسوية البنكية', '${widget.mockUser.balance.toStringAsFixed(2)} ر.س', Icons.account_balance_outlined, AppColors.success),
                  _buildRecordItem('الصفقات النشطة بالمنصة', '${widget.mockOrders.length} صفقات جارية', Icons.description_outlined, AppColors.accentGold),
                  const SizedBox(height: 20),
                ],
              ),
            ),
          );
        },
      },
      {
        'title': 'طلب سحب',
        'icon': Icons.account_balance_wallet_outlined,
        'color': AppColors.success,
        'action': () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => BalanceDetailsScreen(currentUser: widget.mockUser),
            ),
          );
        },
      },
      {
        'title': 'حاسبة الرسوم',
        'icon': Icons.calculate_outlined,
        'color': AppColors.info,
        'action': () {
          _showFeeCalculatorDialog(context);
        },
      },
      {
        'title': widget.mockUser.isVerified ? 'المستشار' : 'توثيق الحساب',
        'icon': widget.mockUser.isVerified ? Icons.psychology_outlined : Icons.fingerprint_outlined,
        'color': widget.mockUser.isVerified ? Colors.purple : AppColors.alert,
        'action': () {
          if (widget.mockUser.isVerified) {
            setState(() => _currentIndex = 3); // Switch to AI Advisor tab
          } else {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => VerificationScreen(mockUser: widget.mockUser),
              ),
            );
          }
        },
      },
    ];

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 15),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: actions.map((act) {
          return InkWell(
            onTap: act['action'] as VoidCallback,
            borderRadius: BorderRadius.circular(20),
            child: Column(
              children: [
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    color: AppColors.cardDark,
                    shape: BoxShape.circle,
                    border: Border.all(color: AppColors.textMuted.withOpacity(0.08)),
                  ),
                  child: Icon(act['icon'] as IconData, color: act['color'] as Color, size: 26),
                ),
                const SizedBox(height: 8),
                Text(
                  act['title'] as String,
                  style: GoogleFonts.cairo(
                    color: AppColors.textLight,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  void _showFeeCalculatorDialog(BuildContext context) {
    double inputAmount = 1000.0;
    final textController = TextEditingController(text: '1000');
    
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.cardDark,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(32),
          topRight: Radius.circular(32),
        ),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            final double fee = inputAmount * 0.03;
            final double total = inputAmount + fee;
            
            return Padding(
              padding: EdgeInsets.only(
                top: 28,
                left: 28,
                right: 28,
                bottom: MediaQuery.of(context).viewInsets.bottom + 28,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.calculate, color: AppColors.accentGold, size: 24),
                      const SizedBox(width: 10),
                      Text(
                        'حاسبة رسوم وعمولات عربون',
                        style: GoogleFonts.cairo(
                          color: AppColors.textLight,
                          fontWeight: FontWeight.w900,
                          fontSize: 16,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'عمولة الحماية والضمان ثابتة بنسبة 3% من قيمة الصفقة ويتحملها المشتري.',
                    style: GoogleFonts.cairo(
                      color: AppColors.textMuted,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 20),
                  
                  Text(
                    'قيمة الصفقة أو الخدمة (ر.س)',
                    style: GoogleFonts.cairo(
                      color: AppColors.textMuted,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: textController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    style: GoogleFonts.outfit(
                      color: AppColors.textLight,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                    onChanged: (val) {
                      setModalState(() {
                        inputAmount = double.tryParse(val) ?? 0.0;
                      });
                    },
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: AppColors.backgroundDark,
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: BorderSide(color: AppColors.textMuted.withOpacity(0.1)),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: const BorderSide(color: AppColors.accentGold),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  
                  // Calculations details card
                  Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: AppColors.backgroundDark,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppColors.textMuted.withOpacity(0.06)),
                    ),
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'صافي مستحقات البائع:',
                              style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 11),
                            ),
                            Text(
                              '${inputAmount.toStringAsFixed(2)} ر.س',
                              style: GoogleFonts.outfit(color: AppColors.textLight, fontSize: 12, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'رسوم الضمان (3%):',
                              style: GoogleFonts.cairo(color: AppColors.accentGold, fontSize: 11),
                            ),
                            Text(
                              '+ ${fee.toStringAsFixed(2)} ر.س',
                              style: GoogleFonts.outfit(color: AppColors.accentGold, fontSize: 12, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                        const Divider(height: 20, thickness: 0.5, color: Colors.white10),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'الإجمالي المطلوب من المشتري:',
                              style: GoogleFonts.cairo(color: AppColors.textLight, fontSize: 12, fontWeight: FontWeight.bold),
                            ),
                            Text(
                              '${total.toStringAsFixed(2)} ر.س',
                              style: GoogleFonts.outfit(color: AppColors.success, fontSize: 15, fontWeight: FontWeight.w900),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  ElevatedButton(
                    onPressed: () => Navigator.pop(context),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.accentGold,
                      foregroundColor: AppColors.primaryDark,
                      minimumSize: const Size(double.infinity, 50),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                    child: Text(
                      'موافق',
                      style: GoogleFonts.cairo(fontWeight: FontWeight.bold),
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

  Widget _buildRecordItem(String label, String val, IconData icon, Color color) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 12),
          Text(label, style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 12, fontWeight: FontWeight.bold)),
          const Spacer(),
          Text(val, style: GoogleFonts.outfit(color: AppColors.textLight, fontSize: 13, fontWeight: FontWeight.w900)),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, VoidCallback onTap) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 15),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            title,
            style: GoogleFonts.cairo(
              color: AppColors.textLight,
              fontSize: 14,
              fontWeight: FontWeight.w900,
            ),
          ),
          TextButton(
            onPressed: onTap,
            child: Text(
              'عرض الكل',
              style: GoogleFonts.cairo(
                color: AppColors.accentGold,
                fontSize: 11,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActiveEscrowList() {
    if (widget.mockOrders.isEmpty) {
      return Container(
        margin: const EdgeInsets.symmetric(horizontal: 24),
        padding: const EdgeInsets.all(30),
        decoration: BoxDecoration(
          color: AppColors.cardDark,
          borderRadius: BorderRadius.circular(24),
        ),
        child: Center(
          child: Text(
            'ليس لديك صفقات أو ضمانات نشطة حالياً',
            style: GoogleFonts.cairo(
              color: AppColors.textMuted,
              fontSize: 12,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      );
    }

    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: widget.mockOrders.length,
      itemBuilder: (context, index) {
        final order = widget.mockOrders[index];
        return _buildEscrowCard(order);
      },
    );
  }

  Widget _buildEscrowCard(OrderModel order) {
    Color statusColor = AppColors.pending;
    String statusText = 'قيد المراجعة';

    switch (order.status) {
      case 'pending':
        statusColor = AppColors.pending;
        statusText = '⏳ بانتظار الاعتماد';
        break;
      case 'escrowed':
        statusColor = AppColors.info;
        statusText = '🔒 مجمد بالضمان';
        break;
      case 'delivered':
        statusColor = AppColors.success;
        statusText = '📦 تم التسليم';
        break;
      case 'completed':
        statusColor = AppColors.success;
        statusText = '✅ مكتمل';
        break;
      case 'disputed':
        statusColor = AppColors.alert;
        statusText = '🚨 نزاع قائم';
        break;
    }

    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => OrderDetailsScreen(order: order, currentUserId: widget.mockUser.uid),
          ),
        );
      },
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: AppColors.cardDark,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: AppColors.textMuted.withOpacity(0.05)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Row(
                children: [
                  Container(
                    width: 50,
                    height: 50,
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.08),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Icon(
                      order.status == 'escrowed' 
                          ? Icons.lock_outline 
                          : order.status == 'delivered'
                              ? Icons.assignment_turned_in_outlined
                              : Icons.schedule_outlined,
                      color: statusColor, 
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          order.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.cairo(
                            color: AppColors.textLight,
                            fontSize: 13,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: statusColor.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                statusText,
                                style: GoogleFonts.cairo(
                                  color: statusColor,
                                  fontSize: 8,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              '#ARB-${order.id.substring(0, 4).toUpperCase()}',
                              style: GoogleFonts.outfit(
                                color: AppColors.textMuted,
                                fontSize: 10,
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
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    Text(
                      order.amount.toStringAsFixed(0),
                      style: GoogleFonts.outfit(
                        color: AppColors.textLight,
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(width: 2),
                    Text(
                      'ر.س',
                      style: GoogleFonts.cairo(
                        color: AppColors.textLight,
                        fontSize: 9,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  '${order.deliveryDays} أيام تسليم',
                  style: GoogleFonts.cairo(
                    color: AppColors.textMuted,
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
}
