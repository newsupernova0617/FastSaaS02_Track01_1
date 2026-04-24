param(
  [switch] $WhatIf
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$appRoot = Split-Path -Parent $scriptDir
$legacyRoot = Join-Path $appRoot 'lib\legacy_ui'
$backupRoot = Join-Path $appRoot ('.rollback_backups\' + (Get-Date -Format 'yyyyMMdd_HHmmss'))

$mappings = @(
  @{ Legacy = 'core\theme\app_theme_legacy.dart'; Active = 'core\theme\app_theme.dart' },
  @{ Legacy = 'shared\widgets\ai_fab_legacy.dart'; Active = 'shared\widgets\ai_fab.dart' },
  @{ Legacy = 'shared\widgets\ai_insight_card_legacy.dart'; Active = 'shared\widgets\ai_insight_card.dart' },
  @{ Legacy = 'shared\widgets\chat_input_legacy.dart'; Active = 'features\ai_chat\widgets\chat_input.dart' },
  @{ Legacy = 'shared\widgets\glass_card_legacy.dart'; Active = 'shared\widgets\glass_card.dart' },
  @{ Legacy = 'shared\widgets\glow_nav_bar_legacy.dart'; Active = 'shared\widgets\glow_nav_bar.dart' },
  @{ Legacy = 'shared\widgets\gradient_hero_card_legacy.dart'; Active = 'shared\widgets\gradient_hero_card.dart' },
  @{ Legacy = 'shared\widgets\prompt_chip_legacy.dart'; Active = 'shared\widgets\prompt_chip.dart' },
  @{ Legacy = 'shared\widgets\transaction_tile_legacy.dart'; Active = 'shared\widgets\transaction_tile.dart' },
  @{ Legacy = 'features\calendar\calendar_page_legacy.dart'; Active = 'features\calendar\calendar_page.dart' },
  @{ Legacy = 'features\record\record_page_legacy.dart'; Active = 'features\record\record_page.dart' },
  @{ Legacy = 'features\reports\report_detail_page_legacy.dart'; Active = 'features\reports\report_detail_page.dart' },
  @{ Legacy = 'features\reports\report_list_item_legacy.dart'; Active = 'features\reports\report_list_item.dart' },
  @{ Legacy = 'features\settings\settings_page_legacy.dart'; Active = 'features\settings\settings_page.dart' },
  @{ Legacy = 'features\stats\stats_page_legacy.dart'; Active = 'features\stats\stats_page.dart' },
  @{ Legacy = 'features\ai_chat\widgets\report_card_legacy.dart'; Active = 'features\ai_chat\widgets\report_card.dart' },
  @{ Legacy = 'features\ai_chat\widgets\report_chart_legacy.dart'; Active = 'features\ai_chat\widgets\report_chart.dart' }
)

Write-Host "Legacy UI restore"
Write-Host "App root: $appRoot"
Write-Host "Backup root: $backupRoot"

foreach ($map in $mappings) {
  $legacyPath = Join-Path $legacyRoot $map.Legacy
  $activePath = Join-Path (Join-Path $appRoot 'lib') $map.Active
  $backupPath = Join-Path $backupRoot $map.Active

  if (-not (Test-Path -LiteralPath $legacyPath)) {
    throw "Missing legacy file: $legacyPath"
  }
  if (-not (Test-Path -LiteralPath $activePath)) {
    throw "Missing active file: $activePath"
  }

  Write-Host "$($map.Legacy) -> $($map.Active)"
  if (-not $WhatIf) {
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $backupPath) | Out-Null
    Copy-Item -LiteralPath $activePath -Destination $backupPath -Force
    Copy-Item -LiteralPath $legacyPath -Destination $activePath -Force
  }
}

if ($WhatIf) {
  Write-Host "Dry run only. No files changed."
} else {
  Write-Host "Restore complete. Previous active files were backed up under $backupRoot."
  Write-Host "Run from flutter_app: dart format lib && flutter analyze && flutter test"
}
