import 'package:cloud_firestore/cloud_firestore.dart';

class UserProfile {
  final String uid;
  final String userShortId;
  final String displayName;
  final String email;
  final String phoneNumber;
  final String photoURL;
  final bool isSeller;
  final bool isAdmin;
  final bool isVerified;
  final String verificationStatus;
  final String? idNumber;
  final double balance;
  final double pendingBalance;
  final bool twoFactorEnabled;
  final bool whatsappEnabled;
  final String? whatsappNumber;
  final int freeFeeTransactions;
  final bool isBlocked;
  final String? blockReason;
  final bool showSupportOnBlock;
  final bool isOnline;
  final DateTime? lastSeen;
  final DateTime createdAt;

  // Exact Web Platform Settings Fields
  final String bio;
  final String bannerUrl;
  final bool isPrivate;
  final String payoutBank;
  final String payoutIban;
  final String payoutAccountName;
  final String primaryColor;
  
  final bool notificationsEnabled;
  final bool pushNotificationsEnabled;
  final bool orderNotificationsEnabled;
  final bool systemAlertsEnabled;
  final bool emailNotifications;

  UserProfile({
    required this.uid,
    required this.userShortId,
    required this.displayName,
    required this.email,
    required this.phoneNumber,
    required this.photoURL,
    required this.isSeller,
    required this.isAdmin,
    required this.isVerified,
    required this.verificationStatus,
    this.idNumber,
    required this.balance,
    required this.pendingBalance,
    required this.twoFactorEnabled,
    required this.whatsappEnabled,
    this.whatsappNumber,
    required this.freeFeeTransactions,
    required this.isBlocked,
    this.blockReason,
    required this.showSupportOnBlock,
    required this.isOnline,
    this.lastSeen,
    required this.createdAt,
    
    // Web Settings
    required this.bio,
    required this.bannerUrl,
    required this.isPrivate,
    required this.payoutBank,
    required this.payoutIban,
    required this.payoutAccountName,
    required this.primaryColor,
    required this.notificationsEnabled,
    required this.pushNotificationsEnabled,
    required this.orderNotificationsEnabled,
    required this.systemAlertsEnabled,
    required this.emailNotifications,
  });

  factory UserProfile.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>? ?? {};
    
    double toDouble(dynamic val) {
      if (val == null) return 0.0;
      if (val is num) return val.toDouble();
      return double.tryParse(val.toString()) ?? 0.0;
    }

    final emailVal = data['email']?.toString() ?? '';
    final isOwner = emailVal.toLowerCase() == 'khyratfarmdates@gmail.com';

