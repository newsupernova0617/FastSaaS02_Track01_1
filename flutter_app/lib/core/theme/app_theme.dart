import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

// Landing-style product UI theme.
//
// The previous dark neon theme is preserved under lib/legacy_ui for rollback.
// Keep these token names stable; existing screens depend on them.

class AppColors {
  AppColors._();

  static const Color primary = Color(0xFF2563EB);
  static const Color secondary = Color(0xFFFF5A4D);
  static const Color primarySoft = Color(0xFF60A5FA);
  static const Color secondarySoft = Color(0xFFFF8A80);

  static const Color brand = primary;
  static const Color brandDark = Color(0xFF1D4ED8);

  static const Color income = Color(0xFF10B981);
  static const Color expense = Color(0xFFEF4444);
  static const Color warning = Color(0xFFF59E0B);
  static const Color success = Color(0xFF10B981);

  static const Color lightBackground = Color(0xFFFFFFFF);
  static const Color lightSurface = Color(0xFFFFFFFF);
  static const Color lightSurfaceElevated = Color(0xFFF7F7F8);
  static const Color lightSurfaceVariant = Color(0xFFF1F3F9);
  static const Color lightBorder = Color(0xFFECECF0);
  static const Color lightOnSurface = Color(0xFF111318);
  static const Color lightOnSurfaceMuted = Color(0xFF69707D);

  // Dark remains as a safe fallback, not the primary visual direction.
  static const Color darkBackground = Color(0xFF111318);
  static const Color darkSurface = Color(0xFF181B22);
  static const Color darkSurfaceElevated = Color(0xFF20242D);
  static const Color darkSurfaceVariant = Color(0xFF252A34);
  static const Color darkBorder = Color(0xFF343A46);
  static const Color darkOnSurface = Color(0xFFF7F7F8);
  static const Color darkOnSurfaceMuted = Color(0xFFB6BDC8);
}

class AppGradients {
  AppGradients._();

  static const LinearGradient brand = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [AppColors.primary, AppColors.brandDark],
  );

  static const LinearGradient brandSoft = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFEFF6FF), Color(0xFFFFF1F0)],
  );

  static LinearGradient heroCard({bool dark = false}) => LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: dark
        ? const [AppColors.primary, AppColors.brandDark]
        : const [AppColors.primary, AppColors.brandDark],
  );

  static const RadialGradient violetBlob = RadialGradient(
    colors: [Color(0x332563EB), Color(0x002563EB)],
    radius: 0.8,
  );

  static const RadialGradient cyanBlob = RadialGradient(
    colors: [Color(0x22FF5A4D), Color(0x00FF5A4D)],
    radius: 0.8,
  );
}

class AppGlow {
  AppGlow._();

  static List<BoxShadow> small({Color? color}) => [
    BoxShadow(
      color: (color ?? AppColors.primary).withValues(alpha: 0.16),
      blurRadius: 14,
      offset: const Offset(0, 6),
    ),
  ];

  static List<BoxShadow> medium({Color? color}) => [
    BoxShadow(
      color: (color ?? AppColors.primary).withValues(alpha: 0.14),
      blurRadius: 24,
      offset: const Offset(0, 12),
    ),
    BoxShadow(
      color: Colors.black.withValues(alpha: 0.05),
      blurRadius: 18,
      offset: const Offset(0, 8),
    ),
  ];

