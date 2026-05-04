import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:in_app_purchase/in_app_purchase.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:flutter_app/core/ads/plan_provider.dart';
import 'package:flutter_app/core/theme/app_theme.dart';
import 'package:flutter_app/shared/models/billing_plan.dart';
import 'package:flutter_app/shared/providers/auth_provider.dart';
import 'package:flutter_app/shared/providers/billing_provider.dart';
import 'package:flutter_app/shared/providers/premium_gate_provider.dart';
import 'package:flutter_app/shared/providers/theme_provider.dart';

// ============================================================
// [공유 위젯] user_profile_sheet.dart
// 프로필 버튼 탭 시 하단에서 올라오는 바텀시트.
// 사용자 아바타/이름/이메일 + 다크 모드 토글 + 로그아웃.
// ============================================================
class UserProfileSheet extends ConsumerWidget {
  const UserProfileSheet({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentUser = ref.watch(currentUserProvider);
    final billingPlan = ref.watch(currentBillingPlanProvider);
    final billingProducts = ref.watch(billingProductsProvider);
    final billingUiState = ref.watch(billingUiStateProvider);
    final premiumGuard = ref.watch(premiumGuardProvider);
    final themeMode = ref.watch(themeModeProvider);
    final theme = Theme.of(context);

    if (currentUser == null) {
      return const SizedBox.shrink();
    }

    final name =
        currentUser.userMetadata?['name'] as String? ??
        currentUser.email ??
        'User';
    final email = currentUser.email ?? '';
    final avatarUrl = currentUser.userMetadata?['avatar_url'] as String?;

    final isDark = switch (themeMode) {
      ThemeMode.dark => true,
      ThemeMode.light => false,
      ThemeMode.system =>
        MediaQuery.platformBrightnessOf(context) == Brightness.dark,
    };

    return Container(
      decoration: BoxDecoration(
        color:
            theme.bottomSheetTheme.backgroundColor ?? theme.colorScheme.surface,
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(AppRadii.lg),
          topRight: Radius.circular(AppRadii.lg),
        ),
      ),
      // 화면 상단 SafeArea + isScrollControlled=true 조합에서 시트가 스크린을
      // 꽉 채워버리지 않도록 상한을 85%로 지정. 내용이 짧으면 Column.min이
      // 알아서 줄어든다.
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.85,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag handle
          Padding(
            padding: const EdgeInsets.only(top: AppSpacing.sm),
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(AppRadii.pill),
              ),
            ),
          ),
          // Header
          Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.lg,
              vertical: AppSpacing.sm,
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const SizedBox(width: 48),
                Text(
                  '프로필',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.of(context).pop(),
                  constraints: const BoxConstraints(
                    minWidth: 48,
                    minHeight: 48,
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          // Scrollable content area
          Flexible(
            child: SingleChildScrollView(
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  vertical: AppSpacing.xl,
                  horizontal: AppSpacing.lg,
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (avatarUrl != null && avatarUrl.isNotEmpty)
                      ClipOval(
                        child: Image.network(
                          avatarUrl,
                          width: 64,
                          height: 64,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) =>
                              _buildAvatarFallback(name, theme),
                        ),
                      )
                    else
                      _buildAvatarFallback(name, theme),
                    const SizedBox(height: AppSpacing.lg),
                    Text(
                      name,
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    if (email.isNotEmpty)
                      Text(
                        email,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: theme.colorScheme.onSurface.withValues(
                            alpha: 0.6,
                          ),
                        ),
                        textAlign: TextAlign.center,
                      ),
                    const SizedBox(height: AppSpacing.xl),

                    // Dark mode toggle
                    _buildDarkModeToggle(
                      context: context,
                      ref: ref,
                      isDark: isDark,
                      themeMode: themeMode,
                      theme: theme,
                    ),
                    const SizedBox(height: AppSpacing.md),
                    _buildPremiumSection(
                      context: context,
                      ref: ref,
                      theme: theme,
                      billingPlan: billingPlan,
                      billingProducts: billingProducts,
                      billingUiState: billingUiState,
                      premiumGuard: premiumGuard,
                    ),
                    const SizedBox(height: AppSpacing.md),

                    // Settings link
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: OutlinedButton.icon(
                        onPressed: () {
                          Navigator.of(context).pop();
                          context.go('/settings');
                        },
                        icon: const Icon(Icons.settings_outlined),
                        label: const Text('설정'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: theme.colorScheme.onSurface,
                          side: BorderSide(
                            color: theme.colorScheme.outline.withValues(
                              alpha: 0.4,
                            ),
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(AppRadii.md),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.md),

                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        onPressed: () => _handleLogout(context, ref),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.expense,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(AppRadii.md),
                          ),
                        ),
                        child: const Text(
                          '로그아웃',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          // Respect bottom safe-area (home indicator etc.)
          SizedBox(
            height: MediaQuery.of(context).padding.bottom + AppSpacing.sm,
          ),
        ],
      ),
    );
  }

