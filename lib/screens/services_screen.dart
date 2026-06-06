import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
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
  String _selectedCategory = 'الكل';
  String _sortBy = 'الأحدث'; // 'الأحدث' | 'الأقل سعراً' | 'الأعلى سعراً' | 'الأسرع تسليماً'
  bool _isGridView = true;

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
              const SizedBox(height: 20),

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
              const SizedBox(height: 16),

              // Category Chips
              _buildCategoryChips(),

              // Sorting & View controls
              _buildControlsRow(),

              // Services Stream Builder
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
                    
                    // 1. Filter by category
                    var filteredServices = allServices;
                    if (_selectedCategory != 'الكل') {
                      filteredServices = allServices.where((s) {
                        final category = (s['category'] ?? '').toString();
                        return category == _selectedCategory;
                      }).toList();
                    }

                    // 2. Filter by search query
                    if (_searchQuery.isNotEmpty) {
                      filteredServices = filteredServices.where((s) {
                        final title = (s['title'] ?? '').toString().toLowerCase();
                        final category = (s['category'] ?? '').toString().toLowerCase();
                        return title.contains(_searchQuery) || category.contains(_searchQuery);
                      }).toList();
                    }

                    // 3. Sort results
                    if (_sortBy == 'الأحدث') {
                      filteredServices.sort((a, b) {
                        final ta = a['createdAt'] as Timestamp?;
                        final tb = b['createdAt'] as Timestamp?;
                        if (ta == null || tb == null) return 0;
                        return tb.compareTo(ta);
                      });
                    } else if (_sortBy == 'الأقل سعراً') {
                      filteredServices.sort((a, b) {
                        final pa = double.tryParse(a['price']?.toString() ?? '0') ?? 0.0;
                        final pb = double.tryParse(b['price']?.toString() ?? '0') ?? 0.0;
                        return pa.compareTo(pb);
                      });
                    } else if (_sortBy == 'الأعلى سعراً') {
                      filteredServices.sort((a, b) {
                        final pa = double.tryParse(a['price']?.toString() ?? '0') ?? 0.0;
                        final pb = double.tryParse(b['price']?.toString() ?? '0') ?? 0.0;
                        return pb.compareTo(pa);
                      });
                    } else if (_sortBy == 'الأسرع تسليماً') {
                      filteredServices.sort((a, b) {
                        int getDays(dynamic val) {
                          final s = val?.toString() ?? '';
                          final match = RegExp(r'\d+').firstMatch(s);
                          if (match != null) return int.parse(match.group(0)!);
                          if (s.contains('يوم')) return 1;
                          if (s.contains('ساعة')) return 0;
                          return 999;
                        }
                        return getDays(a['deliveryTime']).compareTo(getDays(b['deliveryTime']));
                      });
                    }

                    if (filteredServices.isEmpty) {
                      return Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.business_center_outlined, size: 64, color: AppColors.textMuted),
                            const SizedBox(height: 16),
                            Text(
                              'لا توجد خدمات مطابقة للبحث أو التصنيف',
                              style: GoogleFonts.cairo(
                                  color: AppColors.textMuted, fontSize: 14, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      );
                    }

                    return _isGridView
                        ? GridView.builder(
                            physics: const BouncingScrollPhysics(),
                            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 2,
                              childAspectRatio: 0.72,
                              crossAxisSpacing: 16,
                              mainAxisSpacing: 16,
                            ),
                            itemCount: filteredServices.length,
                            itemBuilder: (context, index) {
                              return _buildServiceGridCard(context, filteredServices[index]);
                            },
                          )
                        : ListView.builder(
                            physics: const BouncingScrollPhysics(),
                            itemCount: filteredServices.length,
                            itemBuilder: (context, index) {
                              return _buildServiceListCard(context, filteredServices[index]);
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

  Widget _buildCategoryChips() {
    final categories = [
      'الكل',
      'برمجة وتطوير',
      'تصميم وجرافيكس',
      'تسويق رقمي',
      'كتابة وترجمة',
      'استشارات قانونية',
      'خدمات بنكية'
    ];
    return Container(
      height: 38,
      margin: const EdgeInsets.only(bottom: 8),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        itemCount: categories.length,
        itemBuilder: (context, index) {
          final cat = categories[index];
          final isSelected = _selectedCategory == cat;
          return GestureDetector(
            onTap: () => setState(() => _selectedCategory = cat),
            child: Container(
              margin: const EdgeInsets.only(left: 8),
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: isSelected ? AppColors.accentGold : AppColors.cardDark,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isSelected ? AppColors.accentGold : AppColors.textMuted.withOpacity(0.08),
                  width: 1,
                ),
              ),
              alignment: Alignment.center,
              child: Text(
                cat,
                style: GoogleFonts.cairo(
                  color: isSelected ? AppColors.primaryDark : AppColors.textLight,
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildControlsRow() {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Text(
                'ترتيب حسب: ',
                style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.bold),
              ),
              const SizedBox(width: 4),
              DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: _sortBy,
                  dropdownColor: AppColors.cardDark,
                  icon: const Icon(Icons.arrow_drop_down, color: AppColors.accentGold, size: 18),
                  style: GoogleFonts.cairo(color: AppColors.accentGold, fontSize: 11, fontWeight: FontWeight.w900),
                  onChanged: (val) {
                    if (val != null) setState(() => _sortBy = val);
                  },
                  items: ['الأحدث', 'الأقل سعراً', 'الأعلى سعراً', 'الأسرع تسليماً'].map((val) {
                    return DropdownMenuItem<String>(
                      value: val,
                      child: Text(val),
                    );
                  }).toList(),
                ),
              ),
            ],
          ),
          GestureDetector(
            onTap: () => setState(() => _isGridView = !_isGridView),
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.cardDark,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.textMuted.withOpacity(0.08)),
              ),
              child: Icon(
                _isGridView ? Icons.view_list_rounded : Icons.grid_view_rounded,
                color: AppColors.accentGold,
                size: 16,
              ),
            ),
          ),
        ],
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
              currentUser: widget.currentUser,
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
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
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
                        Row(
                          children: [
                            const Icon(Icons.star, color: AppColors.accentGold, size: 9),
                            const SizedBox(width: 2),
                            Text(
                              '4.9',
                              style: GoogleFonts.outfit(color: AppColors.textLight, fontSize: 8, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(width: 4),
                            const Icon(Icons.verified, color: AppColors.success, size: 9),
                          ],
                        ),
                      ],
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
      ),
    );
  }

  Widget _buildServiceListCard(BuildContext context, Map<String, dynamic> service) {
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
              currentUser: widget.currentUser,
            ),
          ),
        );
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        height: 120,
        decoration: BoxDecoration(
          color: AppColors.cardDark,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppColors.textMuted.withOpacity(0.06)),
        ),
        clipBehavior: Clip.antiAlias,
        child: Row(
          children: [
            // Image
            Container(
              width: 120,
              height: 120,
              color: Colors.white10,
              child: imageUrl != null && imageUrl.isNotEmpty
                  ? Image.network(
                      imageUrl,
                      fit: BoxFit.cover,
                      errorBuilder: (ctx, err, stack) => _buildPlaceholder(),
                    )
                  : _buildPlaceholder(),
            ),
            
            // Content
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppColors.accentGold.withOpacity(0.12),
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
                        Row(
                          children: [
                            const Icon(Icons.star, color: AppColors.accentGold, size: 10),
                            const SizedBox(width: 2),
                            Text(
                              '4.9',
                              style: GoogleFonts.outfit(color: AppColors.textLight, fontSize: 9, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(width: 6),
                            const Icon(Icons.verified, color: AppColors.success, size: 10),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.cairo(
                        color: AppColors.textLight,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        height: 1.3,
                      ),
                    ),
                    const Spacer(),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Text(
                              'يبدأ من: ',
                              style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 8),
                            ),
                            Text(
                              price,
                              style: GoogleFonts.outfit(
                                color: AppColors.textLight,
                                fontSize: 13,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                            const SizedBox(width: 2),
                            Text(
                              'ر.س',
                              style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 8),
                            ),
                          ],
                        ),
                        Row(
                          children: [
                            const Icon(Icons.access_time, color: AppColors.textMuted, size: 10),
                            const SizedBox(width: 4),
                            Text(
                              deliveryTime,
                              style: GoogleFonts.cairo(
                                color: AppColors.textLight,
                                fontSize: 9,
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
      ),
    );
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
