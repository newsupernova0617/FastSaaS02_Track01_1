// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'report.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
  'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models',
);

ReportSummary _$ReportSummaryFromJson(Map<String, dynamic> json) {
  return _ReportSummary.fromJson(json);
}

/// @nodoc
mixin _$ReportSummary {
  int get id => throw _privateConstructorUsedError;
  String get reportType => throw _privateConstructorUsedError;
  String get title => throw _privateConstructorUsedError;
  String? get subtitle => throw _privateConstructorUsedError;
  String get createdAt => throw _privateConstructorUsedError;

  /// Serializes this ReportSummary to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of ReportSummary
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $ReportSummaryCopyWith<ReportSummary> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ReportSummaryCopyWith<$Res> {
  factory $ReportSummaryCopyWith(
    ReportSummary value,
    $Res Function(ReportSummary) then,
  ) = _$ReportSummaryCopyWithImpl<$Res, ReportSummary>;
  @useResult
  $Res call({
    int id,
    String reportType,
    String title,
    String? subtitle,
    String createdAt,
  });
}

/// @nodoc
class _$ReportSummaryCopyWithImpl<$Res, $Val extends ReportSummary>
    implements $ReportSummaryCopyWith<$Res> {
  _$ReportSummaryCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of ReportSummary
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? reportType = null,
    Object? title = null,
    Object? subtitle = freezed,
    Object? createdAt = null,
  }) {
    return _then(
      _value.copyWith(
            id: null == id
                ? _value.id
                : id // ignore: cast_nullable_to_non_nullable
                      as int,
            reportType: null == reportType
                ? _value.reportType
                : reportType // ignore: cast_nullable_to_non_nullable
                      as String,
            title: null == title
                ? _value.title
                : title // ignore: cast_nullable_to_non_nullable
                      as String,
            subtitle: freezed == subtitle
                ? _value.subtitle
                : subtitle // ignore: cast_nullable_to_non_nullable
                      as String?,
            createdAt: null == createdAt
                ? _value.createdAt
                : createdAt // ignore: cast_nullable_to_non_nullable
                      as String,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$ReportSummaryImplCopyWith<$Res>
    implements $ReportSummaryCopyWith<$Res> {
  factory _$$ReportSummaryImplCopyWith(
    _$ReportSummaryImpl value,
    $Res Function(_$ReportSummaryImpl) then,
  ) = __$$ReportSummaryImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    int id,
    String reportType,
    String title,
    String? subtitle,
    String createdAt,
  });
}

/// @nodoc
class __$$ReportSummaryImplCopyWithImpl<$Res>
    extends _$ReportSummaryCopyWithImpl<$Res, _$ReportSummaryImpl>
    implements _$$ReportSummaryImplCopyWith<$Res> {
  __$$ReportSummaryImplCopyWithImpl(
    _$ReportSummaryImpl _value,
    $Res Function(_$ReportSummaryImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of ReportSummary
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? reportType = null,
    Object? title = null,
    Object? subtitle = freezed,
    Object? createdAt = null,
  }) {
    return _then(
      _$ReportSummaryImpl(
        id: null == id
            ? _value.id
            : id // ignore: cast_nullable_to_non_nullable
                  as int,
        reportType: null == reportType
            ? _value.reportType
            : reportType // ignore: cast_nullable_to_non_nullable
                  as String,
        title: null == title
            ? _value.title
            : title // ignore: cast_nullable_to_non_nullable
                  as String,
        subtitle: freezed == subtitle
            ? _value.subtitle
            : subtitle // ignore: cast_nullable_to_non_nullable
                  as String?,
        createdAt: null == createdAt
            ? _value.createdAt
            : createdAt // ignore: cast_nullable_to_non_nullable
                  as String,
      ),
    );
  }
}

/// @nodoc
@JsonSerializable()
class _$ReportSummaryImpl implements _ReportSummary {
  const _$ReportSummaryImpl({
    required this.id,
    required this.reportType,
    required this.title,
    this.subtitle,
    required this.createdAt,
  });

  factory _$ReportSummaryImpl.fromJson(Map<String, dynamic> json) =>
      _$$ReportSummaryImplFromJson(json);

  @override
  final int id;
  @override
  final String reportType;
  @override
  final String title;
  @override
  final String? subtitle;
  @override
  final String createdAt;

  @override
  String toString() {
    return 'ReportSummary(id: $id, reportType: $reportType, title: $title, subtitle: $subtitle, createdAt: $createdAt)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ReportSummaryImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.reportType, reportType) ||
                other.reportType == reportType) &&
            (identical(other.title, title) || other.title == title) &&
            (identical(other.subtitle, subtitle) ||
                other.subtitle == subtitle) &&
            (identical(other.createdAt, createdAt) ||
                other.createdAt == createdAt));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode =>
      Object.hash(runtimeType, id, reportType, title, subtitle, createdAt);

  /// Create a copy of ReportSummary
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ReportSummaryImplCopyWith<_$ReportSummaryImpl> get copyWith =>
      __$$ReportSummaryImplCopyWithImpl<_$ReportSummaryImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$ReportSummaryImplToJson(this);
  }
}

