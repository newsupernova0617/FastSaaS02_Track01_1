import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';

import 'package:flutter_app/core/constants/category_icons.dart';

class CategoryIconBadge extends StatelessWidget {
  final String? category;
  final Color color;
  final double size;
  final double iconSize;
  final bool circular;
  final double? borderRadius;

  const CategoryIconBadge({
    super.key,
    required this.category,
    required this.color,
    this.size = 32,
    this.iconSize = 14,
    this.circular = false,
    this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    final radius = borderRadius ?? (circular ? size / 2 : 12);

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        shape: circular ? BoxShape.circle : BoxShape.rectangle,
        borderRadius: circular ? null : BorderRadius.circular(radius),
      ),
      alignment: Alignment.center,
      child: FaIcon(CategoryIcons.of(category), size: iconSize, color: color),
    );
  }
}
