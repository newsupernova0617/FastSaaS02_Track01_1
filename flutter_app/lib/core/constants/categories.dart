// ============================================================
// [카테고리 정의] categories.dart
// 지출/수입 거래에 사용되는 카테고리 목록을 정의합니다.
// RecordPage의 카테고리 선택 그리드에서 사용됩니다.
// ============================================================
class Categories {
  // 지출 카테고리 목록
  static const List<String> expenseCategories = [
    '식비',      // Food/Dining
    '교통',      // Transportation
    '쇼핑',      // Shopping
    '의료',      // Medical
    '문화여가',  // Entertainment/Leisure
    '월세',      // Rent
    '기타',      // Others
  ];

  // Income Categories
  static const List<String> incomeCategories = [
    '월급',      // Salary
    '부업',      // Side job
    '용돈',      // Allowance
    '기타',      // Others
  ];

  // Get all categories (both expense and income)
  static List<String> getAllExpenseCategories() => expenseCategories;

  static List<String> getAllIncomeCategories() => incomeCategories;

  // Get category index
  static int getExpenseCategoryIndex(String category) {
    return expenseCategories.indexOf(category);
  }

  static int getIncomeCategoryIndex(String category) {
    return incomeCategories.indexOf(category);
  }

  // Check if category exists
  static bool isValidExpenseCategory(String category) {
    return expenseCategories.contains(category);
  }

  static bool isValidIncomeCategory(String category) {
    return incomeCategories.contains(category);
  }
}
