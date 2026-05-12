import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { userApi, type User, type UserCreateInput, type UserUpdateInput } from '../../api/users';
import { companyApi, type Company, type CompanyInput } from '../../api/companies';
import { ROLE_LABELS } from '../../api/auth';
import { ApiError } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import {
  YooAnAlert,
  YooAnButton,
  YooAnEmptyState,
  YooAnField,
  YooAnInput,
  YooAnModal,
  YooAnPageHeader,
  YooAnTextarea,
} from '../../components/yooan';

function errorMessage(e: unknown, fallback: string): string {
  if (e instanceof ApiError && typeof e.message === 'string') return e.message;
  return e instanceof Error ? e.message : fallback;
}

const NONE_COMPANY = 'none';

export default function UsersPage() {
  const { user: me } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCompany = searchParams.get('company') || '';
  const selectedUserId = searchParams.get('user') || '';

  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [companyQuery, setCompanyQuery] = useState('');
  const [userQuery, setUserQuery] = useState('');

  const [companyModalOpen, setCompanyModalOpen] = useState<{ mode: 'create' | 'edit'; data?: Company } | null>(null);
  const [userModalOpen, setUserModalOpen] = useState<{ mode: 'create' | 'edit'; data?: User } | null>(null);

  async function reloadCompanies() {
    try {
      const res = await companyApi.list({ q: companyQuery || undefined });
      setCompanies(res.items);
    } catch (e) {
      setPageError(errorMessage(e, '회사 목록을 불러오지 못했습니다.'));
    }
  }
  useEffect(() => { reloadCompanies(); }, [companyQuery]);

  async function reloadUsers() {
    if (!selectedCompany) { setUsers([]); return; }
    try {
      const res = await userApi.list({
        companyId: selectedCompany === NONE_COMPANY ? 'none' : selectedCompany,
        q: userQuery || undefined,
      });
      setUsers(res.items);
    } catch (e) {
      setPageError(errorMessage(e, '사용자 목록을 불러오지 못했습니다.'));
    }
  }
  useEffect(() => { reloadUsers(); }, [selectedCompany, userQuery]);

  useEffect(() => {
    if (!selectedUserId) { setUser(null); return; }
    let cancelled = false;
    userApi.get(selectedUserId)
      .then((u) => { if (!cancelled) setUser(u); })
      .catch(() => { if (!cancelled) setUser(null); });
    return () => { cancelled = true; };
  }, [selectedUserId]);

  function selectCompany(id: string) {
    const sp = new URLSearchParams(searchParams);
    sp.set('company', id);
    sp.delete('user');
    setSearchParams(sp, { replace: true });
  }
  function selectUser(id: string) {
    const sp = new URLSearchParams(searchParams);
    sp.set('user', id);
    setSearchParams(sp, { replace: true });
  }

  const selectedCompanyObj = useMemo(
    () => (selectedCompany && selectedCompany !== NONE_COMPANY
      ? companies.find((c) => c.id === selectedCompany) ?? null
      : null),
    [selectedCompany, companies],
  );

  return (
    <div className="space-y-4">
      <YooAnPageHeader title="사용자 관리" description="그룹사별로 사용자를 관리하고 명함을 등록합니다." />
      {pageError && <YooAnAlert>{pageError}</YooAnAlert>}

      <div className="grid grid-cols-12 gap-4 min-h-[600px]">
        {/* 좌측 — 회사 패널 */}
        <aside className="col-span-12 md:col-span-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-gray-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">회사</h3>
              <button
                type="button"
                onClick={() => setCompanyModalOpen({ mode: 'create' })}
                className="text-xs text-brand-600 dark:text-brand-400 hover:underline"
              >
                + 새 회사
              </button>
            </div>
            <YooAnInput
              value={companyQuery}
              onChange={(e) => setCompanyQuery(e.target.value)}
              placeholder="회사명 검색"
            />
          </div>
          <ul className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-700/60">
            <li>
              <CompanyRow
                label="(미배정)"
                sub=""
                active={selectedCompany === NONE_COMPANY}
                onClick={() => selectCompany(NONE_COMPANY)}
              />
            </li>
            {companies.map((c) => (
              <li key={c.id}>
                <CompanyRow
                  label={c.name}
                  sub={`${c._count?.users ?? 0}명`}
                  active={selectedCompany === c.id}
                  inactive={!c.isActive}
                  onClick={() => selectCompany(c.id)}
                  onEdit={() => setCompanyModalOpen({ mode: 'edit', data: c })}
                />
              </li>
            ))}
            {companies.length === 0 && (
              <li className="p-4 text-center text-xs text-gray-500 dark:text-gray-400">등록된 회사가 없습니다.</li>
            )}
          </ul>
        </aside>

        {/* 중간 — 사용자 목록 */}
        <section className="col-span-12 md:col-span-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-gray-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between gap-2 min-h-[24px]">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                {selectedCompany === NONE_COMPANY ? '회사 미배정' : selectedCompanyObj?.name || '회사를 선택하세요'}
              </h3>
              {selectedCompany && (
                <button
                  type="button"
                  onClick={() => setUserModalOpen({ mode: 'create' })}
                  className="text-xs text-brand-600 dark:text-brand-400 hover:underline shrink-0"
                >
                  + 새 사용자
                </button>
              )}
            </div>
            {selectedCompany && (
              <YooAnInput
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="이름/아이디/이메일/직책 검색"
              />
            )}
          </div>
          <ul className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-700/60">
            {!selectedCompany ? (
              <li className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                좌측에서 회사를 먼저 선택하세요.
              </li>
            ) : users.length === 0 ? (
              <li><YooAnEmptyState message="사용자가 없습니다." /></li>
            ) : (
              users.map((u) => (
                <li key={u.id}>
                  <UserRow user={u} active={u.id === selectedUserId} onClick={() => selectUser(u.id)} />
                </li>
              ))
            )}
          </ul>
        </section>

        {/* 우측 — 사용자 상세 */}
        <section className="col-span-12 md:col-span-5 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
          {!user ? (
            <div className="h-full flex items-center justify-center text-sm text-gray-400 dark:text-gray-500 p-8 text-center min-h-[400px]">
              {selectedCompany ? '사용자를 선택하면 상세 정보가 표시됩니다.' : ''}
            </div>
          ) : (
            <UserDetail
              user={user}
              companies={companies}
              isSelf={me?.id === user.id}
              onEdit={() => setUserModalOpen({ mode: 'edit', data: user })}
              onDeleted={() => {
                const sp = new URLSearchParams(searchParams);
                sp.delete('user');
                setSearchParams(sp, { replace: true });
                reloadUsers();
                reloadCompanies();
              }}
              onReload={async () => {
                const fresh = await userApi.get(user.id);
                setUser(fresh);
                reloadUsers();
              }}
            />
          )}
        </section>
      </div>

      {companyModalOpen && (
        <CompanyModal
          mode={companyModalOpen.mode}
          initial={companyModalOpen.data}
          onClose={() => setCompanyModalOpen(null)}
          onSaved={(c) => {
            setCompanyModalOpen(null);
            reloadCompanies();
            if (companyModalOpen.mode === 'create') selectCompany(c.id);
          }}
          onDeleted={(id) => {
            setCompanyModalOpen(null);
            reloadCompanies();
            if (selectedCompany === id) {
              const sp = new URLSearchParams(searchParams);
              sp.delete('company');
              sp.delete('user');
              setSearchParams(sp, { replace: true });
            }
          }}
        />
      )}

      {userModalOpen && (
        <UserModal
          mode={userModalOpen.mode}
          initial={userModalOpen.data}
          defaultCompanyId={selectedCompany && selectedCompany !== NONE_COMPANY ? selectedCompany : ''}
          companies={companies}
          isSelf={userModalOpen.mode === 'edit' && me?.id === userModalOpen.data?.id}
          onClose={() => setUserModalOpen(null)}
          onSaved={(saved) => {
            setUserModalOpen(null);
            reloadCompanies();
            reloadUsers();
            selectUser(saved.id);
          }}
        />
      )}
    </div>
  );
}

