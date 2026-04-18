import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter_app/core/theme/app_theme.dart';

// ============================================================
// [Phase 3] report_chart.dart
// AI 리포트/채팅에서 차트 섹션 렌더. Violet/Cyan 브랜드 팔레트 + 다크
// 최적화된 fl_chart 스타일링.
//
// 지원 타입: 'pie' | 'bar' | 'line'
// 데이터: { labels: [...], values: [...] }
// ============================================================

// 다회 카테고리 컬러 — 브랜드 계열 + 보완색. 다크 배경에서 가독 우선.
const List<Color> _chartPalette = [
  AppColors.primary,       // violet
  AppColors.secondary,     // cyan
  AppColors.income,        // emerald
  AppColors.warning,       // amber
  AppColors.expense,       // red
  AppColors.primarySoft,   // violet-soft
  AppColors.secondarySoft, // cyan-soft
  Color(0xFFA855F7),       // violet-500 alt
];

class ReportChart extends StatelessWidget {
  final Map<String, dynamic> section;

  const ReportChart({super.key, required this.section});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final chartType = section['type'] as String? ?? 'bar';
    final title = section['title'] as String?;
    final subtitle = section['subtitle'] as String?;
    final rawData = section['data'] as Map<String, dynamic>?;

    if (rawData == null) return const SizedBox.shrink();

    final labels = (rawData['labels'] as List<dynamic>?)?.cast<String>() ?? [];
    final values = (rawData['values'] as List<dynamic>?)
            ?.map((v) => (v as num).toDouble())
            .toList() ??
        [];

