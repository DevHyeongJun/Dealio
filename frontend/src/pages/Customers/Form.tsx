import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { customerApi, type CustomerInput } from '../../api/customers';
import { ApiError } from '../../api/client';
import { useFormDraft } from '../../hooks/useFormDraft';
import {
  YooAnAlert,
  YooAnButton,
  YooAnField,
  YooAnInput,
  YooAnPageHeader,
  YooAnTextarea,
} from '../../components/yooan';

const emptyForm: CustomerInput = {
  name: '',
  email: '',
  phone: '',
  address: '',
  businessNumber: '',
  representative: '',
  businessAddress: '',
  businessSector: '',
  businessItem: '',
  memo: '',
  isActive: true,
};

function errorMessage(e: unknown, fallback: string): string {
  if (e instanceof ApiError && typeof e.message === 'string') return e.message;
  return e instanceof Error ? e.message : fallback;
}

export default function CustomerForm({ mode }: { mode: 'create' | 'edit' }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const draft = useFormDraft<CustomerInput>(`form:customer:${mode}:${id ?? 'new'}`);

  const [form, setForm] = useState<CustomerInput>(() => draft.load() ?? emptyForm);
  const [hasDraft, setHasDraft] = useState<boolean>(() => draft.load() !== null);
  const [loading, setLoading] = useState(mode === 'edit' && draft.load() === null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mode !== 'edit' || !id) return;
    if (draft.load() !== null) return; // draft 우선
    setLoading(true);
    customerApi
      .get(id)
      .then((c) => {
        setForm({
          name: c.name,
          email: c.email ?? '',
          phone: c.phone ?? '',
          address: c.address ?? '',
          businessNumber: c.businessNumber ?? '',
          representative: c.representative ?? '',
          businessAddress: c.businessAddress ?? '',
          businessSector: c.businessSector ?? '',
          businessItem: c.businessItem ?? '',
          memo: c.memo ?? '',
          isActive: c.isActive,
        });
      })
      .catch((e) => setLoadError(errorMessage(e, '고객을 불러오지 못했습니다.')))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, id]);

  useEffect(() => {
    draft.save(form);
    if (!hasDraft) setHasDraft(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  function setField<K extends keyof CustomerInput>(key: K, value: CustomerInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      if (mode === 'edit' && id) {
        await customerApi.update(id, form);
      } else {
        await customerApi.create(form);
      }
      draft.clear();
      navigate('/customers');
    } catch (e) {
      setFormError(errorMessage(e, '저장에 실패했습니다.'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-500 dark:text-gray-400">불러오는 중...</div>;
  }

  if (loadError) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Link to="/customers" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">← 목록으로</Link>
        <YooAnAlert>{loadError}</YooAnAlert>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      <div>
        <Link to="/customers" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">← 목록으로</Link>
        <YooAnPageHeader
          title={mode === 'create' ? '새 고객' : '고객 수정'}
          description="견적서 발송 대상 고객 정보를 관리합니다."
        />
      </div>

      {formError && <YooAnAlert>{formError}</YooAnAlert>}

      <section className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-5 sm:p-6 space-y-4">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100">기본 정보</h3>

        <YooAnField label="고객명" required>
          <YooAnInput
            required
            autoFocus
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
          />
        </YooAnField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <YooAnField label="이메일">
            <YooAnInput
              type="email"
              value={form.email ?? ''}
              onChange={(e) => setField('email', e.target.value)}
              placeholder="contact@example.com"
            />
          </YooAnField>
          <YooAnField label="전화번호">
            <YooAnInput
              value={form.phone ?? ''}
              onChange={(e) => setField('phone', e.target.value)}
              placeholder="010-0000-0000"
            />
          </YooAnField>
        </div>

        <YooAnField label="주소">
          <YooAnInput
            value={form.address ?? ''}
            onChange={(e) => setField('address', e.target.value)}
          />
        </YooAnField>

        <label className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setField('isActive', e.target.checked)}
          />
          <span>활성 (견적서 발송 대상)</span>
        </label>
      </section>

      <section className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-5 sm:p-6 space-y-4">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100">사업자 정보</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <YooAnField label="사업자등록번호">
            <YooAnInput
              value={form.businessNumber ?? ''}
              onChange={(e) => setField('businessNumber', e.target.value)}
              placeholder="123-45-67890"
              className="font-mono"
            />
          </YooAnField>
          <YooAnField label="대표자">
            <YooAnInput
              value={form.representative ?? ''}
              onChange={(e) => setField('representative', e.target.value)}
            />
          </YooAnField>
        </div>

        <YooAnField label="사업지 주소">
          <YooAnInput
            value={form.businessAddress ?? ''}
            onChange={(e) => setField('businessAddress', e.target.value)}
            placeholder="사업자등록증상 주소"
          />
        </YooAnField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <YooAnField label="업태">
            <YooAnInput
              value={form.businessSector ?? ''}
              onChange={(e) => setField('businessSector', e.target.value)}
              placeholder="예: 서비스업"
            />
          </YooAnField>
          <YooAnField label="업종 / 종목">
            <YooAnInput
              value={form.businessItem ?? ''}
              onChange={(e) => setField('businessItem', e.target.value)}
              placeholder="예: 소프트웨어 개발 및 공급"
            />
          </YooAnField>
        </div>
      </section>

      <section className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-5 sm:p-6">
        <YooAnField label="메모">
          <YooAnTextarea
            value={form.memo ?? ''}
            onChange={(e) => setField('memo', e.target.value)}
            rows={3}
          />
        </YooAnField>
      </section>

      <div className="flex justify-end gap-2">
        <YooAnButton type="button" variant="secondary" onClick={() => navigate('/customers')}>
          취소
        </YooAnButton>
        <YooAnButton type="submit" disabled={saving}>
          {saving ? '저장 중...' : '저장'}
        </YooAnButton>
      </div>
    </form>
  );
}
