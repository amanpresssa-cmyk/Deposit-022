import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../constants/colors.dart';
import '../services/firebase_service.dart';
import '../models/user.dart';

class NotificationsScreen extends StatelessWidget {
  final UserProfile currentUser;

  const NotificationsScreen({Key? key, required this.currentUser}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      appBar: AppBar(
        backgroundColor: AppColors.backgroundDark,
        elevation: 0,
        title: Text(
          'سجل الإشعارات',
          style: GoogleFonts.cairo(
            color: AppColors.textLight,
            fontSize: 18,
            fontWeight: FontWeight.w900,
          ),
        ),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: AppColors.textLight, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: StreamBuilder<List<Map<String, dynamic>>>(
        stream: FirebaseService().streamNotifications(currentUser.uid),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator(color: AppColors.accentGold));
          }
          if (snapshot.hasError) {
            return Center(
              child: Text(
                'حدث خطأ في تحميل الإشعارات',
                style: GoogleFonts.cairo(color: AppColors.alert, fontSize: 14),
              ),
            );
          }

          final notifications = snapshot.data ?? [];

          if (notifications.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.notifications_off_outlined, size: 80, color: AppColors.textMuted.withOpacity(0.5)),
                  const SizedBox(height: 16),
                  Text(
                    'لا توجد إشعارات حالياً',
                    style: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            );
          }

          return ListView.builder(
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.all(20),
            itemCount: notifications.length,
            itemBuilder: (context, index) {
              final notif = notifications[index];
              return _buildNotificationCard(notif);
            },
          );
        },
      ),
    );
  }

  Widget _buildNotificationCard(Map<String, dynamic> notif) {
    final title = notif['title'] ?? 'إشعار جديد';
    final message = notif['message'] ?? '';
    final isRead = notif['isRead'] == true;
    final type = notif['type'] ?? 'system';

    IconData iconData = Icons.notifications;
    Color iconColor = AppColors.accentGold;

    if (type == 'order_update') {
      iconData = Icons.local_shipping_outlined;
      iconColor = AppColors.info;
    } else if (type == 'payment') {
      iconData = Icons.account_balance_wallet_outlined;
      iconColor = AppColors.success;
    } else if (type == 'alert') {
      iconData = Icons.warning_amber_rounded;
      iconColor = AppColors.alert;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isRead ? AppColors.cardDark : AppColors.cardDark.withOpacity(0.7),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isRead ? AppColors.textMuted.withOpacity(0.1) : AppColors.accentGold.withOpacity(0.3),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: iconColor.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(iconData, color: iconColor, size: 20),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: GoogleFonts.cairo(
                    color: AppColors.textLight,
                    fontSize: 14,
                    fontWeight: isRead ? FontWeight.bold : FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  message,
                  style: GoogleFonts.cairo(
                    color: AppColors.textMuted,
                    fontSize: 12,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
          if (!isRead)
            Container(
              margin: const EdgeInsets.only(top: 8),
              width: 8,
              height: 8,
              decoration: const BoxDecoration(
                color: AppColors.accentGold,
                shape: BoxShape.circle,
              ),
            ),
        ],
      ),
    );
  }
}
