import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ReportSection } from '../../api';

interface ReportChartProps {
  section: ReportSection;
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

export default function ReportChart({ section }: ReportChartProps) {
  const chartData = section.data as Record<string, unknown>[];

  if (!chartData || !Array.isArray(chartData) || chartData.length === 0) {
    return null;
  }

  // PIE CHART
  if (section.type === 'pie') {
    return (
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `₩${(value as number).toLocaleString()}`} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // BAR CHART
  if (section.type === 'bar') {
    return (
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(value) => `₩${(value as number).toLocaleString()}`} />
            <Legend />
            <Bar dataKey="value" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // LINE CHART
  if (section.type === 'line') {
    return (
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(value) => `₩${(value as number).toLocaleString()}`} />
            <Legend />
            <Line type="monotone" dataKey="value" stroke="#3b82f6" dot />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Default: no chart for other types (card, alert, suggestion)
  return null;
}
