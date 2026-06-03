import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../constants/colors.dart';
import '../models/user.dart';
import '../services/firebase_service.dart';

class CreateOrderScreen extends StatefulWidget {
  final UserProfile currentUser;
  final Map<String, dynamic>? initialService;

  const CreateOrderScreen({Key? key, required this.currentUser, this.initialService}) : super(key: key);

  @override
  State<CreateOrderScreen> createState() => _CreateOrderScreenState();
}

class _CreateOrderScreenState extends State<CreateOrderScreen> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _titleController = TextEditingController();
  final TextEditingController _descController = TextEditingController();
  final TextEditingController _amountController = TextEditingController();
  final TextEditingController _daysController = TextEditingController();
  final TextEditingController _sellerController = TextEditingController();

  String _category = 'عام';
  bool _allowBNPL = true;
  bool _loading = false;

  // Real-time Fee calculation mirroring payment-utils.ts
  double _platformFee = 0.0;
  double _sellerShare = 0.0;
  double _buyerTotal = 0.0;
  bool _isSubmitted = false;

  @override
  void initState() {
    super.initState();
    if (widget.initialService != null) {
      _titleController.text = widget.initialService!['title'] ?? '';
      _descController.text = 'أرغب بطلب الخدمة: \${widget.initialService!["title"]}';
      _amountController.text = widget.initialService!['price']?.toString() ?? '';
      _daysController.text = widget.initialService!['deliveryDays']?.toString() ?? '';
      _sellerController.text = widget.initialService!['sellerName'] ?? '';
      _category = widget.initialService!['category'] ?? 'عام';
      _calculateFees(_amountController.text);
    } else {
      _loadDraft();
    }
  }

  @override
  void dispose() {
    if (!_isSubmitted) {
      _saveDraft();
    }
    _titleController.dispose();
    _descController.dispose();
    _amountController.dispose();
    _daysController.dispose();
    _sellerController.dispose();
    super.dispose();
  }

  Future<void> _loadDraft() async {
    final prefs = await SharedPreferences.getInstance();
    if (prefs.containsKey('draft_order_title')) {
      setState(() {
        _titleController.text = prefs.getString('draft_order_title') ?? '';
        _descController.text = prefs.getString('draft_order_desc') ?? '';
        _amountController.text = prefs.getString('draft_order_amount') ?? '';
        _daysController.text = prefs.getString('draft_order_days') ?? '';
        _sellerController.text = prefs.getString('draft_order_seller') ?? '';
        _category = prefs.getString('draft_order_category') ?? 'عام';
        if (_amountController.text.isNotEmpty) {
          _calculateFees(_amountController.text);
        }
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('تم استعادة مسودة طلبك السابق', style: TextStyle(fontFamily: 'Cairo'))),
        );
      }
    }
  }

  Future<void> _saveDraft() async {
    final prefs = await SharedPreferences.getInstance();
    if (_titleController.text.isNotEmpty || _amountController.text.isNotEmpty) {
      await prefs.setString('draft_order_title', _titleController.text);
      await prefs.setString('draft_order_desc', _descController.text);
      await prefs.setString('draft_order_amount', _amountController.text);
      await prefs.setString('draft_order_days', _daysController.text);
      await prefs.setString('draft_order_seller', _sellerController.text);
      await prefs.setString('draft_order_category', _category);
    }
  }

  Future<void> _clearDraft() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('draft_order_title');
    await prefs.remove('draft_order_desc');
    await prefs.remove('draft_order_amount');
    await prefs.remove('draft_order_days');
    await prefs.remove('draft_order_seller');
    await prefs.remove('draft_order_category');
  }

  void _calculateFees(String val) {
    final amount = double.tryParse(val) ?? 0.0;
    setState(() {
      _platformFee = amount * 0.03;
      _sellerShare = amount; // Seller gets 100% of their base price
      _buyerTotal = amount + _platformFee;
    });
  }

  void _submitOrder() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _loading = true);

    try {
      final amount = double.parse(_amountController.text.trim());
      final deliveryDays = int.parse(_daysController.text.trim());
      final sellerInput = _sellerController.text.trim();

      // Write real escrow transaction to custom Firestore database
      final FirebaseFirestore db = FirebaseFirestore.instanceFor(
        app: Firebase.app(),
        databaseId: "ai-studio-ee0a8e94-5852-438b-93d7-9755da859ebc",
      );

      final newOrderRef = db.collection('orders').doc();
      final orderId = newOrderRef.id;

      final Map<String, dynamic> orderData = {
        'buyerId': widget.currentUser.uid,
        'sellerId': 'unknown', // Linked when seller accepts
        'sellerEmail': sellerInput.contains('@') ? sellerInput : null,
        'sellerPhone': !sellerInput.contains('@') ? sellerInput : null,
        'title': _titleController.text.trim(),
        'description': _descController.text.trim(),
        'amount': amount,
        'status': 'awaiting_acceptance',
        'category': _category,
        'allowBNPL': _allowBNPL,
        'deliveryDays': deliveryDays,
        'paymentMethod': 'standard',
        'paymentFees': {
          'feePercentage': 3.0,
          'platformCommission': _platformFee,
          'providerCost': 0.0,
          'platformNetRevenue': _platformFee,
          'sellerNetShare': _sellerShare,
        },
        'visibility': 'private',
        'buyerRatingCompleted': false,
        'sellerRatingCompleted': false,
        'isContractSigned': false,
        'createdAt': FieldValue.serverTimestamp(),
        'updatedAt': FieldValue.serverTimestamp(),
      };

      await newOrderRef.set(orderData);

      // Create initial order log
      await db.collection('orderLogs').add({
        'orderId': orderId,
        'userId': widget.currentUser.uid,
        'action': 'تغيير الحالة: awaiting_acceptance',
        'previousStatus': 'none',
        'currentStatus': 'awaiting_acceptance',
        'message': 'تم إنشاء طلب الضمان والتعميد بنجاح عبر تطبيق الجوال المطور',
        'createdAt': FieldValue.serverTimestamp(),
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors.success,
          content: Text(
            'تم إنشاء طلب الضمان الجديد بنجاح وبانتظار قبول الطرف الآخر!',
            textAlign: TextAlign.center,
            style: GoogleFonts.cairo(fontWeight: FontWeight.bold),
          ),
        ),
      );

      // Clear fields
      _clearDraft();
      _isSubmitted = true;
      if (widget.initialService != null && Navigator.canPop(context)) {
        Navigator.pop(context);
      }
      _titleController.clear();
      _descController.clear();
      _amountController.clear();
      _daysController.clear();
      _sellerController.clear();
      
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors.alert,
          content: Text(
            'فشل إنشاء صفقة الضمان، يرجى المحاولة لاحقاً',
            textAlign: TextAlign.center,
            style: GoogleFonts.cairo(fontWeight: FontWeight.bold),
          ),
        ),
      );
    } finally {
      setState(() => _loading = false);
    }
  }


  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'إنشاء صفقة تعميد جديدة',
                  style: GoogleFonts.cairo(
                    color: AppColors.textLight,
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                Text(
                  'أدخل تفاصيل التعاقد لتجميد وحفظ أموالك بالضمان',
                  style: GoogleFonts.cairo(
                    color: AppColors.textMuted,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 30),

                // Title Input
                _buildFieldLabel('عنوان الصفقة أو التعميد'),
                _buildTextField(
                  controller: _titleController,
                  hint: 'مثال: توريد 100 كرتون سكري مفتل',
                  icon: Icons.title_outlined,
                  validator: (val) => val!.isEmpty ? 'يرجى كتابة عنوان الصفقة' : null,
                ),

                // Description Input
                _buildFieldLabel('تفاصيل ومواصفات شروط العمل'),
                _buildTextField(
                  controller: _descController,
                  hint: 'اكتب مواصفات البضاعة والكمية وشروط التسليم والتغليف بدقة...',
                  icon: Icons.description_outlined,
                  maxLines: 4,
                  validator: (val) => val!.isEmpty ? 'يرجى كتابة الشروط والمواصفات' : null,
                ),

                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildFieldLabel('مبلغ الصفقة (ريال)'),
                          TextFormField(
                            controller: _amountController,
                            keyboardType: TextInputType.number,
                            style: GoogleFonts.outfit(color: AppColors.textLight, fontSize: 16),
                            onChanged: _calculateFees,
                            validator: (val) => val!.isEmpty ? 'أدخل المبلغ' : null,
                            decoration: _getInputDecoration('0.00', Icons.monetization_on_outlined),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildFieldLabel('مدة التسليم (أيام)'),
                          TextFormField(
                            controller: _daysController,
                            keyboardType: TextInputType.number,
                            style: GoogleFonts.outfit(color: AppColors.textLight, fontSize: 16),
                            validator: (val) => val!.isEmpty ? 'أدخل الأيام' : null,
                            decoration: _getInputDecoration('مثال: 5', Icons.schedule_outlined),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Seller input (Phone or email)
                _buildFieldLabel('بريد أو جوال البائع/الطرف الآخر'),
                _buildTextField(
                  controller: _sellerController,
                  hint: '05XXXXXXXX أو example@gmail.com',
                  icon: Icons.alternate_email_outlined,
                  validator: (val) => val!.isEmpty ? 'أدخل وسيلة اتصال بالطرف الآخر' : null,
                ),

                // Category Grid - Matches web platform categories exactly
                _buildFieldLabel('تصنيف الصفقة'),
                _buildCategoryGrid(),
                const SizedBox(height: 24),

                // Live calculations panel
                if (_buyerTotal > 0) _buildFeesPanel(),

                const SizedBox(height: 30),
                ElevatedButton(
                  onPressed: _loading ? null : _submitOrder,
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
                          'تأكيد وإنشاء صفقة الضمان والتعميد',
                          style: GoogleFonts.cairo(fontWeight: FontWeight.w900, fontSize: 13),
                        ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCategoryGrid() {
    // التصنيفات الـ 10 الحقيقية من المنصة - CreateOrderPage.tsx السطر 34
    final List<Map<String, dynamic>> categories = [
      {'label': 'عقارات',          'icon': Icons.apartment_outlined,         'color': const Color(0xFF3B82F6)},
      {'label': 'سيارات',          'icon': Icons.directions_car_outlined,     'color': const Color(0xFF8B5CF6)},
      {'label': 'خدمات إلكترونية', 'icon': Icons.computer_outlined,           'color': const Color(0xFF06B6D4)},
      {'label': 'تعقيب معاملات',   'icon': Icons.assignment_outlined,         'color': const Color(0xFFF59E0B)},
      {'label': 'برمجة وتطوير',    'icon': Icons.code_outlined,               'color': const Color(0xFF10B981)},
      {'label': 'صناعة تطبيقات',   'icon': Icons.phone_android_outlined,      'color': const Color(0xFFEC4899)},
      {'label': 'مواقع إلكترونية', 'icon': Icons.language_outlined,           'color': const Color(0xFF6366F1)},
      {'label': 'استضافات',        'icon': Icons.cloud_outlined,              'color': const Color(0xFF14B8A6)},
      {'label': 'أجهزة إلكترونية', 'icon': Icons.devices_outlined,            'color': const Color(0xFFF97316)},
      {'label': 'عام',             'icon': Icons.handshake_outlined,          'color': AppColors.accentGold},
    ];

    return Wrap(
      spacing: 10,
      runSpacing: 10,
      children: categories.map((cat) {
        final bool selected = _category == cat['label'];
        final Color catColor = cat['color'] as Color;
        return GestureDetector(
          onTap: () => setState(() => _category = cat['label'] as String),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: selected ? catColor.withOpacity(0.15) : AppColors.cardDark,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: selected ? catColor.withOpacity(0.6) : AppColors.textMuted.withOpacity(0.08),
                width: selected ? 1.5 : 1,
              ),
              boxShadow: selected
                  ? [BoxShadow(color: catColor.withOpacity(0.2), blurRadius: 8, offset: const Offset(0, 2))]
                  : [],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  cat['icon'] as IconData,
                  size: 16,
                  color: selected ? catColor : AppColors.textMuted,
                ),
                const SizedBox(width: 7),
                Text(
                  cat['label'] as String,
                  style: GoogleFonts.cairo(
                    color: selected ? catColor : AppColors.textMuted,
                    fontSize: 11,
                    fontWeight: selected ? FontWeight.w900 : FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildFieldLabel(String label) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8, top: 16),
      child: Text(
        label,
        style: GoogleFonts.cairo(
          color: AppColors.textLight,
          fontSize: 11,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    int maxLines = 1,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      maxLines: maxLines,
      validator: validator,
      style: GoogleFonts.cairo(color: AppColors.textLight, fontSize: 13, fontWeight: FontWeight.bold),
      decoration: _getInputDecoration(hint, icon),
    );
  }

  InputDecoration _getInputDecoration(String hint, IconData icon) {
    return InputDecoration(
      hintText: hint,
      hintStyle: GoogleFonts.cairo(color: AppColors.textMuted.withOpacity(0.4), fontSize: 11),
      prefixIcon: Icon(icon, color: AppColors.accentGold, size: 20),
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
    );
  }

  Widget _buildFeesPanel() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.cardDark,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.textMuted.withOpacity(0.08)),
      ),
      child: Column(
        children: [
          _buildFeeItem('قيمة الصفقة الأساسية', '${_sellerShare.toStringAsFixed(2)} ر.س', false),
          const SizedBox(height: 8),
          _buildFeeItem('رسوم المنصة والضمان الحامية (3%)', '${_platformFee.toStringAsFixed(2)} ر.س', false),
          const Divider(color: AppColors.textMuted, height: 24, thickness: 0.1),
          _buildFeeItem('إجمالي المبلغ المخصوم عبر بوابة الدفع', '${_buyerTotal.toStringAsFixed(2)} ر.س', true),
        ],
      ),
    );
  }

  Widget _buildFeeItem(String label, String value, bool isTotal) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: GoogleFonts.cairo(
            color: isTotal ? AppColors.accentGold : AppColors.textMuted,
            fontSize: isTotal ? 12 : 10,
            fontWeight: isTotal ? FontWeight.w900 : FontWeight.bold,
          ),
        ),
        Text(
          value,
          style: GoogleFonts.outfit(
            color: isTotal ? AppColors.accentGold : AppColors.textLight,
            fontSize: isTotal ? 16 : 12,
            fontWeight: isTotal ? FontWeight.w900 : FontWeight.bold,
          ),
        ),
      ],
    );
  }
}
