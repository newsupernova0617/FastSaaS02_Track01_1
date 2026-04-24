import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import 'package:flutter_app/core/theme/app_theme.dart';
import 'package:flutter_app/core/constants/categories.dart';
import 'package:flutter_app/core/constants/category_icons.dart';
import 'package:flutter_app/shared/providers/transaction_provider.dart';
import 'package:flutter_app/shared/widgets/glowing_number.dart';

// ============================================================
// [Phase 3] record_page.dart
// Full-screen modal for recording a transaction.
//
// Layout:
//   ┌───── drag handle ──────┐
//   [close]         [date]
//   ┌──── HERO AMOUNT ────┐   <- giant gradient number
//   [ 지출  |  수입 ]          <- segmented
//   [ category grid 3-col ]
//   [ memo ]
//   [ submit CTA (gradient) ]
// ============================================================

class RecordPage extends ConsumerStatefulWidget {
  const RecordPage({super.key});

  @override
  ConsumerState<RecordPage> createState() => _RecordPageState();
}

class _RecordPageState extends ConsumerState<RecordPage> {
  String _transactionType = 'expense';
  DateTime _selectedDate = DateTime.now();
  String _amountText = '';
  String? _selectedCategory;
  String _memo = '';
  bool _isLoading = false;

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

  List<String> _getCategories() => _transactionType == 'expense'
      ? Categories.getAllExpenseCategories()
      : Categories.getAllIncomeCategories();

