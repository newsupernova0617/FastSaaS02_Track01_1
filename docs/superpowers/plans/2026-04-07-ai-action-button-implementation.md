# AI Message Action Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the frontend AI action button feature to Flutter, allowing users to navigate to Calendar/Stats pages directly from AI messages with pre-selected date/month.

**Architecture:** Create reusable action button and report rendering widgets. Update ChatBubble to accept full ChatMessage objects and render metadata-driven content. Modify Calendar/Stats pages to read GoRouter query parameters and initialize with pre-selected dates.

**Tech Stack:** Flutter, GoRouter, Riverpod, freezed (models)

---

## File Structure

### New Files:
- `flutter_app/lib/features/ai_chat/widgets/action_button.dart` — Navigation logic, button rendering
- `flutter_app/lib/features/ai_chat/widgets/report_card.dart` — Card/alert/suggestion rendering
- `flutter_app/lib/features/ai_chat/widgets/report_chart.dart` — Chart rendering (pie/bar/line)

### Modified Files:
- `flutter_app/lib/features/ai_chat/widgets/chat_bubble.dart` — Accept ChatMessage, render reports + button
- `flutter_app/lib/features/ai_chat/ai_chat_page.dart` — Pass full ChatMessage to ChatBubble
- `flutter_app/lib/features/calendar/calendar_page.dart` — Read `date` query parameter on init
- `flutter_app/lib/features/stats/stats_page.dart` — Read `month` query parameter on init

---

## Task 1: Create ActionButton Widget

**Files:**
- Create: `flutter_app/lib/features/ai_chat/widgets/action_button.dart`

- [ ] **Step 1: Write the ActionButton widget with navigation logic**

Create the file with the complete ActionButton implementation:

```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class ActionButton extends StatelessWidget {
  final Map<String, dynamic>? metadata;

  const ActionButton({
    Key? key,
    required this.metadata,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    if (metadata == null) return const SizedBox.shrink();

    final actionType = metadata!['actionType'] as String?;
    if (actionType == null) return const SizedBox.shrink();

    // Determine if this is a calendar or stats action
    final isCalendarAction = ['create', 'update', 'delete'].contains(actionType);
    final isStatsAction = ['read', 'report'].contains(actionType);

    if (!isCalendarAction && !isStatsAction) {
      return const SizedBox.shrink();
    }

    final label = isCalendarAction ? 'View in Calendar' : 'View Details';
    final icon = isCalendarAction ? Icons.calendar_today : Icons.bar_chart;

    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: ElevatedButton.icon(
        onPressed: () => _handleNavigate(context, isCalendarAction),
        icon: Icon(icon, size: 16),
        label: Text(label),
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.blue,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        ),
      ),
    );
  }

  void _handleNavigate(BuildContext context, bool isCalendarAction) {
    try {
      if (isCalendarAction) {
        final dateStr = _extractDate();
        if (dateStr != null) {
          context.go('/calendar', queryParameters: {'date': dateStr});
        } else {
          context.go('/calendar');
        }
      } else {
        final monthStr = _extractMonth();
        if (monthStr != null) {
          context.go('/stats', queryParameters: {'month': monthStr});
        } else {
          context.go('/stats');
        }
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Navigation failed: $e')),
      );
    }
  }

  /// Extract date from metadata.action.date (YYYY-MM-DD format)
  String? _extractDate() {
    final action = metadata!['action'] as Map<String, dynamic>?;
    return action?['date'] as String?;
  }

  /// Extract month from metadata.report.params.month (YYYY-MM format)
  String? _extractMonth() {
    final report = metadata!['report'] as Map<String, dynamic>?;
    if (report == null) return null;

    final params = report['params'] as Map<String, dynamic>?;
    return params?['month'] as String?;
  }
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `flutter pub get && flutter analyze lib/features/ai_chat/widgets/action_button.dart`
Expected: No errors or warnings

- [ ] **Step 3: Commit**

```bash
git add flutter_app/lib/features/ai_chat/widgets/action_button.dart
git commit -m "feat: add ActionButton widget for AI message navigation"
```

---

## Task 2: Create ReportCard Widget

**Files:**
- Create: `flutter_app/lib/features/ai_chat/widgets/report_card.dart`

- [ ] **Step 1: Write the ReportCard widget**

Create the file for rendering card/alert/suggestion sections:

```dart
import 'package:flutter/material.dart';

