import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  productApi,
  type Product,
  type ProductCategory,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
} from '../../api/products';
import { formatCurrency } from '../../lib/format';
import { ApiError } from '../../api/client';
import { YooAnSearchBar, YooAnPagination } from '../../components/yooan';

const PAGE_SIZE = 20;

function errorMessage(e: unknown, fallback: string): string {
  if (e instanceof ApiError && typeof e.message === 'string') return e.message;
  return e instanceof Error ? e.message : fallback;
}

export default function ProductList() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory | ''>('');

  async function load(p = page) {
    setLoading(true);
    setError(null);
    try {
      const res = await productApi.list({
        q: q || undefined,
        category: categoryFilter || undefined,
        take: PAGE_SIZE,
        skip: (p - 1) * PAGE_SIZE,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(errorMessage(e, '품목 목록을 불러오지 못했습니다.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, categoryFilter]);

  // 필터 변경 시 1페이지로 리셋
  useEffect(() => {
    setPage(1);
  }, [categoryFilter]);

  function handleSearch() {
    if (page === 1) load(1);
    else setPage(1);
  }

  async function handleDelete(id: string) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await productApi.remove(id);
      await load(page);
    } catch (e) {
      alert(errorMessage(e, '삭제에 실패했습니다.'));
    }
  }

  // 서버에서 카테고리 필터링하므로 클라이언트 필터 불필요
  const filtered = items;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">품목 관리</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">견적서에 사용할 품목 카탈로그를 관리합니다.</p>
        </div>
        <Link
          to="/products/new"
          className="inline-flex items-center justify-center px-4 py-2 bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600 text-white text-sm font-medium rounded-md shadow-sm"
        >
          + 새 품목
        </Link>
      </div>

      <YooAnSearchBar
        value={q}
        onChange={setQ}
        onSubmit={handleSearch}
        placeholder="품목명 또는 코드 검색"
        trailing={
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as ProductCategory | '')}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 rounded-md text-sm"
          >
            <option value="">전체 유형</option>
            {(Object.keys(CATEGORY_LABELS) as ProductCategory[]).map((k) => (
              <option key={k} value={k}>{CATEGORY_LABELS[k]}</option>
            ))}
          </select>
        }
      />

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 px-4 py-3 text-sm">{error}</div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">등록된 품목이 없습니다.</div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-900 text-gray-600 dark:text-gray-400 text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">코드</th>
                    <th className="text-center px-4 py-3 font-medium">유형</th>
                    <th className="text-left px-4 py-3 font-medium">품목명</th>
                    <th className="text-left px-4 py-3 font-medium">설명</th>
                    <th className="text-center px-4 py-3 font-medium">단위</th>
                    <th className="text-right px-4 py-3 font-medium">단가</th>
                    <th className="text-center px-4 py-3 font-medium">활성</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700 text-gray-800 dark:text-gray-200">
                  {filtered.map((it) => (
                    <tr
                      key={it.id}
                      className="hover:bg-gray-50 dark:hover:bg-slate-700/40 cursor-pointer"
                      onClick={() => navigate(`/products/${it.id}/edit`)}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">{it.code}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${CATEGORY_COLORS[it.category]}`}>
                          {CATEGORY_LABELS[it.category]}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">{it.name}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 truncate max-w-xs">{it.description || '-'}</td>
                      <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">{it.unit}</td>
                      <td className="px-4 py-3 text-right font-medium whitespace-nowrap">{formatCurrency(it.unitPrice, it.currency)}</td>
                      <td className="px-4 py-3 text-center">
                        {it.isActive ? (
                          <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">사용</span>
                        ) : (
                          <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-400">중지</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <Link
                          to={`/products/${it.id}/edit`}
                          className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 text-sm mr-3"
                        >
                          수정
                        </Link>
                        <button onClick={() => handleDelete(it.id)} className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm">삭제</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="md:hidden divide-y divide-gray-200 dark:divide-slate-700">
              {filtered.map((it) => (
                <li
                  key={it.id}
                  className="p-4 cursor-pointer"
                  onClick={() => navigate(`/products/${it.id}/edit`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[it.category]}`}>
                          {CATEGORY_LABELS[it.category]}
                        </span>
                        <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{it.code}</span>
                      </div>
                      <div className="font-medium text-gray-900 dark:text-gray-100 truncate mt-1">{it.name}</div>
                      {it.description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{it.description}</div>
                      )}
                    </div>
                    {!it.isActive && (
                      <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-400 shrink-0">중지</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-3" onClick={(e) => e.stopPropagation()}>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(it.unitPrice, it.currency)} / {it.unit}</span>
                    <div className="text-sm">
                      <Link to={`/products/${it.id}/edit`} className="text-gray-600 dark:text-gray-300 mr-3">수정</Link>
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
