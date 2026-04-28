import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:flutter_app/core/theme/app_theme.dart';

// ============================================================
// [테마 모드 프로바이더] theme_provider.dart
// 사용자의 테마 모드(system/light/dark)를 SharedPreferences에 영속화.
// MaterialApp.router(themeMode: ref.watch(themeModeProvider))로 연결.
// ============================================================

const _prefsKey = 'app.themeMode';
const _primaryPrefsKey = 'app.primaryPreset';

enum PrimaryColorPreset {
  blue(key: 'blue', label: '블루', palette: AppBrandPalette.blue),
  red(
    key: 'red',
    label: '빨강',
    palette: AppBrandPalette(
      primary: Color(0xFFDC2626),
      brandDark: Color(0xFFB91C1C),
      primarySoft: Color(0xFFF87171),
    ),
  ),
  orange(
    key: 'orange',
    label: '주황',
    palette: AppBrandPalette(
      primary: Color(0xFFEA580C),
      brandDark: Color(0xFFC2410C),
      primarySoft: Color(0xFFFB923C),
    ),
  ),
  yellow(
    key: 'yellow',
    label: '노랑',
    palette: AppBrandPalette(
      primary: Color(0xFFCA8A04),
      brandDark: Color(0xFFA16207),
      primarySoft: Color(0xFFFACC15),
    ),
  ),
  skyblue(
    key: 'skyblue',
    label: '하늘색',
    palette: AppBrandPalette(
      primary: Color(0xFF0EA5E9),
      brandDark: Color(0xFF0284C7),
      primarySoft: Color(0xFF7DD3FC),
    ),
  ),
  indigo(
    key: 'indigo',
    label: '인디고',
    palette: AppBrandPalette(
      primary: Color(0xFF4F46E5),
      brandDark: Color(0xFF4338CA),
      primarySoft: Color(0xFF818CF8),
    ),
  ),
  cyan(
    key: 'cyan',
    label: '시안',
    palette: AppBrandPalette(
      primary: Color(0xFF0891B2),
      brandDark: Color(0xFF0E7490),
      primarySoft: Color(0xFF67E8F9),
    ),
  ),
  pink(
    key: 'pink',
    label: '핑크',
    palette: AppBrandPalette(
      primary: Color(0xFFE11D48),
      brandDark: Color(0xFFBE123C),
      primarySoft: Color(0xFFFB7185),
    ),
  ),
  violet(
    key: 'violet',
    label: '바이올렛',
    palette: AppBrandPalette(
      primary: Color(0xFF7C3AED),
      brandDark: Color(0xFF6D28D9),
      primarySoft: Color(0xFFA78BFA),
    ),
  ),
  mint(
    key: 'mint',
    label: '민트',
    palette: AppBrandPalette(
      primary: Color(0xFF0F766E),
      brandDark: Color(0xFF115E59),
      primarySoft: Color(0xFF5EEAD4),
    ),
  ),
  emerald(
    key: 'emerald',
    label: '에메랄드',
    palette: AppBrandPalette(
      primary: Color(0xFF059669),
      brandDark: Color(0xFF047857),
      primarySoft: Color(0xFF6EE7B7),
    ),
  ),
  slate(
    key: 'slate',
    label: '슬레이트',
    palette: AppBrandPalette(
      primary: Color(0xFF334155),
      brandDark: Color(0xFF1E293B),
      primarySoft: Color(0xFF94A3B8),
    ),
  );

  final String key;
  final String label;
  final AppBrandPalette palette;

  const PrimaryColorPreset({
    required this.key,
    required this.label,
    required this.palette,
  });

  static PrimaryColorPreset fromKey(String? raw) {
    return PrimaryColorPreset.values.firstWhere(
      (preset) => preset.key == raw,
      orElse: () => PrimaryColorPreset.blue,
    );
  }
}

class ThemeModeController extends StateNotifier<ThemeMode> {
  ThemeModeController() : super(ThemeMode.light) {
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_prefsKey);
    state = _decode(raw);
  }

  Future<void> setMode(ThemeMode mode) async {
    state = mode;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefsKey, _encode(mode));
  }

  Future<void> toggleDark(bool enabled) =>
      setMode(enabled ? ThemeMode.dark : ThemeMode.light);

  static ThemeMode _decode(String? raw) {
    switch (raw) {
      case 'light':
        return ThemeMode.light;
      case 'system':
        return ThemeMode.system;
      case 'dark':
        return ThemeMode.dark;
      default:
        return ThemeMode.light;
    }
  }

  static String _encode(ThemeMode mode) {
    switch (mode) {
      case ThemeMode.dark:
        return 'dark';
      case ThemeMode.light:
        return 'light';
      case ThemeMode.system:
        return 'system';
    }
  }
}

final themeModeProvider = StateNotifierProvider<ThemeModeController, ThemeMode>(
  (ref) {
    return ThemeModeController();
  },
);

class PrimaryColorController extends StateNotifier<PrimaryColorPreset> {
  PrimaryColorController() : super(PrimaryColorPreset.blue) {
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    state = PrimaryColorPreset.fromKey(prefs.getString(_primaryPrefsKey));
  }

  Future<void> setPreset(PrimaryColorPreset preset) async {
    state = preset;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_primaryPrefsKey, preset.key);
  }
}

final primaryColorPresetProvider =
    StateNotifierProvider<PrimaryColorController, PrimaryColorPreset>((ref) {
      return PrimaryColorController();
    });
