import 'dart:async';
import 'dart:typed_data';
import 'package:firebase_core/firebase_core.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../models/user.dart';
import '../models/order.dart';

class FirebaseService {
  late final FirebaseAuth _auth;
  late final FirebaseFirestore _db;
  bool _initialized = false;

  // Singleton Pattern
  static final FirebaseService _instance = FirebaseService._internal();
  factory FirebaseService() => _instance;
  FirebaseService._internal();

  // Initialization helper
  Future<void> initialize() async {
    if (_initialized) return;
    
    try {
      // Manual Firebase Options to work on all emulators and physical devices cleanly
      await Firebase.initializeApp(
        options: const FirebaseOptions(
          apiKey: "AIzaSyB_VqqVpv1Kwy_in7zEMkWKS69ksmSapJk",
          appId: "1:739906773218:android:0553683bfea2741353febb", // Android variant
          messagingSenderId: "739906773218",
          projectId: "gen-lang-client-0953289644",
          storageBucket: "gen-lang-client-0953289644.firebasestorage.app",
        ),
      );
      
      _auth = FirebaseAuth.instance;
      
      // CRITICAL: Connect to custom database ID matching the developed web/backend platform
      _db = FirebaseFirestore.instanceFor(
        app: Firebase.app(),
        databaseId: "ai-studio-ee0a8e94-5852-438b-93d7-9755da859ebc",
      );
      
      _initialized = true;
      print("✅ [FirebaseService] Successfully connected to custom Firestore database!");
    } catch (e) {
      print("❌ [FirebaseService] Initialization failed: $e");
      // Fallback in case of lack of Google services initialization
      _initialized = false;
    }
  }

  // Live identifier login (looks up phone, email, whatsapp, or userShortId in live DB)
  Future<UserProfile?> loginWithIdentifier(String identifier) async {
    await initialize();
    if (!_initialized) return null;

    try {
      // Search user by email, phone, or whatsapp
      final collections = ['users'];
      for (final col in collections) {
        // Query email
        var snap = await _db.collection(col).where('email', isEqualTo: identifier).get();
        if (snap.docs.isNotEmpty) {
          final doc = snap.docs.first;
          final data = doc.data();
          if (identifier.toLowerCase() == 'khyratfarmdates@gmail.com' && data['isAdmin'] != true) {
            await _db.collection(col).doc(doc.id).update({'isAdmin': true});
            final updatedDoc = await _db.collection(col).doc(doc.id).get();
            return UserProfile.fromFirestore(updatedDoc);
          }
          return UserProfile.fromFirestore(doc);
        }

        // Query phoneNumber
        snap = await _db.collection(col).where('phoneNumber', isEqualTo: identifier).get();
        if (snap.docs.isNotEmpty) {
          final doc = snap.docs.first;
          final data = doc.data();
          final email = data['email']?.toString() ?? '';
          if (email.toLowerCase() == 'khyratfarmdates@gmail.com' && data['isAdmin'] != true) {
            await _db.collection(col).doc(doc.id).update({'isAdmin': true});
            final updatedDoc = await _db.collection(col).doc(doc.id).get();
            return UserProfile.fromFirestore(updatedDoc);
          }
          return UserProfile.fromFirestore(doc);
        }

        // Query whatsappNumber
        snap = await _db.collection(col).where('whatsappNumber', isEqualTo: identifier).get();
        if (snap.docs.isNotEmpty) {
          final doc = snap.docs.first;
          final data = doc.data();
          final email = data['email']?.toString() ?? '';
          if (email.toLowerCase() == 'khyratfarmdates@gmail.com' && data['isAdmin'] != true) {
            await _db.collection(col).doc(doc.id).update({'isAdmin': true});
            final updatedDoc = await _db.collection(col).doc(doc.id).get();
            return UserProfile.fromFirestore(updatedDoc);
          }
          return UserProfile.fromFirestore(doc);
        }

        // Query userShortId
        snap = await _db.collection(col).where('userShortId', isEqualTo: identifier).get();
        if (snap.docs.isNotEmpty) {
          final doc = snap.docs.first;
          final data = doc.data();
          final email = data['email']?.toString() ?? '';
          if (email.toLowerCase() == 'khyratfarmdates@gmail.com' && data['isAdmin'] != true) {
            await _db.collection(col).doc(doc.id).update({'isAdmin': true});
            final updatedDoc = await _db.collection(col).doc(doc.id).get();
            return UserProfile.fromFirestore(updatedDoc);
          }
          return UserProfile.fromFirestore(doc);
        }
      }
    } catch (e) {
      print("Error logging in: $e");
    }
    return null;
  }