function CompanyRow({
  label, sub, active, inactive, onClick, onEdit,
}: {
  label: string;
  sub: string;
  active?: boolean;
  inactive?: boolean;
  onClick: () => void;
  onEdit?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      className={[
        'group flex items-center justify-between gap-2 px-3 py-2.5 cursor-pointer transition-colors',
        active
          ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300'
          : 'hover:bg-gray-50 dark:hover:bg-slate-700/40 text-gray-800 dark:text-gray-200',
      ].join(' ')}
    >
      <div className="min-w-0">
        <div className={`text-sm font-medium truncate ${inactive ? 'text-gray-400 dark:text-gray-500 line-through' : ''}`}>
          {label}
        </div>
        {sub && <div className="text-xs text-gray-500 dark:text-gray-400">{sub}</div>}
      </div>
      {onEdit && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="opacity-0 group-hover:opacity-100 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 px-1"
        >
          편집
        </button>
      )}
    </div>
  );
}

function UserRow({ user, active, onClick }: { user: User; active: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      className={[
        'flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors',
        active
          ? 'bg-brand-50 dark:bg-brand-500/10'
          : 'hover:bg-gray-50 dark:hover:bg-slate-700/40',
      ].join(' ')}
    >
      <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center text-sm font-semibold text-gray-700 dark:text-gray-200 shrink-0">
        {user.name.charAt(0)}
      </div>
      <div className="min-w-0 flex-1">
        <div className={`text-sm font-medium truncate ${active ? 'text-brand-800 dark:text-brand-200' : 'text-gray-900 dark:text-gray-100'} ${!user.isActive ? 'opacity-50 line-through' : ''}`}>
          {user.name}
          {user.jobTitle && <span className="ml-1.5 text-xs font-normal text-gray-500 dark:text-gray-400">{user.jobTitle}</span>}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
          @{user.username} · {ROLE_LABELS[user.role]}
        </div>
      </div>
    </div>
  );
}

