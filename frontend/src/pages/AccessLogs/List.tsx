import { useEffect, useMemo, useState } from 'react';
import { accessLogApi, type AccessLog } from '../../api/accessLogs';
import { userApi, type User } from '../../api/users';
import { ApiError } from '../../api/client';
import { YooAnAlert, YooAnSearchBar } from '../../components/yooan';

const PAGE_SIZE = 100;

function errorMessage(e: unknown, fallback: string): string {
  if (e instanceof ApiError && typeof e.message === 'string') return e.message;
  return e instanceof Error ? e.message : fallback;
}

function formatDateTime(s: string): string {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

function toLocalInputValue(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function AccessLogList() {
  const [items, setItems] = useState<AccessLog[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [userId, setUserId] = useState('');
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  async function load(nextOffset = 0) {
    setLoading(true);
    setError(null);
    try {
      const res = await accessLogApi.list({
        userId: userId || undefined,
        q: q || undefined,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(to).toISOString() : undefined,
        limit: PAGE_SIZE,
        offset: nextOffset,
      });
      setItems(res.items);
      setTotal(res.total);
      setOffset(nextOffset);
    } catch (e) {
      setError(errorMessage(e, '접속 로그를 불러오지 못했습니다.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    userApi.list().then((r) => setUsers(r.items)).catch(() => undefined);
  }, []);

  useEffect(() => {
    load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, from, to]);

  const pageInfo = useMemo(() => {
    const start = total === 0 ? 0 : offset + 1;
    const end = Math.min(offset + items.length, total);
    return { start, end, total };
  }, [offset, items.length, total]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">접속 로그</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">사용자가 어느 메뉴/페이지에 들어갔는지 추적합니다.</p>
      </div>

      <YooAnSearchBar
        value={q}
        onChange={setQ}
        onSubmit={() => load(0)}
        placeholder="경로 또는 라벨 검색"
        trailing={
          <>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 rounded-md text-sm"
            >
              <option value="">전체 사용자</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} (@{u.username})
                </option>
              ))}
            </select>
            <input
              type="datetime-local"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 rounded-md text-sm"
              max={to || toLocalInputValue()}
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">~</span>
            <input
              type="datetime-local"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 rounded-md text-sm"
              min={from || undefined}
            />
          </>
        }
      />

      {error && <YooAnAlert>{error}</YooAnAlert>}

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">불러오는 중...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">기록된 접속 로그가 없습니다.</div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-900 text-gray-600 dark:text-gray-400 text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">시각</th>
                    <th className="text-left px-4 py-3 font-medium">사용자</th>
                    <th className="text-left px-4 py-3 font-medium">메뉴 / 라벨</th>
                    <th className="text-left px-4 py-3 font-medium">경로</th>
                    <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700 text-gray-800 dark:text-gray-200">
                  {items.map((it) => (
                    <tr key={it.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/40">
                      <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300 whitespace-nowrap font-mono text-xs">
                        {formatDateTime(it.createdAt)}
                      </td>
                      <td className="px-4 py-2.5">
                        {it.user ? (
                          <div className="leading-tight">
                            <div className="font-medium">{it.user.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">@{it.user.username}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">(삭제됨)</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {it.label ? (
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                            {it.label}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400 font-mono text-xs">{it.path}</td>
                      <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 font-mono text-xs hidden lg:table-cell">
                        {it.ipAddress || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="md:hidden divide-y divide-gray-200 dark:divide-slate-700">
              {items.map((it) => (
                <li key={it.id} className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-mono text-gray-500 dark:text-gray-400">{formatDateTime(it.createdAt)}</div>
                    {it.label && (
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300 shrink-0">
                        {it.label}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                    {it.user ? `${it.user.name} (@${it.user.username})` : '(삭제된 사용자)'}
                  </div>
                  <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 font-mono break-all">{it.path}</div>
                  {it.ipAddress && (
                    <div className="mt-1 text-xs text-gray-400 dark:text-gray-500 font-mono">{it.ipAddress}</div>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
        <span>
          {pageInfo.start}–{pageInfo.end} / 총 {pageInfo.total.toLocaleString()}건
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => load(Math.max(0, offset - PAGE_SIZE))}
            disabled={offset === 0 || loading}
            className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-md disabled:opacity-40"
          >
            이전
          </button>
          <button
            type="button"
            onClick={() => load(offset + PAGE_SIZE)}
            disabled={offset + items.length >= total || loading}
            className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-md disabled:opacity-40"
          >
            다음
          </button>
        </div>
      </div>
    </div>
  );
}