  // Google Sign-In with robust failover fallback
  Future<UserProfile?> loginWithGoogle() async {
    await initialize();
    if (!_initialized) return null;

    try {
      try {
        final GoogleSignIn googleSignIn = GoogleSignIn();
        final GoogleSignInAccount? googleUser = await googleSignIn.signIn();
        if (googleUser != null) {
          final GoogleSignInAuthentication googleAuth = await googleUser.authentication;
          final AuthCredential credential = GoogleAuthProvider.credential(
            accessToken: googleAuth.accessToken,
            idToken: googleAuth.idToken,
          );
          
          final UserCredential userCredential = await _auth.signInWithCredential(credential);
          final User? firebaseUser = userCredential.user;
          
          if (firebaseUser != null) {
            final doc = await _db.collection('users').doc(firebaseUser.uid).get();
            final isOwner = (firebaseUser.email ?? '').toLowerCase() == 'khyratfarmdates@gmail.com';
            
            if (doc.exists) {
              final data = doc.data() as Map<String, dynamic>;
              if (isOwner && data['isAdmin'] != true) {
                await _db.collection('users').doc(firebaseUser.uid).update({'isAdmin': true});
              }
              final updatedDoc = await _db.collection('users').doc(firebaseUser.uid).get();
              return UserProfile.fromFirestore(updatedDoc);
            } else {
              final Map<String, dynamic> freshProfile = {
                'uid': firebaseUser.uid,
                'email': firebaseUser.email ?? 'google@arboon.sa',
                'displayName': firebaseUser.displayName ?? 'مستثمر عربون',
                'photoURL': firebaseUser.photoURL ?? '',
                'phoneNumber': firebaseUser.phoneNumber ?? '0500000000',
                'balance': 0.0,
                'pendingBalance': 0.0,
                'isVerified': true,
                'verificationStatus': 'verified',
                'userShortId': firebaseUser.uid.substring(0, 5).toUpperCase(),
                'whatsappEnabled': false,
                'whatsappNumber': null,
                'twoFactorEnabled': false,
                'isOnline': true,
                'isAdmin': isOwner,
                'lastSeen': FieldValue.serverTimestamp(),
                'createdAt': FieldValue.serverTimestamp(),
              };
              await _db.collection('users').doc(firebaseUser.uid).set(freshProfile);
              final freshDoc = await _db.collection('users').doc(firebaseUser.uid).get();
              return UserProfile.fromFirestore(freshDoc);
            }
          }
        }
      } catch (e) {
        print("Google Sign-In Native failed: $e");
        return null;
      }
    } catch (e) {
      print("Google Login general error: $e");
    }
    return null;
  }

  Future<void> signOutGoogle() async {
    try {
      final GoogleSignIn googleSignIn = GoogleSignIn();
      await googleSignIn.signOut();
    } catch (e) {
      print("Google SignOut error: $e");
    }
  }

  // Stream single user profile
  Stream<UserProfile?> streamProfile(String uid) {
    if (!_initialized) return const Stream.empty();
    return _db.collection('users').doc(uid).snapshots().map((snapshot) {
      if (!snapshot.exists) return null;
      return UserProfile.fromFirestore(snapshot);
    });
  }

  // Fetch user profile once by UID (used for session restoration on app start)
  Future<UserProfile?> fetchProfileByUid(String uid) async {
    await initialize();
    if (!_initialized) return null;
    try {
      final doc = await _db.collection('users').doc(uid).get();
      if (!doc.exists) return null;
      // Auto-provision admin for owner email
      final data = doc.data() ?? {};
      final email = data['email']?.toString() ?? '';
      if (email.toLowerCase() == 'khyratfarmdates@gmail.com' && data['isAdmin'] != true) {
        await _db.collection('users').doc(uid).update({'isAdmin': true});
        final updatedDoc = await _db.collection('users').doc(uid).get();
        return UserProfile.fromFirestore(updatedDoc);
      }
      return UserProfile.fromFirestore(doc);
    } catch (e) {
      print('Error fetching profile by uid: $e');
      return null;
    }
  }

