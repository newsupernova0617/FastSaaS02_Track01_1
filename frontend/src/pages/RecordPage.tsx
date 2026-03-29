import { useState } from 'react';
import { api } from '../api';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../constants/categories';

export default function RecordPage() {
    // 지출/수입 타입 (기본값: 지출)
    const [type, setType] = useState<'expense' | 'income'>('expense');
    const [amount, setAmount] = useState('');
    // 카테고리 (지출 or 수입에 따라 다른 목록)
    const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
    const [memo, setMemo] = useState('');
    // 거래 날짜 (기본값: 오늘)
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

    // type이 바뀌면 해당 카테고리 목록 적용
    const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // 금액 검증
        if (!amount || Number(amount) <= 0) return alert('금액을 입력해주세요.');

        try {
            // 백엔드에 거래 저장
            await api.addTransaction({
                type,
                amount: Number(amount),
                category,
                memo,
                date,
            });
            alert('저장되었습니다!');
            // 저장 성공하면 폼 초기화
            setAmount('');
            setMemo('');
        } catch (err) {
            console.error(err);
            alert('저장에 실패했습니다.');
        }
    };

    return (
        <div className="p-4 pt-8">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">지출/수입 기록</h1>

            {/* 지출/수입 선택 탭 */}
            <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
                <button
                    onClick={() => { setType('expense'); setCategory(EXPENSE_CATEGORIES[0]); }}
                    className={`flex-1 py-2 rounded-md font-medium transition-all ${type === 'expense' ? 'bg-white shadow text-red-500' : 'text-gray-500'
                        }`}
                >
                    지출
                </button>
                <button
                    onClick={() => { setType('income'); setCategory(INCOME_CATEGORIES[0]); }}
                    className={`flex-1 py-2 rounded-md font-medium transition-all ${type === 'income' ? 'bg-white shadow text-blue-500' : 'text-gray-500'
                        }`}
                >
                    수입
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-2">날짜</label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full bg-white border-0 ring-1 ring-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-400 outline-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-2">금액 (원)</label>
                    <input
                        type="number"
                        inputMode="numeric"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0"
                        className="w-full bg-white border-0 ring-1 ring-gray-200 rounded-xl p-3 text-2xl font-bold focus:ring-2 focus:ring-blue-400 outline-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-2">카테고리</label>
                    {/* type(지출/수입)에 따라 동적으로 카테고리 버튼 렌더링 */}
                    <div className="grid grid-cols-3 gap-2">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => setCategory(cat)}
                                className={`py-2 rounded-lg text-sm font-medium border ${category === cat
                                    ? 'bg-gray-800 text-white border-gray-800'
                                    : 'bg-white text-gray-600 border-gray-200'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-2">메모 (선택)</label>
                    <input
                        type="text"
                        value={memo}
                        onChange={(e) => setMemo(e.target.value)}
                        placeholder="간단한 메모"
                        className="w-full bg-white border-0 ring-1 ring-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-400 outline-none"
                    />
                </div>

                {/* 저장 버튼 - 지출/수입에 따라 색상 변경 */}
                <button
                    type="submit"
                    className={`w-full py-4 rounded-2xl text-lg font-bold text-white shadow-lg transition-transform active:scale-95 ${type === 'expense' ? 'bg-red-500 shadow-red-200' : 'bg-blue-500 shadow-blue-200'
                        }`}
                >
                    저장하기
                </button>
            </form>
        </div>
    );
}
