import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

// ============================================================
// [Phase 3] Futuristic AI Theme
// Electric Violet (#8B5CF6) → Cyan (#06B6D4) brand gradient.
// Dark-first (default ThemeMode.dark). Inter typography.
//
// Structure:
//   AppColors     — semantic color tokens (dark & light)
//   AppGradients  — brand gradients
//   AppGlow       — neon shadow presets (glow effects)
//   AppMotion     — motion curves/durations
//   AppSpacing    — 4dp grid (retained from Phase 2)
//   AppRadii      — corner radii (retained from Phase 2)
//   AppTheme      — ThemeData (lightTheme, darkTheme) + legacy constants
// ============================================================

class AppColors {
  AppColors._();

  // ── Brand ──────────────────────────────────────────────
  static const Color primary = Color(0xFF8B5CF6); // Electric Violet
  static const Color secondary = Color(0xFF06B6D4); // Cyan
  static const Color primarySoft = Color(0xFFA78BFA); // Violet-400
  static const Color secondarySoft = Color(0xFF22D3EE); // Cyan-400

  // ── Legacy brand aliases (Phase 2 compat) ──────────────
  static const Color brand = primary;
  static const Color brandDark = primarySoft;

  // ── Semantic ───────────────────────────────────────────
  static const Color income = Color(0xFF34D399); // Emerald-400
  static const Color expense = Color(0xFFF87171); // Red-400
  static const Color warning = Color(0xFFFBBF24); // Amber-400
  static const Color success = Color(0xFF34D399);

  // ── Dark palette (default) ─────────────────────────────
  static const Color darkBackground = Color(0xFF0A0A0F);
  static const Color darkSurface = Color(0xFF12121A);
  static const Color darkSurfaceElevated = Color(0xFF1A1A24);
  static const Color darkSurfaceVariant = Color(0xFF1A1A24);
  static const Color darkBorder = Color(0xFF26262E);
  static const Color darkOnSurface = Color(0xFFEDEDF2);
  static const Color darkOnSurfaceMuted = Color(0xFF9A9AA8);

  // ── Light palette ──────────────────────────────────────
  static const Color lightBackground = Color(0xFFFAFAFB);
  static const Color lightSurface = Colors.white;
  static const Color lightSurfaceElevated = Color(0xFFF5F5F7);
  static const Color lightSurfaceVariant = Color(0xFFF1F3F9);
  static const Color lightBorder = Color(0xFFE5E7EB);
  static const Color lightOnSurface = Color(0xFF1A1A24);
  static const Color lightOnSurfaceMuted = Color(0xFF6B7280);
}

class AppGradients {
  AppGradients._();

  /// Primary brand gradient — violet → cyan. Use for CTA, hero numbers, glow.
  static const LinearGradient brand = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [AppColors.primary, AppColors.secondary],
  );

  /// Softer version for subtle backgrounds.
  static const LinearGradient brandSoft = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [AppColors.primarySoft, AppColors.secondarySoft],
  );

  /// Hero card background (very subtle, violet-to-cyan at low opacity).
  static LinearGradient heroCard({bool dark = true}) => LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: dark
            ? [
                AppColors.primary.withValues(alpha: 0.28),
                AppColors.secondary.withValues(alpha: 0.20),
              ]
            : [
                AppColors.primary.withValues(alpha: 0.10),
                AppColors.secondary.withValues(alpha: 0.08),
              ],
      );

  /// Animated login background blobs.
  static const RadialGradient violetBlob = RadialGradient(
    colors: [Color(0xFF8B5CF6), Color(0x008B5CF6)],
    radius: 0.8,
  );
  static const RadialGradient cyanBlob = RadialGradient(
    colors: [Color(0xFF06B6D4), Color(0x0006B6D4)],
    radius: 0.8,
  );
}

class AppGlow {
  AppGlow._();

  /// Subtle button / chip glow.
  static List<BoxShadow> small({Color? color}) => [
        BoxShadow(
          color: (color ?? AppColors.primary).withValues(alpha: 0.35),
          blurRadius: 12,
          spreadRadius: 0,
          offset: const Offset(0, 4),
        ),
      ];

  /// Card / FAB glow.
  static List<BoxShadow> medium({Color? color}) => [
        BoxShadow(
          color: (color ?? AppColors.primary).withValues(alpha: 0.30),
          blurRadius: 24,
          spreadRadius: 2,
          offset: const Offset(0, 8),
        ),
        BoxShadow(
          color: (color ?? AppColors.secondary).withValues(alpha: 0.18),
          blurRadius: 16,
          spreadRadius: 0,
          offset: const Offset(0, 0),
        ),
      ];