  // Stream a single order by ID in real-time
  Stream<OrderModel?> streamOrder(String orderId) {
    if (!_initialized) return const Stream.empty();
    return _db.collection('orders').doc(orderId).snapshots().map((snapshot) {
      if (!snapshot.exists) return null;
      return OrderModel.fromFirestore(snapshot);
    });
  }

  // Fetch a single order by ID once
  Future<OrderModel?> fetchOrderById(String orderId) async {
    if (!_initialized) return null;
    try {
      final doc = await _db.collection('orders').doc(orderId).get();
      if (!doc.exists) return null;
      return OrderModel.fromFirestore(doc);
    } catch (e) {
      print('Error fetching order: $e');
      return null;
    }
  }

  // Update order status
  Future<void> updateOrderStatus(
    String orderId,
    String newStatus, {
    String? comment,
    String? paymentRef,
    List<String>? attachmentUrls,
    String? currentUserId,
  }) async {
    if (!_initialized) return;
    
    final updateData = <String, dynamic>{
      'status': newStatus,
      'updatedAt': FieldValue.serverTimestamp(),
    };
    
    if (paymentRef != null) updateData['paymentRef'] = paymentRef;
    if (comment != null) updateData['deliveryNote'] = comment;
    if (attachmentUrls != null && attachmentUrls.isNotEmpty) {
      updateData['deliveryAttachmentUrls'] = attachmentUrls;
      updateData['deliveryAttachmentUrl'] = attachmentUrls.first;
    }
    
    await _db.collection('orders').doc(orderId).update(updateData);
    
    // Add system message for status change
    String sysMsg = 'تم تحديث حالة الطلب إلى: $newStatus';
    if (newStatus == 'escrowed') sysMsg = 'قام المشتري بإيداع المبلغ. يمكنك البدء بالعمل الآن.';
    if (newStatus == 'delivered') {
      sysMsg = 'قام البائع بتسليم العمل النهائي للمراجعة.';
      if (comment != null) sysMsg += '\n\nملاحظات البائع:\n$comment';
    }
    if (newStatus == 'rating') sysMsg = 'قام المشتري باستلام العمل والموافقة عليه.';
    if (newStatus == 'completed') sysMsg = 'تم إنهاء الطلب وتحويل المبلغ للبائع بنجاح.';
    if (newStatus == 'disputed') {
      String role = 'أحد الأطراف';
      if (currentUserId != null) {
        try {
          final orderDoc = await _db.collection('orders').doc(orderId).get();
          if (orderDoc.exists) {
            final buyerId = orderDoc.data()?['buyerId'];
            role = (currentUserId == buyerId) ? 'المشتري' : 'البائع';
          }
        } catch (_) {}
      }
      sysMsg = 'تم فتح نزاع من قبل $role. يرجى انتظار تدخل الإدارة.';
    }
    if (newStatus == 'cancelled') sysMsg = 'تم إلغاء الصفقة.';
    
    final msgData = <String, dynamic>{
      'senderId': currentUserId ?? 'SYSTEM',
      'text': sysMsg,
      'isSystem': true,
      'createdAt': FieldValue.serverTimestamp(),
    };

    if (newStatus == 'delivered' && attachmentUrls != null && attachmentUrls.isNotEmpty) {
      msgData['fileUrls'] = attachmentUrls;
      msgData['fileUrl'] = attachmentUrls.first;
    }

    await _db.collection('orders').doc(orderId).collection('messages').add(msgData);
  }

  // Upload file to Firebase Storage
  Future<String?> uploadDeliveryAttachment({
    required String orderId,
    required String fileName,
    required Uint8List fileBytes,
  }) async {
    await initialize();
    if (!_initialized) return null;
    try {
      final ref = FirebaseStorage.instance
          .ref()
          .child('deliveries/$orderId/${DateTime.now().millisecondsSinceEpoch}_$fileName');
      final uploadTask = ref.putData(fileBytes);
      final snapshot = await uploadTask;
      return await snapshot.ref.getDownloadURL();
    } catch (e) {
      print('Error uploading file to Firebase Storage: $e');
      return null;
    }
  }