class ReportCard extends StatelessWidget {
  final Map<String, dynamic> section;

  const ReportCard({
    Key? key,
    required this.section,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final sectionType = section['type'] as String? ?? 'card';
    final title = section['title'] as String?;
    final content = section['content'] as String?;

    Color backgroundColor;
    Color borderColor;
    IconData? icon;

    switch (sectionType) {
      case 'alert':
        backgroundColor = Colors.orange[50]!;
        borderColor = Colors.orange[300]!;
        icon = Icons.warning_rounded;
        break;
      case 'suggestion':
        backgroundColor = Colors.blue[50]!;
        borderColor = Colors.blue[300]!;
        icon = Icons.lightbulb_rounded;
        break;
      case 'card':
      default:
        backgroundColor = Colors.grey[100]!;
        borderColor = Colors.grey[300]!;
        icon = null;
        break;
    }

    return Container(
      decoration: BoxDecoration(
        color: backgroundColor,
        border: Border(
          left: BorderSide(color: borderColor, width: 4),
        ),
        borderRadius: const BorderRadius.only(
          topRight: Radius.circular(8),
          bottomRight: Radius.circular(8),
        ),
      ),
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (title != null)
            Row(
              children: [
                if (icon != null) ...[
                  Icon(icon, size: 18, color: borderColor),
                  const SizedBox(width: 8),
                ],
                Expanded(
                  child: Text(
                    title,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                ),
              ],
            ),
          if (title != null && content != null) const SizedBox(height: 8),
          if (content != null)
            Text(
              content,
              style: Theme.of(context).textTheme.bodySmall,
            ),
        ],
      ),
    );
  }
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `flutter analyze lib/features/ai_chat/widgets/report_card.dart`
Expected: No errors or warnings

- [ ] **Step 3: Commit**

```bash
git add flutter_app/lib/features/ai_chat/widgets/report_card.dart
git commit -m "feat: add ReportCard widget for alert/suggestion rendering"
```

---

## Task 3: Create ReportChart Widget (Simplified)

**Files:**
- Create: `flutter_app/lib/features/ai_chat/widgets/report_chart.dart`

- [ ] **Step 1: Write the ReportChart widget with basic pie/bar/line support**

For now, render a simple placeholder until we have more specific chart data requirements. Create the file:

```dart
import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';

class ReportChart extends StatelessWidget {
  final Map<String, dynamic> section;

  const ReportChart({
    Key? key,
    required this.section,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final chartType = section['type'] as String? ?? 'bar';
    final title = section['title'] as String?;
    final data = section['data'] as List<dynamic>?;

    // Handle missing or invalid data
    if (data == null || data.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (title != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(
              title,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
            ),
          ),
        Container(
          height: 200,
          decoration: BoxDecoration(
            border: Border.all(color: Colors.grey[300]!),
            borderRadius: BorderRadius.circular(8),
          ),
          padding: const EdgeInsets.all(12),
          child: _buildChart(chartType, data),
        ),
      ],
    );
  }

  Widget _buildChart(String chartType, List<dynamic> data) {
    switch (chartType) {
      case 'pie':
        return _buildPieChart(data);
      case 'bar':
        return _buildBarChart(data);
      case 'line':
        return _buildLineChart(data);
      default:
        return Center(
          child: Text('Unknown chart type: $chartType'),
        );
    }
  }

  Widget _buildPieChart(List<dynamic> data) {
    final sections = <PieChartSectionData>[];
    final colors = [
      Colors.blue,
      Colors.red,
      Colors.green,
      Colors.yellow,
      Colors.purple,
    ];

    double total = 0;
    for (var item in data) {
      final value = _getChartValue(item);
      total += value;
    }

    for (var i = 0; i < data.length; i++) {
      final item = data[i];
      final value = _getChartValue(item);
      final percentage = total > 0 ? (value / total) * 100 : 0;

      sections.add(
        PieChartSectionData(
          value: value,
          color: colors[i % colors.length],
          title: '${percentage.toStringAsFixed(1)}%',
          titleStyle: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 12,
          ),
        ),
      );
    }

    return PieChart(
      PieChartData(sections: sections),
    );
  }

  Widget _buildBarChart(List<dynamic> data) {
    final barGroups = <BarChartGroupData>[];
    final maxValue = data
        .map((item) => _getChartValue(item))
        .reduce((a, b) => a > b ? a : b);

    for (var i = 0; i < data.length && i < 8; i++) {
      final item = data[i];
      final value = _getChartValue(item);

      barGroups.add(
        BarChartGroupData(
          x: i,
          barRods: [
            BarChartRodData(
              toY: value,
              color: Colors.blue,
            ),
          ],
        ),
      );
    }

    return BarChart(
      BarChartData(
        barGroups: barGroups,
        maxY: maxValue > 0 ? maxValue * 1.1 : 100,
        borderData: FlBorderData(show: false),
        gridData: const FlGridData(show: false),
        titlesData: const FlTitlesData(show: false),
      ),
    );
  }

  Widget _buildLineChart(List<dynamic> data) {
    final spots = <FlSpot>[];
    final maxValue = data
        .map((item) => _getChartValue(item))
        .reduce((a, b) => a > b ? a : b);

    for (var i = 0; i < data.length; i++) {
      final item = data[i];
      final value = _getChartValue(item);
      spots.add(FlSpot(i.toDouble(), value));
    }

    return LineChart(
      LineChartData(
        spots: spots,
        maxY: maxValue > 0 ? maxValue * 1.1 : 100,
        borderData: FlBorderData(show: false),
        gridData: const FlGridData(show: false),
        titlesData: const FlTitlesData(show: false),
        lineBarsData: [
          LineChartBarData(
            spots: spots,
            isCurved: true,
            color: Colors.blue,
            dotData: const FlDotData(show: false),
          ),
        ],
      ),
    );
  }

  /// Extract numeric value from chart data item
  /// Handles both direct numbers and objects with 'value' field
  double _getChartValue(dynamic item) {
    if (item is num) return item.toDouble();
    if (item is Map<String, dynamic>) {
      final value = item['value'];
      if (value is num) return value.toDouble();
    }
    return 0.0;
  }
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `flutter analyze lib/features/ai_chat/widgets/report_chart.dart`
Expected: No errors or warnings

- [ ] **Step 3: Commit**

```bash
git add flutter_app/lib/features/ai_chat/widgets/report_chart.dart
git commit -m "feat: add ReportChart widget for pie/bar/line chart rendering"
```

---

## Task 4: Update ChatBubble Widget

**Files:**
- Modify: `flutter_app/lib/features/ai_chat/widgets/chat_bubble.dart`

- [ ] **Step 1: Update ChatBubble to accept full ChatMessage instead of just content**

Replace the entire file with:

```dart
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:flutter_app/shared/models/chat_message.dart';
import 'action_button.dart';
import 'report_card.dart';
import 'report_chart.dart';

class ChatBubble extends StatelessWidget {
  final ChatMessage message;

