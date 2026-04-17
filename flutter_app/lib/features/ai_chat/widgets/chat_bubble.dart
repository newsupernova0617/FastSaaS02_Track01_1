import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:flutter_app/shared/models/chat_message.dart';
import 'action_button.dart';
import 'report_card.dart';
import 'report_chart.dart';

// ============================================================
// [채팅 위젯] chat_bubble.dart
// 개별 채팅 메시지를 말풍선으로 표시하는 위젯입니다.
//
// 사용자 메시지: 오른쪽 정렬, 파란색 배경, 사람 아이콘
// AI 메시지: 왼쪽 정렬, 회색 배경, 로봇 아이콘
//   + metadata에 report 데이터가 있으면 ReportCard/ReportChart 렌더링
//   + metadata에 actionType이 있으면 ActionButton 표시
// ============================================================
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
