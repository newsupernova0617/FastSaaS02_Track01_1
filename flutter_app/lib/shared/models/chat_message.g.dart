// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'chat_message.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$ChatMessageImpl _$$ChatMessageImplFromJson(Map<String, dynamic> json) =>
    _$ChatMessageImpl(
      id: (json['id'] as num).toInt(),
      sessionId: (json['sessionId'] as num?)?.toInt(),
      userId: json['userId'] as String?,
      role: json['role'] as String,
      content: json['content'] as String,
      metadata: _metadataFromJson(json['metadata']),
      createdAt: json['createdAt'] as String,
    );

Map<String, dynamic> _$$ChatMessageImplToJson(_$ChatMessageImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'sessionId': instance.sessionId,
      'userId': instance.userId,
      'role': instance.role,
      'content': instance.content,
      'metadata': _metadataToJson(instance.metadata),
      'createdAt': instance.createdAt,
    };
