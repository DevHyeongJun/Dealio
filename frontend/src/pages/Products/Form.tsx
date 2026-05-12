import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  productApi,
  type ProductInput,
  type ProductCategory,
  type Currency,
  CATEGORY_LABELS,
  CURRENCY_LABELS,
} from '../../api/products';
import { ApiError } from '../../api/client';
import { useFormDraft } from '../../hooks/useFormDraft';
import {
  YooAnAlert,
  YooAnAmountInput,
  YooAnButton,
  YooAnField,
  YooAnInput,
  YooAnPageHeader,
  YooAnTextarea,
} from '../../components/yooan';

const emptyForm: ProductInput = {
  code: '',
  name: '',
  description: '',
  category: 'DEVELOPMENT',
  unit: 'EA',
  currency: 'KRW',
  unitPrice: 0,
  isActive: true,
};

const selectClass =
  'w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';

function errorMessage(e: unknown, fallback: string): string {
  if (e instanceof ApiError && typeof e.message === 'string') return e.message;
  return e instanceof Error ? e.message : fallback;
}

export default function ProductForm({ mode }: { mode: 'create' | 'edit' }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const draft = useFormDraft<ProductInput>(`form:product:${mode}:${id ?? 'new'}`);

  const [form, setForm] = useState<ProductInput>(() => draft.load() ?? emptyForm);
  const [hasDraft, setHasDraft] = useState<boolean>(() => draft.load() !== null);
  const [loading, setLoading] = useState(mode === 'edit' && draft.load() === null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mode !== 'edit' || !id) return;
    if (draft.load() !== null) return;
    setLoading(true);
    productApi
      .get(id)
      .then((p) => {
        setForm({
          code: p.code,
          name: p.name,
          description: p.description ?? '',
          category: p.category,
          unit: p.unit,
          currency: p.currency,
          unitPrice: Number(p.unitPrice),
          isActive: p.isActive,
        });
      })
      .catch((e) => setLoadError(errorMessage(e, '품목을 불러오지 못했습니다.')))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, id]);

  useEffect(() => {
    draft.save(form);
    if (!hasDraft) setHasDraft(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  function setField<K extends keyof ProductInput>(key: K, value: ProductInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      if (mode === 'edit' && id) {
        await productApi.update(id, form);
      } else {
        await productApi.create(form);
      }
      draft.clear();
      navigate('/products');
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
        <Link to="/products" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">← 목록으로</Link>
        <YooAnAlert>{loadError}</YooAnAlert>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      <div>
        <Link to="/products" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">← 목록으로</Link>
        <YooAnPageHeader
          title={mode === 'create' ? '새 품목' : '품목 수정'}
          description="견적서에 사용할 품목 카탈로그를 관리합니다."
        />
      </div>

      {formError && <YooAnAlert>{formError}</YooAnAlert>}

      <section className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-5 sm:p-6 space-y-4">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100">기본 정보</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <YooAnField label="품목코드" hint={mode === 'create' ? '저장 시 자동으로 부여됩니다 (예: P-000001)' : undefined}>
            <YooAnInput
              value={form.code ?? ''}
              readOnly
              disabled
              placeholder={mode === 'create' ? '자동 생성' : ''}
              className="font-mono"
            />
          </YooAnField>
          <YooAnField label="품목 유형" required>
            <select
              value={form.category}
              onChange={(e) => setField('category', e.target.value as ProductCategory)}
              className={selectClass}
            >
              {(Object.keys(CATEGORY_LABELS) as ProductCategory[]).map((k) => (
                <option key={k} value={k}>{CATEGORY_LABELS[k]}</option>
              ))}
            </select>
          </YooAnField>
        </div>

        <YooAnField label="품목명" required>
          <YooAnInput
            required
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
          />
        </YooAnField>

        <YooAnField label="설명">
          <YooAnTextarea
            value={form.description ?? ''}
            onChange={(e) => setField('description', e.target.value)}
            rows={2}
          />
        </YooAnField>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <YooAnField label="단위">
            <YooAnInput
              value={form.unit}
              onChange={(e) => setField('unit', e.target.value)}
              placeholder="EA, 식, 건..."
            />
          </YooAnField>
          <YooAnField label="통화">
            <select
              value={form.currency}
              onChange={(e) => setField('currency', e.target.value as Currency)}
              className={selectClass}
            >
              {(Object.keys(CURRENCY_LABELS) as Currency[]).map((k) => (
                <option key={k} value={k}>{CURRENCY_LABELS[k]}</option>
              ))}
            </select>
          </YooAnField>
          <YooAnField label="단가">
            <YooAnAmountInput
              value={form.unitPrice}
              onChange={(v) => setField('unitPrice', v)}
              suffix={form.currency === 'USD' ? '$' : '원'}
              showKorean={form.currency !== 'USD'}
            />
          </YooAnField>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setField('isActive', e.target.checked)}
          />
          <span>활성 (견적서 작성 시 선택 가능)</span>
        </label>
      </section>

      <div className="flex justify-end gap-2">
        <YooAnButton type="button" variant="secondary" onClick={() => navigate('/products')}>
          취소
        </YooAnButton>
        <YooAnButton type="submit" disabled={saving}>
          {saving ? '저장 중...' : '저장'}
        </YooAnButton>
      </div>
    </form>
  );
}
