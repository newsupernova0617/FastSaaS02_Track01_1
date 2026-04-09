// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'summary_row.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
  'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models',
);

SummaryRow _$SummaryRowFromJson(Map<String, dynamic> json) {
  return _SummaryRow.fromJson(json);
}

/// @nodoc
mixin _$SummaryRow {
  String get type => throw _privateConstructorUsedError; // 'income' | 'expense'
  String get category => throw _privateConstructorUsedError;
  @JsonKey(fromJson: _totalFromJson)
  num get total => throw _privateConstructorUsedError;

  /// Serializes this SummaryRow to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of SummaryRow
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $SummaryRowCopyWith<SummaryRow> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $SummaryRowCopyWith<$Res> {
  factory $SummaryRowCopyWith(
    SummaryRow value,
    $Res Function(SummaryRow) then,
  ) = _$SummaryRowCopyWithImpl<$Res, SummaryRow>;
  @useResult
  $Res call({
    String type,
    String category,
    @JsonKey(fromJson: _totalFromJson) num total,
  });
}

/// @nodoc
class _$SummaryRowCopyWithImpl<$Res, $Val extends SummaryRow>
    implements $SummaryRowCopyWith<$Res> {
  _$SummaryRowCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of SummaryRow
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? type = null,
    Object? category = null,
    Object? total = null,
  }) {
    return _then(
      _value.copyWith(
            type: null == type
                ? _value.type
                : type // ignore: cast_nullable_to_non_nullable
                      as String,
            category: null == category
                ? _value.category
                : category // ignore: cast_nullable_to_non_nullable
                      as String,
            total: null == total
                ? _value.total
                : total // ignore: cast_nullable_to_non_nullable
                      as num,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$SummaryRowImplCopyWith<$Res>
    implements $SummaryRowCopyWith<$Res> {
  factory _$$SummaryRowImplCopyWith(
    _$SummaryRowImpl value,
    $Res Function(_$SummaryRowImpl) then,
  ) = __$$SummaryRowImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    String type,
    String category,
    @JsonKey(fromJson: _totalFromJson) num total,
  });
}

/// @nodoc
class __$$SummaryRowImplCopyWithImpl<$Res>
    extends _$SummaryRowCopyWithImpl<$Res, _$SummaryRowImpl>
    implements _$$SummaryRowImplCopyWith<$Res> {
  __$$SummaryRowImplCopyWithImpl(
    _$SummaryRowImpl _value,
    $Res Function(_$SummaryRowImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of SummaryRow
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? type = null,
    Object? category = null,
    Object? total = null,
  }) {
    return _then(
      _$SummaryRowImpl(
        type: null == type
            ? _value.type
            : type // ignore: cast_nullable_to_non_nullable
                  as String,
        category: null == category
            ? _value.category
            : category // ignore: cast_nullable_to_non_nullable
                  as String,
        total: null == total
            ? _value.total
            : total // ignore: cast_nullable_to_non_nullable
                  as num,
      ),
    );
  }
}

/// @nodoc
@JsonSerializable()
class _$SummaryRowImpl implements _SummaryRow {
  const _$SummaryRowImpl({
    required this.type,
    required this.category,
    @JsonKey(fromJson: _totalFromJson) required this.total,
  });

  factory _$SummaryRowImpl.fromJson(Map<String, dynamic> json) =>
      _$$SummaryRowImplFromJson(json);

  @override
  final String type;
  // 'income' | 'expense'
  @override
  final String category;
  @override
  @JsonKey(fromJson: _totalFromJson)
  final num total;

  @override
  String toString() {
    return 'SummaryRow(type: $type, category: $category, total: $total)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$SummaryRowImpl &&
            (identical(other.type, type) || other.type == type) &&
            (identical(other.category, category) ||
                other.category == category) &&
            (identical(other.total, total) || other.total == total));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, type, category, total);

  /// Create a copy of SummaryRow
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$SummaryRowImplCopyWith<_$SummaryRowImpl> get copyWith =>
      __$$SummaryRowImplCopyWithImpl<_$SummaryRowImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$SummaryRowImplToJson(this);
  }
}

abstract class _SummaryRow implements SummaryRow {
  const factory _SummaryRow({
    required final String type,
    required final String category,
    @JsonKey(fromJson: _totalFromJson) required final num total,
  }) = _$SummaryRowImpl;

  factory _SummaryRow.fromJson(Map<String, dynamic> json) =
      _$SummaryRowImpl.fromJson;

  @override
  String get type; // 'income' | 'expense'
  @override
  String get category;
  @override
  @JsonKey(fromJson: _totalFromJson)
  num get total;

  /// Create a copy of SummaryRow
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$SummaryRowImplCopyWith<_$SummaryRowImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