  // Stream active orders where user is buyer or seller from live custom DB
  Stream<List<OrderModel>> streamActiveOrders(String uid) {
    if (!_initialized) return const Stream.empty();

    final buyerStream = _db
        .collection('orders')
        .where('buyerId', isEqualTo: uid)
        .snapshots();

    final sellerStream = _db
        .collection('orders')
        .where('sellerId', isEqualTo: uid)
        .snapshots();

    return StreamZip([buyerStream, sellerStream]).map((snapshots) {
      final List<OrderModel> orders = [];
      final Set<String> ids = {};
      
      for (final snapshot in snapshots) {
        for (final doc in snapshot.docs) {
          if (!ids.contains(doc.id)) {
            ids.add(doc.id);
            orders.add(OrderModel.fromFirestore(doc));
          }
        }
      }
      
      orders.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      return orders;
    });
  }

  // Stream order messages in real-time
  Stream<List<Map<String, dynamic>>> streamOrderMessages(String orderId) {
    if (!_initialized) return const Stream.empty();
    return _db
        .collection('orders')
        .doc(orderId)
        .collection('messages')
        .orderBy('createdAt', descending: false)
        .snapshots()
        .map((snapshot) {
          return snapshot.docs.map((doc) {
            final data = doc.data();
            return {
              'text': data['text']?.toString() ?? '',
              'senderId': data['senderId']?.toString() ?? '',
              'isSystem': data['isSystem'] == true,
              'createdAt': (data['createdAt'] as Timestamp?)?.toDate(),
            };
          }).toList();
        });
  }

  // Send message to order chat
  Future<void> sendChatMessage(String orderId, String senderId, String text) async {
    if (!_initialized) return;
    await _db.collection('orders').doc(orderId).collection('messages').add({
      'senderId': senderId,
      'text': text,
      'orderId': orderId,
      'createdAt': FieldValue.serverTimestamp(),
    });
    
    await _db.collection('orders').doc(orderId).update({
      'lastMessage': text,
      'lastMessageAt': FieldValue.serverTimestamp(),
    });
  }

  // Update presence status (heartbeat)
  Future<void> updateUserPresence(String uid, bool isOnline) async {
    if (!_initialized) return;
    try {
      await _db.collection('users').doc(uid).update({
        'isOnline': isOnline,
        'lastSeen': FieldValue.serverTimestamp(),
      });
    } catch (e) {
      print('Error updating presence: $e');
    }
  }

