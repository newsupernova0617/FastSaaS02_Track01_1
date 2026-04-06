import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_app/shared/models/transaction.dart';
import 'package:flutter_app/shared/models/summary_row.dart';
import 'api_provider.dart';

/// Family provider for fetching transactions by date
/// Parameters:
///   - date: DateTime for which to fetch transactions (optional, null fetches all)
/// Returns: List<Transaction>
/// Handles:
///   - Loading state via AsyncValue
///   - Error handling with proper error propagation
///   - Automatic caching and invalidation
final transactionsProvider = FutureProvider.family<List<Transaction>, DateTime?>((ref, date) async {
  try {
    // Check if API client is ready (user is authenticated)
    final isApiReady = ref.watch(isApiClientReadyProvider);
    if (!isApiReady) {
      throw Exception('API client not ready - user not authenticated');
    }

    // Get the API client
    final apiClient = ref.watch(apiClientProvider);

    // Fetch transactions for the given date (or all if date is null)
    final transactions = await apiClient.getTransactions(date: date);

    return transactions;
  } catch (e) {
    print('Error fetching transactions: $e');
    rethrow;
  }
});

/// Provider for fetching all transactions (no date filter)
/// Returns: List<Transaction>
final allTransactionsProvider = FutureProvider<List<Transaction>>((ref) async {
  try {
    // Check if API client is ready (user is authenticated)
    final isApiReady = ref.watch(isApiClientReadyProvider);
    if (!isApiReady) {
      throw Exception('API client not ready - user not authenticated');
    }

    // Get the API client
    final apiClient = ref.watch(apiClientProvider);

    // Fetch all transactions
    final transactions = await apiClient.getTransactions();

    return transactions;
  } catch (e) {
    print('Error fetching all transactions: $e');
    rethrow;
  }
});

/// Family provider for fetching monthly summary
/// Parameters:
///   - month: String in format 'YYYY-MM' (e.g., '2024-03')
/// Returns: List<SummaryRow>
/// Handles:
///   - Loading state via AsyncValue
///   - Error handling with proper error propagation
///   - Automatic caching and invalidation
final summaryProvider = FutureProvider.family<List<SummaryRow>, String>((ref, month) async {
  try {
    // Check if API client is ready (user is authenticated)
    final isApiReady = ref.watch(isApiClientReadyProvider);
    if (!isApiReady) {
      throw Exception('API client not ready - user not authenticated');
    }

    // Get the API client
    final apiClient = ref.watch(apiClientProvider);

    // Fetch summary for the given month
    final summary = await apiClient.getSummary(month);

    return summary;
  } catch (e) {
    print('Error fetching summary: $e');
    rethrow;
  }
});

/// Family provider for adding a new transaction
/// Parameters:
///   - data: Map<String, dynamic> with transaction data
/// Returns: int (the ID of the created transaction)
final addTransactionProvider = FutureProvider.family<int, Map<String, dynamic>>((ref, data) async {
  try {
    // Check if API client is ready (user is authenticated)
    final isApiReady = ref.watch(isApiClientReadyProvider);
    if (!isApiReady) {
      throw Exception('API client not ready - user not authenticated');
    }

    // Get the API client
    final apiClient = ref.watch(apiClientProvider);

    // Add transaction
    final id = await apiClient.addTransaction(data);

    // Invalidate related providers to refresh data
    ref.invalidate(allTransactionsProvider);

    // Invalidate summary providers (all months)
    // This is a simple approach - more sophisticated caching could be implemented
    ref.invalidate(summaryProvider);

    return id;
  } catch (e) {
    print('Error adding transaction: $e');
    rethrow;
  }
});

/// Family provider for deleting a transaction
/// Parameters:
///   - id: String ID of the transaction to delete
/// Returns: bool (true if successful)
final deleteTransactionProvider = FutureProvider.family<bool, String>((ref, id) async {
  try {
    // Check if API client is ready (user is authenticated)
    final isApiReady = ref.watch(isApiClientReadyProvider);
    if (!isApiReady) {
      throw Exception('API client not ready - user not authenticated');
    }

    // Get the API client
    final apiClient = ref.watch(apiClientProvider);

    // Delete transaction
    final success = await apiClient.deleteTransaction(id);

    // Invalidate related providers to refresh data
    ref.invalidate(allTransactionsProvider);

    // Invalidate summary providers (all months)
    ref.invalidate(summaryProvider);

    return success;
  } catch (e) {
    print('Error deleting transaction: $e');
    rethrow;
  }
});

/// Utility function to format DateTime to 'YYYY-MM' format
String formatMonthFromDate(DateTime date) {
  return '${date.year}-${date.month.toString().padLeft(2, '0')}';
}
