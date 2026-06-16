import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { getCategoryColor } from '../lib/utils';

interface CategoryDatum {
  name: string;
  value: number;
}

interface Props {
  data: CategoryDatum[];
  total: number;
}

interface LabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  outerRadius: number;
  percent: number;
}

const RADIAN = Math.PI / 180;

function renderLabel({ cx, cy, midAngle, outerRadius, percent }: LabelProps) {
  if (percent < 0.04) return null;
  const radius = outerRadius * 0.65;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={13}
      fontWeight={700}
    >
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  );
}

export default function ProjectsPieChart({ data, total }: Props) {
  return (
    <div className="card p-5 h-full flex flex-col">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="font-display text-lg font-semibold text-navy-900">
          Projects by category
        </h3>
        <span className="text-xs uppercase tracking-wider text-navy-500">ProjectOps</span>
      </div>
      <p className="text-sm text-navy-500 mb-4">Distribution across {total} projects</p>
      <div className="flex-1 min-h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={95}
              paddingAngle={2}
              stroke="#fff"
              strokeWidth={2}
              labelLine={false}
              label={renderLabel}
            >
              {data.map(entry => (
                <Cell key={entry.name} fill={getCategoryColor(entry.name)} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [
                `${value} (${((value / total) * 100).toFixed(1)}%)`,
                name,
              ]}
              contentStyle={{ borderRadius: 6, border: '1px solid #c5cee0', fontSize: 12 }}
            />
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
