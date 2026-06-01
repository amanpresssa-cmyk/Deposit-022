import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../constants/colors.dart';
import '../services/firebase_service.dart';
import '../models/user.dart';
import 'service_details_screen.dart';
import 'add_service_screen.dart';

class ServicesScreen extends StatefulWidget {
  final UserProfile? currentUser;
  const ServicesScreen({Key? key, this.currentUser}) : super(key: key);

  @override
  State<ServicesScreen> createState() => _ServicesScreenState();
}

class _ServicesScreenState extends State<ServicesScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      floatingActionButton: (widget.currentUser != null && widget.currentUser!.isAdmin)
          ? FloatingActionButton(
              backgroundColor: AppColors.accentGold,
              child: const Icon(Icons.add, color: AppColors.backgroundDark),
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => AddServiceScreen(currentUser: widget.currentUser!)),
                );
              },
            )
          : null,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'الخدمات المعروضة',
                style: GoogleFonts.cairo(
                  color: AppColors.textLight,
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                ),
              ),
              Text(
                'تصفح قائمة الخدمات المقدمة من البائعين الموثقين بالنفاذ الوطني',
                style: GoogleFonts.cairo(
                  color: AppColors.textMuted,
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 24),

              // Search Bar
              TextField(
                controller: _searchController,
                onChanged: (val) => setState(() => _searchQuery = val.toLowerCase()),
                style: GoogleFonts.cairo(color: AppColors.textLight, fontSize: 13, fontWeight: FontWeight.bold),
                decoration: InputDecoration(
                  hintText: 'ابحث باسم الخدمة أو التصنيف...',
                  hintStyle: GoogleFonts.cairo(color: AppColors.textMuted.withOpacity(0.4), fontSize: 11),
                  prefixIcon: const Icon(Icons.search, color: AppColors.accentGold),
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
              const SizedBox(height: 20),

              // Services Grid Stream
              Expanded(
                child: StreamBuilder<List<Map<String, dynamic>>>(
                  stream: FirebaseService().streamServices(),
                  builder: (context, snapshot) {
                    if (snapshot.connectionState == ConnectionState.waiting) {
                      return const Center(
                        child: CircularProgressIndicator(color: AppColors.accentGold),
                      );
                    }
                    if (snapshot.hasError) {
                      return Center(
                        child: Text(
                          'حدث خطأ في تحميل الخدمات',
                          style: GoogleFonts.cairo(color: AppColors.alert, fontSize: 12),
                        ),
                      );
                    }

                    final allServices = snapshot.data ?? [];
                    final filteredServices = allServices.where((s) {
                      final title = (s['title'] ?? '').toString().toLowerCase();
                      final category = (s['category'] ?? '').toString().toLowerCase();
                      return title.contains(_searchQuery) || category.contains(_searchQuery);
                    }).toList();

                    if (filteredServices.isEmpty) {
                      return Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.business_center_outlined, size: 64, color: AppColors.textMuted),
                            const SizedBox(height: 16),
                            Text(
                              'لا توجد خدمات متاحة حالياً',
                              style: GoogleFonts.cairo(
                                  color: AppColors.textMuted, fontSize: 14, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      );
                    }

                    return GridView.builder(
                      physics: const BouncingScrollPhysics(),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        childAspectRatio: 0.75,
                        crossAxisSpacing: 16,
                        mainAxisSpacing: 16,
                      ),
                      itemCount: filteredServices.length,
                      itemBuilder: (context, index) {
                        return _buildServiceGridCard(context, filteredServices[index]);
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildServiceGridCard(BuildContext context, Map<String, dynamic> service) {
    final title = service['title'] ?? 'خدمة بدون عنوان';
    final price = service['price']?.toString() ?? '0';
    final category = service['category'] ?? 'عام';
    final deliveryTime = service['deliveryTime'] ?? '-';
    final imageUrl = service['imageUrl'] as String?;

    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => ServiceDetailsScreen(
              service: service,
              currentUser: widget.currentUser, // This will now be UserProfile?
            ),
          ),
        );
      },
      child: Container(
        decoration: BoxDecoration(
        color: AppColors.cardDark,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.textMuted.withOpacity(0.1)),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Image Area
          Expanded(
            flex: 4,
            child: Container(
              width: double.infinity,
              color: Colors.white10,
              child: imageUrl != null && imageUrl.isNotEmpty
                  ? Image.network(
                      imageUrl,
                      fit: BoxFit.cover,
                      errorBuilder: (ctx, err, stack) => _buildPlaceholder(),
                    )
                  : _buildPlaceholder(),
            ),
          ),
          // Content Area
          Expanded(
            flex: 5,
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.accentGold.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      category,
                      style: GoogleFonts.cairo(
                        color: AppColors.accentGold,
                        fontSize: 8,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.cairo(
                      color: AppColors.textLight,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      height: 1.3,
                    ),
                  ),
                  const Spacer(),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'السعر يبدأ من',
                            style: GoogleFonts.cairo(
                              color: AppColors.textMuted,
                              fontSize: 8,
                            ),
                          ),
                          Row(
                            children: [
                              Text(
                                price,
                                style: GoogleFonts.outfit(
                                  color: AppColors.textLight,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                              const SizedBox(width: 2),
                              Text(
                                'ر.س',
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
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            'التسليم',
                            style: GoogleFonts.cairo(
                              color: AppColors.textMuted,
                              fontSize: 8,
                            ),
                          ),
                          Text(
                            deliveryTime,
                            style: GoogleFonts.cairo(
                              color: AppColors.textLight,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    ));
  }

  Widget _buildPlaceholder() {
    return const Center(
      child: Icon(
        Icons.business_center,
        color: AppColors.textMuted,
        size: 32,
      ),
    );
  }
}
