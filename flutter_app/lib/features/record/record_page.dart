import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:flutter_app/core/theme/app_theme.dart';
import 'package:flutter_app/core/constants/categories.dart';
import 'package:flutter_app/shared/providers/transaction_provider.dart';

/// Record page for adding income and expense transactions
/// Features:
/// - Toggle between expense and income
/// - Date picker for transaction date
/// - Amount input with currency formatting
/// - Category selection grid (3 columns)
/// - Memo/description input
/// - Submit button with dynamic color
/// - Loading state during submission
/// - Success/error feedback
class RecordPage extends ConsumerStatefulWidget {
  const RecordPage({super.key});

  @override
  ConsumerState<RecordPage> createState() => _RecordPageState();
}

class _RecordPageState extends ConsumerState<RecordPage> {
  // Form state
  String _transactionType = 'expense'; // 'expense' or 'income'
  DateTime _selectedDate = DateTime.now();
  String _amountText = '';
  String? _selectedCategory;
  String _memo = '';
  bool _isLoading = false;

  // Controllers
  late final TextEditingController _amountController;
  late final TextEditingController _memoController;

  @override
  void initState() {
    super.initState();
    _amountController = TextEditingController();
    _memoController = TextEditingController();
  }

  @override
  void dispose() {
    _amountController.dispose();
    _memoController.dispose();
    super.dispose();
  }

  /// Get categories based on transaction type
  List<String> _getCategories() {
    return _transactionType == 'expense'
        ? Categories.getAllExpenseCategories()
        : Categories.getAllIncomeCategories();
  }

  /// Format amount as currency during input
  void _formatAmountInput(String value) {
    // Remove non-numeric characters except decimal point
    final numericValue = value.replaceAll(RegExp(r'[^0-9.]'), '');

    // Limit decimal places to 2
    if (numericValue.isNotEmpty) {
      try {
        final parsed = double.parse(numericValue);
        if (parsed > 999999999) {
          // Prevent extremely large numbers
          return;
        }
      } catch (e) {
        return;
      }

      _amountText = numericValue;

      // Format for display with commas
      final formatted = _formatNumberWithCommas(numericValue);
      _amountController.value = TextEditingValue(
        text: formatted,
        selection: TextSelection.collapsed(offset: formatted.length),
      );
    } else {
      _amountText = '';
      _amountController.clear();
    }
  }

  /// Format number with commas
  String _formatNumberWithCommas(String value) {
    try {
      if (value.isEmpty) return '';

      // Handle decimal numbers
      if (value.contains('.')) {
        final parts = value.split('.');
        final integerPart = int.parse(parts[0]);
        final formatter = NumberFormat('#,##0');
        return '${formatter.format(integerPart)}.${parts[1]}';
      } else {
        final integerValue = int.parse(value);
        final formatter = NumberFormat('#,##0');
        return formatter.format(integerValue);
      }
    } catch (e) {
      return value;
    }
  }

