// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'ai_action_response.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$AIActionResponseImpl _$$AIActionResponseImplFromJson(
  Map<String, dynamic> json,
) => _$AIActionResponseImpl(
  success: json['success'] as bool,
  type: json['type'] as String?,
  result: json['result'],
  message: json['message'] as String?,
  content: json['content'] as String?,
  metadata: json['metadata'] as Map<String, dynamic>?,
  error: json['error'] as String?,
);

Map<String, dynamic> _$$AIActionResponseImplToJson(
  _$AIActionResponseImpl instance,
) => <String, dynamic>{
  'success': instance.success,
  'type': instance.type,
  'result': instance.result,
  'message': instance.message,
  'content': instance.content,
  'metadata': instance.metadata,
  'error': instance.error,
};