    return UserProfile(
      uid: doc.id,
      userShortId: data['userShortId']?.toString() ?? '',
      displayName: data['displayName']?.toString() ?? 'عضو عربون',
      email: emailVal,
      phoneNumber: data['phoneNumber']?.toString() ?? '',
      photoURL: data['photoURL']?.toString() ?? '',
      isSeller: data['isSeller'] == true,
      isAdmin: data['isAdmin'] == true || isOwner, // Auto-provision Admin role for Owner's email
      isVerified: data['isVerified'] == true,
      verificationStatus: data['verificationStatus']?.toString() ?? 'none',
      idNumber: data['idNumber']?.toString(),
      balance: toDouble(data['balance']),
      pendingBalance: toDouble(data['pendingBalance']),
      twoFactorEnabled: data['twoFactorEnabled'] == true,
      whatsappEnabled: data['whatsappEnabled'] == true,
      whatsappNumber: data['whatsappNumber']?.toString(),
      freeFeeTransactions: data['freeFeeTransactions'] as int? ?? 0,
      isBlocked: data['isBlocked'] == true,
      blockReason: data['blockReason']?.toString(),
      showSupportOnBlock: data['showSupportOnBlock'] != false,
      isOnline: data['isOnline'] == true,
      lastSeen: (data['lastSeen'] as Timestamp?)?.toDate(),
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      
      // Parsing Web settings
      bio: data['bio']?.toString() ?? '',
      bannerUrl: data['bannerUrl']?.toString() ?? '',
      isPrivate: data['isPrivate'] == true,
      payoutBank: data['payoutBank']?.toString() ?? '',
      payoutIban: data['payoutIban']?.toString() ?? '',
      payoutAccountName: data['payoutAccountName']?.toString() ?? '',
      primaryColor: data['primaryColor']?.toString() ?? '#3b82f6',
      notificationsEnabled: data['notificationsEnabled'] != false,
      pushNotificationsEnabled: data['pushNotificationsEnabled'] != false,
      orderNotificationsEnabled: data['orderNotificationsEnabled'] != false,
      systemAlertsEnabled: data['systemAlertsEnabled'] != false,
      emailNotifications: data['emailNotifications'] != false,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'userShortId': userShortId,
      'displayName': displayName,
      'email': email,
      'phoneNumber': phoneNumber,
      'photoURL': photoURL,
      'isSeller': isSeller,
      'isAdmin': isAdmin,
      'isVerified': isVerified,
      'verificationStatus': verificationStatus,
      'idNumber': idNumber,
      'balance': balance,
      'pendingBalance': pendingBalance,
      'twoFactorEnabled': twoFactorEnabled,
      'whatsappEnabled': whatsappEnabled,
      'whatsappNumber': whatsappNumber,
      'freeFeeTransactions': freeFeeTransactions,
      'isBlocked': isBlocked,
      'blockReason': blockReason,
      'showSupportOnBlock': showSupportOnBlock,
      'isOnline': isOnline,
      'lastSeen': lastSeen != null ? Timestamp.fromDate(lastSeen!) : null,
      'createdAt': Timestamp.fromDate(createdAt),
      
      // Mapping Web settings
      'bio': bio,
      'bannerUrl': bannerUrl,
      'isPrivate': isPrivate,
      'payoutBank': payoutBank,
      'payoutIban': payoutIban,
      'payoutAccountName': payoutAccountName,
      'primaryColor': primaryColor,
      'notificationsEnabled': notificationsEnabled,
      'pushNotificationsEnabled': pushNotificationsEnabled,
      'orderNotificationsEnabled': orderNotificationsEnabled,
      'systemAlertsEnabled': systemAlertsEnabled,
      'emailNotifications': emailNotifications,
    };
  }

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      uid: json['uid'] ?? '',
      userShortId: json['userShortId'] ?? '',
      displayName: json['displayName'] ?? '',
      email: json['email'] ?? '',
      phoneNumber: json['phoneNumber'] ?? '',
      photoURL: json['photoURL'] ?? '',
      isSeller: json['isSeller'] == true,
      isAdmin: json['isAdmin'] == true,
      isVerified: json['isVerified'] == true,
      verificationStatus: json['verificationStatus'] ?? 'none',
      idNumber: json['idNumber'],
      balance: (json['balance'] as num?)?.toDouble() ?? 0.0,
      pendingBalance: (json['pendingBalance'] as num?)?.toDouble() ?? 0.0,
      twoFactorEnabled: json['twoFactorEnabled'] == true,
      whatsappEnabled: json['whatsappEnabled'] == true,
      whatsappNumber: json['whatsappNumber'],
      freeFeeTransactions: json['freeFeeTransactions'] as int? ?? 0,
      isBlocked: json['isBlocked'] == true,
      blockReason: json['blockReason'],
      showSupportOnBlock: json['showSupportOnBlock'] != false,
      isOnline: json['isOnline'] == true,
      lastSeen: json['lastSeen'] != null ? DateTime.parse(json['lastSeen']) : null,
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt']) : DateTime.now(),
      bio: json['bio'] ?? '',
      bannerUrl: json['bannerUrl'] ?? '',
      isPrivate: json['isPrivate'] == true,
      payoutBank: json['payoutBank'] ?? '',
      payoutIban: json['payoutIban'] ?? '',
      payoutAccountName: json['payoutAccountName'] ?? '',
      primaryColor: json['primaryColor'] ?? '#3b82f6',
      notificationsEnabled: json['notificationsEnabled'] != false,
      pushNotificationsEnabled: json['pushNotificationsEnabled'] != false,
      orderNotificationsEnabled: json['orderNotificationsEnabled'] != false,
      systemAlertsEnabled: json['systemAlertsEnabled'] != false,
      emailNotifications: json['emailNotifications'] != false,
    );
  }

  Map<String, dynamic> toJson() {
    final map = toMap();
    map['uid'] = uid;
    map['lastSeen'] = lastSeen?.toIso8601String();
    map['createdAt'] = createdAt.toIso8601String();
    return map;
  }
}