abstract class _ReportSummary implements ReportSummary {
  const factory _ReportSummary({
    required final int id,
    required final String reportType,
    required final String title,
    final String? subtitle,
    required final String createdAt,
  }) = _$ReportSummaryImpl;

  factory _ReportSummary.fromJson(Map<String, dynamic> json) =
      _$ReportSummaryImpl.fromJson;

  @override
  int get id;
  @override
  String get reportType;
  @override
  String get title;
  @override
  String? get subtitle;
  @override
  String get createdAt;

  /// Create a copy of ReportSummary
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ReportSummaryImplCopyWith<_$ReportSummaryImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

ReportBreakdownItem _$ReportBreakdownItemFromJson(Map<String, dynamic> json) {
  return _ReportBreakdownItem.fromJson(json);
}

/// @nodoc
mixin _$ReportBreakdownItem {
  String get label => throw _privateConstructorUsedError;
  num get amount => throw _privateConstructorUsedError;
  num get ratio => throw _privateConstructorUsedError;

  /// Serializes this ReportBreakdownItem to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of ReportBreakdownItem
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $ReportBreakdownItemCopyWith<ReportBreakdownItem> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ReportBreakdownItemCopyWith<$Res> {
  factory $ReportBreakdownItemCopyWith(
    ReportBreakdownItem value,
    $Res Function(ReportBreakdownItem) then,
  ) = _$ReportBreakdownItemCopyWithImpl<$Res, ReportBreakdownItem>;
  @useResult
  $Res call({String label, num amount, num ratio});
}

/// @nodoc
class _$ReportBreakdownItemCopyWithImpl<$Res, $Val extends ReportBreakdownItem>
    implements $ReportBreakdownItemCopyWith<$Res> {
  _$ReportBreakdownItemCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of ReportBreakdownItem
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? label = null,
    Object? amount = null,
    Object? ratio = null,
  }) {
    return _then(
      _value.copyWith(
            label: null == label
                ? _value.label
                : label // ignore: cast_nullable_to_non_nullable
                      as String,
            amount: null == amount
                ? _value.amount
                : amount // ignore: cast_nullable_to_non_nullable
                      as num,
            ratio: null == ratio
                ? _value.ratio
                : ratio // ignore: cast_nullable_to_non_nullable
                      as num,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$ReportBreakdownItemImplCopyWith<$Res>
    implements $ReportBreakdownItemCopyWith<$Res> {
  factory _$$ReportBreakdownItemImplCopyWith(
    _$ReportBreakdownItemImpl value,
    $Res Function(_$ReportBreakdownItemImpl) then,
  ) = __$$ReportBreakdownItemImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({String label, num amount, num ratio});
}

/// @nodoc
class __$$ReportBreakdownItemImplCopyWithImpl<$Res>
    extends _$ReportBreakdownItemCopyWithImpl<$Res, _$ReportBreakdownItemImpl>
    implements _$$ReportBreakdownItemImplCopyWith<$Res> {
  __$$ReportBreakdownItemImplCopyWithImpl(
    _$ReportBreakdownItemImpl _value,
    $Res Function(_$ReportBreakdownItemImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of ReportBreakdownItem
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? label = null,
    Object? amount = null,
    Object? ratio = null,
  }) {
    return _then(
      _$ReportBreakdownItemImpl(
        label: null == label
            ? _value.label
            : label // ignore: cast_nullable_to_non_nullable
                  as String,
        amount: null == amount
            ? _value.amount
            : amount // ignore: cast_nullable_to_non_nullable
                  as num,
        ratio: null == ratio
            ? _value.ratio
            : ratio // ignore: cast_nullable_to_non_nullable
                  as num,
      ),
    );
  }
}

/// @nodoc
@JsonSerializable()
class _$ReportBreakdownItemImpl implements _ReportBreakdownItem {
  const _$ReportBreakdownItemImpl({
    required this.label,
    required this.amount,
    required this.ratio,
  });

  factory _$ReportBreakdownItemImpl.fromJson(Map<String, dynamic> json) =>
      _$$ReportBreakdownItemImplFromJson(json);

  @override
  final String label;
  @override
  final num amount;
  @override
  final num ratio;

  @override
  String toString() {
    return 'ReportBreakdownItem(label: $label, amount: $amount, ratio: $ratio)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ReportBreakdownItemImpl &&
            (identical(other.label, label) || other.label == label) &&
            (identical(other.amount, amount) || other.amount == amount) &&
            (identical(other.ratio, ratio) || other.ratio == ratio));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, label, amount, ratio);

  /// Create a copy of ReportBreakdownItem
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ReportBreakdownItemImplCopyWith<_$ReportBreakdownItemImpl> get copyWith =>
      __$$ReportBreakdownItemImplCopyWithImpl<_$ReportBreakdownItemImpl>(
        this,
        _$identity,
      );

  @override
  Map<String, dynamic> toJson() {
    return _$$ReportBreakdownItemImplToJson(this);
  }
}

abstract class _ReportBreakdownItem implements ReportBreakdownItem {
  const factory _ReportBreakdownItem({
    required final String label,
    required final num amount,
    required final num ratio,
  }) = _$ReportBreakdownItemImpl;

  factory _ReportBreakdownItem.fromJson(Map<String, dynamic> json) =
      _$ReportBreakdownItemImpl.fromJson;

  @override
  String get label;
  @override
  num get amount;
  @override
  num get ratio;

  /// Create a copy of ReportBreakdownItem
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ReportBreakdownItemImplCopyWith<_$ReportBreakdownItemImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

ReportSummaryData _$ReportSummaryDataFromJson(Map<String, dynamic> json) {
  return _ReportSummaryData.fromJson(json);
}

/// @nodoc
mixin _$ReportSummaryData {
  String get periodLabel => throw _privateConstructorUsedError;
  num get totalExpense => throw _privateConstructorUsedError;
  num get totalIncome => throw _privateConstructorUsedError;
  num get netAmount => throw _privateConstructorUsedError;
  num? get deltaPercent => throw _privateConstructorUsedError;
  String? get insight => throw _privateConstructorUsedError;
  List<ReportBreakdownItem> get breakdown => throw _privateConstructorUsedError;

  /// Serializes this ReportSummaryData to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of ReportSummaryData
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $ReportSummaryDataCopyWith<ReportSummaryData> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ReportSummaryDataCopyWith<$Res> {
  factory $ReportSummaryDataCopyWith(
    ReportSummaryData value,
    $Res Function(ReportSummaryData) then,
  ) = _$ReportSummaryDataCopyWithImpl<$Res, ReportSummaryData>;
  @useResult
  $Res call({
    String periodLabel,
    num totalExpense,
    num totalIncome,
    num netAmount,
    num? deltaPercent,
    String? insight,
    List<ReportBreakdownItem> breakdown,
  });
}

/// @nodoc
class _$ReportSummaryDataCopyWithImpl<$Res, $Val extends ReportSummaryData>
    implements $ReportSummaryDataCopyWith<$Res> {
  _$ReportSummaryDataCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of ReportSummaryData
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? periodLabel = null,
    Object? totalExpense = null,
    Object? totalIncome = null,
    Object? netAmount = null,
    Object? deltaPercent = freezed,
    Object? insight = freezed,
    Object? breakdown = null,
  }) {
    return _then(
      _value.copyWith(
            periodLabel: null == periodLabel
                ? _value.periodLabel
                : periodLabel // ignore: cast_nullable_to_non_nullable
                      as String,
            totalExpense: null == totalExpense
                ? _value.totalExpense
                : totalExpense // ignore: cast_nullable_to_non_nullable
                      as num,
            totalIncome: null == totalIncome
                ? _value.totalIncome
                : totalIncome // ignore: cast_nullable_to_non_nullable
                      as num,
            netAmount: null == netAmount
                ? _value.netAmount
                : netAmount // ignore: cast_nullable_to_non_nullable
                      as num,
            deltaPercent: freezed == deltaPercent
                ? _value.deltaPercent
                : deltaPercent // ignore: cast_nullable_to_non_nullable
                      as num?,
            insight: freezed == insight
                ? _value.insight
                : insight // ignore: cast_nullable_to_non_nullable
                      as String?,
            breakdown: null == breakdown
                ? _value.breakdown
                : breakdown // ignore: cast_nullable_to_non_nullable
                      as List<ReportBreakdownItem>,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$ReportSummaryDataImplCopyWith<$Res>
    implements $ReportSummaryDataCopyWith<$Res> {
  factory _$$ReportSummaryDataImplCopyWith(
    _$ReportSummaryDataImpl value,
    $Res Function(_$ReportSummaryDataImpl) then,
  ) = __$$ReportSummaryDataImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    String periodLabel,
    num totalExpense,
    num totalIncome,
    num netAmount,
    num? deltaPercent,
    String? insight,
    List<ReportBreakdownItem> breakdown,
  });
}

/// @nodoc
class __$$ReportSummaryDataImplCopyWithImpl<$Res>
    extends _$ReportSummaryDataCopyWithImpl<$Res, _$ReportSummaryDataImpl>
    implements _$$ReportSummaryDataImplCopyWith<$Res> {
  __$$ReportSummaryDataImplCopyWithImpl(
    _$ReportSummaryDataImpl _value,
    $Res Function(_$ReportSummaryDataImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of ReportSummaryData
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? periodLabel = null,
    Object? totalExpense = null,
    Object? totalIncome = null,
    Object? netAmount = null,
    Object? deltaPercent = freezed,
    Object? insight = freezed,
    Object? breakdown = null,
  }) {
    return _then(
      _$ReportSummaryDataImpl(
        periodLabel: null == periodLabel
            ? _value.periodLabel
            : periodLabel // ignore: cast_nullable_to_non_nullable
                  as String,
        totalExpense: null == totalExpense
            ? _value.totalExpense
            : totalExpense // ignore: cast_nullable_to_non_nullable
                  as num,
        totalIncome: null == totalIncome
            ? _value.totalIncome
            : totalIncome // ignore: cast_nullable_to_non_nullable
                  as num,
        netAmount: null == netAmount
            ? _value.netAmount
            : netAmount // ignore: cast_nullable_to_non_nullable
                  as num,
        deltaPercent: freezed == deltaPercent
            ? _value.deltaPercent
            : deltaPercent // ignore: cast_nullable_to_non_nullable
                  as num?,
        insight: freezed == insight
            ? _value.insight
            : insight // ignore: cast_nullable_to_non_nullable
                  as String?,
        breakdown: null == breakdown
            ? _value._breakdown
            : breakdown // ignore: cast_nullable_to_non_nullable
                  as List<ReportBreakdownItem>,
      ),
    );
  }
}

/// @nodoc
@JsonSerializable()
class _$ReportSummaryDataImpl implements _ReportSummaryData {
  const _$ReportSummaryDataImpl({
    required this.periodLabel,
    required this.totalExpense,
    required this.totalIncome,
    required this.netAmount,
    this.deltaPercent,
    this.insight,
    required final List<ReportBreakdownItem> breakdown,
  }) : _breakdown = breakdown;

  factory _$ReportSummaryDataImpl.fromJson(Map<String, dynamic> json) =>
      _$$ReportSummaryDataImplFromJson(json);

  @override
  final String periodLabel;
  @override
  final num totalExpense;
  @override
  final num totalIncome;
  @override
  final num netAmount;
  @override
  final num? deltaPercent;
  @override
  final String? insight;
  final List<ReportBreakdownItem> _breakdown;
  @override
  List<ReportBreakdownItem> get breakdown {
    if (_breakdown is EqualUnmodifiableListView) return _breakdown;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_breakdown);
  }

  @override
  String toString() {
    return 'ReportSummaryData(periodLabel: $periodLabel, totalExpense: $totalExpense, totalIncome: $totalIncome, netAmount: $netAmount, deltaPercent: $deltaPercent, insight: $insight, breakdown: $breakdown)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ReportSummaryDataImpl &&
            (identical(other.periodLabel, periodLabel) ||
                other.periodLabel == periodLabel) &&
            (identical(other.totalExpense, totalExpense) ||
                other.totalExpense == totalExpense) &&
            (identical(other.totalIncome, totalIncome) ||
                other.totalIncome == totalIncome) &&
            (identical(other.netAmount, netAmount) ||
                other.netAmount == netAmount) &&
            (identical(other.deltaPercent, deltaPercent) ||
                other.deltaPercent == deltaPercent) &&
            (identical(other.insight, insight) || other.insight == insight) &&
            const DeepCollectionEquality().equals(
              other._breakdown,
              _breakdown,
            ));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
    runtimeType,
    periodLabel,
    totalExpense,
    totalIncome,
    netAmount,
    deltaPercent,
    insight,
    const DeepCollectionEquality().hash(_breakdown),
  );

  /// Create a copy of ReportSummaryData
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ReportSummaryDataImplCopyWith<_$ReportSummaryDataImpl> get copyWith =>
      __$$ReportSummaryDataImplCopyWithImpl<_$ReportSummaryDataImpl>(
        this,
        _$identity,
      );

  @override
  Map<String, dynamic> toJson() {
    return _$$ReportSummaryDataImplToJson(this);
  }
}

abstract class _ReportSummaryData implements ReportSummaryData {
  const factory _ReportSummaryData({
    required final String periodLabel,
    required final num totalExpense,
    required final num totalIncome,
    required final num netAmount,
    final num? deltaPercent,
    final String? insight,
    required final List<ReportBreakdownItem> breakdown,
  }) = _$ReportSummaryDataImpl;

  factory _ReportSummaryData.fromJson(Map<String, dynamic> json) =
      _$ReportSummaryDataImpl.fromJson;

  @override
  String get periodLabel;
  @override
  num get totalExpense;
  @override
  num get totalIncome;
  @override
  num get netAmount;
  @override
  num? get deltaPercent;
  @override
  String? get insight;
  @override
  List<ReportBreakdownItem> get breakdown;

  /// Create a copy of ReportSummaryData
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ReportSummaryDataImplCopyWith<_$ReportSummaryDataImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

ReportDetail _$ReportDetailFromJson(Map<String, dynamic> json) {
  return _ReportDetail.fromJson(json);
}

/// @nodoc
mixin _$ReportDetail {
  int get id => throw _privateConstructorUsedError;
  String get reportType => throw _privateConstructorUsedError;
  String get title => throw _privateConstructorUsedError;
  String? get subtitle => throw _privateConstructorUsedError;
  ReportSummaryData? get summary => throw _privateConstructorUsedError;
  List<Map<String, dynamic>> get reportData =>
      throw _privateConstructorUsedError;
  Map<String, dynamic> get params => throw _privateConstructorUsedError;
  String get createdAt => throw _privateConstructorUsedError;

  /// Serializes this ReportDetail to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of ReportDetail
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $ReportDetailCopyWith<ReportDetail> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ReportDetailCopyWith<$Res> {
  factory $ReportDetailCopyWith(
    ReportDetail value,
    $Res Function(ReportDetail) then,
  ) = _$ReportDetailCopyWithImpl<$Res, ReportDetail>;
  @useResult
  $Res call({
    int id,
    String reportType,
    String title,
    String? subtitle,
    ReportSummaryData? summary,
    List<Map<String, dynamic>> reportData,
    Map<String, dynamic> params,
    String createdAt,
  });

  $ReportSummaryDataCopyWith<$Res>? get summary;
}

/// @nodoc
class _$ReportDetailCopyWithImpl<$Res, $Val extends ReportDetail>
    implements $ReportDetailCopyWith<$Res> {
  _$ReportDetailCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of ReportDetail
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? reportType = null,
    Object? title = null,
    Object? subtitle = freezed,
    Object? summary = freezed,
    Object? reportData = null,
    Object? params = null,
    Object? createdAt = null,
  }) {
    return _then(
      _value.copyWith(
            id: null == id
                ? _value.id
                : id // ignore: cast_nullable_to_non_nullable
                      as int,
            reportType: null == reportType
                ? _value.reportType
                : reportType // ignore: cast_nullable_to_non_nullable
                      as String,
            title: null == title
                ? _value.title
                : title // ignore: cast_nullable_to_non_nullable
                      as String,
            subtitle: freezed == subtitle
                ? _value.subtitle
                : subtitle // ignore: cast_nullable_to_non_nullable
                      as String?,
            summary: freezed == summary
                ? _value.summary
                : summary // ignore: cast_nullable_to_non_nullable
                      as ReportSummaryData?,
            reportData: null == reportData
                ? _value.reportData
                : reportData // ignore: cast_nullable_to_non_nullable
                      as List<Map<String, dynamic>>,
            params: null == params
                ? _value.params
                : params // ignore: cast_nullable_to_non_nullable
                      as Map<String, dynamic>,
            createdAt: null == createdAt
                ? _value.createdAt
                : createdAt // ignore: cast_nullable_to_non_nullable
                      as String,
          )
          as $Val,
    );
  }

  /// Create a copy of ReportDetail
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $ReportSummaryDataCopyWith<$Res>? get summary {
    if (_value.summary == null) {
      return null;
    }

    return $ReportSummaryDataCopyWith<$Res>(_value.summary!, (value) {
      return _then(_value.copyWith(summary: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$ReportDetailImplCopyWith<$Res>
    implements $ReportDetailCopyWith<$Res> {
  factory _$$ReportDetailImplCopyWith(
    _$ReportDetailImpl value,
    $Res Function(_$ReportDetailImpl) then,
  ) = __$$ReportDetailImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    int id,
    String reportType,
    String title,
    String? subtitle,
    ReportSummaryData? summary,
    List<Map<String, dynamic>> reportData,
    Map<String, dynamic> params,
    String createdAt,
  });

  @override
  $ReportSummaryDataCopyWith<$Res>? get summary;
}

/// @nodoc
class __$$ReportDetailImplCopyWithImpl<$Res>
    extends _$ReportDetailCopyWithImpl<$Res, _$ReportDetailImpl>
    implements _$$ReportDetailImplCopyWith<$Res> {
  __$$ReportDetailImplCopyWithImpl(
    _$ReportDetailImpl _value,
    $Res Function(_$ReportDetailImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of ReportDetail
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? reportType = null,
    Object? title = null,
    Object? subtitle = freezed,
    Object? summary = freezed,
    Object? reportData = null,
    Object? params = null,
    Object? createdAt = null,
  }) {
    return _then(
      _$ReportDetailImpl(
        id: null == id
            ? _value.id
            : id // ignore: cast_nullable_to_non_nullable
                  as int,
        reportType: null == reportType
            ? _value.reportType
            : reportType // ignore: cast_nullable_to_non_nullable
                  as String,
        title: null == title
            ? _value.title
            : title // ignore: cast_nullable_to_non_nullable
                  as String,
        subtitle: freezed == subtitle
            ? _value.subtitle
            : subtitle // ignore: cast_nullable_to_non_nullable
                  as String?,
        summary: freezed == summary
            ? _value.summary
            : summary // ignore: cast_nullable_to_non_nullable
                  as ReportSummaryData?,
        reportData: null == reportData
            ? _value._reportData
            : reportData // ignore: cast_nullable_to_non_nullable
                  as List<Map<String, dynamic>>,
        params: null == params
            ? _value._params
            : params // ignore: cast_nullable_to_non_nullable
                  as Map<String, dynamic>,
        createdAt: null == createdAt
            ? _value.createdAt
            : createdAt // ignore: cast_nullable_to_non_nullable
                  as String,
      ),
    );
  }
}

/// @nodoc
@JsonSerializable()
class _$ReportDetailImpl implements _ReportDetail {
  const _$ReportDetailImpl({
    required this.id,
    required this.reportType,
    required this.title,
    this.subtitle,
    this.summary,
    required final List<Map<String, dynamic>> reportData,
    required final Map<String, dynamic> params,
    required this.createdAt,
  }) : _reportData = reportData,
       _params = params;

  factory _$ReportDetailImpl.fromJson(Map<String, dynamic> json) =>
      _$$ReportDetailImplFromJson(json);

  @override
  final int id;
  @override
  final String reportType;
  @override
  final String title;
  @override
  final String? subtitle;
  @override
  final ReportSummaryData? summary;
  final List<Map<String, dynamic>> _reportData;
  @override
  List<Map<String, dynamic>> get reportData {
    if (_reportData is EqualUnmodifiableListView) return _reportData;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_reportData);
  }

  final Map<String, dynamic> _params;
  @override
  Map<String, dynamic> get params {
    if (_params is EqualUnmodifiableMapView) return _params;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(_params);
  }

  @override
  final String createdAt;

  @override
  String toString() {
    return 'ReportDetail(id: $id, reportType: $reportType, title: $title, subtitle: $subtitle, summary: $summary, reportData: $reportData, params: $params, createdAt: $createdAt)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ReportDetailImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.reportType, reportType) ||
                other.reportType == reportType) &&
            (identical(other.title, title) || other.title == title) &&
            (identical(other.subtitle, subtitle) ||
                other.subtitle == subtitle) &&
            (identical(other.summary, summary) || other.summary == summary) &&
            const DeepCollectionEquality().equals(
              other._reportData,
              _reportData,
            ) &&
            const DeepCollectionEquality().equals(other._params, _params) &&
            (identical(other.createdAt, createdAt) ||
                other.createdAt == createdAt));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
    runtimeType,
    id,
    reportType,
    title,
    subtitle,
    summary,
    const DeepCollectionEquality().hash(_reportData),
    const DeepCollectionEquality().hash(_params),
    createdAt,
  );

  /// Create a copy of ReportDetail
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ReportDetailImplCopyWith<_$ReportDetailImpl> get copyWith =>
      __$$ReportDetailImplCopyWithImpl<_$ReportDetailImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$ReportDetailImplToJson(this);
  }
}

abstract class _ReportDetail implements ReportDetail {
  const factory _ReportDetail({
    required final int id,
    required final String reportType,
    required final String title,
    final String? subtitle,
    final ReportSummaryData? summary,
    required final List<Map<String, dynamic>> reportData,
    required final Map<String, dynamic> params,
    required final String createdAt,
  }) = _$ReportDetailImpl;

  factory _ReportDetail.fromJson(Map<String, dynamic> json) =
      _$ReportDetailImpl.fromJson;

  @override
  int get id;
  @override
  String get reportType;
  @override
  String get title;
  @override
  String? get subtitle;
  @override
  ReportSummaryData? get summary;
  @override
  List<Map<String, dynamic>> get reportData;
  @override
  Map<String, dynamic> get params;
  @override
  String get createdAt;

  /// Create a copy of ReportDetail
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ReportDetailImplCopyWith<_$ReportDetailImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

Report _$ReportFromJson(Map<String, dynamic> json) {
  return _Report.fromJson(json);
}

/// @nodoc
mixin _$Report {
  String get reportType => throw _privateConstructorUsedError;
  String get title => throw _privateConstructorUsedError;
  String? get subtitle => throw _privateConstructorUsedError;
  ReportSummaryData? get summary => throw _privateConstructorUsedError;
  List<Map<String, dynamic>> get reportData =>
      throw _privateConstructorUsedError;
  Map<String, dynamic> get params => throw _privateConstructorUsedError;

  /// Serializes this Report to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of Report
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $ReportCopyWith<Report> get copyWith => throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ReportCopyWith<$Res> {
  factory $ReportCopyWith(Report value, $Res Function(Report) then) =
      _$ReportCopyWithImpl<$Res, Report>;
  @useResult
  $Res call({
    String reportType,
    String title,
    String? subtitle,
    ReportSummaryData? summary,
    List<Map<String, dynamic>> reportData,
    Map<String, dynamic> params,
  });

  $ReportSummaryDataCopyWith<$Res>? get summary;
}

/// @nodoc
class _$ReportCopyWithImpl<$Res, $Val extends Report>
    implements $ReportCopyWith<$Res> {
  _$ReportCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of Report
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? reportType = null,
    Object? title = null,
    Object? subtitle = freezed,
    Object? summary = freezed,
    Object? reportData = null,
    Object? params = null,
  }) {
    return _then(
      _value.copyWith(
            reportType: null == reportType
                ? _value.reportType
                : reportType // ignore: cast_nullable_to_non_nullable
                      as String,
            title: null == title
                ? _value.title
                : title // ignore: cast_nullable_to_non_nullable
                      as String,
            subtitle: freezed == subtitle
                ? _value.subtitle
                : subtitle // ignore: cast_nullable_to_non_nullable
                      as String?,
            summary: freezed == summary
                ? _value.summary
                : summary // ignore: cast_nullable_to_non_nullable
                      as ReportSummaryData?,
            reportData: null == reportData
                ? _value.reportData
                : reportData // ignore: cast_nullable_to_non_nullable
                      as List<Map<String, dynamic>>,
            params: null == params
                ? _value.params
                : params // ignore: cast_nullable_to_non_nullable
                      as Map<String, dynamic>,
          )
          as $Val,
    );
  }

  /// Create a copy of Report
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $ReportSummaryDataCopyWith<$Res>? get summary {
    if (_value.summary == null) {
      return null;
    }

    return $ReportSummaryDataCopyWith<$Res>(_value.summary!, (value) {
      return _then(_value.copyWith(summary: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$ReportImplCopyWith<$Res> implements $ReportCopyWith<$Res> {
  factory _$$ReportImplCopyWith(
    _$ReportImpl value,
    $Res Function(_$ReportImpl) then,
  ) = __$$ReportImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    String reportType,
    String title,
    String? subtitle,
    ReportSummaryData? summary,
    List<Map<String, dynamic>> reportData,
    Map<String, dynamic> params,
  });

  @override
  $ReportSummaryDataCopyWith<$Res>? get summary;
}

/// @nodoc
class __$$ReportImplCopyWithImpl<$Res>
    extends _$ReportCopyWithImpl<$Res, _$ReportImpl>
    implements _$$ReportImplCopyWith<$Res> {
  __$$ReportImplCopyWithImpl(
    _$ReportImpl _value,
    $Res Function(_$ReportImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of Report
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? reportType = null,
    Object? title = null,
    Object? subtitle = freezed,
    Object? summary = freezed,
    Object? reportData = null,
    Object? params = null,
  }) {
    return _then(
      _$ReportImpl(
        reportType: null == reportType
            ? _value.reportType
            : reportType // ignore: cast_nullable_to_non_nullable
                  as String,
        title: null == title
            ? _value.title
            : title // ignore: cast_nullable_to_non_nullable
                  as String,
        subtitle: freezed == subtitle
            ? _value.subtitle
            : subtitle // ignore: cast_nullable_to_non_nullable
                  as String?,
        summary: freezed == summary
            ? _value.summary
            : summary // ignore: cast_nullable_to_non_nullable
                  as ReportSummaryData?,
        reportData: null == reportData
            ? _value._reportData
            : reportData // ignore: cast_nullable_to_non_nullable
                  as List<Map<String, dynamic>>,
        params: null == params
            ? _value._params
            : params // ignore: cast_nullable_to_non_nullable
                  as Map<String, dynamic>,
      ),
    );
  }
}

/// @nodoc
@JsonSerializable()
class _$ReportImpl implements _Report {
  const _$ReportImpl({
    required this.reportType,
    required this.title,
    this.subtitle,
    this.summary,
    required final List<Map<String, dynamic>> reportData,
    required final Map<String, dynamic> params,
  }) : _reportData = reportData,
       _params = params;

  factory _$ReportImpl.fromJson(Map<String, dynamic> json) =>
      _$$ReportImplFromJson(json);

  @override
  final String reportType;
  @override
  final String title;
  @override
  final String? subtitle;
  @override
  final ReportSummaryData? summary;
  final List<Map<String, dynamic>> _reportData;
  @override
  List<Map<String, dynamic>> get reportData {
    if (_reportData is EqualUnmodifiableListView) return _reportData;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_reportData);
  }

  final Map<String, dynamic> _params;
  @override
  Map<String, dynamic> get params {
    if (_params is EqualUnmodifiableMapView) return _params;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(_params);
  }

  @override
  String toString() {
    return 'Report(reportType: $reportType, title: $title, subtitle: $subtitle, summary: $summary, reportData: $reportData, params: $params)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ReportImpl &&
            (identical(other.reportType, reportType) ||
                other.reportType == reportType) &&
            (identical(other.title, title) || other.title == title) &&
            (identical(other.subtitle, subtitle) ||
                other.subtitle == subtitle) &&
            (identical(other.summary, summary) || other.summary == summary) &&
            const DeepCollectionEquality().equals(
              other._reportData,
              _reportData,
            ) &&
            const DeepCollectionEquality().equals(other._params, _params));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
    runtimeType,
    reportType,
    title,
    subtitle,
    summary,
    const DeepCollectionEquality().hash(_reportData),
    const DeepCollectionEquality().hash(_params),
  );

  /// Create a copy of Report
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ReportImplCopyWith<_$ReportImpl> get copyWith =>
      __$$ReportImplCopyWithImpl<_$ReportImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$ReportImplToJson(this);
  }
}

abstract class _Report implements Report {
  const factory _Report({
    required final String reportType,
    required final String title,
    final String? subtitle,
    final ReportSummaryData? summary,
    required final List<Map<String, dynamic>> reportData,
    required final Map<String, dynamic> params,
  }) = _$ReportImpl;

  factory _Report.fromJson(Map<String, dynamic> json) = _$ReportImpl.fromJson;

  @override
  String get reportType;
  @override
  String get title;
  @override
  String? get subtitle;
  @override
  ReportSummaryData? get summary;
  @override
  List<Map<String, dynamic>> get reportData;
  @override
  Map<String, dynamic> get params;

  /// Create a copy of Report
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ReportImplCopyWith<_$ReportImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
