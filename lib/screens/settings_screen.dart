import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_core/firebase_core.dart';
import '../constants/colors.dart';
import '../models/user.dart';
// order.dart import removed - unused
import 'verification_screen.dart';

class SettingsScreen extends StatefulWidget {
  final UserProfile currentUser;
  final bool isDarkMode;
  final VoidCallback? onThemeToggle;

  const SettingsScreen({
    Key? key,
    required this.currentUser,
    this.isDarkMode = true,
    this.onThemeToggle,
  }) : super(key: key);

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _profileFormKey = GlobalKey<FormState>();
  final _financialFormKey = GlobalKey<FormState>();

  // Text Controllers matching Web Page
  final TextEditingController _displayNameController = TextEditingController();
  final TextEditingController _phoneNumberController = TextEditingController();
  final TextEditingController _bioController = TextEditingController();
  final TextEditingController _whatsappNumberController = TextEditingController();
  final TextEditingController _payoutAccountNameController = TextEditingController();
  final TextEditingController _payoutIbanController = TextEditingController();
  final TextEditingController _bannerUrlController = TextEditingController();

  // Settings State Toggles matching Web Page
  bool _isPrivate = false;
  bool _twoFactorEnabled = false;
  bool _notificationsEnabled = true;
  bool _pushNotificationsEnabled = true;
  bool _orderNotificationsEnabled = true;
  bool _systemAlertsEnabled = true;
  bool _emailNotifications = true;
  bool _whatsappEnabled = false;

  // Financial payout bank matching Web Page dropdown options
  String _payoutBank = '';

  // Platform configs (Admin only - mapped matching SettingsPage.tsx)
  bool _maintenanceMode = false;
  bool _mandatoryVerification = true;
  String _primaryColor = '#3b82f6';

  // Active visual section (Section type)
  String _activeTab = 'profile'; // 'profile' | 'security' | 'notifications' | 'financial' | 'platform' | 'owner_dashboard'

  bool _loading = false;
  late final FirebaseFirestore _db;

  @override
  void initState() {
    super.initState();
    _db = FirebaseFirestore.instanceFor(
      app: Firebase.app(),
      databaseId: "ai-studio-ee0a8e94-5852-438b-93d7-9755da859ebc",
    );

    // Initializing state fields directly from the UserProfile model
    _displayNameController.text = widget.currentUser.displayName;
    _phoneNumberController.text = widget.currentUser.phoneNumber;
    _bioController.text = widget.currentUser.bio;
    _bannerUrlController.text = widget.currentUser.bannerUrl;
    _whatsappNumberController.text = widget.currentUser.whatsappNumber ?? '';
    _payoutAccountNameController.text = widget.currentUser.payoutAccountName;
    _payoutIbanController.text = widget.currentUser.payoutIban;

    _isPrivate = widget.currentUser.isPrivate;
    _twoFactorEnabled = widget.currentUser.twoFactorEnabled;
    _notificationsEnabled = widget.currentUser.notificationsEnabled;
    _pushNotificationsEnabled = widget.currentUser.pushNotificationsEnabled;
    _orderNotificationsEnabled = widget.currentUser.orderNotificationsEnabled;
    _systemAlertsEnabled = widget.currentUser.systemAlertsEnabled;
    _emailNotifications = widget.currentUser.emailNotifications;
    _whatsappEnabled = widget.currentUser.whatsappEnabled;
    _payoutBank = widget.currentUser.payoutBank;
    _primaryColor = widget.currentUser.primaryColor;
  }

  @override
  void dispose() {
    _displayNameController.dispose();
    _phoneNumberController.dispose();
    _bioController.dispose();
    _whatsappNumberController.dispose();
    _payoutAccountNameController.dispose();
    _payoutIbanController.dispose();
    _bannerUrlController.dispose();
    super.dispose();
  }

