import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../constants/colors.dart';
import '../models/user.dart';
import 'create_order_screen.dart';

class ServiceDetailsScreen extends StatelessWidget {
  final Map<String, dynamic> service;
  final UserProfile? currentUser;

  const ServiceDetailsScreen({Key? key, required this.service, this.currentUser}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final title = service['title'] ?? 'خدمة بدون عنوان';
    final description = service['description'] ?? 'لا يوجد وصف متاح لهذه الخدمة حتى الآن.';
    final price = service['price']?.toString() ?? '0';
    final category = service['category'] ?? 'عام';
    final deliveryTime = service['deliveryDays']?.toString() ?? '-';
    final imageUrl = service['imageUrl'] as String?;
    final sellerName = service['sellerName'] ?? 'بائع مستقل';

    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          SliverAppBar(
            expandedHeight: 250,
            pinned: true,
            backgroundColor: AppColors.backgroundDark,
            iconTheme: const IconThemeData(color: AppColors.textLight),
            flexibleSpace: FlexibleSpaceBar(
              background: imageUrl != null && imageUrl.isNotEmpty
                  ? Image.network(
                      imageUrl,
                      fit: BoxFit.cover,
                      errorBuilder: (ctx, err, stack) => _buildPlaceholder(),
                    )
                  : _buildPlaceholder(),
            ),
          ),
          SliverToBoxAdapter(
            child: Container(
              padding: const EdgeInsets.all(24),
              decoration: const BoxDecoration(
                color: AppColors.backgroundDark,
                borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.accentGold.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      category,
                      style: GoogleFonts.cairo(
                        color: AppColors.accentGold,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    title,
                    style: GoogleFonts.cairo(
                      color: AppColors.textLight,
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 24),
                  Row(
                    children: [
                      _buildInfoTile(Icons.payments_outlined, 'السعر', '$price ر.س'),
                      const SizedBox(width: 16),
                      _buildInfoTile(Icons.schedule_outlined, 'مدة التسليم', '$deliveryTime أيام'),
                    ],
                  ),
                  const SizedBox(height: 24),
                  Row(
                    children: [
                      const CircleAvatar(
                        backgroundColor: AppColors.accentGold,
                        radius: 20,
                        child: Icon(Icons.person, color: AppColors.primaryDark),
                      ),
                      const SizedBox(width: 16),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('مقدم الخدمة', style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 10)),
                          Text(sellerName, style: GoogleFonts.cairo(color: AppColors.textLight, fontSize: 14, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 32),
                  Text(
                    'تفاصيل الخدمة',
                    style: GoogleFonts.cairo(
                      color: AppColors.textLight,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    description,
                    style: GoogleFonts.cairo(
                      color: AppColors.textMuted,
                      fontSize: 14,
                      height: 1.8,
                    ),
                  ),
                  const SizedBox(height: 48),
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: ElevatedButton(
                      onPressed: () {
                        if (currentUser == null) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              backgroundColor: AppColors.alert,
                              content: Text(
                                'عذراً، يجب تسجيل الدخول لتتمكن من طلب الخدمات',
                                textAlign: TextAlign.center,
                                style: GoogleFonts.cairo(fontWeight: FontWeight.bold),
                              ),
                            ),
                          );
                          return;
                        }
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => CreateOrderScreen(
                              currentUser: currentUser!,
                              initialService: service,
                            ),
                          ),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.accentGold,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      child: Text(
                        'طلب الخدمة الآن',
                        style: GoogleFonts.cairo(
                          color: AppColors.backgroundDark,
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPlaceholder() {
    return Container(
      color: Colors.white10,
      child: const Center(
        child: Icon(Icons.business_center, color: AppColors.textMuted, size: 64),
      ),
    );
  }

  Widget _buildInfoTile(IconData icon, String title, String value) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.cardDark,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.textMuted.withOpacity(0.1)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: AppColors.accentGold, size: 24),
            const SizedBox(height: 12),
            Text(
              title,
              style: GoogleFonts.cairo(
                color: AppColors.textMuted,
                fontSize: 12,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              value,
              style: GoogleFonts.outfit(
                color: AppColors.textLight,
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
