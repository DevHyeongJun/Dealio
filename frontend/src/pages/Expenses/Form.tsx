import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  expenseApi,
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  type ExpenseInput,
  type ExpenseCategory,
  type PaymentMethod,
} from '../../api/expenses';
import { contractApi, type Contract } from '../../api/contracts';
import { ApiError } from '../../api/client';
import {
  YooAnAlert,
  YooAnButton,
  YooAnField,
  YooAnInput,
  YooAnPageHeader,
  YooAnTextarea,
  YooAnAmountInput,
} from '../../components/yooan';
import { useFormDraft } from '../../hooks/useFormDraft';

interface FormState {
  expenseDate: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  vendor: string;
  notes: string;
  contractId: string;
}

const emptyForm: FormState = {
  expenseDate: new Date().toISOString().slice(0, 10),
  category: 'OTHER',
  description: '',
  amount: 0,
  paymentMethod: 'CARD',
  vendor: '',
  notes: '',
  contractId: '',
};

const selectClass =
  'w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';

function errorMessage(e: unknown, fallback: string): string {
  if (e instanceof ApiError && typeof e.message === 'string') return e.message;
  return e instanceof Error ? e.message : fallback;
}

export default function ExpenseForm({ mode }: { mode: 'create' | 'edit' }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefilledContractId = searchParams.get('contractId');

  const draft = useFormDraft<FormState>(`form:expense:${mode}:${id ?? 'new'}`);

  const [form, setForm] = useState<FormState>(() => {
    const cached = draft.load();
    if (cached) return cached;
    if (prefilledContractId) return { ...emptyForm, contractId: prefilledContractId };
    return emptyForm;
  });
  const [hasDraft, setHasDraft] = useState<boolean>(() => draft.load() !== null);
  const [loading, setLoading] = useState(mode === 'edit' && draft.load() === null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [contracts, setContracts] = useState<Contract[]>([]);

  // 계약 마스터 로드
  useEffect(() => {
    contractApi.list({}).then((r) => setContracts(r.items)).catch(() => undefined);
  }, []);

  // 수정 모드 로드
  useEffect(() => {
    if (mode !== 'edit' || !id) return;
    if (draft.load() !== null) return;
    setLoading(true);
    expenseApi
      .get(id)
      .then((e) => {
        setForm({
          expenseDate: e.expenseDate.slice(0, 10),
          category: e.category,
          description: e.description,
          amount: Number(e.amount),
          paymentMethod: e.paymentMethod,
          vendor: e.vendor ?? '',
          notes: e.notes ?? '',
          contractId: e.contractId ?? '',
        });
      })
      .catch((e) => setLoadError(errorMessage(e, '경비를 불러오지 못했습니다.')))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, id]);

  // draft 자동저장
  useEffect(() => {
    draft.save(form);
    if (!hasDraft) setHasDraft(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  // 폼의 contractId 가 contracts 리스트에 없으면 보충 fetch
  useEffect(() => {
    if (form.contractId && !contracts.some((c) => c.id === form.contractId)) {
      contractApi
        .get(form.contractId)
        .then((c) =>
          setContracts((prev) => (prev.some((x) => x.id === c.id) ? prev : [c, ...prev])),
        )
        .catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.contractId, contracts.length]);

  const sortedContracts = useMemo(
    () => [...contracts].sort((a, b) => a.contractNumber.localeCompare(b.contractNumber)),
    [contracts],
  );

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const payload: ExpenseInput = {
        expenseDate: form.expenseDate,
        category: form.category,
        description: form.description.trim(),
        amount: Number(form.amount) || 0,
        paymentMethod: form.paymentMethod,
        vendor: form.vendor.trim() || null,
        notes: form.notes.trim() || null,
        contractId: form.contractId || null,
      };
      if (mode === 'edit' && id) {
        await expenseApi.update(id, payload);
      } else {
        await expenseApi.create(payload);
      }
      draft.clear();
      navigate('/expenses');
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
        <Link to="/expenses" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">← 목록으로</Link>
        <YooAnAlert>{loadError}</YooAnAlert>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      <div>
        <Link to="/expenses" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">← 목록으로</Link>
        <YooAnPageHeader
          title={mode === 'create' ? '새 경비' : '경비 수정'}
          description="경비를 등록하고 필요시 계약 건에 연결합니다."
        />
      </div>

      {formError && <YooAnAlert>{formError}</YooAnAlert>}
      {hasDraft && (
        <div className="rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-900/60 px-4 py-2.5 text-sm">
          저장하지 않은 입력값이 복원되었습니다.
        </div>
      )}

      <section className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-5 sm:p-6 space-y-4">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100">기본 정보</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <YooAnField label="일자" required>
            <YooAnInput
              type="date"
              required
              value={form.expenseDate}
              onChange={(e) => setField('expenseDate', e.target.value)}
            />
          </YooAnField>

          <YooAnField label="카테고리" required>
            <select
              value={form.category}
              onChange={(e) => setField('category', e.target.value as ExpenseCategory)}
              className={selectClass}
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{EXPENSE_CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </YooAnField>
        </div>

        <YooAnField label="내용" required>
          <YooAnInput
            required
            autoFocus={mode === 'create'}
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
            placeholder="예: 거래처 미팅 식사, 자재 구매..."
          />
        </YooAnField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <YooAnField label="금액" required>
            <YooAnAmountInput
              value={form.amount}
              onChange={(v) => setField('amount', v)}
              min={0}
            />
          </YooAnField>
          <YooAnField label="결제수단">
            <select
              value={form.paymentMethod}
              onChange={(e) => setField('paymentMethod', e.target.value as PaymentMethod)}
              className={selectClass}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
              ))}
            </select>
          </YooAnField>
        </div>

        <YooAnField label="거래처">
          <YooAnInput
            value={form.vendor}
            onChange={(e) => setField('vendor', e.target.value)}
            placeholder="(선택) 거래처/식당/판매처"
          />
        </YooAnField>
      </section>

      <section className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">계약 연결 (선택)</h3>
          <Link
            to="/contracts"
            className="text-xs text-brand-600 dark:text-brand-400 hover:underline"
          >
            계약 관리로 이동 →
          </Link>
        </div>

        <YooAnField label="계약">
          <select
            value={form.contractId}
            onChange={(e) => setField('contractId', e.target.value)}
            className={selectClass}
          >
            <option value="">연결 안 함</option>
            {sortedContracts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.contractNumber} · {c.title}
              </option>
            ))}
          </select>
        </YooAnField>
      </section>

      <section className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-5 sm:p-6">
        <YooAnField label="비고">
          <YooAnTextarea
            value={form.notes}
            onChange={(e) => setField('notes', e.target.value)}
            rows={3}
          />
        </YooAnField>
      </section>

      <div className="flex justify-end gap-2">
        <YooAnButton type="button" variant="secondary" onClick={() => navigate('/expenses')}>
          취소
        </YooAnButton>
        <YooAnButton type="submit" disabled={saving || !form.description.trim()}>
          {saving ? '저장 중...' : '저장'}
        </YooAnButton>
      </div>
    </form>
  );
}