  /// Hero number glow.
  static List<BoxShadow> hero({Color? color}) => [
        BoxShadow(
          color: (color ?? AppColors.primary).withValues(alpha: 0.45),
          blurRadius: 40,
          spreadRadius: 4,
          offset: const Offset(0, 12),
        ),
      ];
}

class AppMotion {
  AppMotion._();

  static const Duration fast = Duration(milliseconds: 180);
  static const Duration medium = Duration(milliseconds: 280);
  static const Duration slow = Duration(milliseconds: 520);
  static const Duration count = Duration(milliseconds: 900);

  static const Curve emphasized = Curves.easeOutCubic;
  static const Curve emphasizedDecel = Curves.easeOutQuart;
  static const Curve bounce = Curves.elasticOut;
}

class AppSpacing {
  AppSpacing._();
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 24;
  static const double xxl = 32;
}

class AppRadii {
  AppRadii._();
  static const double sm = 8;
  static const double md = 12;
  static const double card = 16;
  static const double lg = 20;
  static const double xl = 28;
  static const double pill = 999;
}

class AppTheme {
  AppTheme._();

  // ── Legacy constants (Phase 2 compat) ────────────────────
  static const Color backgroundColor = AppColors.darkBackground;
  static const Color expenseColor = AppColors.expense;
  static const Color incomeColor = AppColors.income;
  static const Color primaryColor = AppColors.primary;
  static const Color errorColor = AppColors.expense;
  static const double borderRadiusSmall = AppRadii.sm;
  static const double borderRadiusMedium = AppRadii.md;
  static const double borderRadiusCards = AppRadii.card;
  static const double borderRadiusLarge = AppRadii.lg;

  // ── TextTheme (Inter via GoogleFonts, Noto Sans KR 한글 폴백) ────
  // Inter는 한글 글리프가 없으므로 각 TextStyle에 Noto Sans KR 폴백을
  // 지정한다. 그렇지 않으면 Flutter Web이 "Could not find a set of Noto
  // fonts" 경고를 출력하며, OS 기본 한글 폰트가 없는 장치에서는 한글이
  // tofu(☐)로 렌더링된다.
  static TextTheme _textTheme(Color onSurface, Color onSurfaceMuted) {
    final base = GoogleFonts.interTextTheme();
    final krFallback = <String>[GoogleFonts.notoSansKr().fontFamily!];
    return base.copyWith(
      headlineLarge: base.headlineLarge?.copyWith(
        fontSize: 32,
        fontWeight: FontWeight.w800,
        letterSpacing: -0.6,
        color: onSurface,
        fontFamilyFallback: krFallback,
      ),
      headlineMedium: base.headlineMedium?.copyWith(
        fontSize: 26,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.4,
        color: onSurface,
        fontFamilyFallback: krFallback,
      ),
      headlineSmall: base.headlineSmall?.copyWith(
        fontSize: 20,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.2,
        color: onSurface,
        fontFamilyFallback: krFallback,
      ),
      titleLarge: base.titleLarge?.copyWith(
        fontSize: 18,
        fontWeight: FontWeight.w700,
        color: onSurface,
        fontFamilyFallback: krFallback,
      ),
      titleMedium: base.titleMedium?.copyWith(
        fontSize: 15,
        fontWeight: FontWeight.w600,
        color: onSurface,
        fontFamilyFallback: krFallback,
      ),
      titleSmall: base.titleSmall?.copyWith(
        fontSize: 13,
        fontWeight: FontWeight.w600,
        color: onSurfaceMuted,
        letterSpacing: 0.2,
        fontFamilyFallback: krFallback,
      ),
      bodyLarge: base.bodyLarge?.copyWith(
        fontSize: 15,
        color: onSurface,
        fontFamilyFallback: krFallback,
      ),
      bodyMedium: base.bodyMedium?.copyWith(
        fontSize: 14,
        color: onSurface,
        fontFamilyFallback: krFallback,
      ),
      bodySmall: base.bodySmall?.copyWith(
        fontSize: 12,
        color: onSurfaceMuted,
        fontFamilyFallback: krFallback,
      ),
      labelLarge: base.labelLarge?.copyWith(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: onSurface,
        fontFamilyFallback: krFallback,
      ),
      labelSmall: base.labelSmall?.copyWith(
        fontSize: 11,
        fontWeight: FontWeight.w600,
        color: onSurfaceMuted,
        letterSpacing: 0.6,
        fontFamilyFallback: krFallback,
      ),
    );
  }