function UserDetail({
  user, companies, isSelf, onEdit, onDeleted, onReload,
}: {
  user: User;
  companies: Company[];
  isSelf: boolean;
  onEdit: () => void;
  onDeleted: () => void;
  onReload: () => Promise<void>;
}) {
  const [bizError, setBizError] = useState<string | null>(null);
  const [bizUploading, setBizUploading] = useState(false);
  const [cardCacheBust, setCardCacheBust] = useState<number>(() => Date.now());
  const company = user.company || companies.find((c) => c.id === user.companyId) || null;

  async function handleUpload(file: File) {
    setBizError(null);
    setBizUploading(true);
    try {
      await userApi.uploadBusinessCard(user.id, file);
      setCardCacheBust(Date.now());
      await onReload();
    } catch (e: any) {
      setBizError(e?.message || '업로드 실패');
    } finally {
      setBizUploading(false);
    }
  }

  async function handleDeleteCard() {
    if (!confirm('명함을 삭제하시겠습니까?')) return;
    setBizError(null);
    try {
      await userApi.deleteBusinessCard(user.id);
      await onReload();
    } catch (e: any) {
      setBizError(e?.message || '삭제 실패');
    }
  }

  async function handleDeleteUser() {
    if (isSelf) return;
    if (!confirm(`'${user.name}' 사용자를 삭제하시겠습니까?`)) return;
    try {
      await userApi.remove(user.id);
      onDeleted();
    } catch (e) {
      alert(errorMessage(e, '삭제 실패'));
    }
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <div className="p-5 border-b border-gray-200 dark:border-slate-700 flex items-start gap-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-xl font-bold text-white shrink-0">
          {user.name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`text-lg font-bold text-gray-900 dark:text-gray-100 ${!user.isActive ? 'opacity-50 line-through' : ''}`}>
              {user.name}
            </h3>
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
              user.role === 'ADMIN'
                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300'
            }`}>
              {ROLE_LABELS[user.role]}
            </span>
            {!user.isActive && (
              <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                비활성
              </span>
            )}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            @{user.username}
            {user.jobTitle && <span className="ml-2">· {user.jobTitle}</span>}
            {company && <span className="ml-2">· {company.name}</span>}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <YooAnButton variant="secondary" onClick={onEdit}>편집</YooAnButton>
          <button
            type="button"
            onClick={handleDeleteUser}
            disabled={isSelf}
            className="px-3 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white text-sm rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            title={isSelf ? '자기 자신은 삭제할 수 없습니다.' : ''}
          >
            삭제
          </button>
        </div>
      </div>

      <div className="p-5 border-b border-gray-200 dark:border-slate-700">
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">기본 정보</h4>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Item label="이메일" value={user.email || '-'} />
          <Item label="휴대폰" value={user.phone || '-'} />
          <Item label="회사" value={company?.name || '미배정'} />
          <Item label="직책" value={user.jobTitle || '-'} />
        </dl>
      </div>

      <div className="p-5 flex-1">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">명함</h4>
          <div className="flex items-center gap-2">
            {user.businessCardPath && (
              <button
                type="button"
                onClick={handleDeleteCard}
                className="text-xs text-red-600 dark:text-red-400 hover:underline"
              >
                삭제
              </button>
            )}
            <label className={`text-xs text-brand-600 dark:text-brand-400 hover:underline cursor-pointer ${bizUploading ? 'opacity-60 pointer-events-none' : ''}`}>
              {bizUploading ? '업로드 중...' : (user.businessCardPath ? '교체' : '업로드')}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
        </div>
        {bizError && <YooAnAlert>{bizError}</YooAnAlert>}
        {user.businessCardPath ? (
          <div className="rounded-md border border-gray-200 dark:border-slate-700 overflow-hidden bg-gray-50 dark:bg-slate-900 flex items-center justify-center min-h-[180px]">
            <img
              src={userApi.businessCardUrl(user.id, cardCacheBust)}
              alt={`${user.name} 명함`}
              className="max-w-full max-h-[400px] object-contain"
            />
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-gray-300 dark:border-slate-700 p-8 text-center text-sm text-gray-500 dark:text-gray-400">
            명함이 등록되지 않았습니다. 우측 상단 "업로드" 버튼으로 추가하세요.
            <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">PNG / JPEG / WEBP, 최대 5MB</div>
          </div>
        )}
      </div>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="text-gray-900 dark:text-gray-100 mt-0.5 break-words">{value}</dd>
    </div>
  );
}

function CompanyModal({
  mode, initial, onClose, onSaved, onDeleted,
}: {
  mode: 'create' | 'edit';
  initial?: Company;
  onClose: () => void;
  onSaved: (c: Company) => void;
  onDeleted: (id: string) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [memo, setMemo] = useState(initial?.memo ?? '');
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const body: CompanyInput = { name: name.trim(), memo: memo.trim() || null, isActive };
      const res = mode === 'edit' && initial
        ? await companyApi.update(initial.id, body)
        : await companyApi.create(body);
      onSaved(res);
    } catch (e) {
      setError(errorMessage(e, '저장 실패'));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!initial) return;
    if (!confirm(`'${initial.name}' 회사를 삭제하시겠습니까?`)) return;
    setError(null);
    try {
      await companyApi.remove(initial.id);
      onDeleted(initial.id);
    } catch (e) {
      setError(errorMessage(e, '삭제 실패'));
    }
  }

  return (
    <YooAnModal
      open
      title={mode === 'edit' ? '회사 수정' : '새 회사'}
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-2 w-full">
          {mode === 'edit' && (
            <button
              type="button"
              onClick={remove}
              className="text-sm text-red-600 dark:text-red-400 hover:underline"
            >
              삭제
            </button>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <YooAnButton variant="secondary" onClick={onClose}>취소</YooAnButton>
            <YooAnButton onClick={save} disabled={saving || !name.trim()}>
              {saving ? '저장 중...' : '저장'}
            </YooAnButton>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        {error && <YooAnAlert>{error}</YooAnAlert>}
        <YooAnField label="회사명" required>
          <YooAnInput value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </YooAnField>
        <YooAnField label="메모">
          <YooAnTextarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={3} />
        </YooAnField>
        <label className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          <span>활성</span>
        </label>
      </div>
    </YooAnModal>
  );
}

function UserModal({
  mode, initial, defaultCompanyId, companies, isSelf, onClose, onSaved,
}: {
  mode: 'create' | 'edit';
  initial?: User;
  defaultCompanyId: string;
  companies: Company[];
  isSelf: boolean;
  onClose: () => void;
  onSaved: (u: User) => void;
}) {
  const [username, setUsername] = useState(initial?.username ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'USER'>(initial?.role ?? 'USER');
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [companyId, setCompanyId] = useState(initial?.companyId ?? defaultCompanyId);
  const [jobTitle, setJobTitle] = useState(initial?.jobTitle ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      let res: User;
      if (mode === 'edit' && initial) {
        const body: UserUpdateInput = {
          username: username.trim(),
          email: email.trim() || null,
          name: name.trim(),
          role,
          isActive,
          companyId: companyId || null,
          jobTitle: jobTitle.trim() || null,
          phone: phone.trim() || null,
        };
        if (password) body.password = password;
        res = await userApi.update(initial.id, body);
      } else {
        if (!password) { setError('비밀번호를 입력하세요'); setSaving(false); return; }
        const body: UserCreateInput = {
          username: username.trim(),
          email: email.trim() || null,
          name: name.trim(),
          password,
          role,
          isActive,
          companyId: companyId || null,
          jobTitle: jobTitle.trim() || null,
          phone: phone.trim() || null,
        };
        res = await userApi.create(body);
      }
      onSaved(res);
    } catch (e) {
      setError(errorMessage(e, '저장 실패'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <YooAnModal
      open
      title={mode === 'edit' ? '사용자 수정' : '새 사용자'}
      size="lg"
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <YooAnButton variant="secondary" onClick={onClose}>취소</YooAnButton>
          <YooAnButton onClick={save} disabled={saving || !username.trim() || !name.trim()}>
            {saving ? '저장 중...' : '저장'}
          </YooAnButton>
        </div>
      }
    >
      <div className="space-y-3">
        {error && <YooAnAlert>{error}</YooAnAlert>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <YooAnField label="아이디" required>
            <YooAnInput value={username} onChange={(e) => setUsername(e.target.value)} disabled={mode === 'edit'} />
          </YooAnField>
          <YooAnField label="이름" required>
            <YooAnInput value={name} onChange={(e) => setName(e.target.value)} />
          </YooAnField>
          <YooAnField label="이메일">
            <YooAnInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </YooAnField>
          <YooAnField label="휴대폰">
            <YooAnInput value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-0000-0000" />
          </YooAnField>
          <YooAnField label="회사">
            <select
              value={companyId ?? ''}
              onChange={(e) => setCompanyId(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 rounded-md text-sm"
            >
              <option value="">미배정</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{!c.isActive ? ' (비활성)' : ''}</option>
              ))}
            </select>
          </YooAnField>
          <YooAnField label="직책">
            <YooAnInput value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="대리, 과장 등" />
          </YooAnField>
          <YooAnField label="권한">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'ADMIN' | 'USER')}
              disabled={isSelf}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 rounded-md text-sm disabled:opacity-60"
            >
              <option value="USER">일반</option>
              <option value="ADMIN">관리자</option>
            </select>
          </YooAnField>
          <YooAnField label={mode === 'edit' ? '비밀번호 (변경 시에만)' : '비밀번호'} required={mode === 'create'}>
            <YooAnInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'edit' ? '비워두면 변경 안함' : ''}
            />
          </YooAnField>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            disabled={isSelf}
          />
          <span>활성 (로그인 가능)</span>
        </label>
      </div>
    </YooAnModal>
  );
}
