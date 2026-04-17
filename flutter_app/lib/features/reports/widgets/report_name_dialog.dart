import 'package:flutter/material.dart';

// ============================================================
// [리포트 위젯] report_name_dialog.dart
// 리포트 저장/이름 변경 시 표시되는 다이얼로그입니다.
// 텍스트 입력 필드 + 유효성 검증(빈값, 100자 초과) + 저장/취소 버튼
// ============================================================
class ReportNameDialog extends StatefulWidget {
  final String initialName;
  final Function(String) onSave;
  final String? title;

  const ReportNameDialog({
    Key? key,
    required this.initialName,
    required this.onSave,
    this.title = '리포트 이름',
  }) : super(key: key);

  @override
  State<ReportNameDialog> createState() => _ReportNameDialogState();
}

class _ReportNameDialogState extends State<ReportNameDialog> {
  late TextEditingController _controller;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.initialName);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  String? _validateInput(String value) {
    final trimmed = value.trim();

    if (trimmed.isEmpty) {
      return '이름을 입력해주세요';
    }

    if (trimmed.length > 100) {
      return '100자 이하로 입력해주세요';
    }

    return null;
  }

  void _handleSave() {
    final error = _validateInput(_controller.text);

    if (error != null) {
      setState(() => _errorMessage = error);
      return;
    }

    // Save and close dialog
    widget.onSave(_controller.text.trim());
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.title!),
      content: TextField(
        controller: _controller,
        decoration: InputDecoration(
          hintText: '리포트 이름을 입력하세요',
          errorText: _errorMessage,
          border: OutlineInputBorder(),
        ),
        onChanged: (_) {
          // Clear error when user types
          if (_errorMessage != null) {
            setState(() => _errorMessage = null);
          }
        },
        maxLines: 1,
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('취소'),
        ),
        ElevatedButton(
          onPressed: _handleSave,
          child: const Text('저장'),
        ),
      ],
    );
  }
}
