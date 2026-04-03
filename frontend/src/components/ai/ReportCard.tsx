import { TrendingUp, TrendingDown, AlertCircle, Lightbulb } from 'lucide-react';
import type { ReportSection } from '../../api';

interface ReportCardProps {
  section: ReportSection;
}

export default function ReportCard({ section }: ReportCardProps) {
  // Format currency (₩)
  const formatCurrency = (value: string): string => {
    if (value.startsWith('₩')) return value;
    const num = parseInt(value.replace(/[^0-9]/g, ''));
    return `₩${num.toLocaleString()}`;
  };

  // Format percentage
  const formatPercent = (value: string): string => {
    if (value.includes('%')) return value;
    return `${value}%`;
  };

  // Get trend icon
  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="text-red-500" size={16} />; // Red for spending increase
      case 'down':
        return <TrendingDown className="text-green-500" size={16} />; // Green for spending decrease
      default:
        return null;
    }
  };

  // Get icon based on section type
  const getIcon = () => {
    switch (section.type) {
      case 'alert':
        return <AlertCircle className="text-yellow-500" size={20} />;
      case 'suggestion':
        return <Lightbulb className="text-blue-500" size={20} />;
      default:
        return null;
    }
  };

  const bgColor = section.type === 'alert' ? 'bg-yellow-50' : section.type === 'suggestion' ? 'bg-blue-50' : 'bg-gray-50';
  const borderColor = section.type === 'alert' ? 'border-yellow-200' : section.type === 'suggestion' ? 'border-blue-200' : 'border-gray-200';

  return (
    <div className={`rounded-lg border ${borderColor} ${bgColor} p-4 space-y-2`}>
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900">{section.title}</h4>
          {section.subtitle && <p className="text-sm text-gray-600">{section.subtitle}</p>}
        </div>
      </div>

      {section.metric && (
        <div className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <span>
            {section.metric.includes('₩')
              ? formatCurrency(section.metric)
              : section.metric.includes('%')
                ? formatPercent(section.metric)
                : section.metric}
          </span>
          {getTrendIcon(section.trend)}
        </div>
      )}

      {section.data && Object.keys(section.data).length > 0 && (
        <div className="text-sm text-gray-600 space-y-1">
          {Object.entries(section.data).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span>{key}:</span>
              <span className="font-medium">
                {typeof value === 'number' && key.toLowerCase().includes('amount')
                  ? `₩${(value as number).toLocaleString()}`
                  : String(value)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