  /// Pick date using date picker
  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(2000),
      lastDate: DateTime.now(),
    );

    if (picked != null && mounted) {
      setState(() {
        _selectedDate = picked;
      });
    }
  }

  /// Validate form inputs
  String? _validateForm() {
    if (_amountText.isEmpty) {
      return '금액을 입력해주세요'; // Please enter amount
    }

    try {
      final amount = double.parse(_amountText);
      if (amount <= 0) {
        return '금액은 0보다 커야 합니다'; // Amount must be greater than 0
      }
    } catch (e) {
      return '유효한 금액을 입력해주세요'; // Please enter valid amount
    }

    if (_selectedCategory == null || _selectedCategory!.isEmpty) {
      return '카테고리를 선택해주세요'; // Please select category
    }

    return null;
  }

  /// Submit form
  Future<void> _submitForm() async {
    final error = _validateForm();
    if (error != null) {
      _showErrorSnackBar(error);
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final amount = double.parse(_amountText);
      final dateStr =
          '${_selectedDate.year}-${_selectedDate.month.toString().padLeft(2, '0')}-${_selectedDate.day.toString().padLeft(2, '0')}';

      final transactionData = {
        'type': _transactionType,
        'amount': amount,
        'category': _selectedCategory,
        'date': dateStr,
        'memo': _memo.isNotEmpty ? _memo : null,
      };

      // Call the addTransactionProvider
      await ref.read(addTransactionProvider(transactionData).future);

      if (mounted) {
        // Clear form on success
        setState(() {
          _transactionType = 'expense';
          _selectedDate = DateTime.now();
          _amountText = '';
          _selectedCategory = null;
          _memo = '';
          _amountController.clear();
          _memoController.clear();
          _isLoading = false;
        });

        _showSuccessSnackBar('거래가 저장되었습니다'); // Transaction saved
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        _showErrorSnackBar('거래 저장 실패: ${e.toString()}'); // Failed to save transaction
      }
    }
  }

  /// Show error snackbar
  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppTheme.errorColor,
        duration: const Duration(seconds: 4),
      ),
    );
  }

  /// Show success snackbar
  void _showSuccessSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.green,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  /// Get submit button color based on transaction type
  Color _getSubmitButtonColor() {
    return _transactionType == 'expense'
        ? AppTheme.expenseColor // Red
        : AppTheme.incomeColor; // Blue
  }

  @override
  Widget build(BuildContext context) {
    final categories = _getCategories();

    return Scaffold(
      appBar: AppBar(
        title: const Text('거래 기록'), // Record Transaction
        elevation: 0,
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Type toggle (Expense/Income)
              Text(
                '유형', // Type
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
              ),
              const SizedBox(height: 8),
              SegmentedButton<String>(
                segments: const <ButtonSegment<String>>[
                  ButtonSegment<String>(
                    value: 'expense',
                    label: Text('지출'), // Expense
                  ),
                  ButtonSegment<String>(
                    value: 'income',
                    label: Text('수입'), // Income
                  ),
                ],
                selected: <String>{_transactionType},
                onSelectionChanged: (Set<String> newSelection) {
                  setState(() {
                    _transactionType = newSelection.first;
                    _selectedCategory = null; // Reset category on type change
                  });
                },
              ),
              const SizedBox(height: 24),

              // Date picker
              Text(
                '날짜', // Date
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
              ),
              const SizedBox(height: 8),
              GestureDetector(
                onTap: _pickDate,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: AppTheme.backgroundColor,
                    border: Border.all(
                      color: const Color(0xFFE5E7EB),
                    ),
                    borderRadius: BorderRadius.circular(
                      AppTheme.borderRadiusMedium,
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        DateFormat('yyyy-MM-dd').format(_selectedDate),
                        style: Theme.of(context).textTheme.bodyLarge,
                      ),
                      Icon(
                        Icons.calendar_today,
                        color: AppTheme.primaryColor,
                        size: 20,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Amount input
              Text(
                '금액', // Amount
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _amountController,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                onChanged: _formatAmountInput,
                decoration: InputDecoration(
                  hintText: '금액을 입력하세요', // Enter amount
                  suffixText: '원', // Won (currency)
                  suffixStyle: Theme.of(context).textTheme.bodyLarge,
                ),
              ),
              const SizedBox(height: 24),

              // Category selection
              Text(
                '카테고리', // Category
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
              ),
              const SizedBox(height: 8),
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 3,
                  childAspectRatio: 1.2,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                ),
                itemCount: categories.length,
                itemBuilder: (context, index) {
                  final category = categories[index];
                  final isSelected = _selectedCategory == category;

                  return GestureDetector(
                    onTap: () {
                      setState(() {
                        _selectedCategory = category;
                      });
                    },
                    child: Container(
                      decoration: BoxDecoration(
                        color: isSelected
                            ? _getSubmitButtonColor().withValues(alpha: 0.1)
                            : AppTheme.backgroundColor,
                        border: Border.all(
                          color: isSelected
                              ? _getSubmitButtonColor()
                              : const Color(0xFFE5E7EB),
                          width: isSelected ? 2 : 1,
                        ),
                        borderRadius: BorderRadius.circular(
                          AppTheme.borderRadiusSmall,
                        ),
                      ),
                      child: Center(
                        child: Text(
                          category,
                          textAlign: TextAlign.center,
                          style:
                              Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    color: isSelected
                                        ? _getSubmitButtonColor()
                                        : Colors.black87,
                                    fontWeight: isSelected
                                        ? FontWeight.w600
                                        : FontWeight.normal,
                                  ),
                        ),
                      ),
                    ),
                  );
                },
              ),
              const SizedBox(height: 24),

              // Memo input
              Text(
                '메모', // Memo
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _memoController,
                onChanged: (value) {
                  setState(() {
                    _memo = value;
                  });
                },
                maxLines: 3,
                decoration: InputDecoration(
                  hintText: '거래에 대한 설명을 입력하세요 (선택사항)',
                  // Enter description for transaction (optional)
                ),
              ),
              const SizedBox(height: 32),

              // Submit button
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _submitForm,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _getSubmitButtonColor(),
                    foregroundColor: Colors.white,
                    disabledBackgroundColor: Colors.grey[400],
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(
                        AppTheme.borderRadiusMedium,
                      ),
                    ),
                  ),
                  child: _isLoading
                      ? const SizedBox(
                          height: 24,
                          width: 24,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(
                              Colors.white,
                            ),
                          ),
                        )
                      : Text(
                          _transactionType == 'expense'
                              ? '지출 등록' // Register expense
                              : '수입 등록', // Register income
                          style: Theme.of(context)
                              .textTheme
                              .bodyLarge
                              ?.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.w600,
                              ),
                        ),
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }
}
