import 'package:flutter/material.dart';

class AppColors {
  // Deep midnight banking theme
  static const Color primaryDark = Color(0xFF0A192F);      // Deep Midnight Blue
  static const Color accentGold = Color(0xFFC5A880);       // Silk Gold
  static const Color lightGold = Color(0xFFE5D5C0);        // Light Sand Gold
  static const Color backgroundDark = Color(0xFF030712);   // Cosmic Black/Blue
  static const Color cardDark = Color(0xFF0F172A);         // Sleek Slate Blue Card
  static const Color textLight = Color(0xFFF8FAFC);        // Pure White Text
  static const Color textMuted = Color(0xFF94A3B8);        // Muted Gray Text
  
  // Status Colors (harmonious, not generic)
  static const Color success = Color(0xFF10B981);          // Emerald Green
  static const Color pending = Color(0xFFF59E0B);          // Warm Amber
  static const Color alert = Color(0xFFEF4444);            // Crimson Red
  static const Color info = Color(0xFF3B82F6);             // Vibrant Blue

  // Light Mode Fallback
  static const Color backgroundLight = Color(0xFFF8FAFC);  // Marble White
  static const Color cardLight = Color(0xFFFFFFFF);        // White Card
  static const Color textDark = Color(0xFF0F172A);         // Deep Slate Text

  // Custom Banking Gradients
  static const Gradient goldCardGradient = LinearGradient(
    colors: [Color(0xFFC5A880), Color(0xFF8C714B)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const Gradient darkCardGradient = LinearGradient(
    colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const Gradient primaryGradient = LinearGradient(
    colors: [Color(0xFF0A192F), Color(0xFF172A45)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );
}
