import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ReportChart from '../../../src/components/ai/ReportChart';
import type { ReportSection } from '../../../src/api';

// Mock Recharts components
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: ({ data, dataKey, nameKey }: { data: Record<string, unknown>[]; dataKey: string; nameKey: string }) => (
    <div data-testid="pie" data-datakey={dataKey} data-namekey={nameKey}>
      {JSON.stringify(data)}
    </div>
  ),
  BarChart: ({ data, children }: { data: Record<string, unknown>[]; children: React.ReactNode }) => (
    <div data-testid="bar-chart" data-chartdata={JSON.stringify(data)}>{children}</div>
  ),
  Bar: ({ dataKey, fill }: { dataKey: string; fill: string }) => (
    <div data-testid="bar" data-datakey={dataKey} data-fill={fill} />
  ),
  LineChart: ({ data, children }: { data: Record<string, unknown>[]; children: React.ReactNode }) => (
    <div data-testid="line-chart" data-chartdata={JSON.stringify(data)}>{children}</div>
  ),
  Line: ({ dataKey, stroke, type }: { dataKey: string; stroke: string; type: string }) => (
    <div data-testid="line" data-datakey={dataKey} data-stroke={stroke} data-type={type} />
  ),
  CartesianGrid: ({ strokeDasharray }: { strokeDasharray: string }) => (
    <div data-testid="cartesian-grid" data-strokedasharray={strokeDasharray} />
  ),
  XAxis: ({ dataKey }: { dataKey: string }) => (
    <div data-testid="x-axis" data-datakey={dataKey} />
  ),
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: ({ formatter }: { formatter?: (value: unknown) => string }) => (
    <div data-testid="tooltip" data-hasformatter={formatter ? 'true' : 'false'} />
  ),
  Legend: () => <div data-testid="legend" />,
  Cell: ({ fill }: { fill: string }) => (
    <div data-testid="cell" data-fill={fill} />
  ),
}));

describe('ReportChart Component', () => {
  // Test 1: Render PieChart when section.type is 'pie'
  it('should render PieChart when section.type is "pie"', () => {
    const section: ReportSection = {
      type: 'pie',
      title: 'Spending by Category',
      data: [
        { name: 'Food', value: 500 },
        { name: 'Transportation', value: 300 },
      ],
    };

    render(<ReportChart section={section} />);

    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  // Test 2: Render BarChart when section.type is 'bar'
  it('should render BarChart when section.type is "bar"', () => {
    const section: ReportSection = {
      type: 'bar',
      title: 'Monthly Spending',
      data: [
        { name: 'Jan', value: 1000 },
        { name: 'Feb', value: 1200 },
      ],
    };

    render(<ReportChart section={section} />);

    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  // Test 3: Render LineChart when section.type is 'line'
  it('should render LineChart when section.type is "line"', () => {
    const section: ReportSection = {
      type: 'line',
      title: 'Spending Trend',
      data: [
        { name: 'Week 1', value: 500 },
        { name: 'Week 2', value: 600 },
        { name: 'Week 3', value: 550 },
      ],
    };

    render(<ReportChart section={section} />);

    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  // Test 4: Return null when chartData is empty
  it('should return null when chartData is empty', () => {
    const section: ReportSection = {
      type: 'pie',
      title: 'Empty Chart',
      data: [],
    };

    const { container } = render(<ReportChart section={section} />);

    expect(container.firstChild).toBeNull();
  });

  // Test 5: Return null when chartData is not an array
  it('should return null when chartData is not an array', () => {
    const section: ReportSection = {
      type: 'pie',
      title: 'Invalid Chart',
      data: { invalid: 'data' },
    };

    const { container } = render(<ReportChart section={section} />);

    expect(container.firstChild).toBeNull();
  });

  // Test 6: Return null when chartData is undefined
  it('should return null when chartData is undefined', () => {
    const section: ReportSection = {
      type: 'pie',
      title: 'No Data Chart',
    };

    const { container } = render(<ReportChart section={section} />);

    expect(container.firstChild).toBeNull();
  });

  // Test 7: Pass correct dataKey to Pie chart
  it('should pass correct dataKey "value" to Pie component', () => {
    const section: ReportSection = {
      type: 'pie',
      data: [
        { name: 'Category1', value: 100 },
        { name: 'Category2', value: 200 },
      ],
    };

    render(<ReportChart section={section} />);

    const pieElement = screen.getByTestId('pie');
    expect(pieElement).toHaveAttribute('data-datakey', 'value');
    expect(pieElement).toHaveAttribute('data-namekey', 'name');
  });

  // Test 8: Bar chart should render with correct dataKey
  it('should render Bar with correct dataKey for bar chart', () => {
    const section: ReportSection = {
      type: 'bar',
      data: [
        { name: 'Jan', value: 1000 },
        { name: 'Feb', value: 1200 },
      ],
    };

    render(<ReportChart section={section} />);

    const barElement = screen.getByTestId('bar');
    expect(barElement).toHaveAttribute('data-datakey', 'value');
    expect(barElement).toHaveAttribute('data-fill', '#3b82f6');
  });

  // Test 9: Line chart should render with correct dataKey and color
  it('should render Line with correct dataKey and stroke for line chart', () => {
    const section: ReportSection = {
      type: 'line',
      data: [
        { name: 'Week1', value: 500 },
        { name: 'Week2', value: 600 },
      ],
    };

    render(<ReportChart section={section} />);

    const lineElement = screen.getByTestId('line');
    expect(lineElement).toHaveAttribute('data-datakey', 'value');
    expect(lineElement).toHaveAttribute('data-stroke', '#3b82f6');
  });

  // Test 10: Tooltip should format currency values
  it('should render Tooltip with currency formatter', () => {
    const section: ReportSection = {
      type: 'pie',
      data: [
        { name: 'Food', value: 1000 },
      ],
    };

    render(<ReportChart section={section} />);

    const tooltip = screen.getByTestId('tooltip');
    expect(tooltip).toHaveAttribute('data-hasformatter', 'true');
  });

  // Test 11: Chart components should render with ResponsiveContainer
  it('should wrap charts in ResponsiveContainer', () => {
    const section: ReportSection = {
      type: 'bar',
      data: [
        { name: 'Jan', value: 1000 },
      ],
    };

    render(<ReportChart section={section} />);

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });
});
