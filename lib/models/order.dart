import 'package:cloud_firestore/cloud_firestore.dart';

class OrderSignature {
  final bool signed;
  final String fullName;
  final String phone;
  final DateTime? signedAt;
  final String? ipAddress;
  final String? otpUsed;
  final String? nationalId;

  OrderSignature({
    required this.signed,
    required this.fullName,
    required this.phone,
    this.signedAt,
    this.ipAddress,
    this.otpUsed,
    this.nationalId,
  });

  factory OrderSignature.fromMap(Map<String, dynamic>? map) {
    if (map == null) {
      return OrderSignature(signed: false, fullName: '', phone: '');
    }
    return OrderSignature(
      signed: map['signed'] == true,
      fullName: map['fullName']?.toString() ?? '',
      phone: map['phone']?.toString() ?? '',
      signedAt: (map['signedAt'] as Timestamp?)?.toDate(),
      ipAddress: map['ipAddress']?.toString(),
      otpUsed: map['otpUsed']?.toString(),
      nationalId: map['nationalId']?.toString(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'signed': signed,
      'fullName': fullName,
      'phone': phone,
      'signedAt': signedAt != null ? Timestamp.fromDate(signedAt!) : null,
      'ipAddress': ipAddress,
      'otpUsed': otpUsed,
      'nationalId': nationalId,
    };
  }
}

class OrderFees {
  final double platformCommission;
  final double providerCost;
  final double platformNetRevenue;
  final double sellerNetShare;
  final double feePercentage;

  OrderFees({
    required this.platformCommission,
    required this.providerCost,
    required this.platformNetRevenue,
    required this.sellerNetShare,
    required this.feePercentage,
  });

  factory OrderFees.fromMap(Map<String, dynamic>? map, double totalAmount) {
    if (map == null) {
      return OrderFees(
        platformCommission: totalAmount * 0.03,
        providerCost: 0.0,
        platformNetRevenue: totalAmount * 0.03,
        sellerNetShare: totalAmount,
        feePercentage: 3.0,
      );
    }
    
    double toDouble(dynamic val) {
      if (val == null) return 0.0;
      if (val is num) return val.toDouble();
      return double.tryParse(val.toString()) ?? 0.0;
    }

    return OrderFees(
      platformCommission: toDouble(map['platformCommission']),
      providerCost: toDouble(map['providerCost']),
      platformNetRevenue: toDouble(map['platformNetRevenue']),
      sellerNetShare: toDouble(map['sellerNetShare']),
      feePercentage: toDouble(map['feePercentage']),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'platformCommission': platformCommission,
      'providerCost': providerCost,
      'platformNetRevenue': platformNetRevenue,
      'sellerNetShare': sellerNetShare,
      'feePercentage': feePercentage,
    };
  }
}

class OrderModel {
  final String id;
  final String buyerId;
  final String sellerId;
  final String? sellerEmail;
  final String? sellerPhone;
  final String title;
  final String description;
  final double amount;
  final String status;
  final String category;
  final bool allowBNPL;
  final int deliveryDays;
  final String? deliveryNote;
  final String? deliveryAttachmentUrl;
  final List<String>? deliveryAttachmentUrls;
  final String paymentMethod;
  final OrderFees paymentFees;
  final String? paymentRef;
  final String visibility;
  final bool buyerRatingCompleted;
  final bool sellerRatingCompleted;
  final double? buyerRating;
  final double? sellerRating;
  final OrderSignature? buyerSignature;
  final OrderSignature? sellerSignature;
  final bool isContractSigned;
  final String? contractHash;
  final String? lastMessage;
  final DateTime? lastMessageAt;
  final DateTime createdAt;
  final DateTime updatedAt;

  OrderModel({
    required this.id,
    required this.buyerId,
    required this.sellerId,
    this.sellerEmail,
    this.sellerPhone,
    required this.title,
    required this.description,
    required this.amount,
    required this.status,
    required this.category,
    required this.allowBNPL,
    required this.deliveryDays,
    this.deliveryNote,
    this.deliveryAttachmentUrl,
    this.deliveryAttachmentUrls,
    required this.paymentMethod,
    required this.paymentFees,
    this.paymentRef,
    required this.visibility,
    required this.buyerRatingCompleted,
    required this.sellerRatingCompleted,
    this.buyerRating,
    this.sellerRating,
    this.buyerSignature,
    this.sellerSignature,
    required this.isContractSigned,
    this.contractHash,
    this.lastMessage,
    this.lastMessageAt,
    required this.createdAt,
    required this.updatedAt,
  });

