import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:in_app_purchase/in_app_purchase.dart';
import 'package:flutter_app/core/ads/plan_provider.dart';
import 'package:flutter_app/core/billing/billing_service.dart';
import 'package:flutter_app/core/logger/logger.dart';
import 'package:flutter_app/shared/providers/api_provider.dart';
import 'package:flutter_app/shared/providers/auth_provider.dart';
import 'package:flutter_app/shared/providers/premium_gate_provider.dart';

enum BillingFlowStatus {
  idle,
  loadingProducts,
  ready,
  purchasePending,
  purchaseSuccess,
  restorePending,
  restoreSuccess,
  storeUnavailable,
  error,
}

class BillingUiState {
  final BillingFlowStatus status;
  final String? message;

  const BillingUiState({required this.status, this.message});

  const BillingUiState.idle() : this(status: BillingFlowStatus.idle);

  BillingUiState copyWith({BillingFlowStatus? status, String? message}) {
    return BillingUiState(status: status ?? this.status, message: message);
  }
}

final billingServiceProvider = Provider<BillingService>((ref) {
  return BillingService();
});

final billingProductsProvider = FutureProvider<List<ProductDetails>>((
  ref,
) async {
  final ui = ref.read(billingUiStateProvider.notifier);
  ui.state = const BillingUiState(status: BillingFlowStatus.loadingProducts);
  final isPremiumOverride = ref.watch(isPremiumOverrideProvider);
  final isAuthenticated = ref.watch(isAuthenticatedProvider);
  if (kIsWeb || isPremiumOverride || !isAuthenticated) {
    ui.state = const BillingUiState(status: BillingFlowStatus.idle);
    return const [];
  }

  final service = ref.watch(billingServiceProvider);
  try {
    final products = await service.loadProducts();
    ui.state = products.isEmpty
        ? const BillingUiState(
            status: BillingFlowStatus.storeUnavailable,
            message: '스토어 상품을 불러오지 못했습니다.',
          )
        : const BillingUiState(status: BillingFlowStatus.ready);
    return products;
  } catch (error) {
    ui.state = BillingUiState(
      status: BillingFlowStatus.error,
      message: error.toString(),
    );
    rethrow;
  }
});

final billingUiStateProvider = StateProvider<BillingUiState>((ref) {
  return const BillingUiState.idle();
});

final billingPurchaseListenerProvider = Provider<void>((ref) {
  if (kIsWeb) return;

  final service = ref.watch(billingServiceProvider);
  final apiClient = ref.watch(apiClientProvider);
  final logger = Logger();
  final uiState = ref.read(billingUiStateProvider.notifier);

  final sub = service.purchaseStream.listen(
    (purchases) async {
      for (final purchase in purchases) {
        if (purchase.status == PurchaseStatus.pending) {
          logger.info('[Billing] Purchase pending');
          uiState.state = const BillingUiState(
            status: BillingFlowStatus.purchasePending,
            message: '구매를 처리하고 있습니다.',
          );
          continue;
        }

        if (purchase.status == PurchaseStatus.error) {
          logger.warn(
            '[Billing] Purchase error: ${purchase.error?.message ?? 'unknown error'}',
          );
          uiState.state = BillingUiState(
            status: BillingFlowStatus.error,
            message: purchase.error?.message ?? '결제에 실패했습니다.',
          );
          continue;
        }

        if (purchase.status != PurchaseStatus.purchased &&
            purchase.status != PurchaseStatus.restored) {
          continue;
        }

        try {
          final productId = purchase.productID;
          final purchaseToken = service.extractPurchaseToken(purchase);
          if (purchaseToken.isEmpty) {
            throw Exception('Purchase token is empty');
          }

          await apiClient.verifyGooglePlayPurchase(
            productId: productId,
            purchaseToken: purchaseToken,
          );
          ref.invalidate(billingPlanProvider);
          ref.invalidate(billingProductsProvider);
          uiState.state = BillingUiState(
            status: purchase.status == PurchaseStatus.restored
                ? BillingFlowStatus.restoreSuccess
                : BillingFlowStatus.purchaseSuccess,
            message: purchase.status == PurchaseStatus.restored
                ? '구독 정보를 복원했습니다.'
                : '프리미엄 구독이 활성화되었습니다.',
          );

          if (purchase.pendingCompletePurchase) {
            await service.completePurchase(purchase);
          }
        } catch (error, stackTrace) {
          logger.error(
            '[Billing] Failed to verify purchase: $error',
            error: error,
            stackTrace: stackTrace,
          );
          uiState.state = BillingUiState(
            status: BillingFlowStatus.error,
            message: ref.read(billingErrorMessageProvider(error)),
          );
        }
      }
    },
    onError: (error, stackTrace) {
      logger.error(
        '[Billing] Purchase stream error: $error',
        error: error,
        stackTrace: stackTrace,
      );
      uiState.state = BillingUiState(
        status: BillingFlowStatus.error,
        message: error.toString(),
      );
    },
  );

  ref.onDispose(sub.cancel);
});

final startPremiumPurchaseProvider =
    FutureProvider.family<void, ProductDetails>((ref, product) async {
      final uiState = ref.read(billingUiStateProvider.notifier);
      final isPremium = ref.read(isPremiumUserProvider);
      if (isPremium) {
        uiState.state = const BillingUiState(
          status: BillingFlowStatus.ready,
          message: '이미 프리미엄 이용 중입니다.',
        );
        return;
      }
      final service = ref.watch(billingServiceProvider);
      uiState.state = const BillingUiState(
        status: BillingFlowStatus.purchasePending,
        message: 'Google Play 결제를 시작합니다.',
      );
      await service.buyPremium(product);
    });

final restorePurchasesProvider = FutureProvider<void>((ref) async {
  final uiState = ref.read(billingUiStateProvider.notifier);
  final service = ref.watch(billingServiceProvider);
  uiState.state = const BillingUiState(
    status: BillingFlowStatus.restorePending,
    message: '구독 복원 요청 중입니다.',
  );
  await service.restorePurchases();
});

final billingErrorMessageProvider = Provider.family<String, Object?>((
  ref,
  error,
) {
  if (error is DioException) {
    return error.response?.data is Map<String, dynamic>
        ? ((error.response!.data as Map<String, dynamic>)['error'] as String? ??
              '결제 요청에 실패했습니다.')
        : '결제 요청에 실패했습니다.';
  }
  return error?.toString() ?? '결제 요청에 실패했습니다.';
});