  static List<BoxShadow> hero({Color? color}) => [
    BoxShadow(
      color: (color ?? AppColors.primary).withValues(alpha: 0.18),
      blurRadius: 32,
      offset: const Offset(0, 16),
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
  static const double card = 20;
  static const double lg = 24;
  static const double xl = 32;
  static const double pill = 999;
}

class AppTheme {
  AppTheme._();

  static const Color backgroundColor = AppColors.lightBackground;
  static const Color expenseColor = AppColors.expense;
  static const Color incomeColor = AppColors.income;
  static const Color primaryColor = AppColors.primary;
  static const Color errorColor = AppColors.expense;
  static const double borderRadiusSmall = AppRadii.sm;
  static const double borderRadiusMedium = AppRadii.md;
  static const double borderRadiusCards = AppRadii.card;
  static const double borderRadiusLarge = AppRadii.lg;

  static TextTheme _textTheme(Color onSurface, Color onSurfaceMuted) {
    final base = GoogleFonts.notoSansKrTextTheme();
    return base.copyWith(
      headlineLarge: base.headlineLarge?.copyWith(
        fontSize: 32,
        fontWeight: FontWeight.w900,
        letterSpacing: -0.8,
        color: onSurface,
      ),
      headlineMedium: base.headlineMedium?.copyWith(
        fontSize: 26,
        fontWeight: FontWeight.w800,
        letterSpacing: -0.5,
        color: onSurface,
      ),
      headlineSmall: base.headlineSmall?.copyWith(
        fontSize: 21,
        fontWeight: FontWeight.w800,
        letterSpacing: -0.3,
        color: onSurface,
      ),
      titleLarge: base.titleLarge?.copyWith(
        fontSize: 18,
        fontWeight: FontWeight.w800,
        letterSpacing: -0.2,
        color: onSurface,
      ),
      titleMedium: base.titleMedium?.copyWith(
        fontSize: 15,
        fontWeight: FontWeight.w700,
        color: onSurface,
      ),
      titleSmall: base.titleSmall?.copyWith(
        fontSize: 13,
        fontWeight: FontWeight.w700,
        color: onSurfaceMuted,
        letterSpacing: 0.2,
      ),
      bodyLarge: base.bodyLarge?.copyWith(fontSize: 15, color: onSurface),
      bodyMedium: base.bodyMedium?.copyWith(fontSize: 14, color: onSurface),
      bodySmall: base.bodySmall?.copyWith(fontSize: 12, color: onSurfaceMuted),
      labelLarge: base.labelLarge?.copyWith(
        fontSize: 14,
        fontWeight: FontWeight.w700,
        color: onSurface,
      ),
      labelSmall: base.labelSmall?.copyWith(
        fontSize: 11,
        fontWeight: FontWeight.w700,
        color: onSurfaceMuted,
        letterSpacing: 0.5,
      ),
    );
  }

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

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      primaryColor: AppColors.primary,
      scaffoldBackgroundColor: background,
      fontFamily: GoogleFonts.notoSansKr().fontFamily,
      colorScheme: ColorScheme(
        brightness: brightness,
        primary: AppColors.primary,
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
          side: BorderSide(color: border, width: 0.8),
        ),
      ),
      dividerTheme: DividerThemeData(color: border, thickness: 0.8),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: isDark ? surfaceVariant : AppColors.lightSurfaceElevated,
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
          borderSide: BorderSide(
            color: AppColors.primary.withValues(alpha: 0.65),
            width: 1.2,
          ),
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
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          elevation: 0,
          shadowColor: AppColors.primary.withValues(alpha: 0.20),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadii.pill),
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
            borderRadius: BorderRadius.circular(AppRadii.pill),
          ),
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.xl,
            vertical: AppSpacing.md,
          ),
          textStyle: textTheme.labelLarge,
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(foregroundColor: AppColors.primary),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: surface,
        indicatorColor: AppColors.primary.withValues(alpha: 0.10),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return TextStyle(
            fontSize: 11,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
            color: selected ? AppColors.primary : onSurfaceMuted,
          );
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return IconThemeData(
            color: selected ? AppColors.primary : onSurfaceMuted,
          );
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
        backgroundColor: isDark ? surfaceVariant : const Color(0xFF111318),
        contentTextStyle: const TextStyle(color: Colors.white),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadii.md),
        ),
      ),
      iconTheme: IconThemeData(color: onSurfaceMuted),
      textTheme: textTheme,
      splashColor: AppColors.primary.withValues(alpha: 0.08),
      highlightColor: AppColors.primary.withValues(alpha: 0.04),
    );
  }
}

class BorderRadii {
  BorderRadii._();
  static final BorderRadius _mdSide = BorderRadius.circular(AppRadii.md);
}