  Widget _buildPremiumSection({
    required BuildContext context,
    required WidgetRef ref,
    required ThemeData theme,
    required BillingPlan billingPlan,
    required AsyncValue<List<ProductDetails>> billingProducts,
    required BillingUiState billingUiState,
    required PremiumGuard premiumGuard,
  }) {
    final isPaid = premiumGuard.isPremium;
    final products = billingProducts.valueOrNull ?? const <ProductDetails>[];
    final product = products.isNotEmpty ? products.first : null;
    final expiresLabel = billingPlan.expiresAt != null
        ? DateFormat('yyyy.MM.dd').format(billingPlan.expiresAt!.toLocal())
        : null;

    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(AppRadii.md),
      ),
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                isPaid ? Icons.workspace_premium : Icons.star_outline,
                color: theme.colorScheme.primary,
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Text(
                  isPaid ? '프리미엄 이용 중' : '프리미엄 업그레이드',
                  style: theme.textTheme.bodyLarge?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            isPaid
                ? expiresLabel != null
                      ? '광고 없이 사용 중 · 다음 갱신 $expiresLabel'
                      : '광고 없이 사용 중'
                : '배너 광고와 전면 광고를 제거합니다.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurface.withValues(alpha: 0.7),
            ),
          ),
          if (billingUiState.message != null) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(
              billingUiState.message!,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.primary,
              ),
            ),
          ],
          if (!isPaid) ...[
            const SizedBox(height: AppSpacing.md),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: FilledButton.icon(
                onPressed:
                    product == null ||
                        billingUiState.status ==
                            BillingFlowStatus.purchasePending
                    ? null
                    : () => _startPremiumPurchase(context, ref, product),
                icon: const Icon(Icons.lock_open_outlined),
                label: Text(switch (billingUiState.status) {
                  BillingFlowStatus.purchasePending => '구매 진행 중...',
                  BillingFlowStatus.loadingProducts => '상품 불러오는 중...',
                  BillingFlowStatus.storeUnavailable => '스토어 연결 실패',
                  _ => product != null ? '월 ${product.price}' : '상품 불러오는 중...',
                }),
                style: FilledButton.styleFrom(
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppRadii.md),
                  ),
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            SizedBox(
              width: double.infinity,
              height: 44,
              child: OutlinedButton.icon(
                onPressed:
                    billingUiState.status == BillingFlowStatus.restorePending
                    ? null
                    : () => _restorePurchases(context, ref),
                icon: const Icon(Icons.refresh),
                label: Text(
                  billingUiState.status == BillingFlowStatus.restorePending
                      ? '복원 요청 중...'
                      : '구독 복원',
                ),
                style: OutlinedButton.styleFrom(
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppRadii.md),
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildDarkModeToggle({
    required BuildContext context,
    required WidgetRef ref,
    required bool isDark,
    required ThemeMode themeMode,
    required ThemeData theme,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(AppRadii.md),
      ),
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.lg,
        vertical: AppSpacing.sm,
      ),
      child: Row(
        children: [
          Icon(
            isDark ? Icons.dark_mode : Icons.light_mode,
            color: theme.colorScheme.onSurface,
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '다크 모드',
                  style: theme.textTheme.bodyLarge?.copyWith(
                    fontWeight: FontWeight.w500,
                  ),
                ),
                Text(_modeLabel(themeMode), style: theme.textTheme.bodySmall),
              ],
            ),
          ),
          Switch(
            value: isDark,
            onChanged: (enabled) =>
                ref.read(themeModeProvider.notifier).toggleDark(enabled),
          ),
        ],
      ),
    );
  }

  String _modeLabel(ThemeMode mode) {
    switch (mode) {
      case ThemeMode.dark:
        return '다크 고정';
      case ThemeMode.light:
        return '라이트 고정';
      case ThemeMode.system:
        return '시스템 설정 따름';
    }
  }

  Widget _buildAvatarFallback(String name, ThemeData theme) {
    final initial = name.isNotEmpty ? name[0].toUpperCase() : '?';
    return Container(
      width: 64,
      height: 64,
      decoration: BoxDecoration(
        color: theme.colorScheme.primary.withValues(alpha: 0.12),
        shape: BoxShape.circle,
      ),
      child: Center(
        child: Text(
          initial,
          style: TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.w600,
            color: theme.colorScheme.primary,
          ),
        ),
      ),
    );
  }

  Future<void> _handleLogout(BuildContext context, WidgetRef ref) async {
    try {
      await ref.read(signOutProvider.future);
      if (context.mounted) {
        Navigator.of(context).pop();
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('로그아웃 실패: $e')));
      }
    }
  }

  Future<void> _startPremiumPurchase(
    BuildContext context,
    WidgetRef ref,
    ProductDetails product,
  ) async {
    try {
      await ref.read(startPremiumPurchaseProvider(product).future);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Google Play 결제 화면을 열었습니다.')),
        );
      }
    } catch (e) {
      if (context.mounted) {
        final message = ref.read(billingErrorMessageProvider(e));
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(message)));
      }
    }
  }

  Future<void> _restorePurchases(BuildContext context, WidgetRef ref) async {
    try {
      await ref.read(restorePurchasesProvider.future);
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('구독 복원을 요청했습니다.')));
      }
    } catch (e) {
      if (context.mounted) {
        final message = ref.read(billingErrorMessageProvider(e));
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(message)));
      }
    }
  }
}
