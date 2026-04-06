import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter_app/core/theme/app_theme.dart';
import 'package:flutter_app/shared/providers/transaction_provider.dart';
import 'package:flutter_app/shared/models/summary_row.dart';

class StatsPage extends ConsumerStatefulWidget {
  const StatsPage({Key? key}) : super(key: key);

  @override
  ConsumerState<StatsPage> createState() => _StatsPageState();
}

class _StatsPageState extends ConsumerState<StatsPage> {
  late DateTime _selectedDate;

  @override
  void initState() {
    super.initState();
    _selectedDate = DateTime.now();
  }

  String _formatMonthYear(DateTime date) {
    return '${date.year}-${date.month.toString().padLeft(2, '0')}';
  }

  DateTime _previousMonth(DateTime date) {
    return DateTime(date.year, date.month - 1);
  }

  DateTime _nextMonth(DateTime date) {
    return DateTime(date.year, date.month + 1);
  }

  @override
  Widget build(BuildContext context) {
    final monthString = _formatMonthYear(_selectedDate);
    final summaryAsync = ref.watch(summaryProvider(monthString));

    return Scaffold(
      appBar: AppBar(
        title: const Text('통계'),
        elevation: 0,
      ),
      body: summaryAsync.when(
        data: (summary) => _buildContent(context, summary),
        loading: () => const Center(
          child: CircularProgressIndicator(),
        ),
        error: (error, stackTrace) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 16),
              Text('오류가 발생했습니다'),
              const SizedBox(height: 8),
              Text(
                error.toString(),
                style: Theme.of(context).textTheme.bodySmall,
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildContent(BuildContext context, List<SummaryRow> summary) {
    // Calculate totals
    final expenseSummary = summary.where((s) => s.type == 'expense').toList();
    final incomeSummary = summary.where((s) => s.type == 'income').toList();

    final totalExpense = expenseSummary.fold<num>(0, (sum, s) => sum + s.total);
    final totalIncome = incomeSummary.fold<num>(0, (sum, s) => sum + s.total);
    final netAmount = totalIncome - totalExpense;

    // Get category colors
    final categoryColors = _getCategoryColors();

    return SingleChildScrollView(
      child: Column(
        children: [
          // Month Navigation
          _buildMonthNavigation(context),
          const SizedBox(height: 24),

          // Summary Cards
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              children: [
                _buildSummaryCard(
                  context,
                  '총 지출',
                  '${totalExpense.toStringAsFixed(0)}원',
                  AppTheme.expenseColor,
                ),
                const SizedBox(height: 12),
                _buildSummaryCard(
                  context,
                  '총 수입',
                  '${totalIncome.toStringAsFixed(0)}원',
                  AppTheme.incomeColor,
                ),
                const SizedBox(height: 12),
                _buildSummaryCard(
                  context,
                  '순 자산 변화',
                  '${netAmount.toStringAsFixed(0)}원',
                  netAmount >= 0 ? AppTheme.incomeColor : AppTheme.expenseColor,
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),

          // Chart Section
          if (expenseSummary.isNotEmpty) ...[
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(
                '지출 내역',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
            ),
            const SizedBox(height: 16),
            _buildExpenseChart(expenseSummary, categoryColors),
            const SizedBox(height: 32),
          ],

          // Expense Category Breakdown
          if (expenseSummary.isNotEmpty) ...[
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(
                '지출 카테고리 상세',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
            ),
            const SizedBox(height: 12),
            _buildCategoryBreakdown(expenseSummary, totalExpense, categoryColors),
            const SizedBox(height: 24),
          ],

          // Income Category Breakdown
          if (incomeSummary.isNotEmpty) ...[
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(
                '수입 카테고리',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
            ),
            const SizedBox(height: 12),
            _buildCategoryBreakdown(incomeSummary, totalIncome, categoryColors),
            const SizedBox(height: 24),
          ],

          // Empty state
          if (expenseSummary.isEmpty && incomeSummary.isEmpty)
            Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                children: [
                  Icon(Icons.trending_up, size: 48, color: Colors.grey[400]),
                  const SizedBox(height: 16),
                  Text(
                    '이 달에 거래 내역이 없습니다',
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: Colors.grey[600],
                        ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildMonthNavigation(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          IconButton(
            icon: const Icon(Icons.chevron_left),
            onPressed: () {
              setState(() {
                _selectedDate = _previousMonth(_selectedDate);
              });
            },
          ),
          Text(
            '${_selectedDate.year}년 ${_selectedDate.month}월',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          IconButton(
            icon: const Icon(Icons.chevron_right),
            onPressed: () {
              setState(() {
                _selectedDate = _nextMonth(_selectedDate);
              });
            },
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryCard(
    BuildContext context,
    String label,
    String amount,
    Color color,
  ) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Colors.grey[600],
                      ),
                ),
                const SizedBox(height: 8),
                Text(
                  amount,
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        color: color,
                        fontWeight: FontWeight.bold,
                      ),
                ),
              ],
            ),
            Container(
              width: 4,
              height: 60,
              decoration: BoxDecoration(
                color: color,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildExpenseChart(
    List<SummaryRow> expenseSummary,
    Map<String, Color> categoryColors,
  ) {
    final pieChartData = _buildPieChartData(expenseSummary, categoryColors);

    return SizedBox(
      height: 300,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: PieChart(
            PieChartData(
              sections: pieChartData,
              centerSpaceRadius: 60,
              sectionsSpace: 2,
              startDegreeOffset: -90,
            ),
          ),
        ),
      ),
    );
  }

  List<PieChartSectionData> _buildPieChartData(
    List<SummaryRow> data,
    Map<String, Color> categoryColors,
  ) {
    final totalAmount =
        data.fold<num>(0, (sum, item) => sum + item.total);

    return data.map((item) {
      final percentage = (item.total / totalAmount * 100).toStringAsFixed(1);
      final color = categoryColors[item.category] ?? Colors.grey;

      return PieChartSectionData(
        value: item.total.toDouble(),
        title: '$percentage%',
        radius: 80,
        titleStyle: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.bold,
          color: Colors.white,
        ),
        color: color,
      );
    }).toList();
  }

  Widget _buildCategoryBreakdown(
    List<SummaryRow> summary,
    num totalAmount,
    Map<String, Color> categoryColors,
  ) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        children: List.generate(summary.length, (index) {
          final item = summary[index];
          final percentage = (item.total / totalAmount * 100).toStringAsFixed(1);
          final color = categoryColors[item.category] ?? Colors.grey;

          return Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Row(
                        children: [
                          Container(
                            width: 12,
                            height: 12,
                            decoration: BoxDecoration(
                              color: color,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            item.category,
                            style: Theme.of(context).textTheme.bodyMedium,
                          ),
                        ],
                      ),
                    ),
                    Text(
                      '${item.total.toStringAsFixed(0)}원',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: double.parse(percentage) / 100,
                          minHeight: 6,
                          backgroundColor: Colors.grey[200],
                          valueColor: AlwaysStoppedAnimation<Color>(color),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '$percentage%',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Colors.grey[600],
                          ),
                    ),
                  ],
                ),
              ],
            ),
          );
        }),
      ),
    );
  }

  Map<String, Color> _getCategoryColors() {
    return {
      // Expense categories
      '식비': const Color(0xFFFF6B6B),
      '교통': const Color(0xFF4ECDC4),
      '쇼핑': const Color(0xFFFFE66D),
      '의료': const Color(0xFF95E1D3),
      '문화여가': const Color(0xFFA8D8EA),
      '월세': const Color(0xFFFF8B94),
      '기타': const Color(0xFFCCCCCC),
      // Income categories
      '월급': const Color(0xFF3B82F6),
      '부업': const Color(0xFF10B981),
      '용돈': const Color(0xFF8B5CF6),
    };
  }
}
