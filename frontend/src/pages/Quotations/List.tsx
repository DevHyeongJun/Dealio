import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  quotationApi,
  calcVatBreakdown,
  type Quotation,
} from '../../api/quotations';
import { formatCurrency, formatDate } from '../../lib/format';
import { YooAnSearchBar, YooAnPagination } from '../../components/yooan';

const PAGE_SIZE = 20;

export default function QuotationList() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Quotation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');

  async function load(p = page) {
    setLoading(true);
    setError(null);
    try {
      const res = await quotationApi.list({
        q: q || undefined,
        take: PAGE_SIZE,
        skip: (p - 1) * PAGE_SIZE,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function handleSearch() {
    if (page === 1) load(1);
    else setPage(1);
  }

  async function handleDelete(id: string) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await quotationApi.remove(id);
      await load(page);
    } catch (e: any) {
      alert(e.message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">견적서 관리</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">발행된 견적서를 조회하고 관리합니다.</p>
        </div>
        <Link
          to="/quotations/new"
          className="inline-flex items-center justify-center px-4 py-2 bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600 text-white text-sm font-medium rounded-md shadow-sm"
        >
          + 새 견적서
        </Link>
      </div>

      <YooAnSearchBar
        value={q}
        onChange={setQ}
        onSubmit={handleSearch}
        placeholder="고객명 또는 견적번호 검색"
      />

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 px-4 py-3 text-sm">{error}</div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">불러오는 중...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">등록된 견적서가 없습니다.</div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-900 text-gray-600 dark:text-gray-400 text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">견적번호</th>
                    <th className="text-left px-4 py-3 font-medium">고객명</th>
                    <th className="text-left px-4 py-3 font-medium">발행일</th>
                    <th className="text-left px-4 py-3 font-medium">유효기한</th>
                    <th className="text-right px-4 py-3 font-medium">금액</th>
                    <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">작성자</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700 text-gray-800 dark:text-gray-200">
                  {items.map((it) => (
                    <tr
                      key={it.id}
                      className="hover:bg-gray-50 dark:hover:bg-slate-700/40 cursor-pointer"
                      onClick={() => navigate(`/quotations/${it.id}`)}
                    >
                      <td className="px-4 py-3 align-top">
                        <span className="text-brand-600 dark:text-brand-400 font-medium font-mono text-xs">
                          {it.quotationNumber}
                        </span>
                        {it.title && (
                          <div className="text-xs text-gray-700 dark:text-gray-300 mt-0.5 truncate max-w-[200px]" title={it.title}>
                            {it.title}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">{it.customerName}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{formatDate(it.issueDate)}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{formatDate(it.validUntil)}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(calcVatBreakdown(Number(it.totalAmount), it.vatIncluded).total)}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs hidden lg:table-cell whitespace-nowrap">
                        {it.createdBy?.name ?? '-'}
                        {it.updatedBy && it.updatedById !== it.createdById && (
                          <span className="block text-gray-400 dark:text-gray-500">수정: {it.updatedBy.name}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <Link
                          to={`/contracts?fromQuotation=${it.id}`}
                          className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-sm mr-3"
                          title="이 견적서를 성사 처리하고 계약을 생성합니다"
                        >
                          계약 생성
                        </Link>
                        <Link to={`/quotations/${it.id}/edit`} className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 text-sm mr-3">수정</Link>
                        <button onClick={() => handleDelete(it.id)} className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm">삭제</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="md:hidden divide-y divide-gray-200 dark:divide-slate-700">
              {items.map((it) => (
                <li
                  key={it.id}
                  className="p-4 cursor-pointer"
                  onClick={() => navigate(`/quotations/${it.id}`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="block text-brand-600 dark:text-brand-400 font-medium truncate">
                        {it.title || it.quotationNumber}
                      </div>
                      {it.title && (
                        <div className="font-mono text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{it.quotationNumber}</div>
                      )}
                      <p className="text-sm text-gray-900 dark:text-gray-100 mt-1 truncate">{it.customerName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {formatDate(it.issueDate)}
                        {it.createdBy && <span className="ml-1.5">· {it.createdBy.name}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3" onClick={(e) => e.stopPropagation()}>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(calcVatBreakdown(Number(it.totalAmount), it.vatIncluded).total)}</span>
                    <div className="text-sm">
                      <Link
                        to={`/contracts?fromQuotation=${it.id}`}
                        className="text-emerald-600 dark:text-emerald-400 mr-3"
                      >
                        계약 생성
                      </Link>
                      <Link to={`/quotations/${it.id}/edit`} className="text-gray-600 dark:text-gray-300 mr-3">수정</Link>
                      <button onClick={() => handleDelete(it.id)} className="text-red-600 dark:text-red-400">삭제</button>
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