    if (values.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (title != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 2),
            child: Text(
              title,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        if (subtitle != null && subtitle.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.sm),
            child: Text(
              subtitle,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.55),
              ),
            ),
          ),
        Container(
          height: 260,
          decoration: BoxDecoration(
            color: theme.colorScheme.surface,
            borderRadius: BorderRadius.circular(AppRadii.card),
            border: Border.all(
              color: theme.colorScheme.outline.withValues(alpha: 0.4),
              width: 0.5,
            ),
          ),
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: _buildChart(context, chartType, labels, values),
        ),
      ],
    );
  }

  Widget _buildChart(
    BuildContext context,
    String chartType,
    List<String> labels,
    List<double> values,
  ) {
    switch (chartType) {
      case 'pie':
        return _buildPieChart(context, labels, values);
      case 'bar':
        return _buildBarChart(context, labels, values);
      case 'line':
        return _buildLineChart(context, labels, values);
      default:
        return Center(
          child: Text('Unknown chart type: $chartType'),
        );
    }
  }

  Widget _buildPieChart(
    BuildContext context,
    List<String> labels,
    List<double> values,
  ) {
    final theme = Theme.of(context);
    final total = values.fold<double>(0, (sum, v) => sum + v);
    final sections = <PieChartSectionData>[];

    for (var i = 0; i < values.length; i++) {
      final value = values[i];
      final pct = total > 0 ? (value / total) * 100 : 0;
      final color = _chartPalette[i % _chartPalette.length];
      sections.add(
        PieChartSectionData(
          value: value,
          color: color,
          title: pct > 5 ? '${pct.toStringAsFixed(0)}%' : '',
          titleStyle: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w700,
            fontSize: 11,
          ),
          radius: 50,
        ),
      );
    }

    return Column(
      children: [
        Expanded(
          child: PieChart(
            PieChartData(
              sections: sections,
              sectionsSpace: 2,
              centerSpaceRadius: 28,
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        Wrap(
          spacing: AppSpacing.md,
          runSpacing: 6,
          children: List.generate(values.length, (i) {
            final label = i < labels.length ? labels[i] : 'Item $i';
            final pct = total > 0 ? (values[i] / total) * 100 : 0;
            final color = _chartPalette[i % _chartPalette.length];
            return Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 10,
                  height: 10,
                  decoration: BoxDecoration(
                    color: color,
                    borderRadius: BorderRadius.circular(2),
                    boxShadow: [
                      BoxShadow(
                        color: color.withValues(alpha: 0.4),
                        blurRadius: 4,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  '$label ${pct.toStringAsFixed(0)}%',
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: theme.colorScheme.onSurface,
                    fontWeight: FontWeight.w500,
                    letterSpacing: 0,
                  ),
                ),
              ],
            );
          }),
        ),
      ],
    );
  }

  Widget _buildBarChart(
    BuildContext context,
    List<String> labels,
    List<double> values,
  ) {
    final theme = Theme.of(context);
    final maxValue = values.reduce((a, b) => a > b ? a : b);
    final barGroups = <BarChartGroupData>[];

    for (var i = 0; i < values.length && i < 12; i++) {
      barGroups.add(
        BarChartGroupData(
          x: i,
          barRods: [
            BarChartRodData(
              toY: values[i],
              width: 16,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(4),
                topRight: Radius.circular(4),
              ),
              // Gradient fill matches brand
              gradient: AppGradients.brand,
            ),
          ],
        ),
      );
    }

    final tickStyle = theme.textTheme.labelSmall?.copyWith(
      color: theme.colorScheme.onSurface.withValues(alpha: 0.55),
      fontSize: 10,
    );

    return BarChart(
      BarChartData(
        barGroups: barGroups,
        maxY: maxValue > 0 ? maxValue * 1.1 : 100,
        borderData: FlBorderData(show: false),
        gridData: FlGridData(
          show: true,
          drawHorizontalLine: true,
          drawVerticalLine: false,
          getDrawingHorizontalLine: (_) => FlLine(
            color: theme.colorScheme.outline.withValues(alpha: 0.25),
            strokeWidth: 0.5,
          ),
        ),
        titlesData: FlTitlesData(
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: labels.isNotEmpty,
              getTitlesWidget: (value, meta) {
                final i = value.toInt();
                if (i >= 0 && i < labels.length) {
                  return Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Text(
                      labels[i],
                      style: tickStyle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  );
                }
                return const Text('');
              },
            ),
          ),
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 36,
              getTitlesWidget: (value, meta) => Text(
                _formatNumber(value.toInt()),
                style: tickStyle,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLineChart(
    BuildContext context,
    List<String> labels,
    List<double> values,
  ) {
    final theme = Theme.of(context);
    final maxValue = values.reduce((a, b) => a > b ? a : b);
    final spots = [
      for (var i = 0; i < values.length; i++) FlSpot(i.toDouble(), values[i]),
    ];

    final tickStyle = theme.textTheme.labelSmall?.copyWith(
      color: theme.colorScheme.onSurface.withValues(alpha: 0.55),
      fontSize: 10,
    );

    return LineChart(
      LineChartData(
        maxY: maxValue > 0 ? maxValue * 1.1 : 100,
        borderData: FlBorderData(show: false),
        gridData: FlGridData(
          show: true,
          drawHorizontalLine: true,
          drawVerticalLine: false,
          getDrawingHorizontalLine: (_) => FlLine(
            color: theme.colorScheme.outline.withValues(alpha: 0.25),
            strokeWidth: 0.5,
          ),
        ),
        titlesData: FlTitlesData(
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: labels.isNotEmpty,
              getTitlesWidget: (value, meta) {
                final i = value.toInt();
                if (i >= 0 && i < labels.length) {
                  return Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Text(
                      labels[i],
                      style: tickStyle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  );
                }
                return const Text('');
              },
            ),
          ),
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 36,
              getTitlesWidget: (value, meta) =>
                  Text(_formatNumber(value.toInt()), style: tickStyle),
            ),
          ),
        ),
        lineBarsData: [
          LineChartBarData(
            spots: spots,
            isCurved: true,
            gradient: AppGradients.brand,
            barWidth: 2.5,
            dotData: FlDotData(
              show: true,
              getDotPainter: (spot, _, __, ___) => FlDotCirclePainter(
                radius: 3.5,
                color: AppColors.primary,
                strokeWidth: 2,
                strokeColor: Colors.white,
              ),
            ),
            belowBarData: BarAreaData(
              show: true,
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  AppColors.primary.withValues(alpha: 0.25),
                  AppColors.secondary.withValues(alpha: 0.02),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatNumber(int num) {
    if (num >= 1000000) return '${(num / 1000000).toStringAsFixed(0)}M';
    if (num >= 1000) return '${(num / 1000).toStringAsFixed(0)}K';
    return num.toString();
  }
}