  // ── Themes ───────────────────────────────────────────────
  static ThemeData lightTheme = _buildTheme(
    brightness: Brightness.light,
    background: AppColors.lightBackground,
    surface: AppColors.lightSurface,
    surfaceVariant: AppColors.lightSurfaceVariant,
    border: AppColors.lightBorder,
    onSurface: AppColors.lightOnSurface,
    onSurfaceMuted: AppColors.lightOnSurfaceMuted,
  );

  static ThemeData darkTheme = _buildTheme(
    brightness: Brightness.dark,
    background: AppColors.darkBackground,
    surface: AppColors.darkSurface,
    surfaceVariant: AppColors.darkSurfaceVariant,
    border: AppColors.darkBorder,
    onSurface: AppColors.darkOnSurface,
    onSurfaceMuted: AppColors.darkOnSurfaceMuted,
  );

  static ThemeData _buildTheme({
    required Brightness brightness,
    required Color background,
    required Color surface,
    required Color surfaceVariant,
    required Color border,
    required Color onSurface,
    required Color onSurfaceMuted,
  }) {
    final isDark = brightness == Brightness.dark;
    final textTheme = _textTheme(onSurface, onSurfaceMuted);
    const primary = AppColors.primary;

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      primaryColor: primary,
      scaffoldBackgroundColor: background,
      fontFamily: GoogleFonts.inter().fontFamily,
      // Inter에 한글이 없으므로 ThemeData 수준에서도 폴백 지정.
      fontFamilyFallback: <String>[GoogleFonts.notoSansKr().fontFamily!],
      colorScheme: ColorScheme(
        brightness: brightness,
        primary: primary,
        onPrimary: Colors.white,
        secondary: AppColors.secondary,
        onSecondary: Colors.white,
        error: AppColors.expense,
        onError: Colors.white,
        surface: surface,
        onSurface: onSurface,
        surfaceContainerHighest: surfaceVariant,
        outline: border,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: background,
        foregroundColor: onSurface,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: textTheme.titleLarge,
        iconTheme: IconThemeData(color: onSurface),
      ),
      cardTheme: CardThemeData(
        color: surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadii.card),
          side: BorderSide(color: border, width: 0.5),
        ),
      ),
      dividerTheme: DividerThemeData(color: border, thickness: 0.5),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: isDark ? surfaceVariant : const Color(0xFFF5F6FA),
        hintStyle: TextStyle(color: onSurfaceMuted),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadii.md),
          borderSide: BorderSide(color: border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadii._mdSide,
          borderSide: BorderSide(color: border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadii._mdSide,
          borderSide: BorderSide(color: primary.withValues(alpha: 0.55), width: 1.2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadii._mdSide,
          borderSide: const BorderSide(color: AppColors.expense),
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.lg,
          vertical: AppSpacing.md,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadii.md),
          ),
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.xl,
            vertical: AppSpacing.md,
          ),
          textStyle: textTheme.labelLarge,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: onSurface,
          side: BorderSide(color: border),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadii.md),
          ),
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.xl,
            vertical: AppSpacing.md,
          ),
          textStyle: textTheme.labelLarge,
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(foregroundColor: primary),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: surface,
        indicatorColor: primary.withValues(alpha: 0.15),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return TextStyle(
            fontSize: 11,
            fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
            color: selected ? primary : onSurfaceMuted,
          );
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return IconThemeData(color: selected ? primary : onSurfaceMuted);
        }),
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: surface,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(
            top: Radius.circular(AppRadii.xl),
          ),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: isDark ? surfaceVariant : const Color(0xFF323232),
        contentTextStyle: TextStyle(color: isDark ? onSurface : Colors.white),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadii.md),
        ),
      ),
      iconTheme: IconThemeData(color: onSurfaceMuted),
      textTheme: textTheme,
      splashColor: primary.withValues(alpha: 0.08),
      highlightColor: primary.withValues(alpha: 0.04),
    );
  }
}

/// Internal helper for reused BorderRadius instances in InputDecorationTheme.
class BorderRadii {
  BorderRadii._();
  static final BorderRadius _mdSide = BorderRadius.circular(AppRadii.md);
}
