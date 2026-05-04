import 'package:flutter/foundation.dart';
import 'package:in_app_purchase/in_app_purchase.dart';
import 'package:flutter_app/core/constants/app_constants.dart';

class BillingService {
  BillingService({InAppPurchase? inAppPurchase})
    : _inAppPurchase = inAppPurchase ?? InAppPurchase.instance;

  final InAppPurchase _inAppPurchase;

  Stream<List<PurchaseDetails>> get purchaseStream =>
      _inAppPurchase.purchaseStream;

  Future<List<ProductDetails>> loadProducts() async {
    if (kIsWeb) return const [];

    final available = await _inAppPurchase.isAvailable();
    if (!available) {
      throw Exception('Google Play 결제를 사용할 수 없습니다.');
    }

    final response = await _inAppPurchase.queryProductDetails({
      AppConstants.premiumMonthlyProductId,
    });

    if (response.error != null) {
      throw Exception(response.error!.message);
    }

    return response.productDetails;
  }

  Future<void> buyPremium(ProductDetails product) async {
    final purchaseParam = PurchaseParam(productDetails: product);
    await _inAppPurchase.buyNonConsumable(purchaseParam: purchaseParam);
  }

  Future<void> restorePurchases() {
    return _inAppPurchase.restorePurchases();
  }

  Future<void> completePurchase(PurchaseDetails purchase) {
    return _inAppPurchase.completePurchase(purchase);
  }

  String extractPurchaseToken(PurchaseDetails purchase) {
    return purchase.verificationData.serverVerificationData;
  }
}
