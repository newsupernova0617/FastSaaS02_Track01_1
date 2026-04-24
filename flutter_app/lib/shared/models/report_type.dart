enum ReportType {
  weekly_summary,
  monthly_summary,
  category_detail,
  spending_pattern,
  anomaly,
  suggestion;

  String get label => switch (this) {
    ReportType.weekly_summary => '주간 요약',
    ReportType.monthly_summary => '월간 요약',
    ReportType.category_detail => '카테고리 분석',
    ReportType.spending_pattern => '지출 패턴',
    ReportType.anomaly => '이상 탐지',
    ReportType.suggestion => '제안',
  };

  static ReportType? fromString(String value) {
    try {
      return ReportType.values.byName(value);
    } catch (_) {
      return null;
    }
  }
}
