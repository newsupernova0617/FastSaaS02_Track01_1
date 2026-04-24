import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _aiFeatureUiPrefsKey = 'app.aiFeatureUi.enabled';

class AiFeatureUiController extends StateNotifier<bool> {
  AiFeatureUiController() : super(false) {
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    state = prefs.getBool(_aiFeatureUiPrefsKey) ?? false;
  }

  Future<void> setEnabled(bool enabled) async {
    state = enabled;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_aiFeatureUiPrefsKey, enabled);
  }
}

final aiFeatureUiProvider = StateNotifierProvider<AiFeatureUiController, bool>((
  ref,
) {
  return AiFeatureUiController();
});
