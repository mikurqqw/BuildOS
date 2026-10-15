import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Wallet, ArrowUpRight } from 'lucide-react';
import { useI18n } from '../i18n/context';
import { budgetTotals } from '@buildos/shared';
type Totals = ReturnType<typeof budgetTotals>;
export function BudgetCharts({
  chart,
  totals,
}: {
  chart: ({ name: string } & Totals)[];
  totals: Totals;
}) {
  const { t, money, locale } = useI18n();
  const compact = (value: number) =>
    new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'ru-KZ', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  const data = [
    { name: t.actual, value: totals.actual, color: 'var(--accent)' },
    { name: t.committed, value: totals.committed, color: 'var(--chart-teal)' },
    {
      name: t.budgetAvailable,
      value: Math.max(0, totals.variance),
      color: 'var(--chart-track)',
    },
  ].filter((item) => item.value > 0);
  const usage =
    totals.planned > 0
      ? Math.round((totals.exposure / totals.planned) * 100)
      : null;
  return (
    <div className="budget-chart-grid">
      <section className="panel budget-comparison">
        <div className="chart-heading">
          <div>
            <span className="eyebrow">
              KZT / {t.budgetControl.toLocaleUpperCase()}
            </span>
            <h2>{t.budgetCompare}</h2>
            <p>{t.budgetCompareHint}</p>
          </div>
          <span className="chart-heading-icon">
            <Wallet size={20} />
          </span>
        </div>
        <div className="chart-key">
          {[
            { name: t.planned, color: 'var(--chart-plan)' },
            { name: t.actual, color: 'var(--accent)' },
            { name: t.committed, color: 'var(--chart-teal)' },
          ].map((item) => (
            <span key={item.name}>
              <i style={{ background: item.color }} />
              {item.name}
            </span>
          ))}
        </div>
        <div
          className="budget-horizontal-chart"
          style={{ height: Math.max(240, chart.length * 84 + 45) }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chart}
              layout="vertical"
              barGap={5}
              barSize={11}
              margin={{ top: 8, right: 24, bottom: 0, left: 0 }}
            >
              <CartesianGrid
                horizontal={false}
                stroke="var(--border)"
                strokeDasharray="3 5"
              />
              <XAxis
                type="number"
                tickFormatter={(value) => compact(Number(value))}
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                tickMargin={12}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={140}
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'var(--text)', fontSize: 11 }}
                tickFormatter={(value) =>
                  String(value).length > 23
                    ? String(value).slice(0, 21) + '…'
                    : String(value)
                }
              />
              <Tooltip
                cursor={{ fill: 'var(--accent-soft)', opacity: 0.3 }}
                formatter={(value) => money(Number(value))}
                contentStyle={{
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '12px 16px',
                  boxShadow: 'var(--shadow)',
                }}
              />
              <Bar
                dataKey="planned"
                name={t.planned}
                fill="var(--chart-plan)"
                radius={[0, 5, 5, 0]}
                isAnimationActive={false}
              />
              <Bar
                dataKey="actual"
                stackId="exposure"
                name={t.actual}
                fill="var(--accent)"
                radius={[0, 0, 0, 0]}
                isAnimationActive={false}
              />
              <Bar
                dataKey="committed"
                stackId="exposure"
                name={t.committed}
                fill="var(--chart-teal)"
                radius={[0, 5, 5, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="panel budget-allocation">
        <div className="chart-heading">
          <div>
            <span className="eyebrow">
              {t.costStructure.toLocaleUpperCase()}
            </span>
            <h2>{t.budgetAllocation}</h2>
          </div>
          <ArrowUpRight size={19} className="muted" />
        </div>
        <div className="budget-donut">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                innerRadius="74%"
                outerRadius="94%"
                startAngle={90}
                endAngle={-270}
                paddingAngle={data.length > 1 ? 3 : 0}
                stroke="none"
                cornerRadius={6}
                isAnimationActive={false}
              >
                {data.map((item) => (
                  <Cell key={item.name} fill={item.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="donut-center">
            <span>{t.budgetUsage}</span>
            <strong
              className={usage !== null && usage > 100 ? 'danger-text' : ''}
            >
              {usage === null ? '—' : `${usage}%`}
            </strong>
            <small>{t.exposure}</small>
          </div>
        </div>
        <div className="allocation-legend">
          {[
            { label: t.actual, value: totals.actual, color: 'var(--accent)' },
            {
              label: t.committed,
              value: totals.committed,
              color: 'var(--chart-teal)',
            },
            {
              label: totals.variance < 0 ? t.budgetOverrun : t.budgetFree,
              value: Math.abs(totals.variance),
              color:
                totals.variance < 0 ? 'var(--signal)' : 'var(--chart-track)',
            },
          ].map((item) => (
            <div key={item.label}>
              <span>
                <i style={{ background: item.color }} />
                {item.label}
              </span>
              <strong>{money(item.value)}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
