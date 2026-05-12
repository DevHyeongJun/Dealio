import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { customerApi, type Customer } from '../../api/customers';
import { ApiError } from '../../api/client';
import {
  YooAnAlert,
  YooAnBadge,
  YooAnButton,
  YooAnEmptyState,
  YooAnPageHeader,
  YooAnPagination,
  YooAnSearchBar,
} from '../../components/yooan';

const PAGE_SIZE = 20;

function errorMessage(e: unknown, fallback: string): string {
  if (e instanceof ApiError && typeof e.message === 'string') return e.message;
  return e instanceof Error ? e.message : fallback;
}

export default function CustomerList() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [q, setQ] = useState('');

  async function load(p = page) {
    setLoading(true);
    setListError(null);
    try {
      const res = await customerApi.list({
        q: q || undefined,
        take: PAGE_SIZE,
        skip: (p - 1) * PAGE_SIZE,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      setListError(errorMessage(e, '고객 목록을 불러오지 못했습니다.'));
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
      await customerApi.remove(id);
      await load(page);
    } catch (e) {
      alert(errorMessage(e, '삭제에 실패했습니다.'));
    }
  }

  return (
    <div className="space-y-4">
      <YooAnPageHeader
        title="고객 관리"
        description="견적서 발송 대상 고객 정보를 관리합니다."
        actions={
          <YooAnButton onClick={() => navigate('/customers/new')}>+ 새 고객</YooAnButton>
        }
      />

      <YooAnSearchBar
        value={q}
        onChange={setQ}
        onSubmit={handleSearch}
        placeholder="고객명, 이메일, 전화번호 검색"
      />

      {listError && <YooAnAlert>{listError}</YooAnAlert>}

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">불러오는 중...</div>
        ) : items.length === 0 ? (
          <YooAnEmptyState
            message="등록된 고객이 없습니다."
            action={
              <YooAnButton onClick={() => navigate('/customers/new')}>+ 첫 고객 등록</YooAnButton>
            }
          />
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-900 text-gray-600 dark:text-gray-400 text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">고객명</th>
                    <th className="text-left px-4 py-3 font-medium">이메일</th>
                    <th className="text-left px-4 py-3 font-medium">전화번호</th>
                    <th className="text-left px-4 py-3 font-medium">주소</th>
                    <th className="text-center px-4 py-3 font-medium">활성</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700 text-gray-800 dark:text-gray-200">
                  {items.map((it) => (
                    <tr
                      key={it.id}
                      className="hover:bg-gray-50 dark:hover:bg-slate-700/40 cursor-pointer"
                      onClick={() => navigate(`/customers/${it.id}/edit`)}
                    >
                      <td className="px-4 py-3 font-medium">{it.name}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{it.email || '-'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{it.phone || '-'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 truncate max-w-xs">
                        {it.address || '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {it.isActive ? (
                          <YooAnBadge tone="success">사용</YooAnBadge>
                        ) : (
                          <YooAnBadge tone="neutral">중지</YooAnBadge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <Link
                          to={`/customers/${it.id}/edit`}
                          className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                        >
                          수정
                        </Link>
                        <button
                          onClick={() => handleDelete(it.id)}
                          className="ml-1 px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="md:hidden divide-y divide-gray-200 dark:divide-slate-700">
              {items.map((it) => (
                <li
                  key={it.id}
                  className="p-4 cursor-pointer"
                  onClick={() => navigate(`/customers/${it.id}/edit`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {it.name}
                      </div>
                      {it.email && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                          {it.email}
                        </div>
                      )}
                      {it.phone && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {it.phone}
                        </div>
                      )}
                    </div>
                    {!it.isActive && <YooAnBadge tone="neutral">중지</YooAnBadge>}
                  </div>
                  <div className="flex items-center justify-end gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                    <Link
                      to={`/customers/${it.id}/edit`}
                      className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300"
                    >
                      수정
                    </Link>
                    <button
                      onClick={() => handleDelete(it.id)}
                      className="px-3 py-1.5 text-xs text-red-600 dark:text-red-400"
                    >
                      삭제
                    </button>
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
