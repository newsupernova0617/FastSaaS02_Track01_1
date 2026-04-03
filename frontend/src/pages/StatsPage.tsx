import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import type { SummaryRow } from '../api';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6B7280'];

export default function StatsPage() {
    const [searchParams] = useSearchParams();
    const [currentDate, setCurrentDate] = useState(new Date());
    // 월별 카테고리 합계 데이터
    const [summary, setSummary] = useState<SummaryRow[]>([]);

    // 현재 표시 중인 월 (YYYY-MM 형식)
    const monthStr = currentDate.toISOString().slice(0, 7);

    // Query parameter에서 month가 전달되면 해당 월로 이동
    useEffect(() => {
        const monthParam = searchParams.get('month');
        if (monthParam) {
            // monthParam 형식: YYYY-MM
            const [year, month] = monthParam.split('-');
            if (year && month) {
                const parsedYear = parseInt(year, 10);
                const parsedMonth = parseInt(month, 10) - 1; // JavaScript months are 0-indexed
                if (!isNaN(parsedYear) && !isNaN(parsedMonth) && parsedMonth >= 0 && parsedMonth <= 11) {
                    setCurrentDate(new Date(parsedYear, parsedMonth, 1));
                }
            }
        }
    }, [searchParams]);

    // monthStr이 바뀔 때마다 데이터 로드
    useEffect(() => {
        loadSummary();
    }, [monthStr]);

    // API에서 월별 카테고리별 합계 조회
    const loadSummary = async () => {
        try {
            const data = await api.getSummary(monthStr);
            setSummary(data);
        } catch (err) {
            console.error(err);
        }
    };

    const nextMonth = () => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)));
    const prevMonth = () => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)));

    // 원형차트용 지출 데이터 (카테고리별 합계)
    const expenseData = summary
        .filter(s => s.type === 'expense')
        .map(s => ({ name: s.category, value: Number(s.total) }));

    // 총 지출 합계
    const totalExpense = expenseData.reduce((acc, curr) => acc + curr.value, 0);
    // 총 수입 합계
    const totalIncome = summary
        .filter(s => s.type === 'income')
        .reduce((acc, curr) => acc + Number(curr.total), 0);

    return (
        <div className="p-4 pt-8">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-bold text-gray-800">{currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월 통계</h1>
                <div className="flex gap-2">
                    <button onClick={prevMonth} className="p-2 bg-white rounded-full border border-gray-100 shadow-sm active:scale-90 transition-transform">
                        <ChevronLeft size={20} />
                    </button>
                    <button onClick={nextMonth} className="p-2 bg-white rounded-full border border-gray-100 shadow-sm active:scale-90 transition-transform">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* 총합 카드 */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-white rounded-2xl p-4 border border-gray-50 shadow-sm transition-all hover:shadow-md">
                    <div className="text-xs text-gray-400 mb-1 font-medium">총 지출</div>
                    <div className="text-lg font-bold text-red-500">{totalExpense.toLocaleString()}원</div>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-gray-50 shadow-sm transition-all hover:shadow-md">
                    <div className="text-xs text-gray-400 mb-1 font-medium">총 수입</div>
                    <div className="text-lg font-bold text-blue-500">{totalIncome.toLocaleString()}원</div>
                </div>
            </div>

            {/* 지출 구성 원형차트 */}
            <div className="bg-white rounded-3xl p-6 border border-gray-50 shadow-sm relative overflow-hidden mb-8">
                <h2 className="text-lg font-bold text-gray-700 mb-2">지출 카테고리 구성</h2>
                {expenseData.length > 0 ? (
                    <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RePieChart>
                                {/* 도넛 차트 (innerRadius로 중앙 비우기) */}
                                <Pie
                                    data={expenseData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {expenseData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend layout="vertical" align="right" verticalAlign="middle" />
                            </RePieChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="h-[200px] flex items-center justify-center text-gray-400 border border-dashed border-gray-100 rounded-xl mt-4">
                        데이터가 없습니다.
                    </div>
                )}
            </div>

            {/* 지출 카테고리별 상세 비율 */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-800 px-1">지출 상세 비율</h2>
                <div className="space-y-3">
                    {/* 지출이 많은 순서대로 정렬 */}
                    {expenseData.sort((a, b) => b.value - a.value).map((item, idx) => {
                        // 백분율 계산
                        const percentage = ((item.value / totalExpense) * 100).toFixed(1);
                        return (
                            <div key={item.name} className="bg-white rounded-2xl p-5 border border-gray-50 shadow-sm">
                                <div className="flex justify-between mb-3">
                                    <span className="font-bold text-gray-700 flex items-center gap-2">
                                        {/* 카테고리 색상 표시 */}
                                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                        {item.name}
                                    </span>
                                    <span className="font-bold text-gray-800">{percentage}%</span>
                                </div>
                                {/* 진행률 바 */}
                                <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-1000"
                                        style={{
                                            backgroundColor: COLORS[idx % COLORS.length],
                                            width: `${percentage}%`
                                        }}
                                    />
                                </div>
                                {/* 절대 금액 */}
                                <div className="mt-2 text-right text-sm text-gray-400 font-medium">
                                    {item.value.toLocaleString()}원
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
