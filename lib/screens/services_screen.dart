import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../constants/colors.dart';

class ServicesScreen extends StatefulWidget {
  const ServicesScreen({Key? key}) : super(key: key);

  @override
  State<ServicesScreen> createState() => _ServicesScreenState();
}

class _ServicesScreenState extends State<ServicesScreen> {
  final TextEditingController _searchController = TextEditingController();
  final List<Map<String, dynamic>> _mockServices = [
    {
      'name': 'الشيخ عبد الرحمن السليمان',
      'specialty': 'مزارع السليمان المعتمدة لتجهيز وتعبئة التمور',
      'rating': 4.9,
      'reviews': 124,
      'location': 'القصيم، المملكة العربية السعودية',
      'verified': true,
      'photo': '',
      'category': 'منتجات زراعية'
    },
    {
      'name': 'مؤسسة الشحن المبرد اللوجستية',
      'specialty': 'نقل لوجستي مبرد للتمور والمنتجات الغذائية لجميع مناطق المملكة',
      'rating': 4.7,
      'reviews': 86,
      'location': 'الرياض، المملكة العربية السعودية',
      'verified': true,
      'photo': '',
      'category': 'تجارة عامة'
    },
    {
      'name': 'مكتب الإنجاز للتعقيب والوساطة',
      'specialty': 'وساطة تعقيب وتأمين وتخليص معاملات حكومية رسمية موثقة بالنفاذ',
      'rating': 4.8,
      'reviews': 53,
      'location': 'جدة، المملكة العربية السعودية',
      'verified': true,
      'photo': '',
      'category': 'خدمات وساطة تعقيب'
    }
  ];

  List<Map<String, dynamic>> _filteredServices = [];

  @override
  void initState() {
    super.initState();
    _filteredServices = List.from(_mockServices);
  }

  void _filterServices(String query) {
    setState(() {
      _filteredServices = _mockServices
          .where((service) =>
              service['name'].toString().toLowerCase().contains(query.toLowerCase()) ||
              service['specialty'].toString().toLowerCase().contains(query.toLowerCase()))
          .toList();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'الوسطاء والخدمات المعتمدة',
                style: GoogleFonts.cairo(
                  color: AppColors.textLight,
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                ),
              ),
              Text(
                'تصفح قائمة المعقبين والتجار والوسطاء الموثقين هوياتهم بالنفاذ الوطني الموحد',
                style: GoogleFonts.cairo(
                  color: AppColors.textMuted,
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 24),

              // Search Bar input
              TextField(
                controller: _searchController,
                onChanged: _filterServices,
                style: GoogleFonts.cairo(color: AppColors.textLight, fontSize: 13, fontWeight: FontWeight.bold),
                decoration: InputDecoration(
                  hintText: 'ابحث باسم الوسيط أو الخدمة أو مزارع التمور...',
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

              // Filtered list items
              Expanded(
                child: _filteredServices.isEmpty
                    ? Center(
                        child: Text(
                          'عذراً، لم يتم العثور على وسطاء يطابقون بحثك',
                          style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                      )
                    : ListView.builder(
                        physics: const BouncingScrollPhysics(),
                        itemCount: _filteredServices.length,
                        itemBuilder: (context, index) {
                          final service = _filteredServices[index];
                          return _buildServiceCard(service);
                        },
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildServiceCard(Map<String, dynamic> service) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.cardDark,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: AppColors.textMuted.withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: AppColors.accentGold.withOpacity(0.08),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.person, color: AppColors.accentGold, size: 24),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Flexible(
                                child: Text(
                                  service['name'] as String,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: GoogleFonts.cairo(
                                    color: AppColors.textLight,
                                    fontSize: 13,
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 6),
                              if (service['verified'] == true)
                                const Icon(Icons.verified, color: AppColors.success, size: 14),
                            ],
                          ),
                          Text(
                            service['category'] as String,
                            style: GoogleFonts.cairo(
                              color: AppColors.accentGold,
                              fontSize: 9,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Row(
                children: [
                  const Icon(Icons.star_rounded, color: Colors.amber, size: 18),
                  const SizedBox(width: 4),
                  Text(
                    service['rating'].toString(),
                    style: GoogleFonts.outfit(
                      color: AppColors.textLight,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            service['specialty'] as String,
            style: GoogleFonts.cairo(
              color: AppColors.textMuted,
              fontSize: 11,
              fontWeight: FontWeight.bold,
              height: 1.5,
            ),
          ),
          const Divider(color: AppColors.textMuted, height: 24, thickness: 0.1),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.location_on_outlined, color: AppColors.textMuted, size: 14),
                  const SizedBox(width: 4),
                  Text(
                    service['location'] as String,
                    style: GoogleFonts.cairo(
                      color: AppColors.textMuted,
                      fontSize: 9,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              Text(
                '(${service['reviews']} تقييم)',
                style: GoogleFonts.cairo(
                  color: AppColors.textMuted,
                  fontSize: 9,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
