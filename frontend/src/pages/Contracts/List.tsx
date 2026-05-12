import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  contractApi,
  type Contract,
  type ContractType,
  type ContractPaymentStatus,
  type ContractSummary,
  CONTRACT_TYPE_LABELS,
  CONTRACT_TYPE_COLORS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
} from '../../api/contracts';
import { formatCurrency, formatDate } from '../../lib/format';
import { calcVatBreakdown } from '../../api/quotations';
import { ApiError } from '../../api/client';
import { YooAnAlert, YooAnSearchBar, YooAnSummaryCard, YooAnPagination } from '../../components/yooan';

const PAGE_SIZE = 20;

function errorMessage(e: unknown, fallback: string): string {
  if (e instanceof ApiError && typeof e.message === 'string') return e.message;
  return e instanceof Error ? e.message : fallback;
}

export default function ContractList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const fromQuotationId = searchParams.get('fromQuotation');

  const [items, setItems] = useState<Contract[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState<ContractSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState<ContractType | ''>('');
  const [paymentFilter, setPaymentFilter] = useState<ContractPaymentStatus | ''>('');

  async function load(p = page) {
    setLoading(true);
    setError(null);
    try {
      const [list, sum] = await Promise.all([
        contractApi.list({
          q: q || undefined,
          type: typeFilter || undefined,
          paymentStatus: paymentFilter || undefined,
          take: PAGE_SIZE,
          skip: (p - 1) * PAGE_SIZE,
        }),
        contractApi.summary().catch(() => null),
      ]);
      setItems(list.items);
      setTotal(list.total);
      if (sum) setSummary(sum);
    } catch (e) {
      setError(errorMessage(e, '계약 목록을 불러오지 못했습니다.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, paymentFilter, page]);

  // 필터 변경 시 1페이지로 리셋
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, paymentFilter]);

  function handleSearch() {
    if (page === 1) load(1);
    else setPage(1);
  }

  // 견적서로부터 계약 생성: ?fromQuotation=ID 가 들어오면 신규 페이지로 위임
  useEffect(() => {
    if (!fromQuotationId) return;
    const params = new URLSearchParams({ fromQuotation: fromQuotationId });
    searchParams.delete('fromQuotation');
    setSearchParams(searchParams, { replace: true });
    navigate(`/contracts/new?${params.toString()}`);
  }, [fromQuotationId, navigate, searchParams, setSearchParams]);

  async function handleDelete(c: Contract) {
    if (!confirm(`'${c.title}' 계약을 삭제하시겠습니까?`)) return;
    try {
      await contractApi.remove(c.id);
      await load(page);
    } catch (e) {
      alert(errorMessage(e, '삭제에 실패했습니다.'));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">계약 관리</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">외주/수주 계약을 등록하고 정산을 추적합니다.</p>
        </div>
        <Link
          to="/contracts/new"
          className="inline-flex items-center justify-center px-4 py-2 bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600 text-white text-sm font-medium rounded-md shadow-sm"
        >
          + 새 계약
        </Link>
      </div>

      {summary && <SummaryGrid summary={summary} />}

      <YooAnSearchBar
        value={q}
        onChange={setQ}
        onSubmit={handleSearch}
        placeholder="계약명 / 거래처 / 계약번호"
        trailing={
          <>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as ContractType | '')}
              className="px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 rounded-md text-sm"
            >
              <option value="">전체 유형</option>
              {(Object.keys(CONTRACT_TYPE_LABELS) as ContractType[]).map((k) => (
                <option key={k} value={k}>{CONTRACT_TYPE_LABELS[k]}</option>
              ))}
            </select>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as ContractPaymentStatus | '')}
              className="px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 rounded-md text-sm"
            >
              <option value="">전체 정산</option>
              {(Object.keys(PAYMENT_STATUS_LABELS) as ContractPaymentStatus[]).map((k) => (
                <option key={k} value={k}>{PAYMENT_STATUS_LABELS[k]}</option>
              ))}
            </select>
          </>
        }
      />

      {error && <YooAnAlert>{error}</YooAnAlert>}

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">불러오는 중...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">등록된 계약이 없습니다.</div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-900 text-gray-600 dark:text-gray-400 text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">계약번호</th>
                    <th className="text-center px-4 py-3 font-medium">유형</th>
                    <th className="text-left px-4 py-3 font-medium">계약명 / 거래처</th>
                    <th className="text-right px-4 py-3 font-medium">계약금액</th>
                    <th className="text-right px-4 py-3 font-medium">정산금액</th>
                    <th className="text-center px-4 py-3 font-medium">정산상태</th>
                    <th className="text-left px-4 py-3 font-medium hidden xl:table-cell">기간</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700 text-gray-800 dark:text-gray-200">
                  {items.map((c) => (
                    <tr
                      key={c.id}
                      className="hover:bg-gray-50 dark:hover:bg-slate-700/40 cursor-pointer"
                      onClick={() => navigate(`/contracts/${c.id}`)}
                    >
                      <td className="px-4 py-3 font-mono text-xs align-top">
                        <span className="text-brand-600 dark:text-brand-400">
                          {c.contractNumber}
                        </span>
                        {c.quotation && (
                          <Link
                            to={`/quotations/${c.quotation.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="block mt-1 text-[10px] text-gray-500 dark:text-gray-400 hover:underline"
                          >
                            ← {c.quotation.quotationNumber}
                          </Link>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center align-top">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${CONTRACT_TYPE_COLORS[c.type]}`}>
                          {CONTRACT_TYPE_LABELS[c.type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className="font-medium">{c.title}</span>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{c.counterpartyName}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium align-top whitespace-nowrap">
                        <span className={c.type === 'SALES' ? 'text-brand-700 dark:text-brand-300' : 'text-amber-700 dark:text-amber-300'}>
                          {c.type === 'SALES' ? '+' : '-'}{formatCurrency(c.amount)}
                        </span>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 font-normal mt-0.5">
                          공급가 {formatCurrency(calcVatBreakdown(Number(c.amount), c.vatIncluded ?? true).supply)} · {(c.vatIncluded ?? true) ? 'VAT 포함' : 'VAT 별도'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 align-top whitespace-nowrap">
                        {formatCurrency(c.paidAmount)}
                      </td>
                      <td className="px-4 py-3 text-center align-top">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${PAYMENT_STATUS_COLORS[c.paymentStatus]}`}>
                          {PAYMENT_STATUS_LABELS[c.paymentStatus]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 hidden xl:table-cell align-top whitespace-nowrap">
                        {formatDate(c.startDate)} ~ {formatDate(c.endDate)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap align-top" onClick={(e) => e.stopPropagation()}>
                        <Link to={`/contracts/${c.id}/edit`} className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 text-sm mr-3">수정</Link>
                        <button onClick={() => handleDelete(c)} className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm">삭제</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="md:hidden divide-y divide-gray-200 dark:divide-slate-700">
              {items.map((c) => (
                <li
                  key={c.id}
                  className="p-4 cursor-pointer"
                  onClick={() => navigate(`/contracts/${c.id}`)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${CONTRACT_TYPE_COLORS[c.type]}`}>
                          {CONTRACT_TYPE_LABELS[c.type]}
                        </span>
                        <span className="text-xs font-mono text-brand-600 dark:text-brand-400">{c.contractNumber}</span>
                      </div>
                      <div className="font-medium text-gray-900 dark:text-gray-100 truncate mt-1">{c.title}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{c.counterpartyName}</div>
                    </div>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium shrink-0 ${PAYMENT_STATUS_COLORS[c.paymentStatus]}`}>
                      {PAYMENT_STATUS_LABELS[c.paymentStatus]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-3" onClick={(e) => e.stopPropagation()}>
                    <div>
                      <div className={`font-semibold ${c.type === 'SALES' ? 'text-brand-700 dark:text-brand-300' : 'text-amber-700 dark:text-amber-300'}`}>
                        {c.type === 'SALES' ? '+' : '-'}{formatCurrency(c.amount)}
                      </div>
                      <div className="text-[10px] text-gray-400 dark:text-gray-500">
                        공급가 {formatCurrency(calcVatBreakdown(Number(c.amount), c.vatIncluded ?? true).supply)} · {(c.vatIncluded ?? true) ? 'VAT 포함' : 'VAT 별도'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">정산: {formatCurrency(c.paidAmount)}</div>
                    </div>
                    <div className="text-sm">
                      <Link to={`/contracts/${c.id}/edit`} className="text-gray-600 dark:text-gray-300 mr-3">수정</Link>
                      <button onClick={() => handleDelete(c)} className="text-red-600 dark:text-red-400">삭제</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
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

function SummaryGrid({ summary }: { summary: ContractSummary }) {
  const sales = summary.sales;
  const out = summary.outsourcing;
  const totalContract = summary.total.contractAmount;
  const totalPaid = summary.total.paidAmount;
  const totalOutstanding = totalContract - totalPaid;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <YooAnSummaryCard
        label="전체 계약금"
        value={formatCurrency(totalContract)}
        hint={`${summary.total.count}건`}
        emphasis
      />
      <YooAnSummaryCard
        label="정산 완료"
        value={formatCurrency(totalPaid)}
        tone="success"
        hint={`수주 ${formatCurrency(sales.paidAmount)} · 외주 ${formatCurrency(out.paidAmount)}`}
      />
      <YooAnSummaryCard
        label="미정산 잔액"
        value={formatCurrency(totalOutstanding)}
        tone={totalOutstanding > 0 ? 'danger' : 'neutral'}
        hint={`수주 ${formatCurrency(sales.outstanding)} · 외주 ${formatCurrency(out.outstanding)}`}
      />
      <YooAnSummaryCard
        label="수주/외주 (계약금)"
        value={
          <span className="text-base">
            <span className="text-brand-700 dark:text-brand-300">+{formatCurrency(sales.contractAmount)}</span>
            <span className="text-gray-400 dark:text-gray-500 mx-1.5">/</span>
            <span className="text-amber-700 dark:text-amber-300">-{formatCurrency(out.contractAmount)}</span>
          </span>
        }
        hint={`수주 ${sales.count}건 · 외주 ${out.count}건`}
      />
    </div>
  );
}