  void _formatAmountInput(String value) {
    final numeric = value.replaceAll(RegExp(r'[^0-9]'), '');
    if (numeric.isEmpty) {
      setState(() => _amountText = '');
      _amountController.clear();
      return;
    }
    try {
      final parsed = double.parse(numeric);
      if (parsed > 999999999) return;
    } catch (_) {
      return;
    }
    setState(() => _amountText = numeric);
    final formatted = NumberFormat('#,##0').format(int.parse(numeric));
    _amountController.value = TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
    );
  }

  Future<void> _pickDate() async {
    HapticFeedback.selectionClick();
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(2000),
      lastDate: DateTime.now(),
      builder: (c, child) => Theme(
        data: Theme.of(c).copyWith(
          colorScheme: Theme.of(c).colorScheme.copyWith(
                primary: AppColors.primary,
              ),
        ),
        child: child!,
      ),
    );
    if (picked != null && mounted) {
      setState(() => _selectedDate = picked);
    }
  }

  String? _validate() {
    if (_amountText.isEmpty) return '금액을 입력해주세요';
    try {
      final amount = double.parse(_amountText);
      if (amount <= 0) return '금액은 0보다 커야 합니다';
    } catch (_) {
      return '유효한 금액을 입력해주세요';
    }
    if (_selectedCategory == null || _selectedCategory!.isEmpty) {
      return '카테고리를 선택해주세요';
    }
    return null;
  }

  Future<void> _submit() async {
    final error = _validate();
    if (error != null) {
      _toast(error, isError: true);
      return;
    }
    setState(() => _isLoading = true);
    HapticFeedback.lightImpact();

    try {
      final amount = double.parse(_amountText);
      final dateStr =
          '${_selectedDate.year}-${_selectedDate.month.toString().padLeft(2, '0')}-${_selectedDate.day.toString().padLeft(2, '0')}';

      await ref.read(addTransactionProvider({
        'transactionType': _transactionType,
        'amount': amount,
        'category': _selectedCategory,
        'date': dateStr,
        if (_memo.isNotEmpty) 'memo': _memo,
      }).future);

      if (!mounted) return;
      HapticFeedback.mediumImpact();
      _toast('저장되었어요');
      await Future.delayed(const Duration(milliseconds: 200));
      if (mounted) context.pop();
    } catch (e) {
      if (!mounted) return;
      setState(() => _isLoading = false);
      _toast('저장 실패: $e', isError: true);
    }
  }

  void _toast(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? AppColors.expense : AppColors.success,
        behavior: SnackBarBehavior.floating,
        duration: Duration(seconds: isError ? 4 : 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final categories = _getCategories();

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      resizeToAvoidBottomInset: true,
      body: SafeArea(
        child: Column(
          children: [
            // Drag handle
            Padding(
              padding: const EdgeInsets.only(top: AppSpacing.sm),
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(AppRadii.pill),
                ),
              ),
            ),

            // Top bar
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.lg,
                vertical: AppSpacing.sm,
              ),
              child: Row(
                children: [
                  IconButton(
                    onPressed: () => context.pop(),
                    icon: const Icon(Icons.close_rounded),
                    tooltip: '닫기',
                  ),
                  const Spacer(),
                  TextButton.icon(
                    onPressed: _pickDate,
                    icon: const Icon(Icons.calendar_today_rounded, size: 16),
                    label: Text(
                      DateFormat('yyyy.MM.dd (E)', 'ko').format(_selectedDate),
                      style: theme.textTheme.labelLarge,
                    ),
                  ),
                ],
              ),
            ),

            Expanded(
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.lg,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const SizedBox(height: AppSpacing.xl),

                    // Hero amount
                    _HeroAmount(
                      amountText: _amountText,
                      displayText: _amountController.text,
                      onChanged: _formatAmountInput,
                      controller: _amountController,
                    ),

                    const SizedBox(height: AppSpacing.xxl),

                    // Type segmented
                    _TypeSegmented(
                      value: _transactionType,
                      onChanged: (v) {
                        HapticFeedback.selectionClick();
                        setState(() {
                          _transactionType = v;
                          _selectedCategory = null;
                        });
                      },
                    ),

                    const SizedBox(height: AppSpacing.xl),

                    // Categories
                    Text('카테고리',
                        style: theme.textTheme.titleSmall?.copyWith(
                          color: theme.colorScheme.onSurface
                              .withValues(alpha: 0.6),
                          letterSpacing: 0.5,
                        )),
                    const SizedBox(height: AppSpacing.md),
                    _CategoryGrid(
                      categories: categories,
                      selected: _selectedCategory,
                      onSelect: (c) {
                        HapticFeedback.selectionClick();
                        setState(() => _selectedCategory = c);
                      },
                    ),

                    const SizedBox(height: AppSpacing.xl),

                    // Memo
                    Text('메모 (선택)',
                        style: theme.textTheme.titleSmall?.copyWith(
                          color: theme.colorScheme.onSurface
                              .withValues(alpha: 0.6),
                          letterSpacing: 0.5,
                        )),
                    const SizedBox(height: AppSpacing.sm),
                    TextField(
                      controller: _memoController,
                      maxLines: 2,
                      maxLength: 200,
                      onChanged: (v) => _memo = v,
                      decoration: const InputDecoration(
                        hintText: '무엇에 대한 거래인가요?',
                      ),
                    ),

                    const SizedBox(height: AppSpacing.xxl),
                  ],
                ),
              ),
            ),

            // Submit CTA
            Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.lg,
                AppSpacing.sm,
                AppSpacing.lg,
                AppSpacing.xl,
              ),
              child: _SubmitCta(
                isLoading: _isLoading,
                enabled: !_isLoading && _amountText.isNotEmpty,
                onTap: _submit,
                label: _transactionType == 'expense' ? '지출 저장' : '수입 저장',
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ────────────────────────────────────────────────────────────
// Hero amount — big gradient number that taps to invoke keyboard
// ────────────────────────────────────────────────────────────
class _HeroAmount extends StatelessWidget {
  final String amountText;
  final String displayText;
  final ValueChanged<String> onChanged;
  final TextEditingController controller;

  const _HeroAmount({
    required this.amountText,
    required this.displayText,
    required this.onChanged,
    required this.controller,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final showPlaceholder = amountText.isEmpty;

    return Column(
      children: [
        Text('₩',
            style: theme.textTheme.headlineSmall?.copyWith(
              color: theme.colorScheme.onSurface.withValues(alpha: 0.4),
            )),
        const SizedBox(height: 4),

        // Invisible text field captures input; the displayed value is the
        // gradient GlowingNumber below.
        Stack(
          alignment: Alignment.center,
          children: [
            SizedBox(
              height: 72,
              child: showPlaceholder
                  ? GlowingNumber('0', fontSize: 56, glow: false)
                  : GlowingNumber(displayText, fontSize: 56),
            ),
            Positioned.fill(
              child: Opacity(
                opacity: 0.0,
                child: TextField(
                  controller: controller,
                  keyboardType: TextInputType.number,
                  autofocus: true,
                  onChanged: onChanged,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 56),
                  decoration: const InputDecoration(
                    border: InputBorder.none,
                    enabledBorder: InputBorder.none,
                    focusedBorder: InputBorder.none,
                    contentPadding: EdgeInsets.zero,
                    isDense: true,
                    filled: false,
                  ),
                ),
              ),
            ),
          ],
        ),

        const SizedBox(height: AppSpacing.sm),
        Text(
          '금액을 입력하세요',
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurface.withValues(alpha: 0.45),
          ),
        ),
      ],
    ).animate().fadeIn(duration: 400.ms).scaleXY(begin: 0.96, end: 1);
  }
}