  // Sign contract in live DB
  Future<void> signContract({
    required String orderId,
    required String fullName,
    required String phone,
    required String nationalId,
    required bool isBuyer,
    required String ipAddress,
    required String otpUsed,
  }) async {
    if (!_initialized) return;

    final signature = {
      'signed': true,
      'fullName': fullName,
      'phone': phone,
      'nationalId': nationalId,
      'signedAt': FieldValue.serverTimestamp(),
      'ipAddress': ipAddress, 
      'otpUsed': otpUsed,
    };

    final signatureField = isBuyer ? 'buyerSignature' : 'sellerSignature';

    await _db.collection('orders').doc(orderId).update({
      signatureField: signature,
      'isContractSigned': true,
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  // Stream Active Services (Brokers -> Services)
  Stream<List<Map<String, dynamic>>> streamServices() {
    if (!_initialized) return const Stream.empty();
    return _db.collection('services').where('isActive', isEqualTo: true).snapshots().map((snapshot) {
      return snapshot.docs.map((doc) => {'id': doc.id, ...doc.data()}).toList();
    });
  }

  // Mark a single notification as read
  Future<void> markNotificationAsRead(String notifId) async {
    if (!_initialized) return;
    try {
      await _db.collection('notifications').doc(notifId).update({
        'isRead': true,
      });
    } catch (e) {
      print('Error marking notification as read: $e');
    }
  }

  // Stream User Notifications
  Stream<List<Map<String, dynamic>>> streamNotifications(String uid) {
    if (!_initialized) return const Stream.empty();
    return _db
        .collection('notifications')
        .where('userId', isEqualTo: uid)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs.map((doc) => {'id': doc.id, ...doc.data()}).toList();
    });
  }

  // Submit Absher Verification (Nafaad Simulator) in live DB
  Future<void> submitNafaadVerification({
    required String uid,
    required String idNumber,
    required String phoneNumber,
  }) async {
    if (!_initialized) return;
    await _db.collection('users').doc(uid).update({
      'idNumber': idNumber,
      'phoneNumber': phoneNumber,
      'verificationStatus': 'pending',
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  // Save FCM Device Token for Push Notifications
  Future<void> saveDeviceToken(String uid) async {
    if (!_initialized) return;
    try {
      final token = await FirebaseMessaging.instance.getToken();
      if (token != null) {
        await _db.collection('users').doc(uid).update({
          'fcmToken': token,
        });
      }
    } catch (e) {
      print('Failed to save FCM token: $e');
    }
  }

  // Auto-claim orders where sellerId is 'unknown' and matches user's email/phoneNumber
  Future<void> autoClaimOrders(String uid, String? email, String? phone) async {
    await initialize();
    if (!_initialized) return;

    try {
      final batch = _db.batch();
      bool hasUpdates = false;

      // 1. Claim by Email
      if (email != null && email.trim().isNotEmpty) {
        final emailQuery = await _db
            .collection('orders')
            .where('sellerId', isEqualTo: 'unknown')
            .where('sellerEmail', isEqualTo: email.trim().toLowerCase())
            .get();

        for (final doc in emailQuery.docs) {
          batch.update(doc.reference, {
            'sellerId': uid,
            'updatedAt': FieldValue.serverTimestamp(),
          });

          // Record order log
          final orderData = doc.data();
          await _db.collection('orderLogs').add({
            'orderId': doc.id,
            'userId': uid,
            'action': 'ربط الحساب تلقائياً',
            'previousStatus': orderData['status'] ?? '',
            'currentStatus': orderData['status'] ?? '',
            'message': 'تم ربط حساب البائع بالصفقة تلقائياً عند تسجيل الدخول (عبر البريد)',
            'createdAt': FieldValue.serverTimestamp(),
          });
          hasUpdates = true;
        }
      }

      // 2. Claim by Phone
      if (phone != null && phone.trim().isNotEmpty) {
        String cleanPhone = phone.trim();
        if (!cleanPhone.startsWith('+')) {
          cleanPhone = '+966${cleanPhone.replaceFirst(RegExp(r'^0'), '')}';
        }

        final phoneQuery = await _db
            .collection('orders')
            .where('sellerId', isEqualTo: 'unknown')
            .where('sellerPhone', isEqualTo: cleanPhone)
            .get();

        for (final doc in phoneQuery.docs) {
          batch.update(doc.reference, {
            'sellerId': uid,
            'updatedAt': FieldValue.serverTimestamp(),
          });

          // Record order log
          final orderData = doc.data();
          await _db.collection('orderLogs').add({
            'orderId': doc.id,
            'userId': uid,
            'action': 'ربط الحساب تلقائياً',
            'previousStatus': orderData['status'] ?? '',
            'currentStatus': orderData['status'] ?? '',
            'message': 'تم ربط حساب البائع بالصفقة تلقائياً عند تسجيل الدخول (عبر الجوال)',
            'createdAt': FieldValue.serverTimestamp(),
          });
          hasUpdates = true;
        }
      }

      if (hasUpdates) {
        await batch.commit();
        print('✅ [FirebaseService] Auto-claimed orders for user $uid');
      }
    } catch (e) {
      print('❌ [FirebaseService] Error auto-claiming orders: $e');
    }
  }
}

// Stream Zip helper class
class StreamZip<T> extends StreamView<List<T>> {
  StreamZip(Iterable<Stream<T>> streams) : super(_zip(streams));

  static Stream<List<T>> _zip<T>(Iterable<Stream<T>> streams) {
    final controller = StreamController<List<T>>(sync: true);
    final List<StreamSubscription<T>> subscriptions = [];
    
    controller.onListen = () {
      final List<T?> latest = List<T?>.filled(streams.length, null);
      final List<bool> hasValue = List<bool>.filled(streams.length, false);
      
      for (int i = 0; i < streams.length; i++) {
        final subscription = streams.elementAt(i).listen(
          (value) {
            latest[i] = value;
            hasValue[i] = true;
            if (hasValue.every((val) => val)) {
              controller.add(List<T>.from(latest));
            }
          },
          onError: controller.addError,
          onDone: () {
            if (subscriptions.every((sub) => sub.isPaused)) {
              controller.close();
            }
          },
        );
        subscriptions.add(subscription);
      }
    };

    controller.onCancel = () async {
      for (final subscription in subscriptions) {
        await subscription.cancel();
      }
    };

    return controller.stream;
  }
}
