import { Link, useLocation } from 'react-router-dom';
import { CreditCard, Calendar, PieChart } from 'lucide-react';

export default function BottomNav() {
    const location = useLocation();

    // 하단 네비게이션 메뉴 항목
    const navItems = [
        { path: '/record', label: '기록', icon: CreditCard },
        { path: '/calendar', label: '달력', icon: Calendar },
        { path: '/stats', label: '통계', icon: PieChart },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto bg-white border-t border-gray-200 flex justify-around py-3 pb-6 z-50">
            {navItems.map(({ path, label, icon: Icon }) => {
                // 현재 경로와 일치하면 활성화 상태 (파란색)
                const isActive = location.pathname === path;
                return (
                    <Link
                        key={path}
                        to={path}
                        className={`flex flex-col items-center gap-1 ${isActive ? 'text-blue-500' : 'text-gray-400'
                            }`}
                    >
                        <Icon size={24} />
                        <span className="text-xs font-medium">{label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
