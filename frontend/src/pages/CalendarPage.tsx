import { useState, useEffect } from 'react';
import { api, Transaction } from '../api';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function CalendarPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

    const monthStr = currentDate.toISOString().slice(0, 7); // YYYY-MM

    useEffect(() => {
        loadTransactions();
    }, [monthStr]);

    const loadTransactions = async () => {
        try {
            const data = await api.getTransactions(monthStr);
            setTransactions(data);
        } catch (err) {
            console.error(err);
        }
    };

    const nextMonth = () => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)));
    const prevMonth = () => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)));

    // 달력 그리기 로직
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const blanks = Array.from({ length: firstDay }, (_, i) => i);

    const dailyTransactions = transactions.filter(t => t.date === selectedDate);
    const dailyTotalIncome = dailyTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const dailyTotalExpense = dailyTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

    // 날짜별 합계 계산 (달력에 표시용)
    const getDailySummary = (day: number) => {
        const d = `${monthStr}-${String(day).padStart(2, '0')}`;
        const dayTs = transactions.filter(t => t.date === d);
        const income = dayTs.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
        const expense = dayTs.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
        return { income, expense };
    };

    return (
        <div className="p-4 pt-8">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-800">{year}년 {month + 1}월</h1>
                <div className="flex gap-2">
                    <button onClick={prevMonth} className="p-2 bg-white rounded-full border border-gray-100 shadow-sm active:scale-90 transition-transform">
                        <ChevronLeft size={20} />
                    </button>
                    <button onClick={nextMonth} className="p-2 bg-white rounded-full border border-gray-100 shadow-sm active:scale-90 transition-transform">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
                <div className="grid grid-cols-7 mb-2 text-center text-xs font-bold text-gray-400">
                    {['일', '월', '화', '수', '목', '금', '토'].map(d => <div key={d} className={d === '일' ? 'text-red-400' : d === '토' ? 'text-blue-400' : ''}>{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-y-2">
                    {blanks.map(b => <div key={`b-${b}`} />)}
                    {days.map(d => {
                        const fullDate = `${monthStr}-${String(d).padStart(2, '0')}`;
                        const isSelected = selectedDate === fullDate;
                        const { income, expense } = getDailySummary(d);

                        return (
                            <button
                                key={d}
                                onClick={() => setSelectedDate(fullDate)}
                                className={`flex flex-col items-center py-2 rounded-xl transition-all ${isSelected ? 'bg-blue-50 ring-1 ring-blue-300' : 'hover:bg-gray-50'
                                    }`}
                            >
                                <span className={`text-sm font-semibold mb-1 ${new Date(year, month, d).getDay() === 0 ? 'text-red-500' :
                                        new Date(year, month, d).getDay() === 6 ? 'text-blue-500' : 'text-gray-700'
                                    }`}>{d}</span>
                                <div className="space-y-[2px]">
                                    {income > 0 && <div className="w-1 h-1 bg-blue-400 rounded-full mx-auto" />}
                                    {expense > 0 && <div className="w-1 h-1 bg-red-400 rounded-full mx-auto" />}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-end px-2">
                    <h2 className="text-lg font-bold text-gray-700">{selectedDate.slice(8, 10)}일 내역</h2>
                    <div className="text-xs space-x-2">
                        <span className="text-blue-500 font-medium">+ {dailyTotalIncome.toLocaleString()}</span>
                        <span className="text-red-500 font-medium">- {dailyTotalExpense.toLocaleString()}</span>
                    </div>
                </div>

                <div className="space-y-2">
                    {dailyTransactions.length === 0 ? (
                        <div className="bg-white rounded-2xl p-8 text-center text-gray-400 border border-dashed border-gray-200">내역이 없습니다.</div>
                    ) : (
                        dailyTransactions.map(t => (
                            <div key={t.id} className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm border border-gray-50">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${t.type === 'income' ? 'bg-blue-50 text-blue-500' : 'bg-red-50 text-red-500'
                                        }`}>
                                        {t.category.slice(0, 2)}
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-800">{t.category}</div>
                                        {t.memo && <div className="text-xs text-gray-400">{t.memo}</div>}
                                    </div>
                                </div>
                                <div className={`font-bold ${t.type === 'income' ? 'text-blue-500' : 'text-red-500'}`}>
                                    {t.type === 'income' ? '+' : '-'} {t.amount.toLocaleString()}원
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
