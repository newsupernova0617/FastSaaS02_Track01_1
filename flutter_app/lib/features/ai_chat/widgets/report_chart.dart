import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';

// ============================================================
// [리포트 위젯] report_chart.dart
// AI 응답 또는 리포트 상세에서 차트 섹션을 렌더링합니다.
// fl_chart 패키지를 사용합니다.
//
// 차트 타입별 표시:
//   'pie'  → 파이 차트 (비율 표시 + 범례)
//   'bar'  → 막대 차트 (카테고리별 금액 비교)
//   'line' → 라인 차트 (시계열 추이)
//
// 데이터 형식: { labels: ['식비', '교통'], values: [50000, 20000] }
// ============================================================
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
    final subtitle = section['subtitle'] as String?;
    final rawData = section['data'] as Map<String, dynamic>?;

    if (rawData == null) {
      return const SizedBox.shrink();
    }

    // Parse labels and values from the API response format
    final labels = (rawData['labels'] as List<dynamic>?)?.cast<String>() ?? [];
    final values = (rawData['values'] as List<dynamic>?)
        ?.map((v) => (v as num).toDouble())
        .toList() ?? [];

    if (values.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (title != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Text(
              title,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
            ),
          ),
        if (subtitle != null && subtitle.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(
              subtitle,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.grey[600],
                  ),
            ),
          ),
        Container(
          height: 250,
          decoration: BoxDecoration(
            border: Border.all(color: Colors.grey[300]!),
            borderRadius: BorderRadius.circular(8),
          ),
          padding: const EdgeInsets.all(16),
          child: _buildChart(chartType, labels, values),
        ),
      ],
    );
  }

  Widget _buildChart(String chartType, List<String> labels, List<double> values) {
    switch (chartType) {
      case 'pie':
        return _buildPieChart(labels, values);
      case 'bar':
        return _buildBarChart(labels, values);
      case 'line':
        return _buildLineChart(labels, values);
      default:
        return Center(
          child: Text('Unknown chart type: $chartType'),
        );
    }
  }

  Widget _buildPieChart(List<String> labels, List<double> values) {
    final sections = <PieChartSectionData>[];
    final colors = [
      Colors.blue,
      Colors.red,
      Colors.green,
      Colors.orange,
      Colors.purple,
      Colors.teal,
      Colors.pink,
      Colors.amber,
    ];

    double total = values.fold(0, (sum, val) => sum + val);

    for (var i = 0; i < values.length; i++) {
      final value = values[i];
      final percentage = total > 0 ? (value / total) * 100 : 0;

      sections.add(
        PieChartSectionData(
          value: value,
          color: colors[i % colors.length],
          title: '${percentage.toStringAsFixed(0)}%',
          titleStyle: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 12,
          ),
          radius: 50,
        ),
      );
    }

    return Column(
      children: [
        Expanded(
          child: PieChart(
            PieChartData(sections: sections),
          ),
        ),
        const SizedBox(height: 12),
        // Legend
        Wrap(
          spacing: 12,
          runSpacing: 8,
          children: List.generate(values.length, (i) {
            final label = i < labels.length ? labels[i] : 'Item $i';
            final value = values[i];
            final color = colors[i % colors.length];
            final percentage = total > 0 ? (value / total) * 100 : 0;
            return Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    color: color,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  '$label ${percentage.toStringAsFixed(0)}%',
                  style: const TextStyle(fontSize: 12),
                ),
              ],
            );
          }),
        ),
      ],
    );
  }

  Widget _buildBarChart(List<String> labels, List<double> values) {
    final barGroups = <BarChartGroupData>[];
    final maxValue = values.reduce((a, b) => a > b ? a : b);

    for (var i = 0; i < values.length && i < 12; i++) {
      final value = values[i];
      barGroups.add(
        BarChartGroupData(
          x: i,
          barRods: [
            BarChartRodData(
              toY: value,
              color: Colors.blue,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(4),
                topRight: Radius.circular(4),
              ),
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
        gridData: const FlGridData(show: true, drawHorizontalLine: true),
        titlesData: FlTitlesData(
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: labels.isNotEmpty,
              getTitlesWidget: (double value, TitleMeta meta) {
                int index = value.toInt();
                if (index < labels.length) {
                  return Text(
                    labels[index],
                    style: const TextStyle(fontSize: 10),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  );
                }
                return const Text('');
              },
            ),
          ),
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              getTitlesWidget: (double value, TitleMeta meta) {
                return Text(
                  _formatNumber(value.toInt()),
                  style: const TextStyle(fontSize: 10),
                );
              },
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLineChart(List<String> labels, List<double> values) {
    final spots = <FlSpot>[];
    final maxValue = values.reduce((a, b) => a > b ? a : b);

    for (var i = 0; i < values.length; i++) {
      spots.add(FlSpot(i.toDouble(), values[i]));
    }

    return LineChart(
      LineChartData(
        maxY: maxValue > 0 ? maxValue * 1.1 : 100,
        borderData: FlBorderData(show: false),
        gridData: const FlGridData(show: true, drawHorizontalLine: true),
        titlesData: FlTitlesData(
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: labels.isNotEmpty,
              getTitlesWidget: (double value, TitleMeta meta) {
                int index = value.toInt();
                if (index < labels.length) {
                  return Text(
                    labels[index],
                    style: const TextStyle(fontSize: 10),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  );
                }
                return const Text('');
              },
            ),
          ),
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              getTitlesWidget: (double value, TitleMeta meta) {
                return Text(
                  _formatNumber(value.toInt()),
                  style: const TextStyle(fontSize: 10),
                );
              },
            ),
          ),
        ),
        lineBarsData: [
          LineChartBarData(
            spots: spots,
            isCurved: true,
            color: Colors.blue,
            barWidth: 2,
            dotData: FlDotData(
              show: true,
              getDotPainter: (spot, percent, barData, index) =>
                  FlDotCirclePainter(radius: 3, color: Colors.blue),
            ),
          ),
        ],
      ),
    );
  }

  String _formatNumber(int num) {
    if (num >= 1000000) {
      return '${(num / 1000000).toStringAsFixed(0)}M';
    } else if (num >= 1000) {
      return '${(num / 1000).toStringAsFixed(0)}K';
    }
    return num.toString();
  }
}
