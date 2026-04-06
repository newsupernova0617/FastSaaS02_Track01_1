import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ReportCard from '../../../src/components/ai/ReportCard';
import type { ReportSection } from '../../../src/api';

describe('ReportCard Component', () => {
  // Test 1: Card type should have gray background
  it('should render card type with gray background and border', () => {
    const section: ReportSection = {
      type: 'card',
      title: 'Monthly Spending',
      metric: '₩1,200,000',
    };

    const { container } = render(<ReportCard section={section} />);

    const cardContainer = container.querySelector('.rounded-lg.border');
    expect(cardContainer).toHaveClass('bg-gray-50', 'border-gray-200');
  });

  // Test 2: Alert type should have yellow background
  it('should render alert type with yellow background and AlertCircle icon', () => {
    const section: ReportSection = {
      type: 'alert',
      title: 'High Spending Alert',
      subtitle: 'You exceeded your monthly budget',
    };

    const { container } = render(<ReportCard section={section} />);

    const cardContainer = container.querySelector('.rounded-lg.border');
    expect(cardContainer).toHaveClass('bg-yellow-50', 'border-yellow-200');
  });

  // Test 3: Suggestion type should have blue background
  it('should render suggestion type with blue background and Lightbulb icon', () => {
    const section: ReportSection = {
      type: 'suggestion',
      title: 'Save More Suggestion',
      subtitle: 'Consider cutting back on dining',
    };

    const { container } = render(<ReportCard section={section} />);

    const cardContainer = container.querySelector('.rounded-lg.border');
    expect(cardContainer).toHaveClass('bg-blue-50', 'border-blue-200');
  });

  // Test 4: Currency formatting with ₩ symbol already present
  it('should display pre-formatted currency metric with ₩', () => {
    const section: ReportSection = {
      type: 'card',
      title: 'Spending',
      metric: '₩1,000,000',
    };

    const { container } = render(<ReportCard section={section} />);

    // Component displays metric as-is when it already contains ₩
    const metricValue = container.querySelector('.text-lg.font-bold');
    expect(metricValue?.textContent).toMatch(/₩1,000,000/);
  });

  // Test 5: Trend icon for 'up' trend (should be red)
  it('should render TrendingUp icon in red when trend is "up"', () => {
    const section: ReportSection = {
      type: 'card',
      title: 'Spending Increase',
      metric: '₩500,000',
      trend: 'up',
    };

    render(<ReportCard section={section} />);

    // TrendingUp icon should be rendered with text-red-500 class
    const trendIcon = document.querySelector('.text-red-500');
    expect(trendIcon).toBeInTheDocument();
  });

  // Test 6: Trend icon for 'down' trend (should be green)
  it('should render TrendingDown icon in green when trend is "down"', () => {
    const section: ReportSection = {
      type: 'card',
      title: 'Spending Decrease',
      metric: '₩300,000',
      trend: 'down',
    };

    render(<ReportCard section={section} />);

    // TrendingDown icon should be rendered with text-green-500 class
    const trendIcon = document.querySelector('.text-green-500');
    expect(trendIcon).toBeInTheDocument();
  });

  // Test 7: Render data key-value pairs
  it('should render section.data key-value pairs', () => {
    const section: ReportSection = {
      type: 'card',
      title: 'Breakdown',
      data: {
        'Food & Dining': 250000,
        'Transportation': 150000,
        'Shopping': 200000,
      },
    };

    render(<ReportCard section={section} />);

    expect(screen.getByText(/Food & Dining:/)).toBeInTheDocument();
    expect(screen.getByText(/Transportation:/)).toBeInTheDocument();
    expect(screen.getByText(/Shopping:/)).toBeInTheDocument();
  });

  // Test 8: Format amount fields in data with ₩ prefix
  it('should format amount fields in data with currency prefix', () => {
    const section: ReportSection = {
      type: 'card',
      title: 'Category Amounts',
      data: {
        'Food Amount': 500000,
        'Category': 'Food',
      },
    };

    render(<ReportCard section={section} />);

    // Amount field should be formatted as currency
    expect(screen.getByText(/₩500,000/)).toBeInTheDocument();
  });

  // Test 9: Render subtitle when provided
  it('should render subtitle when provided', () => {
    const section: ReportSection = {
      type: 'card',
      title: 'Monthly Report',
      subtitle: 'January 2024 Summary',
    };

    render(<ReportCard section={section} />);

    expect(screen.getByText('January 2024 Summary')).toBeInTheDocument();
  });

  // Test 10: Not render subtitle when not provided
  it('should not render subtitle when not provided', () => {
    const section: ReportSection = {
      type: 'card',
      title: 'Monthly Report',
    };

    const { container } = render(<ReportCard section={section} />);

    const subtitleElements = container.querySelectorAll('p.text-sm.text-gray-600');
    expect(subtitleElements.length).toBe(0);
  });

  // Test 11: Not render metric when not provided
  it('should not render metric section when metric is undefined', () => {
    const section: ReportSection = {
      type: 'card',
      title: 'No Metric',
    };

    const { container } = render(<ReportCard section={section} />);

    const metricElements = container.querySelectorAll('div.flex.items-center.gap-2.text-lg');
    expect(metricElements.length).toBe(0);
  });
});
