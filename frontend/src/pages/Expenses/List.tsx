import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  expenseApi,
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_CATEGORY_COLORS,
  PAYMENT_METHOD_LABELS,
  type Expense,
  type ExpenseCategory,
  type ExpenseListParams,
} from '../../api/expenses';
import { ApiError } from '../../api/client';
import { formatCurrency, formatDate } from '../../lib/format';
import {
  YooAnAlert,
  YooAnButton,
  YooAnEmptyState,
  YooAnPageHeader,
  YooAnPagination,
  YooAnSearchBar,
} from '../../components/yooan';

function errorMessage(e: unknown, fallback: string): string {
  if (e instanceof ApiError && typeof e.message === 'string') return e.message;
  return e instanceof Error ? e.message : fallback;
}

const inputClass =
  'px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';

const PAGE_SIZE = 20;

export default function ExpenseList() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalAmount, setTotalAmount] = useState(0);
  const [byCategory, setByCategory] = useState<Partial<Record<ExpenseCategory, number>>>({});
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [category, setCategory] = useState<ExpenseCategory | ''>('');
  const [contractFilter, setContractFilter] = useState<'' | 'linked' | 'unlinked'>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  async function load(p = page) {
    setLoading(true);
    setListError(null);
    try {
      const params: ExpenseListParams = {
        q: q || undefined,
        category: category || undefined,
        from: from || undefined,
        to: to || undefined,
        take: PAGE_SIZE,
        skip: (p - 1) * PAGE_SIZE,
      };
      if (contractFilter === 'unlinked') params.contractId = 'none';
      const res = await expenseApi.list(params);
      setItems(res.items);
      setTotal(res.total);
      setTotalAmount(res.totalAmount);
      setByCategory(res.byCategory);
    } catch (e) {
      setListError(errorMessage(e, '경비 목록을 불러오지 못했습니다.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, category, contractFilter, from, to]);

  // 필터 변경 시 1페이지로 리셋
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, contractFilter, from, to]);

  function handleSearch() {
    if (page === 1) load(1);
    else setPage(1);
  }

  async function handleDelete(id: string) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await expenseApi.remove(id);
      load(page);
    } catch (e) {
      alert(errorMessage(e, '삭제에 실패했습니다.'));
    }
  }

  function resetFilters() {
    setQ('');
    setCategory('');
    setContractFilter('');
    setFrom('');
    setTo('');
    setPage(1);
  }

  const linkedCount = useMemo(() => items.filter((it) => it.contractId).length, [items]);

  return (
    <div className="space-y-4">
      <YooAnPageHeader
        title="경비 처리"
        description="회사 경비를 등록하고 계약 건에 선택적으로 연결합니다."
        actions={<YooAnButton onClick={() => navigate('/expenses/new')}>+ 새 경비</YooAnButton>}
      />

      {listError && <YooAnAlert>{listError}</YooAnAlert>}

      {/* 합계 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="합계 금액" value={formatCurrency(totalAmount)} highlight />
        <SummaryCard label="총 건수" value={`${items.length}건`} />
        <SummaryCard label="계약 연결" value={`${linkedCount}건`} />
        <SummaryCard label="계약 미연결" value={`${items.length - linkedCount}건`} />
      </div>

      {/* 필터: 다른 목록과 동일하게 YooAnSearchBar + trailing 한 줄 */}
      <YooAnSearchBar
        value={q}
        onChange={setQ}
        onSubmit={handleSearch}
        placeholder="내용 / 거래처 / 비고 검색"
        trailing={
          <>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory | '')}
              className={inputClass}
            >
              <option value="">전체 카테고리</option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{EXPENSE_CATEGORY_LABELS[c]}</option>
              ))}
            </select>
            <select
              value={contractFilter}
              onChange={(e) => setContractFilter(e.target.value as any)}
              className={inputClass}
            >
              <option value="">계약 전체</option>
              <option value="unlinked">계약 미연결</option>
            </select>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className={inputClass}
              aria-label="시작 날짜"
            />
            <span className="text-gray-400 dark:text-gray-500">~</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className={inputClass}
              aria-label="종료 날짜"
            />
            {(q || category || contractFilter || from || to) && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-2 py-1"
              >
                초기화
              </button>
            )}
          </>
        }
      />

      {/* 카테고리별 합계 chip */}
      {Object.keys(byCategory).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {EXPENSE_CATEGORIES.filter((c) => byCategory[c]).map((c) => (
            <span
              key={c}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${EXPENSE_CATEGORY_COLORS[c]}`}
            >
              <span className="font-medium">{EXPENSE_CATEGORY_LABELS[c]}</span>
              <span>{formatCurrency(byCategory[c]!)}</span>
            </span>
          ))}
        </div>
      )}

      {/* 목록 */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">불러오는 중...</div>
        ) : items.length === 0 ? (
          <YooAnEmptyState message="등록된 경비가 없습니다." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-900 text-gray-600 dark:text-gray-400 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">날짜</th>
                  <th className="text-left px-4 py-3 font-medium">카테고리</th>
                  <th className="text-left px-4 py-3 font-medium">내용</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">거래처</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">계약</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">결제</th>
                  <th className="text-right px-4 py-3 font-medium">금액</th>
                  <th className="px-4 py-3 w-24" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700 text-gray-800 dark:text-gray-200">
                {items.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/40">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300">
                      {formatDate(e.expenseDate)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${EXPENSE_CATEGORY_COLORS[e.category]}`}>
                        {EXPENSE_CATEGORY_LABELS[e.category]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/expenses/${e.id}/edit`}
                        className="text-gray-900 dark:text-gray-100 hover:underline"
                      >
                        {e.description}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden lg:table-cell">
                      {e.vendor || '-'}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {e.contract ? (
                        <Link
                          to={`/contracts/${e.contract.id}`}
                          className="text-brand-600 dark:text-brand-400 hover:underline"
                        >
                          {e.contract.contractNumber}
                        </Link>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">미연결</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden md:table-cell whitespace-nowrap">
                      {PAYMENT_METHOD_LABELS[e.paymentMethod]}
                    </td>
                    <td className="px-4 py-3 text-right font-medium whitespace-nowrap">
                      {formatCurrency(Number(e.amount))}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Link
                        to={`/expenses/${e.id}/edit`}
                        className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 mr-2"
                      >
                        수정
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(e.id)}
                        className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <YooAnPagination
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onChange={setPage}
      />
    </div>
  );
}

function SummaryCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${
      highlight
        ? 'bg-brand-50 border-brand-200 dark:bg-brand-500/10 dark:border-brand-500/40'
        : 'bg-white border-gray-200 dark:bg-slate-800 dark:border-slate-700'
    }`}>
      <div className={`text-xs ${highlight ? 'text-brand-700 dark:text-brand-300' : 'text-gray-500 dark:text-gray-400'}`}>
        {label}
      </div>
      <div className={`mt-1 text-lg font-bold ${highlight ? 'text-brand-700 dark:text-brand-200' : 'text-gray-900 dark:text-gray-100'}`}>
        {value}
      </div>
    </div>
  );
}
