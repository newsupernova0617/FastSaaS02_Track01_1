import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:table_calendar/table_calendar.dart';
import 'package:intl/intl.dart';
import 'package:flutter_app/shared/models/transaction.dart';
import 'package:flutter_app/shared/providers/transaction_provider.dart';
import 'package:flutter_app/core/theme/app_theme.dart';

/// Calendar page with transaction listing
/// Displays a monthly calendar with income/expense indicators
/// Shows filtered transactions for selected date
class CalendarPage extends ConsumerStatefulWidget {
  const CalendarPage({super.key});

  @override
  ConsumerState<CalendarPage> createState() => _CalendarPageState();
}

class _CalendarPageState extends ConsumerState<CalendarPage> {
  late DateTime _selectedDate;
  late DateTime _focusedDate;

  @override
  void initState() {
    super.initState();
    _selectedDate = DateTime.now();
    _focusedDate = DateTime.now();
  }

  /// Get the formatted date string for API calls (YYYY-MM-DD)
  String _getFormattedDate(DateTime date) {
    return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
  }

  /// Get daily totals for expense and income for a specific date
  Map<String, double> _getDailyTotals(List<Transaction> transactions, DateTime date) {
    final dateStr = _getFormattedDate(date);
    double totalExpense = 0;
    double totalIncome = 0;

    for (final transaction in transactions) {
      if (transaction.date == dateStr) {
        if (transaction.type == 'expense') {
          totalExpense += transaction.amount.toDouble();
        } else if (transaction.type == 'income') {
          totalIncome += transaction.amount.toDouble();
        }
      }
    }

    return {
      'expense': totalExpense,
      'income': totalIncome,
    };
  }

  /// Get transactions for the current month (for calendar indicators)
  List<Transaction> _getMonthTransactions(List<Transaction> transactions) {
    final monthStr = '${_focusedDate.year}-${_focusedDate.month.toString().padLeft(2, '0')}';
    return transactions
        .where((t) => t.date.startsWith(monthStr))
        .toList();
  }

  /// Get transaction indicators (dots) for a specific date
  List<Color> _getIndicatorColors(DateTime date, List<Transaction> monthTransactions) {
    final dateStr = _getFormattedDate(date);
    final colors = <Color>[];

    // Check if date has expenses
    if (monthTransactions.any((t) => t.date == dateStr && t.type == 'expense')) {
      colors.add(AppTheme.expenseColor);
    }

    // Check if date has income
    if (monthTransactions.any((t) => t.date == dateStr && t.type == 'income')) {
      colors.add(AppTheme.incomeColor);
    }

    return colors;
  }