  factory OrderModel.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>? ?? {};

    double toDouble(dynamic val) {
      if (val == null) return 0.0;
      if (val is num) return val.toDouble();
      return double.tryParse(val.toString()) ?? 0.0;
    }

    int toInt(dynamic val) {
      if (val == null) return 0;
      if (val is num) return val.toInt();
      return int.tryParse(val.toString()) ?? 0;
    }

    final amt = toDouble(data['amount']);

    return OrderModel(
      id: doc.id,
      buyerId: data['buyerId']?.toString() ?? '',
      sellerId: data['sellerId']?.toString() ?? '',
      sellerEmail: data['sellerEmail']?.toString(),
      sellerPhone: data['sellerPhone']?.toString(),
      title: data['title']?.toString() ?? '',
      description: data['description']?.toString() ?? '',
      amount: amt,
      status: data['status']?.toString() ?? 'pending',
      category: data['category']?.toString() ?? 'خدمات عامة',
      allowBNPL: data['allowBNPL'] == true,
      deliveryDays: toInt(data['deliveryDays']),
      deliveryNote: data['deliveryNote']?.toString(),
      deliveryAttachmentUrl: data['deliveryAttachmentUrl']?.toString(),
      deliveryAttachmentUrls: data['deliveryAttachmentUrls'] != null
          ? List<String>.from(data['deliveryAttachmentUrls'])
          : null,
      paymentMethod: data['paymentMethod']?.toString() ?? 'standard',
      paymentFees: OrderFees.fromMap(data['paymentFees'] as Map<String, dynamic>?, amt),
      paymentRef: data['paymentRef']?.toString(),
      visibility: data['visibility']?.toString() ?? 'private',
      buyerRatingCompleted: data['buyerRatingCompleted'] == true,
      sellerRatingCompleted: data['sellerRatingCompleted'] == true,
      buyerRating: data['buyerRating'] != null ? toDouble(data['buyerRating']) : null,
      sellerRating: data['sellerRating'] != null ? toDouble(data['sellerRating']) : null,
      buyerSignature: OrderSignature.fromMap(data['buyerSignature'] as Map<String, dynamic>?),
      sellerSignature: OrderSignature.fromMap(data['sellerSignature'] as Map<String, dynamic>?),
      isContractSigned: data['isContractSigned'] == true,
      contractHash: data['contractHash']?.toString(),
      lastMessage: data['lastMessage']?.toString(),
      lastMessageAt: (data['lastMessageAt'] as Timestamp?)?.toDate(),
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      updatedAt: (data['updatedAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'buyerId': buyerId,
      'sellerId': sellerId,
      'sellerEmail': sellerEmail,
      'sellerPhone': sellerPhone,
      'title': title,
      'description': description,
      'amount': amount,
      'status': status,
      'category': category,
      'allowBNPL': allowBNPL,
      'deliveryDays': deliveryDays,
      'deliveryNote': deliveryNote,
      'deliveryAttachmentUrl': deliveryAttachmentUrl,
      'deliveryAttachmentUrls': deliveryAttachmentUrls,
      'paymentMethod': paymentMethod,
      'paymentFees': paymentFees.toMap(),
      'paymentRef': paymentRef,
      'visibility': visibility,
      'buyerRatingCompleted': buyerRatingCompleted,
      'sellerRatingCompleted': sellerRatingCompleted,
      'buyerRating': buyerRating,
      'sellerRating': sellerRating,
      'buyerSignature': buyerSignature?.toMap(),
      'sellerSignature': sellerSignature?.toMap(),
      'isContractSigned': isContractSigned,
      'contractHash': contractHash,
      'lastMessage': lastMessage,
      'lastMessageAt': lastMessageAt != null ? Timestamp.fromDate(lastMessageAt!) : null,
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': Timestamp.fromDate(updatedAt),
    };
  }
}
