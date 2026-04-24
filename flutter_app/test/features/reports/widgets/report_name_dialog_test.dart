import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_app/features/reports/widgets/report_name_dialog.dart';

void main() {
  group('ReportNameDialog', () {
    testWidgets('renders with initial name', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: ReportNameDialog(
                initialName: 'Initial Title',
                onSave: (_) {},
              ),
            ),
          ),
        ),
      );

      // Verify initial name is in TextField
      expect(find.byType(TextField), findsOneWidget);
      final textField = tester.widget<TextField>(find.byType(TextField));
      expect(textField.controller?.text, 'Initial Title');
    });

    testWidgets('calls onSave with trimmed input', (WidgetTester tester) async {
      String? savedName;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: ReportNameDialog(
                initialName: 'Old Name',
                onSave: (name) => savedName = name,
              ),
            ),
          ),
        ),
      );

      // Clear and type new name with spaces
      await tester.enterText(find.byType(TextField), '  New Name  ');
      await tester.tap(find.byType(ElevatedButton));
      await tester.pumpAndSettle();

      // Should be trimmed
      expect(savedName, 'New Name');
    });

    testWidgets('shows error for empty input', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: ReportNameDialog(initialName: 'Title', onSave: (_) {}),
            ),
          ),
        ),
      );

      // Clear TextField
      await tester.enterText(find.byType(TextField), '');
      await tester.tap(find.byType(ElevatedButton)); // Click Save
      await tester.pump();

      // Should show error
      expect(find.text('이름을 입력해주세요'), findsOneWidget);
    });

    testWidgets('shows error for title > 100 chars', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: ReportNameDialog(initialName: 'Title', onSave: (_) {}),
            ),
          ),
        ),
      );

      // Type long name
      final longName = 'a' * 101;
      await tester.enterText(find.byType(TextField), longName);
      await tester.tap(find.byType(ElevatedButton)); // Click Save
      await tester.pump();

      // Should show error
      expect(find.text('100자 이하로 입력해주세요'), findsOneWidget);
    });

    testWidgets('closes dialog on cancel', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: ReportNameDialog(initialName: 'Title', onSave: (_) {}),
            ),
          ),
        ),
      );

      // Find and tap Cancel button
      await tester.tap(find.widgetWithText(TextButton, '취소'));
      await tester.pumpAndSettle();

      // Dialog should be gone
      expect(find.byType(AlertDialog), findsNothing);
    });

    testWidgets('clears error message on input change', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: ReportNameDialog(initialName: 'Title', onSave: (_) {}),
            ),
          ),
        ),
      );

      // Clear and try to save (should show error)
      await tester.enterText(find.byType(TextField), '');
      await tester.tap(find.byType(ElevatedButton));
      await tester.pump();

      // Error should be visible
      expect(find.text('이름을 입력해주세요'), findsOneWidget);

      // Type something to clear error
      await tester.enterText(find.byType(TextField), 'New Name');
      await tester.pump();

      // Error should be gone
      expect(find.text('이름을 입력해주세요'), findsNothing);
    });

    testWidgets('dialog shows custom title', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: ReportNameDialog(
                initialName: 'Title',
                onSave: (_) {},
                title: '커스텀 제목',
              ),
            ),
          ),
        ),
      );

      // Should show custom title
      expect(find.text('커스텀 제목'), findsOneWidget);
    });
  });
}