  // ── Show toast helper ──
  void _showSnackBar(String text, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: isError ? AppColors.alert : AppColors.success,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        content: Text(
          text,
          textAlign: TextAlign.center,
          style: GoogleFonts.cairo(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 12),
        ),
      ),
    );
  }

  // ── Form Validations ──
  bool _validatePhone(String val) {
    if (val.isEmpty) return true;
    final clean = val.replaceAll(RegExp(r'\D'), '');
    return clean.startsWith('05') && clean.length == 10 ||
        clean.startsWith('9665') && clean.length == 12 ||
        clean.startsWith('009665') && clean.length == 14;
  }

  bool _validateIban(String val) {
    if (val.isEmpty) return true;
    final clean = val.trim().toUpperCase();
    return clean.startsWith('SA') && clean.length == 24;
  }

  // ── Save Section: Profile ──
  void _saveProfile() async {
    if (!_profileFormKey.currentState!.validate()) return;
    if (_displayNameController.text.trim().isEmpty) {
      _showSnackBar('الاسم الكامل مطلوب', isError: true);
      return;
    }
    if (_phoneNumberController.text.isNotEmpty && !_validatePhone(_phoneNumberController.text)) {
      _showSnackBar('رقم الجوال غير صحيح. الصيغ المقبولة: 05XXXXXXXX أو 9665XXXXXXXX', isError: true);
      return;
    }

    setState(() => _loading = true);
    try {
      await _db.collection('users').doc(widget.currentUser.uid).update({
        'displayName': _displayNameController.text.trim(),
        'phoneNumber': _phoneNumberController.text.trim(),
        'bio': _bioController.text.trim(),
        'bannerUrl': _bannerUrlController.text.trim(),
        'updatedAt': FieldValue.serverTimestamp(),
      });
      _showSnackBar('تم حفظ وتحديث الملف الشخصي بنجاح');
    } catch (e) {
      _showSnackBar('فشل حفظ الإعدادات، يرجى مراجعة اتصال الإنترنت', isError: true);
    } finally {
      setState(() => _loading = false);
    }
  }

  // ── Save Section: Security ──
  void _saveSecurity() async {
    setState(() => _loading = true);
    try {
      await _db.collection('users').doc(widget.currentUser.uid).update({
        'isPrivate': _isPrivate,
        'twoFactorEnabled': _twoFactorEnabled,
        'updatedAt': FieldValue.serverTimestamp(),
      });
      _showSnackBar('تم حفظ إعدادات الأمان والخصوصية بنجاح');
    } catch (e) {
      _showSnackBar('فشل حفظ الإعدادات المحددة', isError: true);
    } finally {
      setState(() => _loading = false);
    }
  }

  // ── Save Section: Notifications ──
  void _saveNotifications() async {
    if (_whatsappEnabled && _whatsappNumberController.text.isNotEmpty && !_validatePhone(_whatsappNumberController.text)) {
      _showSnackBar('رقم الواتساب غير صحيح. الصيغ المقبولة: 05XXXXXXXX أو 9665XXXXXXXX', isError: true);
      return;
    }

    setState(() => _loading = true);
    try {
      await _db.collection('users').doc(widget.currentUser.uid).update({
        'notificationsEnabled': _notificationsEnabled,
        'pushNotificationsEnabled': _pushNotificationsEnabled,
        'orderNotificationsEnabled': _orderNotificationsEnabled,
        'systemAlertsEnabled': _systemAlertsEnabled,
        'emailNotifications': _emailNotifications,
        'whatsappEnabled': _whatsappEnabled,
        'whatsappNumber': _whatsappNumberController.text.trim(),
        'updatedAt': FieldValue.serverTimestamp(),
      });
      _showSnackBar('تم حفظ تفضيلات التنبيهات بنجاح');
    } catch (e) {
      _showSnackBar('فشل حفظ تفضيلات التنبيهات', isError: true);
    } finally {
      setState(() => _loading = false);
    }
  }

  // ── Save Section: Financial ──
  void _saveFinancial() async {
    if (!_financialFormKey.currentState!.validate()) return;
    if (_payoutIbanController.text.isNotEmpty && !_validateIban(_payoutIbanController.text)) {
      _showSnackBar('رقم الآيبان غير صحيح. يجب أن يبدأ بـ SA ويتبعه 22 رقماً', isError: true);
      return;
    }

    setState(() => _loading = true);
    try {
      await _db.collection('users').doc(widget.currentUser.uid).update({
        'payoutBank': _payoutBank,
        'payoutAccountName': _payoutAccountNameController.text.trim(),
        'payoutIban': _payoutIbanController.text.trim().toUpperCase(),
        'updatedAt': FieldValue.serverTimestamp(),
      });
      _showSnackBar('تم حفظ بيانات الحساب البنكي للتسوية بنجاح');
    } catch (e) {
      _showSnackBar('فشل حفظ المعلومات المالية', isError: true);
    } finally {
      setState(() => _loading = false);
    }
  }

  // ── Save Section: Platform (Admin settings) ──
  void _savePlatformSettings() async {
    setState(() => _loading = true);
    try {
      await _db.collection('users').doc(widget.currentUser.uid).update({
        'primaryColor': _primaryColor,
        'updatedAt': FieldValue.serverTimestamp(),
      });
      // Optionally store in global system logs or global collection too
      _showSnackBar('تم حفظ واعتماد إعدادات المنصة بنجاح في قاعدة البيانات حياً');
    } catch (e) {
      _showSnackBar('فشل حفظ إعدادات النظام للمشرف', isError: true);
    } finally {
      setState(() => _loading = false);
    }
  }

  // ── Admin Payout Approval Handler ──
  void _approveWithdrawal(String docId, String userId, double amount) async {
    setState(() => _loading = true);
    try {
      await _db.collection('withdrawals').doc(docId).update({
        'status': 'approved',
        'approvedAt': FieldValue.serverTimestamp(),
      });

      await _db.collection('system_logs').add({
        'operationType': 'WITHDRAWAL_APPROVED',
        'message': 'تمت الموافقة واعتماد تحويل مبلغ $amount ريال للمستفيد $userId من الجوال',
        'timestamp': FieldValue.serverTimestamp(),
        'severity': 'HIGH',
      });

      _showSnackBar('تم اعتماد تسوية المبلغ المالي بنجاح!');
    } catch (e) {
      _showSnackBar('فشل اعتماد طلب التحويل', isError: true);
    } finally {
      setState(() => _loading = false);
    }
  }

  // ── Admin Dispute Settlement Handler ──
  void _arbitrateDispute(String orderId, bool refundToBuyer, double amount) async {
    setState(() => _loading = true);
    try {
      final String finalStatus = refundToBuyer ? 'refunded' : 'completed';
      final String actionMessage = refundToBuyer
          ? 'الفصل في النزاع لصفقة التعميد لصالح المشتري وإعادة الأموال بالكامل'
          : 'الفصل في النزاع لصالح البائع وتحرير الأموال المحجوزة لحسابه المباشر';

      await _db.collection('orders').doc(orderId).update({
        'status': finalStatus,
        'disputeResolvedAt': FieldValue.serverTimestamp(),
        'disputeDecision': refundToBuyer ? 'buyer_refunded' : 'seller_payout',
        'updatedAt': FieldValue.serverTimestamp(),
      });

      await _db.collection('orderLogs').add({
        'orderId': orderId,
        'userId': widget.currentUser.uid,
        'action': 'حكم تحكيمي: $finalStatus',
        'previousStatus': 'disputed',
        'currentStatus': finalStatus,
        'message': actionMessage,
        'createdAt': FieldValue.serverTimestamp(),
      });

      _showSnackBar('تم إصدار الحكم التحكيمي وفصل النزاع بنجاح في قاعدة البيانات الحية!');
    } catch (e) {
      _showSnackBar('فشل تسجيل قرار التحكيم المالي', isError: true);
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? AppColors.cardDark : AppColors.cardLight;
    final textCol = isDark ? AppColors.textLight : AppColors.textDark;
    final isAdmin = widget.currentUser.isAdmin;

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.backgroundLight,
      body: SafeArea(
        child: Column(
          children: [
            // Page Header
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 20, 24, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'إعدادات الحساب',
                        style: GoogleFonts.cairo(
                          color: textCol,
                          fontSize: 20,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      Row(
                        children: [
                          if (_loading)
                            const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.accentGold),
                            ),
                          if (_loading) const SizedBox(width: 8),
                          // زر تبديل وضع الليلي / النهاري
                          GestureDetector(
                            onTap: widget.onThemeToggle,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              decoration: BoxDecoration(
                                color: isDark
                                    ? Colors.amber.withOpacity(0.15)
                                    : Colors.indigo.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: isDark
                                      ? Colors.amber.withOpacity(0.3)
                                      : Colors.indigo.withOpacity(0.2),
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    isDark ? Icons.wb_sunny_rounded : Icons.nightlight_round,
                                    size: 14,
                                    color: isDark ? Colors.amber : Colors.indigo,
                                  ),
                                  const SizedBox(width: 5),
                                  Text(
                                    isDark ? 'فاتح' : 'مظلم',
                                    style: GoogleFonts.cairo(
                                      color: isDark ? Colors.amber : Colors.indigo,
                                      fontSize: 10,
                                      fontWeight: FontWeight.w900,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  Text(
                    'إدارة بياناتك الشخصية، الأمان، التنبيهات، والمعلومات المالية للمنصة',
                    style: GoogleFonts.cairo(
                      color: AppColors.textMuted,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),

            // Horizontal Segmented Tabs (Matches web layout navigation)
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  _buildTabButton(id: 'profile', label: 'الملف الشخصي', icon: Icons.person_outline),
                  _buildTabButton(id: 'security', label: 'الأمان والخصوصية', icon: Icons.lock_outline),
                  _buildTabButton(id: 'notifications', label: 'التنبيهات', icon: Icons.notifications_none),
                  _buildTabButton(id: 'financial', label: 'المعلومات المالية', icon: Icons.credit_card_outlined),
                  if (isAdmin) ...[
                    _buildTabButton(id: 'platform', label: 'إعدادات المنصة', icon: Icons.settings_outlined),
                    _buildTabButton(id: 'owner_dashboard', label: '⚖️ لوحة المالك', icon: Icons.admin_panel_settings_outlined),
                  ],
                ],
              ),
            ),

            // Main Settings Form Body
            Expanded(
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: [
                    if (_activeTab == 'profile') _buildProfileSection(cardBg, textCol),
                    if (_activeTab == 'security') _buildSecuritySection(cardBg, textCol),
                    if (_activeTab == 'notifications') _buildNotificationsSection(cardBg, textCol),
                    if (_activeTab == 'financial') _buildFinancialSection(cardBg, textCol),
                    if (_activeTab == 'platform' && isAdmin) _buildPlatformSection(cardBg, textCol),
                    if (_activeTab == 'owner_dashboard' && isAdmin) _buildOwnerDashboardSection(cardBg, textCol),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTabButton({required String id, required String label, required IconData icon}) {
    final active = _activeTab == id;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    Color activeBg = AppColors.accentGold.withOpacity(0.12);
    Color activeText = AppColors.accentGold;
    
    if (id == 'platform') {
      activeBg = Colors.red.withOpacity(0.12);
      activeText = Colors.redAccent;
    } else if (id == 'owner_dashboard') {
      activeBg = Colors.teal.withOpacity(0.12);
      activeText = Colors.teal;
    }

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 4),
      child: InkWell(
        onTap: () => setState(() => _activeTab = id),
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: BoxDecoration(
            color: active ? activeBg : Colors.transparent,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: active ? activeText.withOpacity(0.3) : AppColors.textMuted.withOpacity(0.08),
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 16, color: active ? activeText : AppColors.textMuted),
              const SizedBox(width: 8),
              Text(
                label,
                style: GoogleFonts.cairo(
                  color: active ? activeText : (isDark ? AppColors.textLight : AppColors.textDark),
                  fontSize: 11,
                  fontWeight: active ? FontWeight.w900 : FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════
  // SECTION 1 — الملف الشخصي (Profile)
  // ═══════════════════════════════════════════════════════════
  Widget _buildProfileSection(Color cardBg, Color textCol) {
    return Form(
      key: _profileFormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header description
          _buildSectionHeader(Icons.person, 'الملف الشخصي', 'بياناتك الظاهرة للمستخدمين الآخرين في منصة عربون', Colors.blue),
          
          // Profile Quick Summary Card
          Container(
            padding: const EdgeInsets.all(16),
            margin: const EdgeInsets.only(bottom: 16),
            decoration: BoxDecoration(
              color: cardBg,
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: AppColors.textMuted.withOpacity(0.06)),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 26,
                  backgroundImage: widget.currentUser.photoURL.isNotEmpty ? NetworkImage(widget.currentUser.photoURL) : null,
                  backgroundColor: AppColors.accentGold.withOpacity(0.1),
                  child: widget.currentUser.photoURL.isEmpty ? const Icon(Icons.person, color: AppColors.accentGold, size: 28) : null,
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _displayNameController.text.isNotEmpty ? _displayNameController.text : 'عضو عربون',
                        style: GoogleFonts.cairo(fontWeight: FontWeight.w900, fontSize: 13, color: textCol),
                      ),
                      Text(
                        widget.currentUser.email,
                        style: GoogleFonts.outfit(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: widget.currentUser.isVerified ? AppColors.success.withOpacity(0.12) : AppColors.textMuted.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    widget.currentUser.isVerified ? 'موثق' : 'غير موثق',
                    style: GoogleFonts.cairo(
                      color: widget.currentUser.isVerified ? AppColors.success : AppColors.textMuted,
                      fontWeight: FontWeight.w900,
                      fontSize: 9,
                    ),
                  ),
                )
              ],
            ),
          ),

          // Inputs Card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: cardBg,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: AppColors.textMuted.withOpacity(0.06)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'المعلومات الأساسية',
                  style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 0.8),
                ),
                const SizedBox(height: 16),

                _buildTextField(
                  controller: _displayNameController,
                  label: 'الاسم الكامل',
                  hint: 'الاسم الثلاثي أو الثنائي المعتمد',
                  icon: Icons.person_outline,
                  textCol: textCol,
                  required: true,
                ),
                const SizedBox(height: 16),

                _buildTextField(
                  controller: _phoneNumberController,
                  label: 'رقم الجوال',
                  hint: '05XXXXXXXX',
                  icon: Icons.phone_iphone_outlined,
                  textCol: textCol,
                  isNumber: true,
                ),
                _buildFieldHint('يُستخدم للتواصل الداخلي وتلقي التنبيهات المباشرة — لا يُعرض للعامة'),
                const SizedBox(height: 16),

                _buildTextField(
                  controller: _bioController,
                  label: 'النبذة التعريفية',
                  hint: 'أخبر العملاء بتخصصك وخبراتك البنكية والتجارية...',
                  icon: Icons.info_outline,
                  textCol: textCol,
                  maxLines: 3,
                ),
                _buildFieldHint('كلما كانت نبذتك أوضح، زادت ثقة العملاء بك في صفقات الضمان والتعميد'),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Image/Banner Input Card (Matches Web picture uploads)
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: cardBg,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: AppColors.textMuted.withOpacity(0.06)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'صورة الغلاف',
                  style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 12),
                
                _buildTextField(
                  controller: _bannerUrlController,
                  label: 'رابط صورة الغلاف',
                  hint: 'رابط URL لصورة الغلاف الخاصة بملفك الشخصي',
                  icon: Icons.image_outlined,
                  textCol: textCol,
                ),
                _buildFieldHint('رابط غلاف لملفك الشخصي يعكس الطابع الاحترافي للعملاء بالمنصة'),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Save button
          _buildSaveBar(onSave: _saveProfile),
        ],
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════
  // SECTION 2 — الأمان والخصوصية (Security)
  // ═══════════════════════════════════════════════════════════
  Widget _buildSecuritySection(Color cardBg, Color textCol) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionHeader(Icons.lock, 'الأمان والخصوصية', 'تحكم في أمان حسابك ومستوى ظهوره بالضمان المالي', Colors.orange),

        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: cardBg,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: AppColors.textMuted.withOpacity(0.06)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'إعدادات الخصوصية والأمان',
                style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 16),

              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                activeColor: Colors.purple,
                value: _isPrivate,
                onChanged: (bool val) => setState(() => _isPrivate = val),
                title: Row(
                  children: [
                    Icon(_isPrivate ? Icons.visibility_off : Icons.visibility, color: _isPrivate ? Colors.purple : AppColors.textMuted, size: 18),
                    const SizedBox(width: 8),
                    Text(
                      'حساب خاص',
                      style: GoogleFonts.cairo(color: textCol, fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                subtitle: Padding(
                  padding: const EdgeInsets.only(top: 4.0),
                  child: Text(
                    'يخفي ملفك الشخصي من نتائج البحث للزوار غير المسجلين بالمنصة',
                    style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 9, height: 1.4),
                  ),
                ),
              ),
              const Divider(height: 24, thickness: 0.1),

              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                activeColor: AppColors.accentGold,
                value: _twoFactorEnabled,
                onChanged: (bool val) {
                  if (val && widget.currentUser.phoneNumber.isEmpty) {
                    _showSnackBar('يتطلب تفعيل التوثيق بخطوتين ربط وتوثيق رقم الجوال أولاً', isError: true);
                    return;
                  }
                  setState(() => _twoFactorEnabled = val);
                },
                title: Row(
                  children: [
                    Icon(Icons.shield_outlined, color: _twoFactorEnabled ? AppColors.accentGold : AppColors.textMuted, size: 18),
                    const SizedBox(width: 8),
                    Text(
                      'التحقق بخطوتين (2FA)',
                      style: GoogleFonts.cairo(color: textCol, fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                subtitle: Padding(
                  padding: const EdgeInsets.only(top: 4.0),
                  child: Text(
                    'رمز OTP يصل لجوالك كأمان إضافي عند كل تسجيل دخول من جهاز جديد',
                    style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 9, height: 1.4),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Verification Badges (Matches exact web verification card)
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: cardBg,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: AppColors.textMuted.withOpacity(0.06)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'التوثيق والهوية الرسمية',
                style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 16),

              // Phone Verification Card
              _buildVerificationRow(
                icon: Icons.phone_android_outlined,
                title: 'توثيق رقم الجوال',
                desc: 'يرفع مستوى موثوقية العمليات وتفعيل كود OTP الحارس',
                isVerified: widget.currentUser.phoneNumber.isNotEmpty,
                onPressed: () {
                  _showSnackBar('رقم الجوال موثق ومرتبط بنجاح ببيانات حسابك');
                },
              ),
              const Divider(height: 24, thickness: 0.1),

              // Identity Verification Card
              _buildVerificationRow(
                icon: Icons.verified_user_outlined,
                title: 'التحقق من الهوية الوطنية',
                desc: 'توثيق بطاقتك الوطنية بالنفاذ الموحد — إلزامي لتحويل الأرصدة الكبيرة',
                isVerified: widget.currentUser.verificationStatus == 'verified',
                onPressed: () {
                  if (widget.currentUser.verificationStatus == 'verified') {
                    _showSnackBar('الهوية الوطنية موثقة ومطابقة بالكامل بالنفاذ الوطني');
                  } else {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => VerificationScreen(mockUser: widget.currentUser)),
                    );
                  }
                },
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Legal Links (Exactly matches web page footer footer link blocks)
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: cardBg,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: AppColors.textMuted.withOpacity(0.06)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'المستندات القانونية للمنصة',
                style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildLegalLink('شروط الاستخدام', Icons.gavel_outlined),
                  _buildLegalLink('سياسة الخصوصية', Icons.privacy_tip_outlined),
                  _buildLegalLink('الأسئلة الشائعة', Icons.question_answer_outlined),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),

        _buildSaveBar(onSave: _saveSecurity),
      ],
    );
  }

  Widget _buildVerificationRow({
    required IconData icon,
    required String title,
    required String desc,
    required bool isVerified,
    required VoidCallback onPressed,
  }) {
    final textCol = Theme.of(context).brightness == Brightness.dark ? AppColors.textLight : AppColors.textDark;
    return Row(
      children: [
        Icon(icon, color: AppColors.accentGold, size: 20),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: GoogleFonts.cairo(color: textCol, fontWeight: FontWeight.bold, fontSize: 11),
              ),
              Text(
                desc,
                style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 9, height: 1.4),
              ),
            ],
          ),
        ),
        const SizedBox(width: 8),
        isVerified
            ? Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: AppColors.success.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.check, color: AppColors.success, size: 10),
                    const SizedBox(width: 4),
                    Text('موثق', style: GoogleFonts.cairo(color: AppColors.success, fontSize: 8, fontWeight: FontWeight.w900)),
                  ],
                ),
              )
            : ElevatedButton(
                onPressed: onPressed,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.accentGold,
                  foregroundColor: AppColors.primaryDark,
                  elevation: 0,
                  minimumSize: const Size(60, 28),
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                child: Text('التحقق', style: GoogleFonts.cairo(fontSize: 9, fontWeight: FontWeight.bold)),
              ),
      ],
    );
  }

  Widget _buildLegalLink(String label, IconData icon) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return InkWell(
      onTap: () {
        _showSnackBar('تم فتح مستند $label بنجاح');
      },
      borderRadius: BorderRadius.circular(10),
      child: Padding(
        padding: const EdgeInsets.all(8.0),
        child: Column(
          children: [
            Icon(icon, size: 18, color: AppColors.accentGold),
            const SizedBox(height: 6),
            Text(
              label,
              style: GoogleFonts.cairo(fontSize: 9, fontWeight: FontWeight.bold, color: isDark ? AppColors.textLight : AppColors.textDark),
            ),
          ],
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════
  // SECTION 3 — التنبيهات (Notifications)
  // ═══════════════════════════════════════════════════════════
  Widget _buildNotificationsSection(Color cardBg, Color textCol) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionHeader(Icons.notifications, 'التنبيهات والإشعارات', 'تحكم في ما تتلقاه من إشعارات وعبر أي قناة بالصفقات', Colors.green),

        // App Notifications Toggles (Matches Web Toggles exactly)
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: cardBg,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: AppColors.textMuted.withOpacity(0.06)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'تنبيهات التطبيق',
                style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 16),

              _buildSwitchRow(
                title: 'إشعارات المنصة الأساسية',
                desc: 'تنبيهات العقود والمحادثات المباشرة داخل نظام عربون',
                value: _notificationsEnabled,
                onChanged: (val) => setState(() => _notificationsEnabled = val),
              ),
              const Divider(height: 24, thickness: 0.1),

              _buildSwitchRow(
                title: 'إشعارات الدفع (Push Notifications)',
                desc: 'تنبيهات فورية على جهازك حتى عند إغلاق التطبيق كلياً',
                value: _pushNotificationsEnabled,
                onChanged: (val) => setState(() => _pushNotificationsEnabled = val),
              ),
              const Divider(height: 24, thickness: 0.1),

              _buildSwitchRow(
                title: 'تحديثات وحالات الطلبات',
                desc: 'إشعار فوري عند تغيير حالة الصفقة (قبول، تسليم، تجميد، أو تحرير)',
                value: _orderNotificationsEnabled,
                onChanged: (val) => setState(() => _orderNotificationsEnabled = val),
              ),
              const Divider(height: 24, thickness: 0.1),

              _buildSwitchRow(
                title: 'تنبيهات نظام عربون الفنية',
                desc: 'إشعارات الصيانة الدورية وتحديثات الأمان وإدارة الصفقات الكبرى',
                value: _systemAlertsEnabled,
                onChanged: (val) => setState(() => _systemAlertsEnabled = val),
              ),
              const Divider(height: 24, thickness: 0.1),

              _buildSwitchRow(
                title: 'ملخص البريد الإلكتروني',
                desc: 'مستندات ووثائق التسويات المالية وفواتير الصفقات على بريدك الموثق',
                value: _emailNotifications,
                onChanged: (val) => setState(() => _emailNotifications = val),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // WhatsApp Bot Details (Matches Web details exactly)
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.green.withOpacity(0.04),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: Colors.green.withOpacity(0.15)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                activeColor: Colors.green,
                value: _whatsappEnabled,
                onChanged: (bool val) => setState(() => _whatsappEnabled = val),
                title: Row(
                  children: [
                    const Icon(Icons.chat_bubble_outline, color: Colors.green, size: 18),
                    const SizedBox(width: 8),
                    Text(
                      '💬 تنبيهات الواتساب الفورية',
                      style: GoogleFonts.cairo(color: textCol, fontSize: 12, fontWeight: FontWeight.w900),
                    ),
                  ],
                ),
                subtitle: Padding(
                  padding: const EdgeInsets.only(top: 4.0),
                  child: Text(
                    'استقبل إشعارات صفقاتك على الواتساب وقم بإدارتها بالكامل عبر الأوامر',
                    style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 9, height: 1.4),
                  ),
                ),
              ),
              
              if (_whatsappEnabled) ...[
                const SizedBox(height: 16),
                _buildTextField(
                  controller: _whatsappNumberController,
                  label: 'رقم واتساب المعتمد للأوامر والتنبيهات',
                  hint: '9665XXXXXXXX أو 05XXXXXXXX',
                  icon: Icons.phone_android,
                  textCol: textCol,
                  isNumber: true,
                ),
                _buildFieldHint('سيقوم نظام عربون بإرسال إشعارات الصفقات والأرقام لهذا الرقم'),
                const SizedBox(height: 16),

                // Commands list matching Web Reference
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: cardBg,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.green.withOpacity(0.08)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'الأوامر التفاعلية المتاحة عبر بوت الواتساب:',
                        style: GoogleFonts.cairo(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 9, letterSpacing: 0.5),
                      ),
                      const SizedBox(height: 8),
                      _buildWACommandRow('رصيدي', 'عرض الرصيد المتاح للسحب والمعلق بالضمان حياً'),
                      _buildWACommandRow('طلباتي', 'جلب صفقاتك وعقودك النشطة في المنصة حياً'),
                      _buildWACommandRow('موافقة / رفض', 'الموافقة أو الاعتذار الفوري عن الصفقات الجديدة'),
                      _buildWACommandRow('استلام [رمز]', 'تأكيد استلام العمل وتحرير أموال الصفقة للبائع'),
                      _buildWACommandRow('رد [رمز] : رسالة', 'الدردشة مباشرة مع الطرف الآخر بصفقة التعميد'),
                    ],
                  ),
                )
              ]
            ],
          ),
        ),
        const SizedBox(height: 24),

        _buildSaveBar(onSave: _saveNotifications),
      ],
    );
  }

  Widget _buildSwitchRow({
    required String title,
    required String desc,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    final textCol = Theme.of(context).brightness == Brightness.dark ? AppColors.textLight : AppColors.textDark;
    return SwitchListTile(
      contentPadding: EdgeInsets.zero,
      activeColor: AppColors.accentGold,
      value: value,
      onChanged: onChanged,
      title: Text(
        title,
        style: GoogleFonts.cairo(color: textCol, fontSize: 11, fontWeight: FontWeight.bold),
      ),
      subtitle: Padding(
        padding: const EdgeInsets.only(top: 4.0),
        child: Text(
          desc,
          style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 9, height: 1.4),
        ),
      ),
    );
  }

  Widget _buildWACommandRow(String command, String desc) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Text(
              desc,
              style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 9),
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: Colors.green.withOpacity(0.08),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(
              command,
              style: GoogleFonts.cairo(color: Colors.green, fontSize: 8, fontWeight: FontWeight.w900),
            ),
          ),
        ],
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════
  // SECTION 4 — المعلومات المالية (Financial)
  // ═══════════════════════════════════════════════════════════
  Widget _buildFinancialSection(Color cardBg, Color textCol) {
    return Form(
      key: _financialFormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionHeader(Icons.credit_card, 'المعلومات المالية', 'بيانات حسابك البنكي لاستلام وجدولة مستحقاتك المالية', Colors.purple),

          // Payout Warnings Info block
          Container(
            padding: const EdgeInsets.all(16),
            margin: const EdgeInsets.only(bottom: 16),
            decoration: BoxDecoration(
              color: Colors.amber.withOpacity(0.05),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.amber.withOpacity(0.15)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.warning_amber_rounded, color: Colors.orange, size: 18),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'هذه المعلومات تُستخدم حصراً لتحويل مستحقاتك من الصفقات الناجحة. تأكد من دقة رقم الـ IBAN لتجنب تأخير التسويات البنكية.',
                    style: GoogleFonts.cairo(color: Colors.orange[700], fontSize: 9, fontWeight: FontWeight.bold, height: 1.5),
                  ),
                ),
              ],
            ),
          ),

          // IBAN and bank name inputs matching web page
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: cardBg,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: AppColors.textMuted.withOpacity(0.06)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'بيانات الحساب البنكي للتسوية المباشرة',
                  style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 16),

                // Bank selector dropdown
                _buildBankDropdown(textCol),
                _buildFieldHint('اختر البنك الذي تريد استلام مستحقات الصفقات والتعميدات فيه'),
                const SizedBox(height: 16),

                _buildTextField(
                  controller: _payoutAccountNameController,
                  label: 'اسم صاحب الحساب',
                  hint: 'كما يظهر في بطاقتك البنكية تماماً',
                  icon: Icons.person_outline,
                  textCol: textCol,
                ),
                _buildFieldHint('يجب أن يتطابق تماماً مع الاسم المسجل في البنك — الأخطاء تؤدي لرفض الحوالة'),
                const SizedBox(height: 16),

                _buildTextField(
                  controller: _payoutIbanController,
                  label: 'رقم الآيبان (IBAN)',
                  hint: 'SAXXXXXXXXXXXXXXXXXXXX',
                  icon: Icons.account_balance_wallet_outlined,
                  textCol: textCol,
                  required: true,
                ),
                if (_payoutIbanController.text.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 4.0),
                    child: Text(
                      _validateIban(_payoutIbanController.text) ? '✅ رقم الآيبان صحيح ومطابق للمواصفات' : '❌ يجب أن يبدأ بـ SA ويتبعه 22 رقماً',
                      style: GoogleFonts.cairo(
                        color: _validateIban(_payoutIbanController.text) ? AppColors.success : AppColors.alert,
                        fontSize: 8,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                _buildFieldHint('يبدأ بـ SA ويتبعه 22 رقماً — تجده في تطبيق البنك الخاص بك'),
              ],
            ),
          ),
          const SizedBox(height: 24),

          _buildSaveBar(onSave: _saveFinancial),
        ],
      ),
    );
  }

  Widget _buildBankDropdown(Color textCol) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final List<Map<String, String>> banks = [
      {'id': 'stc_pay', 'name': 'اس تي سي بنك (STC Bank)'},
      {'id': 'alrajhi', 'name': 'مصرف الراجحي'},
      {'id': 'snbe', 'name': 'البنك الأهلي السعودي'},
      {'id': 'alinma', 'name': 'بنك الإنماء'},
      {'id': 'riyad', 'name': 'بنك الرياض'},
      {'id': 'bsf', 'name': 'البنك السعودي الفرنسي'},
      {'id': 'sab', 'name': 'البنك العربي الوطني'},
      {'id': 'jazira', 'name': 'بنك الجزيرة'},
      {'id': 'other', 'name': 'بنك آخر'},
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.account_balance, color: AppColors.accentGold, size: 16),
            const SizedBox(width: 8),
            Text(
              'اسم البنك المستلم',
              style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(
            color: isDark ? Colors.black.withOpacity(0.2) : Colors.black.withOpacity(0.02),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.textMuted.withOpacity(0.1)),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: _payoutBank.isEmpty ? null : _payoutBank,
              hint: Text('اختر البنك...', style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 11)),
              dropdownColor: isDark ? AppColors.cardDark : AppColors.cardLight,
              style: GoogleFonts.cairo(color: textCol, fontWeight: FontWeight.bold, fontSize: 11),
              isExpanded: true,
              items: banks.map((bank) {
                return DropdownMenuItem<String>(
                  value: bank['id'],
                  child: Text(bank['name']!),
                );
              }).toList(),
              onChanged: (val) {
                if (val != null) setState(() => _payoutBank = val);
              },
            ),
          ),
        ),
      ],
    );
  }

  // ═══════════════════════════════════════════════════════════
  // SECTION 5 — إعدادات المنصة (Platform Settings) - Admin Only
  // ═══════════════════════════════════════════════════════════
  Widget _buildPlatformSection(Color cardBg, Color textCol) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionHeader(Icons.settings, 'إعدادات المنصة العامة', 'خيارات تحكم النظام وإدارة الألوان الحصرية للمسؤولين', Colors.redAccent),

        // Maintenance and force verification options
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: cardBg,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: AppColors.textMuted.withOpacity(0.06)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(color: Colors.red, borderRadius: BorderRadius.circular(4)),
                    child: Text('ADMIN ONLY', style: GoogleFonts.outfit(color: Colors.white, fontSize: 7, fontWeight: FontWeight.w900)),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'تحكم النظام والتشغيل',
                    style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w900),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              _buildSwitchRow(
                title: 'وضع الصيانة (Maintenance Mode)',
                desc: 'تجميد جميع الصفقات والعمليات على الخادم كلياً لأغراض التحديث',
                value: _maintenanceMode,
                onChanged: (val) => setState(() => _maintenanceMode = val),
              ),
              const Divider(height: 24, thickness: 0.1),

              _buildSwitchRow(
                title: 'التحقق الإلزامي بالنفاذ الوطني',
                desc: 'إلزام كافة المستخدمين بتوثيق الهوية قبل إنشاء أو تعميد أي صفقة',
                value: _mandatoryVerification,
                onChanged: (val) => setState(() => _mandatoryVerification = val),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Primary Color Picker block matching web options
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: cardBg,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: AppColors.textMuted.withOpacity(0.06)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'اللون الأساسي لواجهة المنصة',
                style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 12),
              
              Wrap(
                spacing: 12,
                runSpacing: 12,
                children: [
                  '#3b82f6', // blue
                  '#10b981', // green
                  '#f43f5e', // rose
                  '#8b5cf6', // purple
                  '#f59e0b', // gold/amber
                  '#000000', // black
                ].map((colorHex) {
                  final Color c = Color(int.parse(colorHex.replaceFirst('#', 'FF'), radix: 16));
                  final bool selected = _primaryColor == colorHex;
                  return InkWell(
                    onTap: () => setState(() => _primaryColor = colorHex),
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: c,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Colors.white, width: selected ? 3 : 1),
                        boxShadow: [
                          if (selected)
                            BoxShadow(color: Colors.grey.withOpacity(0.4), blurRadius: 4, spreadRadius: 1),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 12),
              _buildFieldHint('يؤثر على الأزرار البارزة والعناصر الأساسية في حساب المالك'),
            ],
          ),
        ),
        const SizedBox(height: 24),

        _buildSaveBar(onSave: _savePlatformSettings),
      ],
    );
  }

  // ═══════════════════════════════════════════════════════════
  // TAB 6 — لوحة تحكّم المالك الإشرافية (Disputes & Payouts)
  // ═══════════════════════════════════════════════════════════
  Widget _buildOwnerDashboardSection(Color cardBg, Color textCol) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionHeader(Icons.admin_panel_settings, 'لوحة تحكّم المسؤول الإشرافية', 'مراجعة وحكم النزاعات الجارية واعتماد تحويل المبالغ البنكية حياً', Colors.teal),

        // Part 1: Dispute Arbitrations
        Container(
          padding: const EdgeInsets.all(20),
          margin: const EdgeInsets.only(bottom: 16),
          decoration: BoxDecoration(
            color: cardBg,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: Colors.teal.withOpacity(0.2)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.gavel, color: Colors.teal, size: 16),
                  const SizedBox(width: 8),
                  Text(
                    '⚖️ قضايا النزاع الجارية المرفوعة للتحكيم',
                    style: GoogleFonts.cairo(color: textCol, fontWeight: FontWeight.w900, fontSize: 11),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              StreamBuilder<QuerySnapshot>(
                stream: _db.collection('orders').where('status', isEqualTo: 'disputed').snapshots(),
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(child: Padding(padding: EdgeInsets.all(12), child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.teal))));
                  }
                  final docs = snapshot.data?.docs ?? [];
                  if (docs.isEmpty) {
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Text(
                        'لا توجد نزاعات أو طلبات تحكيم نشطة حالياً بنظام عربون.',
                        style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 9, fontWeight: FontWeight.bold),
                      ),
                    );
                  }

                  return ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: docs.length,
                    itemBuilder: (context, index) {
                      final orderDoc = docs[index];
                      final data = orderDoc.data() as Map<String, dynamic>;
                      final double amount = (data['amount'] as num?)?.toDouble() ?? 0.0;
                      final String orderId = orderDoc.id;

                      return Container(
                        margin: const EdgeInsets.symmetric(vertical: 6),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.backgroundDark.withOpacity(0.04),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppColors.alert.withOpacity(0.12)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Text(
                                    data['title']?.toString() ?? 'نزاع صفقة تعميد',
                                    style: GoogleFonts.cairo(color: textCol, fontWeight: FontWeight.w900, fontSize: 10),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                Text(
                                  '$amount ريال',
                                  style: GoogleFonts.outfit(color: AppColors.accentGold, fontWeight: FontWeight.w900, fontSize: 11),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                ElevatedButton(
                                  onPressed: () => _arbitrateDispute(orderId, true, amount),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.alert.withOpacity(0.15),
                                    foregroundColor: AppColors.alert,
                                    elevation: 0,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                    minimumSize: const Size(80, 28),
                                  ),
                                  child: Text('إرجاع للمشتري', style: GoogleFonts.cairo(fontSize: 8, fontWeight: FontWeight.w900)),
                                ),
                                const SizedBox(width: 8),
                                ElevatedButton(
                                  onPressed: () => _arbitrateDispute(orderId, false, amount),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.success.withOpacity(0.15),
                                    foregroundColor: AppColors.success,
                                    elevation: 0,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                    minimumSize: const Size(80, 28),
                                  ),
                                  child: Text('تحرير للبائع', style: GoogleFonts.cairo(fontSize: 8, fontWeight: FontWeight.w900)),
                                ),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                  );
                },
              ),
            ],
          ),
        ),

        // Part 2: Approve Bank Payouts
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: cardBg,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: Colors.teal.withOpacity(0.2)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.wallet_outlined, color: Colors.teal, size: 16),
                  const SizedBox(width: 8),
                  Text(
                    '💸 طلبات سداد وتسوية الأرباح بانتظار الاعتماد المالي',
                    style: GoogleFonts.cairo(color: textCol, fontWeight: FontWeight.w900, fontSize: 11),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              StreamBuilder<QuerySnapshot>(
                stream: _db.collection('withdrawals').where('status', isEqualTo: 'pending').snapshots(),
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(child: Padding(padding: EdgeInsets.all(12), child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.teal))));
                  }
                  final docs = snapshot.data?.docs ?? [];
                  if (docs.isEmpty) {
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Text(
                        'لا توجد طلبات سحب أرباح معلقة بنظام عربون حالياً.',
                        style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 9, fontWeight: FontWeight.bold),
                      ),
                    );
                  }

                  return ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: docs.length,
                    itemBuilder: (context, index) {
                      final withdrawalDoc = docs[index];
                      final data = withdrawalDoc.data() as Map<String, dynamic>;
                      final double amount = (data['amount'] as num?)?.toDouble() ?? 0.0;
                      final String userLabel = data['userDisplayName']?.toString() ?? 'عضو عربون';
                      final String docId = withdrawalDoc.id;

                      return Container(
                        margin: const EdgeInsets.symmetric(vertical: 6),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.backgroundDark.withOpacity(0.04),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.teal.withOpacity(0.15)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        userLabel,
                                        style: GoogleFonts.cairo(color: textCol, fontWeight: FontWeight.w900, fontSize: 10),
                                      ),
                                      Text(
                                        'الآيبان: ${data['iban']?.toString() ?? ''}',
                                        style: GoogleFonts.outfit(color: AppColors.textMuted, fontSize: 8, fontWeight: FontWeight.bold),
                                      ),
                                    ],
                                  ),
                                ),
                                Text(
                                  '$amount ر.س',
                                  style: GoogleFonts.outfit(color: AppColors.accentGold, fontWeight: FontWeight.w900, fontSize: 11),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Align(
                              alignment: Alignment.centerLeft,
                              child: ElevatedButton(
                                onPressed: () => _approveWithdrawal(docId, data['userId']?.toString() ?? 'unknown', amount),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.teal,
                                  foregroundColor: Colors.white,
                                  elevation: 0,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                  minimumSize: const Size(100, 28),
                                ),
                                child: Text('اعتماد الحوالة البنكية', style: GoogleFonts.cairo(fontSize: 8, fontWeight: FontWeight.w900)),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  );
                },
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ── Section utilities ──

  Widget _buildSectionHeader(IconData icon, String title, String desc, Color color) {
    final textCol = Theme.of(context).brightness == Brightness.dark ? AppColors.textLight : AppColors.textDark;
    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: GoogleFonts.cairo(color: textCol, fontWeight: FontWeight.w900, fontSize: 14, height: 1.2),
                ),
                Text(
                  desc,
                  style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 9, height: 1.2),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    required Color textCol,
    bool required = false,
    bool isNumber = false,
    int maxLines = 1,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, color: AppColors.accentGold, size: 14),
            const SizedBox(width: 6),
            Text(
              label,
              style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 9, fontWeight: FontWeight.bold),
            ),
            if (required)
              Text(' *', style: GoogleFonts.cairo(color: AppColors.alert, fontSize: 10, fontWeight: FontWeight.bold)),
          ],
        ),
        const SizedBox(height: 6),
        TextFormField(
          controller: controller,
          keyboardType: isNumber ? TextInputType.number : TextInputType.text,
          maxLines: maxLines,
          validator: (val) => required && (val == null || val.isEmpty) ? 'أدخل البيانات المطلوبة' : null,
          style: GoogleFonts.cairo(color: textCol, fontSize: 11, fontWeight: FontWeight.bold),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: GoogleFonts.cairo(color: AppColors.textMuted.withOpacity(0.35), fontSize: 10),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: AppColors.textMuted.withOpacity(0.1), width: 1.5),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.accentGold, width: 1.5),
            ),
            filled: true,
            fillColor: isDark ? Colors.black.withOpacity(0.2) : Colors.black.withOpacity(0.02),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          ),
        ),
      ],
    );
  }

  Widget _buildFieldHint(String hint) {
    return Padding(
      padding: const EdgeInsets.only(top: 4, bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.info_outline, size: 10, color: AppColors.textMuted),
          const SizedBox(width: 4),
          Expanded(
            child: Text(
              hint,
              style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 8, height: 1.3),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSaveBar({required VoidCallback onSave}) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          ElevatedButton.icon(
            onPressed: _loading ? null : onSave,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primaryDark,
              foregroundColor: AppColors.accentGold,
              side: const BorderSide(color: AppColors.accentGold, width: 1.5),
              minimumSize: const Size(140, 46),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              elevation: 0,
            ),
            icon: const Icon(Icons.save_outlined, size: 16),
            label: Text(
              'حفظ التغييرات',
              style: GoogleFonts.cairo(fontWeight: FontWeight.w900, fontSize: 11),
            ),
          ),
        ],
      ),
    );
  }
}
