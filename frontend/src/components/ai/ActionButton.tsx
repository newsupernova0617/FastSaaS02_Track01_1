import { useNavigate } from 'react-router-dom';
import { Calendar, BarChart3 } from 'lucide-react';
import type { ChatMessageMetadata } from '../../api';

interface ActionButtonProps {
  metadata?: ChatMessageMetadata;
}

export default function ActionButton({ metadata }: ActionButtonProps) {
  const navigate = useNavigate();

  if (!metadata?.actionType) return null;

  // Determine navigation based on action type
  const shouldNavigateToCalendar = ['create', 'update', 'delete'].includes(metadata.actionType);
  const shouldNavigateToStats = ['read', 'report'].includes(metadata.actionType);

  if (!shouldNavigateToCalendar && !shouldNavigateToStats) return null;

  const handleClick = () => {
    if (shouldNavigateToCalendar && metadata.action?.date) {
      navigate(`/calendar?date=${metadata.action.date}`);
    } else if (shouldNavigateToStats && metadata.report) {
      const params = (metadata.report as Record<string, unknown>).params as Record<string, unknown> | undefined;
      const month = params?.month as string | undefined;
      if (month) {
        navigate(`/stats?month=${month}`);
      } else {
        // Default to current month in YYYY-MM format
        const now = new Date();
        const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        navigate(`/stats?month=${defaultMonth}`);
      }
    } else if (shouldNavigateToStats) {
      // Default to current month in YYYY-MM format
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      navigate(`/stats?month=${month}`);
    }
  };

  const label = shouldNavigateToCalendar ? 'View in Calendar' : 'View Details';
  const Icon = shouldNavigateToCalendar ? Calendar : BarChart3;

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-2 rounded-lg bg-blue-100 px-4 py-2 text-blue-700 hover:bg-blue-200 transition-colors"
    >
      <Icon size={16} />
      {label}
    </button>
  );
}
