# Legacy UI Rollback

This directory preserves the pre-landing Flutter UI implementation.

Use the restore script from `flutter_app`:

```powershell
.\tool\restore_legacy_ui.ps1 -WhatIf
.\tool\restore_legacy_ui.ps1
dart format lib
flutter analyze
flutter test
```

The script backs up the current active files under `.rollback_backups/<timestamp>`
before copying matching legacy files back into `lib/`.

Preserved areas:

- `core/theme/app_theme_legacy.dart`
- `shared/widgets/*_legacy.dart`
- `features/calendar`, `features/record`, `features/reports`, `features/settings`, `features/stats`

Note: login, onboarding, and home did not have complete pre-landing snapshots
available in this repository, so the script restores the preserved areas only.