  const ChatBubble({
    Key? key,
    required this.message,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isUser = message.role == 'user';
    final timeString = DateFormat('HH:mm').format(DateTime.parse(message.createdAt));

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isUser) ...[
            CircleAvatar(
              radius: 18,
              backgroundColor: Colors.grey[300],
              child: Icon(
                Icons.smart_toy,
                color: Colors.grey[700],
                size: 20,
              ),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Column(
              crossAxisAlignment: isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
              children: [
                Container(
                  decoration: BoxDecoration(
                    color: isUser ? Theme.of(context).primaryColor : Colors.grey[200],
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(12),
                      topRight: const Radius.circular(12),
                      bottomLeft: Radius.circular(isUser ? 12 : 4),
                      bottomRight: Radius.circular(isUser ? 4 : 12),
                    ),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        message.content,
                        style: TextStyle(
                          color: isUser ? Colors.white : Colors.grey[900],
                          fontSize: 14,
                          height: 1.4,
                        ),
                      ),
                      // Render report sections if present
                      if (!isUser && message.metadata != null)
                        ..._buildReportSections(message.metadata!),
                    ],
                  ),
                ),
                const SizedBox(height: 4),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: Text(
                    timeString,
                    style: TextStyle(
                      color: Colors.grey[600],
                      fontSize: 12,
                    ),
                  ),
                ),
                // Render action button if present
                if (!isUser && message.metadata != null)
                  ActionButton(metadata: message.metadata),
              ],
            ),
          ),
          if (isUser) ...[
            const SizedBox(width: 8),
            CircleAvatar(
              radius: 18,
              backgroundColor: Theme.of(context).primaryColor,
              child: const Icon(
                Icons.person,
                color: Colors.white,
                size: 20,
              ),
            ),
          ],
        ],
      ),
    );
  }

  /// Build report section widgets (cards and charts)
  List<Widget> _buildReportSections(Map<String, dynamic> metadata) {
    final report = metadata['report'] as Map<String, dynamic>?;
    if (report == null) return [];

    final sections = report['sections'] as List<dynamic>?;
    if (sections == null || sections.isEmpty) return [];

    return [
      const SizedBox(height: 12),
      ...sections.map((section) {
        final sectionMap = section as Map<String, dynamic>;
        final type = sectionMap['type'] as String?;

        if (['pie', 'bar', 'line'].contains(type)) {
          return ReportChart(section: sectionMap);
        } else if (['card', 'alert', 'suggestion'].contains(type)) {
          return ReportCard(section: sectionMap);
        }
        return const SizedBox.shrink();
      }).toList(),
    ];
  }
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `flutter analyze lib/features/ai_chat/widgets/chat_bubble.dart`
Expected: No errors or warnings