  /// Format currency value
  String _formatCurrency(double value) {
    return '₩${value.toStringAsFixed(0).replaceAllMapped(
      RegExp(r'(\d)(?=(\d{3})+(?!\d))'),
      (Match m) => '${m[1]},',
    )}';
  }

  /// Get category color based on type and category name
  Color _getCategoryColor(String type, String category) {
    if (type == 'expense') {
      return AppTheme.expenseColor;
    } else {
      return AppTheme.incomeColor;
    }
  }

  /// Get category emoji/icon representation
  String _getCategoryEmoji(String category) {
    const categoryEmojis = {
      '식비': '🍽️',
      '교통': '🚗',
      '쇼핑': '🛍️',
      '의료': '⚕️',
      '문화여가': '🎬',
      '월세': '🏠',
      '기타': '📦',
      '월급': '💰',
      '부업': '💼',
      '용돈': '💸',
    };
    return categoryEmojis[category] ?? '📌';
  }

  /// Delete transaction with confirmation
  Future<void> _deleteTransaction(String transactionId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('거래 삭제'),
        content: const Text('이 거래를 삭제하시겠습니까?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('취소'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('삭제', style: TextStyle(color: AppTheme.errorColor)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        await ref.read(deleteTransactionProvider(transactionId).future);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('거래가 삭제되었습니다.')),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('삭제 실패: ${e.toString()}')),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    // Fetch transactions for the focused month
    final transactionsAsyncValue = ref.watch(transactionsProvider(null));

    return Scaffold(
      appBar: AppBar(
        title: const Text('달력'),
      ),
      body: transactionsAsyncValue.when(
        loading: () => const Center(
          child: CircularProgressIndicator(),
        ),
        error: (error, stackTrace) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: AppTheme.errorColor),
              const SizedBox(height: 16),
              Text('오류: ${error.toString()}'),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () => ref.invalidate(transactionsProvider),
                child: const Text('다시 시도'),
              ),
            ],
          ),
        ),
        data: (transactions) {
          final monthTransactions = _getMonthTransactions(transactions);
          final selectedDateTransactions = transactions
              .where((t) => t.date == _getFormattedDate(_selectedDate))
              .toList();
          final dailyTotals = _getDailyTotals(transactions, _selectedDate);

          return SingleChildScrollView(
            child: Column(
              children: [
                // Calendar widget
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Card(
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: TableCalendar<Transaction>(
                        focusedDay: _focusedDate,
                        firstDay: DateTime(2020),
                        lastDay: DateTime(2030),
                        selectedDayPredicate: (day) => isSameDay(_selectedDate, day),
                        onDaySelected: (selectedDay, focusedDay) {
                          setState(() {
                            _selectedDate = selectedDay;
                            _focusedDate = focusedDay;
                          });
                        },
                        onPageChanged: (focusedDay) {
                          setState(() {
                            _focusedDate = focusedDay;
                          });
                        },
                        calendarStyle: CalendarStyle(
                          todayDecoration: BoxDecoration(
                            color: AppTheme.primaryColor.withValues(alpha: 0.3),
                            shape: BoxShape.circle,
                          ),
                          selectedDecoration: const BoxDecoration(
                            color: AppTheme.primaryColor,
                            shape: BoxShape.circle,
                          ),
                          defaultDecoration: const BoxDecoration(
                            shape: BoxShape.circle,
                          ),
                          weekendDecoration: const BoxDecoration(
                            shape: BoxShape.circle,
                          ),
                          markerDecoration: const BoxDecoration(
                            color: AppTheme.primaryColor,
                            shape: BoxShape.circle,
                          ),
                        ),
                        headerStyle: const HeaderStyle(
                          formatButtonVisible: false,
                          titleCentered: true,
                          titleTextStyle: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        daysOfWeekStyle: const DaysOfWeekStyle(
                          weekendStyle: TextStyle(color: AppTheme.expenseColor),
                          weekdayStyle: TextStyle(color: Colors.black87),
                        ),
                        calendarBuilders: CalendarBuilders(
                          defaultBuilder: (context, day, focusedDay) {
                            final indicators = _getIndicatorColors(day, monthTransactions);
                            return Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  '${day.day}',
                                  style: const TextStyle(fontSize: 14),
                                ),
                                if (indicators.isNotEmpty)
                                  Padding(
                                    padding: const EdgeInsets.only(top: 4),
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: indicators
                                          .asMap()
                                          .entries
                                          .map(
                                            (e) => Container(
                                              width: 4,
                                              height: 4,
                                              margin: const EdgeInsets.symmetric(
                                                horizontal: 1,
                                              ),
                                              decoration: BoxDecoration(
                                                color: e.value,
                                                shape: BoxShape.circle,
                                              ),
                                            ),
                                          )
                                          .toList(),
                                    ),
                                  ),
                              ],
                            );
                          },
                          selectedBuilder: (context, day, focusedDay) {
                            final indicators = _getIndicatorColors(day, monthTransactions);
                            return Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  '${day.day}',
                                  style: const TextStyle(
                                    fontSize: 14,
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                if (indicators.isNotEmpty)
                                  Padding(
                                    padding: const EdgeInsets.only(top: 4),
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: indicators
                                          .asMap()
                                          .entries
                                          .map(
                                            (e) => Container(
                                              width: 4,
                                              height: 4,
                                              margin: const EdgeInsets.symmetric(
                                                horizontal: 1,
                                              ),
                                              decoration: BoxDecoration(
                                                color: Colors.white.withValues(alpha: 0.8),
                                                shape: BoxShape.circle,
                                              ),
                                            ),
                                          )
                                          .toList(),
                                    ),
                                  ),
                              ],
                            );
                          },
                          todayBuilder: (context, day, focusedDay) {
                            final indicators = _getIndicatorColors(day, monthTransactions);
                            return Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  '${day.day}',
                                  style: const TextStyle(
                                    fontSize: 14,
                                    color: AppTheme.primaryColor,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                if (indicators.isNotEmpty)
                                  Padding(
                                    padding: const EdgeInsets.only(top: 4),
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: indicators
                                          .asMap()
                                          .entries
                                          .map(
                                            (e) => Container(
                                              width: 4,
                                              height: 4,
                                              margin: const EdgeInsets.symmetric(
                                                horizontal: 1,
                                              ),
                                              decoration: BoxDecoration(
                                                color: e.value,
                                                shape: BoxShape.circle,
                                              ),
                                            ),
                                          )
                                          .toList(),
                                    ),
                                  ),
                              ],
                            );
                          },
                        ),
                      ),
                    ),
                  ),
                ),

                // Daily summary section
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Row(
                    children: [
                      Expanded(
                        child: Card(
                          color: AppTheme.expenseColor.withValues(alpha: 0.1),
                          child: Padding(
                            padding: const EdgeInsets.all(12),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  '지출',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: AppTheme.expenseColor,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  _formatCurrency(dailyTotals['expense']!),
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: AppTheme.expenseColor,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Card(
                          color: AppTheme.incomeColor.withValues(alpha: 0.1),
                          child: Padding(
                            padding: const EdgeInsets.all(12),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  '수입',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: AppTheme.incomeColor,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  _formatCurrency(dailyTotals['income']!),
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: AppTheme.incomeColor,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 16),

                // Transaction list header
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '${DateFormat('yyyy년 MM월 dd일').format(_selectedDate)} 거래',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        '${selectedDateTransactions.length}건',
                        style: const TextStyle(
                          fontSize: 14,
                          color: Colors.black54,
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 12),

                // Transaction list
                if (selectedDateTransactions.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 32),
                    child: Column(
                      children: [
                        Icon(
                          Icons.receipt_long_outlined,
                          size: 48,
                          color: Colors.grey[300],
                        ),
                        const SizedBox(height: 12),
                        Text(
                          '거래 기록이 없습니다',
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                  )
                else
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: selectedDateTransactions.length,
                      separatorBuilder: (context, index) => const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        final transaction = selectedDateTransactions[index];
                        final categoryColor = _getCategoryColor(
                          transaction.type,
                          transaction.category,
                        );
                        final categoryEmoji = _getCategoryEmoji(transaction.category);
                        final isExpense = transaction.type == 'expense';

                        return Dismissible(
                          key: ValueKey('transaction_${transaction.id}'),
                          direction: DismissDirection.endToStart,
                          onDismissed: (direction) {
                            _deleteTransaction(transaction.id.toString());
                          },
                          background: Container(
                            decoration: BoxDecoration(
                              color: AppTheme.errorColor,
                              borderRadius: BorderRadius.circular(
                                AppTheme.borderRadiusCards,
                              ),
                            ),
                            alignment: Alignment.centerRight,
                            padding: const EdgeInsets.only(right: 16),
                            child: const Icon(
                              Icons.delete_outline,
                              color: Colors.white,
                            ),
                          ),
                          child: Card(
                            child: Padding(
                              padding: const EdgeInsets.all(12),
                              child: Row(
                                children: [
                                  // Category indicator
                                  Container(
                                    width: 48,
                                    height: 48,
                                    decoration: BoxDecoration(
                                      color: categoryColor.withValues(alpha: 0.1),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Center(
                                      child: Text(
                                        categoryEmoji,
                                        style: const TextStyle(fontSize: 24),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 12),

                                  // Transaction details
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          mainAxisAlignment:
                                              MainAxisAlignment.spaceBetween,
                                          children: [
                                            Expanded(
                                              child: Text(
                                                transaction.category,
                                                style: const TextStyle(
                                                  fontSize: 14,
                                                  fontWeight: FontWeight.w600,
                                                  color: Colors.black87,
                                                ),
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                            Text(
                                              '${isExpense ? '-' : '+'} ${_formatCurrency(transaction.amount.toDouble())}',
                                              style: TextStyle(
                                                fontSize: 14,
                                                fontWeight: FontWeight.bold,
                                                color: categoryColor,
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 4),
                                        if (transaction.description != null &&
                                            transaction.description!.isNotEmpty)
                                          Text(
                                            transaction.description!,
                                            style: const TextStyle(
                                              fontSize: 12,
                                              color: Colors.black54,
                                            ),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),

                const SizedBox(height: 24),
              ],
            ),
          );
        },
      ),
    );
  }
}
