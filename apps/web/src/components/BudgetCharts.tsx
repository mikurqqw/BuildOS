import { Wallet, ArrowUpRight, CircleCheck, CircleDashed } from 'lucide-react';
import { useI18n } from '../i18n/context';
import { budgetTotals } from '@buildos/shared';
type Totals = ReturnType<typeof budgetTotals>;
export function BudgetCharts({
  chart,
  totals,
}: {
  chart: ({ id: string; name: string } & Totals)[];
  totals: Totals;
}) {
  const { t, money, locale } = useI18n();
  const maximum = Math.max(
    1,
    ...chart.map((item) => Math.max(item.planned, item.exposure)),
  );
  const denominator = Math.max(totals.planned, totals.exposure, 1);
  const usage =
    totals.planned > 0
      ? Math.round((totals.exposure / totals.planned) * 100)
      : null;
  const actualArc = (totals.actual / denominator) * 78;
  const committedArc = (totals.committed / denominator) * 78;
  const compact = (value: number) =>
    new Intl.NumberFormat(
      locale === 'en' ? 'en-GB' : locale === 'kk' ? 'kk-KZ' : 'ru-KZ',
      { notation: 'compact', maximumFractionDigits: 1 },
    ).format(value);
  return (
    <div className="budget-studio">
      <section className="panel budget-projects-card">
        <div className="budget-card-heading">
          <div>
            <span className="eyebrow">{t.budgetControl}</span>
            <h2>{t.budgetCompare}</h2>
            <p>{t.budgetScale}</p>
          </div>
          <span className="chart-heading-icon">
            <Wallet size={20} />
          </span>
        </div>
        <div className="budget-comparison-key">
          <span>
            <i className="plan-key" />
            {t.planned}
          </span>
          <span>
            <i className="actual-key" />
            {t.actual}
          </span>
          <span>
            <i className="commit-key" />
            {t.committed}
          </span>
          <small>KZT</small>
        </div>
        <div className="budget-project-plots">
          {chart.map((item, index) => {
            const percent = item.planned
              ? Math.round((item.exposure / item.planned) * 100)
              : null;
            return (
              <article className="budget-project-plot" key={item.id}>
                <header>
                  <span
                    className={`budget-project-number project-color-${index % 3}`}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3>{item.name}</h3>
                    <span>
                      {t.planned}: <strong>{money(item.planned)}</strong>
                    </span>
                  </div>
                  <span
                    className={`budget-use-chip ${percent !== null && percent > 100 ? 'over' : ''}`}
                  >
                    {percent === null ? '—' : `${percent}%`}
                    <small>{t.budgetProjectUsage}</small>
                  </span>
                </header>
                <div
                  className="budget-bullet-plot"
                  role="img"
                  aria-label={`${item.name}: ${t.planned} ${money(item.planned)}, ${t.actual} ${money(item.actual)}, ${t.committed} ${money(item.committed)}`}
                >
                  <div className="budget-scale-grid" aria-hidden="true">
                    {[0, 25, 50, 75, 100].map((value) => (
                      <i key={value} style={{ left: `${value}%` }} />
                    ))}
                  </div>
                  <div className="budget-plan-rail">
                    <span
                      style={{ width: `${(item.planned / maximum) * 100}%` }}
                    />
                  </div>
                  <div className="budget-spend-rail">
                    <span
                      className="actual"
                      style={{ width: `${(item.actual / maximum) * 100}%` }}
                    />
                    <span
                      className="committed"
                      style={{ width: `${(item.committed / maximum) * 100}%` }}
                    />
                  </div>
                </div>
                <footer>
                  <span>{t.budgetUsedAmount}</span>
                  <strong>{money(item.exposure)}</strong>
                </footer>
              </article>
            );
          })}
        </div>
        <div className="budget-scale-labels" aria-hidden="true">
          {[0, 0.25, 0.5, 0.75, 1].map((value) => (
            <span key={value}>{compact(maximum * value)}</span>
          ))}
        </div>
      </section>
      <section className="panel budget-health-card">
        <div className="budget-card-heading">
          <div>
            <span className="eyebrow">{t.costStructure}</span>
            <h2>{t.budgetAllocation}</h2>
          </div>
          <ArrowUpRight size={19} />
        </div>
        <div className="budget-orbit">
          <svg
            viewBox="0 0 240 210"
            role="img"
            aria-label={`${t.budgetUsage}: ${usage === null ? '—' : `${usage}%`}`}
          >
            <defs>
              <linearGradient id="budget-arc" x1="0" y1="0" x2="1" y2="1">
                <stop stopColor="var(--accent)" />
                <stop offset="1" stopColor="var(--chart-indigo)" />
              </linearGradient>
            </defs>
            <g transform="rotate(129.6 120 105)" fill="none" strokeWidth="15">
              <circle
                cx="120"
                cy="105"
                r="80"
                stroke="var(--chart-track)"
                pathLength="100"
                strokeDasharray="78 100"
                strokeLinecap="round"
              />
              <circle
                cx="120"
                cy="105"
                r="80"
                stroke="url(#budget-arc)"
                pathLength="100"
                strokeDasharray={`${actualArc} 100`}
              />
              <circle
                cx="120"
                cy="105"
                r="80"
                stroke="var(--chart-teal)"
                pathLength="100"
                strokeDasharray={`${committedArc} 100`}
                strokeDashoffset={-actualArc}
              />
            </g>
          </svg>
          <div>
            <span>{t.budgetUsage}</span>
            <strong
              className={usage !== null && usage > 100 ? 'danger-text' : ''}
            >
              {usage === null ? '—' : `${usage}%`}
            </strong>
            <small>{t.exposure}</small>
          </div>
        </div>
        <div
          className={`budget-health-note ${totals.variance < 0 ? 'over' : ''}`}
        >
          {totals.variance < 0 ? (
            <CircleDashed size={17} />
          ) : (
            <CircleCheck size={17} />
          )}
          <span>
            {totals.variance < 0 ? t.budgetOverrun : t.budgetAvailable}
            <strong>{money(Math.abs(totals.variance))}</strong>
          </span>
        </div>
        <div className="budget-health-breakdown">
          {[
            { label: t.actual, value: totals.actual, color: 'var(--accent)' },
            {
              label: t.committed,
              value: totals.committed,
              color: 'var(--chart-teal)',
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
        <footer className="budget-health-total">
          <span>{t.budgetPlanTotal}</span>
          <strong>{money(totals.planned)}</strong>
        </footer>
      </section>
    </div>
  );
}