// ────────────────────────────────────────────────────────────
// Type segmented — expense / income
// ────────────────────────────────────────────────────────────
class _TypeSegmented extends StatelessWidget {
  final String value;
  final ValueChanged<String> onChanged;

  const _TypeSegmented({required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(AppRadii.pill),
        border: Border.all(color: theme.colorScheme.outline, width: 0.5),
      ),
      child: Row(
        children: [
          _segBtn(context, '지출', 'expense', AppColors.expense),
          _segBtn(context, '수입', 'income', AppColors.income),
        ],
      ),
    );
  }

  Widget _segBtn(BuildContext context, String label, String key, Color color) {
    final selected = value == key;
    final theme = Theme.of(context);
    return Expanded(
      child: GestureDetector(
        onTap: () => onChanged(key),
        child: AnimatedContainer(
          duration: AppMotion.fast,
          padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm + 2),
          decoration: BoxDecoration(
            gradient: selected
                ? LinearGradient(
                    colors: [color.withValues(alpha: 0.9), color],
                  )
                : null,
            borderRadius: BorderRadius.circular(AppRadii.pill),
            boxShadow: selected
                ? [
                    BoxShadow(
                      color: color.withValues(alpha: 0.35),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ]
                : null,
          ),
          child: Center(
            child: Text(
              label,
              style: theme.textTheme.labelLarge?.copyWith(
                fontWeight: FontWeight.w700,
                color: selected
                    ? Colors.white
                    : theme.colorScheme.onSurface.withValues(alpha: 0.7),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ────────────────────────────────────────────────────────────
// Category grid
// ────────────────────────────────────────────────────────────
class _CategoryGrid extends StatelessWidget {
  final List<String> categories;
  final String? selected;
  final ValueChanged<String> onSelect;

  const _CategoryGrid({
    required this.categories,
    required this.selected,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Wrap(
      spacing: AppSpacing.sm,
      runSpacing: AppSpacing.sm,
      children: [
        for (final c in categories)
          _CatChip(
            label: c,
            icon: CategoryIcons.of(c),
            selected: selected == c,
            onTap: () => onSelect(c),
            theme: theme,
          ),
      ],
    );
  }
}

class _CatChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;
  final ThemeData theme;

  const _CatChip({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
    required this.theme,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppRadii.pill),
      child: AnimatedContainer(
        duration: AppMotion.fast,
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md + 2,
          vertical: AppSpacing.sm + 2,
        ),
        decoration: BoxDecoration(
          gradient: selected ? AppGradients.brand : null,
          color: selected ? null : theme.colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(AppRadii.pill),
          border: Border.all(
            color: selected
                ? Colors.transparent
                : theme.colorScheme.outline.withValues(alpha: 0.4),
            width: 0.5,
          ),
          boxShadow: selected ? AppGlow.small() : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon,
                size: 16,
                color: selected
                    ? Colors.white
                    : theme.colorScheme.onSurface.withValues(alpha: 0.75)),
            const SizedBox(width: 6),
            Text(label,
                style: theme.textTheme.labelLarge?.copyWith(
                  color: selected
                      ? Colors.white
                      : theme.colorScheme.onSurface,
                  fontWeight: FontWeight.w600,
                )),
          ],
        ),
      ),
    );
  }
}

// ────────────────────────────────────────────────────────────
// Submit CTA
// ────────────────────────────────────────────────────────────
class _SubmitCta extends StatelessWidget {
  final bool isLoading;
  final bool enabled;
  final VoidCallback onTap;
  final String label;

  const _SubmitCta({
    required this.isLoading,
    required this.enabled,
    required this.onTap,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: enabled ? 1.0 : 0.5,
      child: SizedBox(
        width: double.infinity,
        height: 58,
        child: DecoratedBox(
          decoration: BoxDecoration(
            gradient: AppGradients.brand,
            borderRadius: BorderRadius.circular(AppRadii.lg),
            boxShadow: enabled ? AppGlow.medium() : null,
          ),
          child: ElevatedButton(
            onPressed: enabled ? onTap : null,
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.transparent,
              shadowColor: Colors.transparent,
              disabledBackgroundColor: Colors.transparent,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppRadii.lg),
              ),
            ),
            child: isLoading
                ? const SizedBox(
                    height: 22,
                    width: 22,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  )
                : Text(
                    label,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.3,
                      color: Colors.white,
                    ),
                  ),
          ),
        ),
      ),
    );
  }
}
