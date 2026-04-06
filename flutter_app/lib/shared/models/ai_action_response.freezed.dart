// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'ai_action_response.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
  'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models',
);

AIActionResponse _$AIActionResponseFromJson(Map<String, dynamic> json) {
  return _AIActionResponse.fromJson(json);
}

/// @nodoc
mixin _$AIActionResponse {
  bool get success => throw _privateConstructorUsedError;
  String? get type =>
      throw _privateConstructorUsedError; // 'create' | 'update' | 'read' | 'delete' | 'report'
  dynamic get result => throw _privateConstructorUsedError;
  String? get message => throw _privateConstructorUsedError;
  String? get content => throw _privateConstructorUsedError;
  Map<String, dynamic>? get metadata => throw _privateConstructorUsedError;
  String? get error => throw _privateConstructorUsedError;

  /// Serializes this AIActionResponse to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of AIActionResponse
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $AIActionResponseCopyWith<AIActionResponse> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $AIActionResponseCopyWith<$Res> {
  factory $AIActionResponseCopyWith(
    AIActionResponse value,
    $Res Function(AIActionResponse) then,
  ) = _$AIActionResponseCopyWithImpl<$Res, AIActionResponse>;
  @useResult
  $Res call({
    bool success,
    String? type,
    dynamic result,
    String? message,
    String? content,
    Map<String, dynamic>? metadata,
    String? error,
  });
}

/// @nodoc
class _$AIActionResponseCopyWithImpl<$Res, $Val extends AIActionResponse>
    implements $AIActionResponseCopyWith<$Res> {
  _$AIActionResponseCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of AIActionResponse
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? success = null,
    Object? type = freezed,
    Object? result = freezed,
    Object? message = freezed,
    Object? content = freezed,
    Object? metadata = freezed,
    Object? error = freezed,
  }) {
    return _then(
      _value.copyWith(
            success: null == success
                ? _value.success
                : success // ignore: cast_nullable_to_non_nullable
                      as bool,
            type: freezed == type
                ? _value.type
                : type // ignore: cast_nullable_to_non_nullable
                      as String?,
            result: freezed == result
                ? _value.result
                : result // ignore: cast_nullable_to_non_nullable
                      as dynamic,
            message: freezed == message
                ? _value.message
                : message // ignore: cast_nullable_to_non_nullable
                      as String?,
            content: freezed == content
                ? _value.content
                : content // ignore: cast_nullable_to_non_nullable
                      as String?,
            metadata: freezed == metadata
                ? _value.metadata
                : metadata // ignore: cast_nullable_to_non_nullable
                      as Map<String, dynamic>?,
            error: freezed == error
                ? _value.error
                : error // ignore: cast_nullable_to_non_nullable
                      as String?,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$AIActionResponseImplCopyWith<$Res>
    implements $AIActionResponseCopyWith<$Res> {
  factory _$$AIActionResponseImplCopyWith(
    _$AIActionResponseImpl value,
    $Res Function(_$AIActionResponseImpl) then,
  ) = __$$AIActionResponseImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    bool success,
    String? type,
    dynamic result,
    String? message,
    String? content,
    Map<String, dynamic>? metadata,
    String? error,
  });
}

/// @nodoc
class __$$AIActionResponseImplCopyWithImpl<$Res>
    extends _$AIActionResponseCopyWithImpl<$Res, _$AIActionResponseImpl>
    implements _$$AIActionResponseImplCopyWith<$Res> {
  __$$AIActionResponseImplCopyWithImpl(
    _$AIActionResponseImpl _value,
    $Res Function(_$AIActionResponseImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of AIActionResponse
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? success = null,
    Object? type = freezed,
    Object? result = freezed,
    Object? message = freezed,
    Object? content = freezed,
    Object? metadata = freezed,
    Object? error = freezed,
  }) {
    return _then(
      _$AIActionResponseImpl(
        success: null == success
            ? _value.success
            : success // ignore: cast_nullable_to_non_nullable
                  as bool,
        type: freezed == type
            ? _value.type
            : type // ignore: cast_nullable_to_non_nullable
                  as String?,
        result: freezed == result
            ? _value.result
            : result // ignore: cast_nullable_to_non_nullable
                  as dynamic,
        message: freezed == message
            ? _value.message
            : message // ignore: cast_nullable_to_non_nullable
                  as String?,
        content: freezed == content
            ? _value.content
            : content // ignore: cast_nullable_to_non_nullable
                  as String?,
        metadata: freezed == metadata
            ? _value._metadata
            : metadata // ignore: cast_nullable_to_non_nullable
                  as Map<String, dynamic>?,
        error: freezed == error
            ? _value.error
            : error // ignore: cast_nullable_to_non_nullable
                  as String?,
      ),
    );
  }
}

/// @nodoc
@JsonSerializable()
class _$AIActionResponseImpl implements _AIActionResponse {
  const _$AIActionResponseImpl({
    required this.success,
    required this.type,
    required this.result,
    required this.message,
    required this.content,
    required final Map<String, dynamic>? metadata,
    required this.error,
  }) : _metadata = metadata;

  factory _$AIActionResponseImpl.fromJson(Map<String, dynamic> json) =>
      _$$AIActionResponseImplFromJson(json);

  @override
  final bool success;
  @override
  final String? type;
  // 'create' | 'update' | 'read' | 'delete' | 'report'
  @override
  final dynamic result;
  @override
  final String? message;
  @override
  final String? content;
  final Map<String, dynamic>? _metadata;
  @override
  Map<String, dynamic>? get metadata {
    final value = _metadata;
    if (value == null) return null;
    if (_metadata is EqualUnmodifiableMapView) return _metadata;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(value);
  }

  @override
  final String? error;

  @override
  String toString() {
    return 'AIActionResponse(success: $success, type: $type, result: $result, message: $message, content: $content, metadata: $metadata, error: $error)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$AIActionResponseImpl &&
            (identical(other.success, success) || other.success == success) &&
            (identical(other.type, type) || other.type == type) &&
            const DeepCollectionEquality().equals(other.result, result) &&
            (identical(other.message, message) || other.message == message) &&
            (identical(other.content, content) || other.content == content) &&
            const DeepCollectionEquality().equals(other._metadata, _metadata) &&
            (identical(other.error, error) || other.error == error));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
    runtimeType,
    success,
    type,
    const DeepCollectionEquality().hash(result),
    message,
    content,
    const DeepCollectionEquality().hash(_metadata),
    error,
  );

  /// Create a copy of AIActionResponse
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$AIActionResponseImplCopyWith<_$AIActionResponseImpl> get copyWith =>
      __$$AIActionResponseImplCopyWithImpl<_$AIActionResponseImpl>(
        this,
        _$identity,
      );

  @override
  Map<String, dynamic> toJson() {
    return _$$AIActionResponseImplToJson(this);
  }
}

abstract class _AIActionResponse implements AIActionResponse {
  const factory _AIActionResponse({
    required final bool success,
    required final String? type,
    required final dynamic result,
    required final String? message,
    required final String? content,
    required final Map<String, dynamic>? metadata,
    required final String? error,
  }) = _$AIActionResponseImpl;

  factory _AIActionResponse.fromJson(Map<String, dynamic> json) =
      _$AIActionResponseImpl.fromJson;

  @override
  bool get success;
  @override
  String? get type; // 'create' | 'update' | 'read' | 'delete' | 'report'
  @override
  dynamic get result;
  @override
  String? get message;
  @override
  String? get content;
  @override
  Map<String, dynamic>? get metadata;
  @override
  String? get error;

  /// Create a copy of AIActionResponse
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$AIActionResponseImplCopyWith<_$AIActionResponseImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
