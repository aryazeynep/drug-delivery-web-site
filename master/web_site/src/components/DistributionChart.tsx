'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import type { HistogramBin, PieChartDataPoint, LabelCount } from '@/types/dataset';

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: HistogramBin;
    value: number;
  }>;
}

function HistogramTooltip({ active, payload }: ChartTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-medium text-gray-800">{payload[0].payload.range}</p>
        <p className="text-blue-600">Count: {payload[0].value}</p>
      </div>
    );
  }
  return null;
}

interface DistributionHistogramProps {
  data: HistogramBin[];
  height?: number;
}

export function DistributionHistogram({ data, height = 250 }: DistributionHistogramProps) {
  if (!data || data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="range"
          tick={{ fontSize: 11 }}
          interval={0}
          angle={-45}
          textAnchor="end"
          height={60}
        />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip content={<HistogramTooltip />} />
        <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]}>
          {data.map((_, index) => (
            <Cell
              key={`cell-${index}`}
              fill={`hsl(217, 91%, 60%, ${0.5 + (index / data.length) * 0.5})`}
            />
          ))}
          <LabelList dataKey="count" position="top" fontSize={10} fill="#6b7280" />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

interface SmallHistogramProps {
  data: HistogramBin[];
}

export function SmallHistogram({ data }: SmallHistogramProps) {
  if (!data || data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={120}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="2 2" stroke="#e5e7eb" />
        <XAxis
          dataKey="range"
          tick={{ fontSize: 9 }}
          interval={0}
          angle={-45}
          textAnchor="end"
          height={30}
        />
        <YAxis tick={{ fontSize: 9 }} />
        <Tooltip content={<HistogramTooltip />} />
        <Bar dataKey="count" fill="#0891b2" radius={[2, 2, 0, 0]}>
          {data.map((_, index) => (
            <Cell
              key={`cell-${index}`}
              fill={`hsl(187, 83%, 40%, ${0.5 + (index / data.length) * 0.5})`}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

interface DistributionPieChartProps {
  data: PieChartDataPoint[];
  height?: number;
}

export function DistributionPieChart({ data, height = 300 }: DistributionPieChartProps) {
  if (!data || data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
          label={({ name, payload }) => `${name}: ${payload.percentage}`}
          labelLine={{ stroke: '#9ca3af', strokeWidth: 1 }}
        >
          {data.map((_, index) => (
            <Cell
              key={`cell-${index}`}
              fill={`hsl(${220 + index * 25}, 70%, ${50 - index * 3}%)`}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, _name, props) => [
            `${Number(value).toLocaleString()} (${(props.payload as unknown as { percentage: string }).percentage})`,
            'Count',
          ]}
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '8px',
          }}
        />
        <Legend
          verticalAlign="bottom"
          height={36}
          formatter={(value) => <span className="text-sm text-gray-700">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

interface ValueDistributionProps {
  labelCounts: LabelCount[];
  maxCount: number;
}

export function ValueDistribution({ labelCounts, maxCount }: ValueDistributionProps) {
  return (
    <div className="space-y-2">
      {labelCounts.map((item, idx) => (
        <div key={idx} className="flex items-center gap-3">
          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-medium flex items-center justify-center flex-shrink-0">
            {idx + 1}
          </span>
          <div className="flex-1 bg-white rounded-full h-3 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(item.count / maxCount) * 100}%`,
                backgroundColor: `hsl(${220 + idx * 15}, 70%, ${50 - idx * 3}%)`,
              }}
            />
          </div>
          <span className="text-sm font-medium text-gray-700 w-16 text-right flex-shrink-0">
            {item.count.toLocaleString()}
          </span>
          <span
            className="text-xs text-gray-600 max-w-[200px] truncate"
            title={item.label}
          >
            {item.label.length > 20 ? item.label.substring(0, 20) + '...' : item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