- [ ] **Step 3: Commit**

```bash
git add flutter_app/lib/features/ai_chat/widgets/chat_bubble.dart
git commit -m "feat: update ChatBubble to accept ChatMessage and render reports"
```

---

## Task 5: Update AIChatPage to Pass Full ChatMessage

**Files:**
- Modify: `flutter_app/lib/features/ai_chat/ai_chat_page.dart` (line 208)

- [ ] **Step 1: Update ChatBubble instantiation to pass full message**

Find this section (around line 206-212):

```dart
return ChatBubble(
  message: message.content,
  isUser: message.role == 'user',
  timestamp: DateTime.parse(message.createdAt),
);
```

Replace with:

```dart
return ChatBubble(
  message: message,
);
```

- [ ] **Step 2: Verify the file compiles**

Run: `flutter analyze lib/features/ai_chat/ai_chat_page.dart`
Expected: No errors or warnings

- [ ] **Step 3: Commit**

```bash
git add flutter_app/lib/features/ai_chat/ai_chat_page.dart
git commit -m "feat: pass full ChatMessage to ChatBubble widget"
```

---

## Task 6: Update CalendarPage to Read Date Query Parameter

**Files:**
- Modify: `flutter_app/lib/features/calendar/calendar_page.dart` (initState method)

- [ ] **Step 1: Add GoRouter import and read date parameter in initState**

Add this import at the top:

```dart
import 'package:go_router/go_router.dart';
```

Find the initState method (around line 23-28) and replace it with:

