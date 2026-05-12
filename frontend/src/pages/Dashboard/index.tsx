import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Bar,
} from 'recharts';
import { dashboardApi, type DashboardResponse } from '../../api/dashboard';
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_CATEGORY_COLORS,
  type ExpenseCategory,
} from '../../api/expenses';
import { formatCurrency, formatDate } from '../../lib/format';
import { ApiError } from '../../api/client';
import { YooAnAlert, YooAnPageHeader } from '../../components/yooan';

function errorMessage(e: unknown, fb: string): string {
  if (e instanceof ApiError && typeof e.message === 'string') return e.message;
  return e instanceof Error ? e.message : fb;
}

function formatShortKRW(n: number): string {
  if (Math.abs(n) >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`;
  if (Math.abs(n) >= 10_000) return `${Math.round(n / 10_000).toLocaleString()}만`;
  return n.toLocaleString();
}

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  return formatDate(iso);
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    dashboardApi.get()
      .then((res) => { if (alive) setData(res); })
      .catch((e) => { if (alive) setError(errorMessage(e, '대시보드를 불러오지 못했습니다.')); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  if (loading && !data) {
    return <div className="p-8 text-center text-gray-500 dark:text-gray-400">불러오는 중...</div>;
  }
  if (error) return <YooAnAlert>{error}</YooAnAlert>;
  if (!data) return null;

  const { revenue, monthly, topCustomers, expenseTotal, expenseByCategory,
    recentActivity } = data;

  // Chart A — 매출 누적 (5 series)
  const revenueChartData = monthly.map((m) => ({
    month: `${m.month}월`,
    '수주 정산': m.salesPaidCum,
    '수주 미정산': m.salesUnpaidCum,
    '외주 정산': m.outsourcingPaidCum,
    '외주 미정산': m.outsourcingUnpaidCum,
    '순수주': m.netCum,
  }));

  // Chart B — flow(월별 막대) + stock(누적 라인)
  const cashChartData = monthly.map((m) => ({
    month: `${m.month}월`,
    // 막대 — 그 달의 실제 현금 흐름
    '들어온 돈': m.salesPaid,
    '나간 돈': m.outsourcingPaid + m.expense,
    // 라인 — 미정산 누적 잔액 (받아야 할 / 줘야 할)
    '들어올 돈 (누적)': m.salesUnpaidCum,
    '나갈 돈 (누적)': m.outsourcingUnpaidCum,
  }));

  return (
    <div className="space-y-4">
      <YooAnPageHeader
        title={`${data.year}년 대시보드`}
        description="올해 매출/계약/경비 현황과 최근 활동을 한눈에 확인합니다."
      />

      {/* KPI 카드 5종 — 순수주 / 수주 / 외주 / 경비 / 미정산 */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard label="순수주" value={formatCurrency(revenue.netTotal)} sub={`정산 기준 ${formatShortKRW(revenue.netPaid)}`} />
        <KpiCard label="수주 매출" value={formatCurrency(revenue.salesTotal)} sub={`정산 ${formatShortKRW(revenue.salesPaid)} / 미정산 ${formatShortKRW(revenue.salesUnpaid)}`} accent />
        <KpiCard label="외주 (지급)" value={formatCurrency(revenue.outsourcingTotal)} sub={`정산 ${formatShortKRW(revenue.outsourcingPaid)} / 미정산 ${formatShortKRW(revenue.outsourcingUnpaid)}`} />
        <KpiCard label="경비" value={formatCurrency(expenseTotal)} sub={`${Object.keys(expenseByCategory).length}개 카테고리`} />
        <KpiCard label="미정산" value={formatCurrency(revenue.salesUnpaid)} sub={`외주 미정산 ${formatShortKRW(revenue.outsourcingUnpaid)}`} />
      </div>

      {/* 전망 패널 — 큰 숫자로 +/- 한눈에 */}
      <ForecastPanel
        confirmed={revenue.salesPaid - revenue.outsourcingPaid - expenseTotal}
        forecast={revenue.netTotal - expenseTotal}
        salesTotal={revenue.salesTotal}
        outsourcingTotal={revenue.outsourcingTotal}
        expenseTotal={expenseTotal}
      />

      {/* 차트 2종 — 매출 누적 / 현금 흐름 */}
      <div className="grid grid-cols-12 gap-4">
        <section className="col-span-12 lg:col-span-6 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100">매출 누적 추이</h3>
            <span className="text-xs text-gray-400 dark:text-gray-500">시리즈 클릭으로 토글</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatShortKRW(v)} stroke="#9ca3af" width={70} />
                <Tooltip formatter={(v) => formatCurrency(Number(v) || 0)} contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="수주 정산" stroke="#2563EB" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="수주 미정산" stroke="#60A5FA" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 2 }} />
                <Line type="monotone" dataKey="외주 정산" stroke="#D97706" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="외주 미정산" stroke="#FBBF24" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 2 }} />
                <Line type="monotone" dataKey="순수주" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="col-span-12 lg:col-span-6 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100">현금 흐름 / 미정산</h3>
            <span className="text-xs text-gray-400 dark:text-gray-500">막대=월별 흐름 · 점선=누적 미정산</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={cashChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatShortKRW(v)} stroke="#9ca3af" width={70} />
                <Tooltip formatter={(v) => formatCurrency(Number(v) || 0)} contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {/* 월별 흐름 — 막대 */}
                <Bar dataKey="들어온 돈" fill="#10B981" barSize={14} />
                <Bar dataKey="나간 돈" fill="#EF4444" barSize={14} />
                {/* 미정산 누적 — 라인 (점선) */}
                <Line type="monotone" dataKey="들어올 돈 (누적)" stroke="#0EA5E9" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 2 }} />
                <Line type="monotone" dataKey="나갈 돈 (누적)" stroke="#F59E0B" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Top 5 고객 + 경비 카테고리 chip */}
      <div className="grid grid-cols-12 gap-4">
        <section className="col-span-12 lg:col-span-7 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-5">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">매출 Top 5 고객</h3>
          {topCustomers.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">올해 수주 데이터가 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {topCustomers.map((c, idx) => {
                const max = topCustomers[0].totalAmount || 1;
                const pct = (c.totalAmount / max) * 100;
                return (
                  <li key={c.customerId ?? c.name} className="text-sm">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 text-xs font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{c.name}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{c.count}건</span>
                      </div>
                      <span className="font-bold text-gray-900 dark:text-gray-100 shrink-0">
                        {formatCurrency(c.totalAmount)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-1.5">
                      <div
                        className="bg-brand-500 dark:bg-brand-400 h-full rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="col-span-12 lg:col-span-5 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100">경비 카테고리별</h3>
            <Link to="/expenses" className="text-xs text-brand-600 dark:text-brand-400 hover:underline">전체 보기 →</Link>
          </div>
          {Object.keys(expenseByCategory).length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">올해 등록된 경비가 없습니다.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {EXPENSE_CATEGORIES.filter((c) => expenseByCategory[c]).map((c: ExpenseCategory) => (
                <span
                  key={c}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${EXPENSE_CATEGORY_COLORS[c]}`}
                >
                  <span className="font-medium">{EXPENSE_CATEGORY_LABELS[c]}</span>
                  <span>{formatCurrency(expenseByCategory[c]!)}</span>
                </span>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* 최근 활동 타임라인 */}
      <section className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-5">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">최근 활동</h3>
        {recentActivity.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">활동이 없습니다.</p>
        ) : (
          <ul className="space-y-2.5">
            {recentActivity.map((a, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className={`shrink-0 w-1.5 h-1.5 rounded-full mt-2 ${ACTIVITY_DOT[a.type]}`} />
                <div className="min-w-0 flex-1">
                  <Link to={a.link} className="text-sm text-gray-900 dark:text-gray-100 hover:underline">
                    {a.title}
                  </Link>
                  {a.subtitle && (
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{a.subtitle}</span>
                  )}
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{timeAgo(a.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const ACTIVITY_DOT: Record<string, string> = {
  QUOTATION_CREATED: 'bg-brand-500',
  QUOTATION_SENT: 'bg-blue-500',
  CONTRACT_CREATED: 'bg-emerald-500',
  EXPENSE_CREATED: 'bg-amber-500',
};

function ForecastPanel({
  confirmed, forecast, salesTotal, outsourcingTotal, expenseTotal,
}: {
  confirmed: number;
  forecast: number;
  salesTotal: number;
  outsourcingTotal: number;
  expenseTotal: number;
}) {
  const positive = forecast >= 0;
  return (
    <section className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">올해 전망 — 예상 순이익</div>
          <div className={`mt-1 text-3xl font-bold tabular-nums ${
            positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {positive ? '+ ' : '- '}{formatCurrency(Math.abs(forecast))}
            <span className="ml-2 text-sm font-normal text-gray-400 dark:text-gray-500">
              {positive ? '↗' : '↘'}
            </span>
          </div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            수주 {formatShortKRW(salesTotal)} − 외주 {formatShortKRW(outsourcingTotal)} − 경비 {formatShortKRW(expenseTotal)}
          </div>
        </div>

        <div className="sm:text-right">
          <div className="text-xs text-gray-500 dark:text-gray-400">확정 손익 (정산 기준)</div>
          <div className={`mt-1 text-lg font-bold tabular-nums ${
            confirmed >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'
          }`}>
            {confirmed >= 0 ? '+ ' : '- '}{formatCurrency(Math.abs(confirmed))}
          </div>
          <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            미정산 정산되면 {positive && confirmed < forecast
              ? `+${formatShortKRW(forecast - confirmed)} 추가`
              : '추가 변동'}
          </div>
        </div>
      </div>
    </section>
  );
}

function KpiCard({
  label, value, sub, accent, danger,
}: {
  label: string;
  value: string;
  sub?: string;
  /** true 면 값(value) 글씨색만 brand 색으로 포인트 */
  accent?: boolean;
  /** true 면 값을 붉은색으로 (경고/미정산 등) */
  danger?: boolean;
}) {
  const valueColor = danger
    ? 'text-red-600 dark:text-red-400'
    : accent
      ? 'text-brand-600 dark:text-brand-400'
      : 'text-gray-900 dark:text-gray-100';
  return (
    <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
      <div className={`mt-1 text-xl font-bold tabular-nums ${valueColor}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate" title={sub}>{sub}</div>}
    </div>
  );
}
