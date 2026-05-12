import { useEffect, useState } from 'react';
import { accessRuleApi, type AccessRule } from '../../api/accessRules';
import { settingsApi, type AppSettings } from '../../api/settings';
import { ApiError } from '../../api/client';
import { YooAnAlert, YooAnButton, YooAnField, YooAnInput } from '../../components/yooan';
import { useToast } from '../../contexts/ToastContext';

function errorMessage(e: unknown, fallback: string): string {
  if (e instanceof ApiError && typeof e.message === 'string') return e.message;
  return e instanceof Error ? e.message : fallback;
}

function formatDateTime(s: string): string {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

export default function AccessRulesPage() {
  const toast = useToast();
  const [items, setItems] = useState<AccessRule[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 새 룰 입력
  const [newCidr, setNewCidr] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [adding, setAdding] = useState(false);

  // 토글 저장 중
  const [togglingFilter, setTogglingFilter] = useState(false);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const [rules, s] = await Promise.all([accessRuleApi.list(), settingsApi.get()]);
      setItems(rules.items);
      setSettings(s);
    } catch (e) {
      setError(errorMessage(e, '불러오기 실패'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { reload(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newCidr.trim()) return;
    setAdding(true);
    try {
      await accessRuleApi.create({
        cidr: newCidr.trim(),
        label: newLabel.trim() || null,
        enabled: true,
      });
      setNewCidr('');
      setNewLabel('');
      toast.success('IP 규칙이 추가되었습니다.');
      await reload();
    } catch (e) {
      toast.error(errorMessage(e, '추가 실패'));
    } finally {
      setAdding(false);
    }
  }

  async function toggleEnabled(rule: AccessRule) {
    try {
      await accessRuleApi.update(rule.id, { enabled: !rule.enabled });
      await reload();
    } catch (e) {
      toast.error(errorMessage(e, '변경 실패'));
    }
  }

  async function remove(rule: AccessRule) {
    if (!confirm(`'${rule.cidr}' 규칙을 삭제하시겠습니까?`)) return;
    try {
      await accessRuleApi.remove(rule.id);
      toast.success('삭제되었습니다.');
      await reload();
    } catch (e) {
      toast.error(errorMessage(e, '삭제 실패'));
    }
  }

  async function toggleFilter() {
    if (!settings) return;
    const next = !settings.ipFilterEnabled;
    const warningWhenEnabling =
      next && items.filter((r) => r.enabled).length === 0
        ? '활성 룰이 없는 상태에서 켜면 localhost 만 접근 가능합니다. 본인의 IP 가 화이트리스트에 있는지 확인 후 켜는 것을 권장합니다. 계속하시겠습니까?'
        : null;
    if (warningWhenEnabling && !confirm(warningWhenEnabling)) return;
    setTogglingFilter(true);
    try {
      const res = await settingsApi.update({ ipFilterEnabled: next });
      setSettings(res);
      toast.success(next ? 'IP 화이트리스트가 활성화되었습니다.' : 'IP 화이트리스트가 비활성화되었습니다.');
    } catch (e) {
      toast.error(errorMessage(e, '설정 변경 실패'));
    } finally {
      setTogglingFilter(false);
    }
  }

  const activeCount = items.filter((r) => r.enabled).length;
  const enforceMode = !!settings?.ipFilterEnabled;

  return (
    <div className="space-y-5 max-w-4xl">
      <header>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">접속 허용 IP 관리</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          특정 IP 또는 CIDR 대역만 접속할 수 있도록 화이트리스트를 관리합니다. localhost(서버 자신)는 항상 허용됩니다.
        </p>
      </header>

      {error && <YooAnAlert>{error}</YooAnAlert>}

      {/* 마스터 토글 */}
      <section className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">화이트리스트 모드</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {enforceMode
                ? '활성 상태 — 아래 룰에 매칭되는 IP 만 접근할 수 있습니다.'
                : '비활성 상태 — 모든 IP 가 접근 가능합니다 (룰은 저장만 되어 있음).'}
            </p>
            {enforceMode && activeCount === 0 && (
              <p className="text-xs mt-2 text-amber-700 dark:text-amber-300">
                ⚠️ 활성 룰이 없습니다. 본인 IP 가 잠금되지 않도록 룰을 먼저 추가하세요. (현재 localhost 만 허용됨)
              </p>
            )}
          </div>
          <YooAnButton
            type="button"
            variant={enforceMode ? 'secondary' : 'primary'}
            onClick={toggleFilter}
            disabled={!settings || togglingFilter}
          >
            {togglingFilter ? '...' : enforceMode ? '비활성화' : '활성화'}
          </YooAnButton>
        </div>
      </section>

      {/* 새 룰 추가 */}
      <section className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">새 규칙 추가</h3>
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <YooAnField label="IP / CIDR" required hint="예: 192.168.0.0/24 또는 203.0.113.5">
              <YooAnInput
                value={newCidr}
                onChange={(e) => setNewCidr(e.target.value)}
                placeholder="192.168.0.0/24"
                className="font-mono"
                required
              />
            </YooAnField>
            <YooAnField label="라벨 (선택)" hint="예: 사무실, 본사망">
              <YooAnInput
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="사무실"
              />
            </YooAnField>
          </div>
          <div className="flex justify-end">
            <YooAnButton type="submit" disabled={adding || !newCidr.trim()}>
              {adding ? '추가 중...' : '추가'}
            </YooAnButton>
          </div>
        </form>
      </section>

      {/* 룰 목록 */}
      <section className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">등록된 규칙</h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            전체 {items.length} / 활성 {activeCount}
          </span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">불러오는 중...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">등록된 규칙이 없습니다.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-900 text-gray-600 dark:text-gray-400 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">활성</th>
                <th className="text-left px-4 py-2.5 font-medium">IP / CIDR</th>
                <th className="text-left px-4 py-2.5 font-medium">라벨</th>
                <th className="text-left px-4 py-2.5 font-medium hidden md:table-cell">추가일</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700 text-gray-800 dark:text-gray-200">
              {items.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/40">
                  <td className="px-4 py-2.5">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={r.enabled}
                        onChange={() => toggleEnabled(r)}
                      />
                      <span className={r.enabled ? 'text-green-700 dark:text-green-300 text-xs font-medium' : 'text-gray-400 dark:text-gray-500 text-xs'}>
                        {r.enabled ? '활성' : '중지'}
                      </span>
                    </label>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-sm">{r.cidr}</td>
                  <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{r.label || <span className="text-gray-400 dark:text-gray-500">-</span>}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400 hidden md:table-cell whitespace-nowrap">
                    {formatDateTime(r.createdAt)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => remove(r)}
                      className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* 안내 박스 */}
      <div className="rounded-md bg-gray-50 dark:bg-slate-900/30 px-4 py-3 text-xs text-gray-600 dark:text-gray-400 space-y-1.5 leading-relaxed">
        <p className="font-medium text-gray-700 dark:text-gray-300">사용 가이드</p>
        <ul className="space-y-0.5">
          <li>· CIDR 표기 예시: <code className="font-mono text-brand-600 dark:text-brand-400">192.168.0.0/24</code> (192.168.0.1~254), 단일 IP 도 가능</li>
          <li>· 활성 룰이 하나라도 매칭되면 접속 허용 (whitelist 방식)</li>
          <li>· 화이트리스트 모드가 꺼져 있거나 활성 룰이 없으면 모든 IP 허용</li>
          <li>· <strong>localhost (127.0.0.1, ::1) 는 항상 허용</strong> — 잠금 발생 시 서버에서 비활성화 가능</li>
          <li>· <strong>모바일 MAC 주소로 차단은 불가능</strong> — HTTP 는 MAC 정보를 전달하지 않음. IP 기반 차단 또는 계정 비활성화 사용 권장.</li>
        </ul>
      </div>
    </div>
  );
}