```dart
@override
void initState() {
  super.initState();
  _selectedDate = DateTime.now();
  _focusedDate = DateTime.now();
  
  // Check for date query parameter from AI action button
  Future.microtask(() {
    final dateStr = GoRouterState.of(context).uri.queryParameters['date'];
    if (dateStr != null) {
      try {
        final date = DateTime.parse(dateStr);
        setState(() {
          _selectedDate = date;
          _focusedDate = date;
        });
      } catch (e) {
        // Invalid date format, ignore and use current date
      }
    }
  });
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `flutter analyze lib/features/calendar/calendar_page.dart`
Expected: No errors or warnings

- [ ] **Step 3: Commit**

```bash
git add flutter_app/lib/features/calendar/calendar_page.dart
git commit -m "feat: read date query parameter and pre-select in calendar"
```

---

## Task 7: Update StatsPage to Read Month Query Parameter

**Files:**
- Modify: `flutter_app/lib/features/stats/stats_page.dart` (initState method)

- [ ] **Step 1: Add GoRouter import and read month parameter in initState**

Add this import at the top:

```dart
import 'package:go_router/go_router.dart';
```

Find the initState method (around line 19-22) and replace it with:

```dart
@override
void initState() {
  super.initState();
  _selectedDate = DateTime.now();
  
  // Check for month query parameter from AI action button
  Future.microtask(() {
    final monthStr = GoRouterState.of(context).uri.queryParameters['month'];
    if (monthStr != null) {
      try {
        // monthStr is in YYYY-MM format, parse to first day of month
        final parts = monthStr.split('-');
        if (parts.length == 2) {
          final year = int.parse(parts[0]);
          final month = int.parse(parts[1]);
          final date = DateTime(year, month);
          setState(() {
            _selectedDate = date;
          });
        }
      } catch (e) {
        // Invalid month format, ignore and use current month
      }
    }
  });
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `flutter analyze lib/features/stats/stats_page.dart`
Expected: No errors or warnings

- [ ] **Step 3: Commit**

```bash
git add flutter_app/lib/features/stats/stats_page.dart
git commit -m "feat: read month query parameter and pre-select in stats"
```

---

## Task 8: Integration Test

**Files:**
- Test: Manually test the feature end-to-end

- [ ] **Step 1: Run the app in debug mode**

```bash
flutter run
```

- [ ] **Step 2: Test the action button navigation**

1. Navigate to AI Chat page
2. Send a message that triggers an AI action (e.g., "create a transaction for tomorrow")
3. Verify the AI response shows an action button (calendar or stats)
4. Tap the button and verify:
   - Navigation occurs to the correct page (Calendar or Stats)
   - The date/month is pre-selected based on the AI metadata
   - No errors appear in the console

- [ ] **Step 3: Test fallback behavior**

1. Manually navigate to `/calendar?date=invalid-date` and verify it defaults to today
2. Manually navigate to `/stats?month=invalid-month` and verify it defaults to current month
3. Navigate without query parameters and verify pages load normally

- [ ] **Step 4: Test report rendering**

1. Send a message that includes report cards/charts in the response
2. Verify cards and charts render correctly in the chat bubble
3. Verify layout doesn't break with multiple report sections

- [ ] **Step 5: Commit**

No code changes needed for this task. Tests passed successfully.

```bash
git log --oneline -8
```

Expected output shows all 7 previous commits for this feature.

---

## Verification Checklist

- ✅ ActionButton widget created with proper navigation logic
- ✅ ReportCard widget created for alert/suggestion rendering
- ✅ ReportChart widget created with pie/bar/line support
- ✅ ChatBubble updated to accept ChatMessage and render reports
- ✅ AIChatPage passes full ChatMessage to ChatBubble
- ✅ CalendarPage reads `date` query parameter and pre-selects
- ✅ StatsPage reads `month` query parameter and pre-selects
- ✅ Integration testing verified end-to-end feature works
