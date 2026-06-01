import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_core/firebase_core.dart';
import '../constants/colors.dart';
import '../models/user.dart';

class AddServiceScreen extends StatefulWidget {
  final UserProfile currentUser;

  const AddServiceScreen({Key? key, required this.currentUser}) : super(key: key);

  @override
  State<AddServiceScreen> createState() => _AddServiceScreenState();
}

class _AddServiceScreenState extends State<AddServiceScreen> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _titleController = TextEditingController();
  final TextEditingController _descController = TextEditingController();
  final TextEditingController _priceController = TextEditingController();
  final TextEditingController _daysController = TextEditingController();
  
  String _category = 'برمجة وتطوير';
  bool _loading = false;

  void _submitService() async {
    if (!_formKey.currentState!.validate()) return;
    
    setState(() => _loading = true);
    
    try {
      final db = FirebaseFirestore.instanceFor(
        app: Firebase.app(),
        databaseId: "ai-studio-ee0a8e94-5852-438b-93d7-9755da859ebc",
      );

      final docRef = db.collection('services').doc();
      await docRef.set({
        'id': docRef.id,
        'title': _titleController.text.trim(),
        'description': _descController.text.trim(),
        'category': _category,
        'price': double.parse(_priceController.text.trim()),
        'deliveryDays': int.parse(_daysController.text.trim()),
        'sellerId': widget.currentUser.uid,
        'sellerName': widget.currentUser.displayName,
        'sellerRating': 5.0, // Default rating for new service
        'isVerified': widget.currentUser.isVerified,
        'createdAt': FieldValue.serverTimestamp(),
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors.success,
          content: Text('تم نشر الخدمة بنجاح!', style: GoogleFonts.cairo(fontWeight: FontWeight.bold)),
        ),
      );
      Navigator.pop(context);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors.alert,
          content: Text('حدث خطأ أثناء إضافة الخدمة', style: GoogleFonts.cairo()),
        ),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        title: Text('إضافة خدمة جديدة', style: GoogleFonts.cairo(color: AppColors.textLight, fontWeight: FontWeight.bold, fontSize: 16)),
        iconTheme: const IconThemeData(color: AppColors.textLight),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildLabel('عنوان الخدمة'),
              _buildTextField(_titleController, 'مثال: تصميم شعار احترافي', maxLines: 1),
              const SizedBox(height: 16),
              
              _buildLabel('وصف الخدمة'),
              _buildTextField(_descController, 'اكتب وصفاً مفصلاً للخدمة التي تقدمها...', maxLines: 5),
              const SizedBox(height: 16),
              
              _buildLabel('التصنيف'),
              Container(
                decoration: BoxDecoration(
                  color: AppColors.backgroundDark,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.textMuted.withOpacity(0.2)),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _category,
                    dropdownColor: const Color(0xFF16181C),
                    isExpanded: true,
                    style: GoogleFonts.cairo(color: AppColors.textLight, fontWeight: FontWeight.bold, fontSize: 13),
                    items: ['برمجة وتطوير', 'تصميم جرافيك', 'تسويق ومبيعات', 'كتابة وترجمة', 'استشارات', 'عام']
                        .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                        .toList(),
                    onChanged: (val) {
                      if (val != null) setState(() => _category = val);
                    },
                  ),
                ),
              ),
              const SizedBox(height: 16),

              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildLabel('سعر الخدمة (ريال)'),
                        _buildTextField(_priceController, '0.0', keyboardType: TextInputType.number),
                      ],
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildLabel('مدة التسليم (أيام)'),
                        _buildTextField(_daysController, 'مثال: 3', keyboardType: TextInputType.number),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 32),

              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.accentGold,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  onPressed: _loading ? null : _submitService,
                  child: _loading
                      ? const CircularProgressIndicator(color: AppColors.backgroundDark)
                      : Text('نشر الخدمة', style: GoogleFonts.cairo(color: AppColors.backgroundDark, fontSize: 16, fontWeight: FontWeight.bold)),
                ),
              )
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0, right: 4.0),
      child: Text(text, style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 12, fontWeight: FontWeight.bold)),
    );
  }

  Widget _buildTextField(TextEditingController controller, String hint, {int maxLines = 1, TextInputType keyboardType = TextInputType.text}) {
    return TextFormField(
      controller: controller,
      maxLines: maxLines,
      keyboardType: keyboardType,
      style: GoogleFonts.cairo(color: AppColors.textLight, fontSize: 13, fontWeight: FontWeight.bold),
      validator: (val) => val == null || val.trim().isEmpty ? 'هذا الحقل مطلوب' : null,
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: GoogleFonts.cairo(color: AppColors.textMuted.withOpacity(0.5), fontSize: 12),
        filled: true,
        fillColor: AppColors.backgroundDark,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: AppColors.textMuted.withOpacity(0.2)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: AppColors.textMuted.withOpacity(0.2)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppColors.accentGold),
        ),
      ),
    );
  }
}
