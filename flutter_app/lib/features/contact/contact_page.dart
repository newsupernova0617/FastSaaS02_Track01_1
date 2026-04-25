import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:flutter_app/core/api/api_client.dart';
import 'package:flutter_app/core/constants/app_constants.dart';
import 'package:flutter_app/core/theme/app_theme.dart';
import 'package:flutter_app/shared/providers/auth_provider.dart';
import 'package:flutter_app/shared/widgets/glass_card.dart';

enum ContactType { bug, feature, account, billing, other }

class ContactPage extends ConsumerStatefulWidget {
  const ContactPage({super.key});

  @override
  ConsumerState<ContactPage> createState() => _ContactPageState();
}

class _ContactPageState extends ConsumerState<ContactPage> {
  ContactType _type = ContactType.bug;
  String _reproducible = '항상 재현됨';
  bool _isSubmitting = false;

  final _titleController = TextEditingController();
  final _detailsController = TextEditingController();
  final _screenController = TextEditingController();
  final _expectedController = TextEditingController();
  final _actualController = TextEditingController();
  final _situationController = TextEditingController();
  final _effectController = TextEditingController();
  final _timeController = TextEditingController();
  final _loginMethodController = TextEditingController();
  final _billingTypeController = TextEditingController();

  @override
  void dispose() {
    _titleController.dispose();
    _detailsController.dispose();
    _screenController.dispose();
    _expectedController.dispose();
    _actualController.dispose();
    _situationController.dispose();
    _effectController.dispose();
    _timeController.dispose();
    _loginMethodController.dispose();
    _billingTypeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final user = ref.watch(currentUserProvider);
    final email = user?.email ?? '로그인 정보 없음';

    return Scaffold(
      appBar: AppBar(title: const Text('문의하기')),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        children: [
          _IntroCard(theme: theme),
          const SizedBox(height: AppSpacing.lg),
          _SectionTitle(theme: theme, title: '문의 유형'),
          const SizedBox(height: AppSpacing.sm),
          GlassCard(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Wrap(
              spacing: AppSpacing.sm,
              runSpacing: AppSpacing.sm,
              children: ContactType.values
                  .map(
                    (type) => ChoiceChip(
                      label: Text(_labelFor(type)),
                      selected: _type == type,
                      onSelected: (_) => setState(() => _type = type),
                    ),
                  )
                  .toList(),
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          _SectionTitle(theme: theme, title: '문의 내용'),
          const SizedBox(height: AppSpacing.sm),
          GlassCard(
            child: Column(
              children: [
                _LabeledField(
                  label: '제목',
                  child: TextField(
                    controller: _titleController,
                    decoration: const InputDecoration(
                      hintText: '예: AI가 식비를 교통으로 분류해요',
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                _LabeledField(
                  label: '상세 내용',
                  child: TextField(
                    controller: _detailsController,
                    maxLines: 5,
                    decoration: const InputDecoration(
                      hintText: '무엇을 했고 어떤 문제가 있었는지 자세히 적어주세요.',
                    ),
                  ),
                ),
                ..._buildConditionalFields(),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          _SectionTitle(theme: theme, title: '자동 첨부 정보'),
          const SizedBox(height: AppSpacing.sm),
          GlassCard(
            child: Column(
              children: [
                _InfoRow(label: '앱 이름', value: AppConstants.appName),
                _InfoRow(label: '앱 버전', value: AppConstants.appVersion),
                _InfoRow(label: '운영체제', value: _platformLabel()),
                _InfoRow(label: '현재 화면', value: '문의하기'),
                _InfoRow(label: '계정', value: email),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          GlassCard(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  Icons.privacy_tip_outlined,
                  color: theme.colorScheme.primary,
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Text(
                    '비밀번호, 카드번호 전체, 주민등록번호 같은 민감 정보는 입력하지 마세요.',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurface.withValues(
                        alpha: 0.72,
                      ),
                      height: 1.45,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.xl),
          SizedBox(
            height: 52,
            child: ElevatedButton.icon(
              onPressed: _isSubmitting ? null : _submit,
              icon: _isSubmitting
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.send_rounded),
              label: Text(_isSubmitting ? '접수 중...' : '문의 접수하기'),
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _buildConditionalFields() {
    switch (_type) {
      case ContactType.bug:
        return [
          const SizedBox(height: AppSpacing.md),
          _LabeledField(
            label: '발생 화면',
            child: TextField(
              controller: _screenController,
              decoration: const InputDecoration(hintText: '예: 홈 > AI 입력'),
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          _LabeledField(
            label: '재현 여부',
            child: DropdownButtonFormField<String>(
              initialValue: _reproducible,
              items: const [
                DropdownMenuItem(value: '항상 재현됨', child: Text('항상 재현됨')),
                DropdownMenuItem(value: '가끔 재현됨', child: Text('가끔 재현됨')),
                DropdownMenuItem(value: '한 번만 발생', child: Text('한 번만 발생')),
              ],
              onChanged: (value) {
                if (value != null) setState(() => _reproducible = value);
              },
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          _LabeledField(
            label: '기대 결과',
            child: TextField(
              controller: _expectedController,
              decoration: const InputDecoration(hintText: '예: 식비로 분류되길 기대했어요'),
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          _LabeledField(
            label: '실제 결과',
            child: TextField(
              controller: _actualController,
              decoration: const InputDecoration(hintText: '예: 교통으로 추천되었어요'),
            ),
          ),
        ];
      case ContactType.feature:
        return [
          const SizedBox(height: AppSpacing.md),
          _LabeledField(
            label: '필요한 상황',
            child: TextField(
              controller: _situationController,
              maxLines: 3,
              decoration: const InputDecoration(
                hintText: '어떤 상황에서 이 기능이 필요한가요?',
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          _LabeledField(
            label: '기대 효과',
            child: TextField(
              controller: _effectController,
              maxLines: 3,
              decoration: const InputDecoration(hintText: '추가되면 어떤 점이 좋아지나요?'),
            ),
          ),
        ];
      case ContactType.account:
        return [
          const SizedBox(height: AppSpacing.md),
          _LabeledField(
            label: '문제 발생 시점',
            child: TextField(
              controller: _timeController,
              decoration: const InputDecoration(hintText: '예: 오늘 오전 9시'),
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          _LabeledField(
            label: '로그인 방식',
            child: TextField(
              controller: _loginMethodController,
              decoration: const InputDecoration(hintText: '예: Google 로그인'),
            ),
          ),
        ];
      case ContactType.billing:
        return [
          const SizedBox(height: AppSpacing.md),
          _LabeledField(
            label: '결제 문제 유형',
            child: TextField(
              controller: _billingTypeController,
              decoration: const InputDecoration(hintText: '예: 중복 결제, 영수증 누락'),
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          _LabeledField(
            label: '문제 발생 시점',
            child: TextField(
              controller: _timeController,
              decoration: const InputDecoration(
                hintText: '예: 2026-04-25 14:30',
              ),
            ),
          ),
        ];
      case ContactType.other:
        return const [];
    }
  }

  String _labelFor(ContactType type) {
    switch (type) {
      case ContactType.bug:
        return '버그 신고';
      case ContactType.feature:
        return '기능 제안';
      case ContactType.account:
        return '계정/로그인';
      case ContactType.billing:
        return '결제/구독';
      case ContactType.other:
        return '기타';
    }
  }

  String _platformLabel() {
    if (kIsWeb) return 'Web';
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return 'Android';
      case TargetPlatform.iOS:
        return 'iOS';
      case TargetPlatform.macOS:
        return 'macOS';
      case TargetPlatform.windows:
        return 'Windows';
      case TargetPlatform.linux:
        return 'Linux';
      case TargetPlatform.fuchsia:
        return 'Fuchsia';
    }
  }

  Future<void> _submit() async {
    if (_titleController.text.trim().isEmpty ||
        _detailsController.text.trim().isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('제목과 상세 내용을 입력해 주세요.')));
      return;
    }

    final metadata = <String, dynamic>{
      'appVersion': AppConstants.appVersion,
      'platform': _platformLabel(),
      'currentScreen': '문의하기',
      'accountEmail': ref.read(currentUserProvider)?.email,
      if (_type == ContactType.bug) ...{
        'screen': _screenController.text.trim(),
        'reproducible': _reproducible,
        'expected': _expectedController.text.trim(),
        'actual': _actualController.text.trim(),
      },
      if (_type == ContactType.feature) ...{
        'situation': _situationController.text.trim(),
        'effect': _effectController.text.trim(),
      },
      if (_type == ContactType.account) ...{
        'issueTime': _timeController.text.trim(),
        'loginMethod': _loginMethodController.text.trim(),
      },
      if (_type == ContactType.billing) ...{
        'billingType': _billingTypeController.text.trim(),
        'issueTime': _timeController.text.trim(),
      },
    };

    setState(() => _isSubmitting = true);
    try {
      final apiClient = ref.read(apiClientProvider);
      final id = await apiClient.submitContactRequest(
        type: _type.name,
        title: _titleController.text.trim(),
        details: _detailsController.text.trim(),
        metadata: metadata,
      );

      if (!mounted) return;

      _titleController.clear();
      _detailsController.clear();
      _screenController.clear();
      _expectedController.clear();
      _actualController.clear();
      _situationController.clear();
      _effectController.clear();
      _timeController.clear();
      _loginMethodController.clear();
      _billingTypeController.clear();

      setState(() {
        _type = ContactType.bug;
        _reproducible = '항상 재현됨';
      });

      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('문의가 접수되었습니다. 접수 번호: #$id')));
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('문의 접수에 실패했습니다: $error')));
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }
}

class _IntroCard extends StatelessWidget {
  final ThemeData theme;

  const _IntroCard({required this.theme});

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      overlayIcon: const Icon(Icons.support_agent_rounded),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '문제를 빠르게 해결할 수 있게 도와주세요',
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            '문의 유형을 고르고 상황을 적어주시면 확인에 필요한 정보가 함께 정리됩니다.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurface.withValues(alpha: 0.68),
              height: 1.45,
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final ThemeData theme;
  final String title;

  const _SectionTitle({required this.theme, required this.title});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xs),
      child: Text(
        title,
        style: theme.textTheme.titleSmall?.copyWith(
          color: theme.colorScheme.onSurface.withValues(alpha: 0.64),
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _LabeledField extends StatelessWidget {
  final String label;
  final Widget child;

  const _LabeledField({required this.label, required this.child});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: theme.textTheme.labelLarge?.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: AppSpacing.xs),
        child,
      ],
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;

  const _InfoRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
      child: Row(
        children: [
          SizedBox(
            width: 88,
            child: Text(
              label,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.55),
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: theme.textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
