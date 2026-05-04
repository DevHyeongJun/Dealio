import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  quotationApi,
  type Quotation,
  type QuotationStatus,
  STATUS_COLORS,
  STATUS_LABELS,
} from '../../api/quotations';
import { formatCurrency, formatDate } from '../../lib/format';

export default function QuotationList() {
  const [items, setItems] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<QuotationStatus | ''>('');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await quotationApi.list({ q: q || undefined, status: status || undefined });
      setItems(res.items);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await quotationApi.remove(id);
      setItems((prev) => prev.filter((it) => it.id !== id));
    } catch (e: any) {
      alert(e.message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">견적서 관리</h2>
          <p className="text-sm text-gray-500 mt-1">발행된 견적서를 조회하고 관리합니다.</p>
        </div>
        <Link
          to="/quotations/new"
          className="inline-flex items-center justify-center px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-md shadow-sm"
        >
          + 새 견적서
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-4 flex flex-col sm:flex-row gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
          placeholder="고객명 또는 견적번호 검색"
          className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as QuotationStatus | '')}
          className="px-3 py-2 border rounded-md text-sm bg-white"
        >
          <option value="">전체 상태</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button
          onClick={load}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white text-sm rounded-md"
        >
          검색
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>
      )}

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">불러오는 중...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-gray-500">등록된 견적서가 없습니다.</div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">견적번호</th>
                    <th className="text-left px-4 py-3 font-medium">고객명</th>
                    <th className="text-left px-4 py-3 font-medium">발행일</th>
                    <th className="text-left px-4 py-3 font-medium">유효기한</th>
                    <th className="text-right px-4 py-3 font-medium">금액</th>
                    <th className="text-center px-4 py-3 font-medium">상태</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((it) => (
                    <tr key={it.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link to={`/quotations/${it.id}`} className="text-brand-600 hover:underline font-medium">
                          {it.quotationNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{it.customerName}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(it.issueDate)}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(it.validUntil)}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(it.totalAmount)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[it.status]}`}>
                          {STATUS_LABELS[it.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Link to={`/quotations/${it.id}/edit`} className="text-gray-600 hover:text-gray-900 text-sm mr-3">수정</Link>
                        <button onClick={() => handleDelete(it.id)} className="text-red-600 hover:text-red-700 text-sm">삭제</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="md:hidden divide-y">
              {items.map((it) => (
                <li key={it.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link to={`/quotations/${it.id}`} className="block text-brand-600 font-medium truncate">
                        {it.quotationNumber}
                      </Link>
                      <p className="text-sm text-gray-900 mt-1 truncate">{it.customerName}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatDate(it.issueDate)}</p>
                    </div>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium shrink-0 ${STATUS_COLORS[it.status]}`}>
                      {STATUS_LABELS[it.status]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="font-semibold">{formatCurrency(it.totalAmount)}</span>
                    <div className="text-sm">
                      <Link to={`/quotations/${it.id}/edit`} className="text-gray-600 mr-3">수정</Link>
                      <button onClick={() => handleDelete(it.id)} className="text-red-600">삭제</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
