import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  contractApi,
  type ContractInput,
  type ContractType,
  type ContractPaymentStatus,
  PAYMENT_STATUS_LABELS,
} from '../../api/contracts';
import { customerApi, type Customer } from '../../api/customers';
import { quotationApi, calcVatBreakdown, STATUS_LABELS, type Quotation } from '../../api/quotations';
import { formatCurrency, formatDate } from '../../lib/format';
import { ApiError } from '../../api/client';
import { useFormDraft } from '../../hooks/useFormDraft';
import {
  YooAnAlert,
  YooAnAmountInput,
  YooAnButton,
  YooAnField,
  YooAnInput,
  YooAnModal,
  YooAnPageHeader,
  YooAnPicker,
  YooAnTextarea,
} from '../../components/yooan';

interface FormState {
  title: string;
  type: ContractType;
  customerId: string;
  quotationId: string;
  amount: number;
  vatIncluded: boolean;
  paidAmount: number;
  paymentStatus: ContractPaymentStatus;
  startDate: string;
  endDate: string;
  notes: string;
}

const emptyForm: FormState = {
  title: '',
  type: 'SALES',
  customerId: '',
  quotationId: '',
  amount: 0,
  vatIncluded: true,
  paidAmount: 0,
  paymentStatus: 'UNPAID',
  startDate: '',
  endDate: '',
  notes: '',
};

function toDateInput(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function errorMessage(e: unknown, fallback: string): string {
  if (e instanceof ApiError && typeof e.message === 'string') return e.message;
  return e instanceof Error ? e.message : fallback;
}

const inputClass =
  'w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';

export default function ContractForm({ mode }: { mode: 'create' | 'edit' }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const fromQuotationId = searchParams.get('fromQuotation');

  const draft = useFormDraft<FormState>(`form:contract:${mode}:${id ?? 'new'}`);
  const [form, setForm] = useState<FormState>(() => draft.load() ?? emptyForm);
  const [hasDraft, setHasDraft] = useState<boolean>(() => draft.load() !== null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [linkedQuotation, setLinkedQuotation] =
    useState<{ id: string; quotationNumber: string; title: string | null; customerName: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // 견적서 picker 모달
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  const [pickerResults, setPickerResults] = useState<Quotation[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);

  // 고객 목록 로드
  useEffect(() => {
    customerApi
      .list({ activeOnly: true })
      .then((r) => setCustomers(r.items))
      .catch(() => undefined);
  }, []);

  // 수정 모드: 기존 계약 로드 (draft 가 있으면 draft 우선)
  useEffect(() => {
    if (mode !== 'edit' || !id) return;
    if (draft.load() !== null) return;
    contractApi
      .get(id)
      .then((c) => {
        setForm({
          title: c.title,
          type: c.type,
          customerId: c.customerId ?? '',
          quotationId: c.quotationId ?? '',
          amount: Number(c.amount ?? 0),
          vatIncluded: c.vatIncluded ?? true,
          paidAmount: Number(c.paidAmount ?? 0),
          paymentStatus: c.paymentStatus,
          startDate: toDateInput(c.startDate),
          endDate: toDateInput(c.endDate),
          notes: c.notes ?? '',
        });
        if (c.quotation) {
          setLinkedQuotation({
            id: c.quotation.id,
            quotationNumber: c.quotation.quotationNumber,
            title: (c.quotation as any).title ?? null,
            customerName: c.quotation.customerName,
          });
        }
      })
      .catch((e) => setLoadError(errorMessage(e, '계약을 불러오지 못했습니다.')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, id]);

  // 폼 변경 시 draft 자동저장
  useEffect(() => {
    draft.save(form);
    if (!hasDraft) setHasDraft(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  // 신규 모드 + ?fromQuotation: 견적서로부터 prefill (단, draft 가 있으면 그걸 우선)
  useEffect(() => {
    if (mode !== 'create' || !fromQuotationId) return;
    if (draft.load() !== null) {
      // draft 우선 — query 파라미터만 정리
      searchParams.delete('fromQuotation');
      setSearchParams(searchParams, { replace: true });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const quotation = await quotationApi.get(fromQuotationId);
        if (cancelled) return;
        const breakdown = calcVatBreakdown(Number(quotation.totalAmount), quotation.vatIncluded);
        // 견적서의 customerName 이 customer 마스터 한 명과 일치하면 자동 매칭
        let matchedCustomerId = '';
        try {
          const customerList = await customerApi.list({ activeOnly: true, q: quotation.customerName });
          const exact = customerList.items.find((c) => c.name === quotation.customerName);
          if (exact) matchedCustomerId = exact.id;
        } catch { /* 무시 */ }

        setForm({
          ...emptyForm,
          title: quotation.title?.trim() || `${quotation.quotationNumber} — ${quotation.customerName}`,
          type: 'SALES',
          customerId: matchedCustomerId,
          quotationId: quotation.id,
          amount: breakdown.total,
          paidAmount: 0,
          paymentStatus: 'UNPAID',
          notes: quotation.notes ?? '',
        });
        setLinkedQuotation({
          id: quotation.id,
          quotationNumber: quotation.quotationNumber,
          title: quotation.title ?? null,
          customerName: quotation.customerName,
        });
      } catch (e) {
        setLoadError(errorMessage(e, '견적서를 불러오지 못했습니다.'));
      } finally {
        searchParams.delete('fromQuotation');
        setSearchParams(searchParams, { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromQuotationId, mode]);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === form.customerId),
    [customers, form.customerId],
  );

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openQuotationPicker() {
    setPickerOpen(true);
    setPickerError(null);
    // 거래처가 선택되어 있으면 그 고객명으로 검색 prefill
    const initialQuery = selectedCustomer?.name ?? '';
    setPickerQuery(initialQuery);
    runPickerSearch(initialQuery);
  }

  async function runPickerSearch(query: string) {
    setPickerLoading(true);
    setPickerError(null);
    try {
      const res = await quotationApi.list({ q: query || undefined });
      setPickerResults(res.items);
    } catch (e) {
      setPickerError(errorMessage(e, '견적서를 불러오지 못했습니다.'));
    } finally {
      setPickerLoading(false);
    }
  }

  function selectQuotation(quotation: Quotation) {
    setLinkedQuotation({
      id: quotation.id,
      quotationNumber: quotation.quotationNumber,
      title: quotation.title ?? null,
      customerName: quotation.customerName,
    });
    setField('quotationId', quotation.id);
    // 계약금액이 비어있고 신규 모드라면 견적서 합계로 기본 채움
    if (mode === 'create' && !form.amount) {
      const breakdown = calcVatBreakdown(Number(quotation.totalAmount), quotation.vatIncluded);
      setForm((f) => ({ ...f, amount: breakdown.total }));
    }
    setPickerOpen(false);
  }

  function unlinkQuotation() {
    setLinkedQuotation(null);
    setField('quotationId', '');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customerId) {
      setFormError('거래처를 선택하세요.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload: ContractInput = {
        title: form.title.trim(),
        type: form.type,
        customerId: form.customerId,
        quotationId: form.quotationId || null,
        amount: Number(form.amount) || 0,
        vatIncluded: form.vatIncluded,
        paidAmount: Number(form.paidAmount) || 0,
        paymentStatus: form.paymentStatus,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        notes: form.notes.trim() || null,
      };
      if (mode === 'create') {
        const created = await contractApi.create(payload);
        draft.clear();
        navigate(`/contracts/${created.id}`);
      } else if (id) {
        await contractApi.update(id, payload);
        draft.clear();
        navigate(`/contracts/${id}`);
      }
    } catch (e) {
      setFormError(errorMessage(e, '저장에 실패했습니다.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      <div>
        <Link to="/contracts" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">← 목록으로</Link>
        <YooAnPageHeader
          title={mode === 'create' ? '새 계약' : '계약 수정'}
          description="외주/수주 계약을 등록하고 정산을 추적합니다."
        />
      </div>

      {loadError && <YooAnAlert>{loadError}</YooAnAlert>}
      {formError && <YooAnAlert>{formError}</YooAnAlert>}

      <section className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-5 sm:p-6 space-y-4">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100">기본 정보</h3>

        <YooAnField label="계약명" required>
          <YooAnInput
            required
            value={form.title}
            onChange={(e) => setField('title', e.target.value)}
            placeholder="예: 2026년 상반기 유지보수 계약"
          />
        </YooAnField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <YooAnField label="계약 유형" required>
            <select
              value={form.type}
              onChange={(e) => setField('type', e.target.value as ContractType)}
              className={inputClass}
            >
              <option value="SALES">수주 (받음)</option>
              <option value="OUTSOURCING">외주 (보냄)</option>
            </select>
          </YooAnField>

          <YooAnField label="정산 상태">
            <select
              value={form.paymentStatus}
              onChange={(e) => setField('paymentStatus', e.target.value as ContractPaymentStatus)}
              className={inputClass}
            >
              {(Object.keys(PAYMENT_STATUS_LABELS) as ContractPaymentStatus[]).map((k) => (
                <option key={k} value={k}>{PAYMENT_STATUS_LABELS[k]}</option>
              ))}
            </select>
          </YooAnField>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs text-gray-500 dark:text-gray-400">
              거래처 <span className="text-red-500">*</span>
            </label>
            <Link
              to="/customers"
              className="text-xs text-brand-600 dark:text-brand-400 hover:underline"
            >
              고객 관리로 이동 →
            </Link>
          </div>
          <YooAnPicker<Customer>
            value={selectedCustomer ?? null}
            placeholder="거래처를 선택하세요"
            title="거래처 선택"
            searchPlaceholder="거래처명 / 이메일 / 전화 검색"
            itemKey={(c) => c.id}
            renderSelected={(c) => (c.email ? `${c.name} (${c.email})` : c.name)}
            renderItem={(c) => (
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{c.name}</div>
                {(c.email || c.phone) && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    {[c.email, c.phone].filter(Boolean).join(' · ')}
                  </div>
                )}
              </div>
            )}
            onSearch={async (q) => {
              const res = await customerApi.list({ activeOnly: true, q: q || undefined });
              return res.items;
            }}
            onSelect={(c) => {
              setCustomers((prev) => (prev.some((x) => x.id === c.id) ? prev : [c, ...prev]));
              setField('customerId', c.id);
            }}
          />
          {customers.length === 0 && !selectedCustomer && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">
              등록된 활성 고객이 없습니다. 먼저 고객 관리에서 등록하세요.
            </p>
          )}

          {selectedCustomer && (
            <div className="mt-3 rounded-md bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-700 px-4 py-3 space-y-3">
              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                <ReadOnlyField label="이메일" value={selectedCustomer.email} />
                <ReadOnlyField label="연락처" value={selectedCustomer.phone} />
                <ReadOnlyField label="주소" value={selectedCustomer.address} />
              </dl>
              {(selectedCustomer.businessNumber || selectedCustomer.representative
                || selectedCustomer.businessAddress || selectedCustomer.businessSector
                || selectedCustomer.businessItem) && (
                <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm pt-3 border-t border-gray-200 dark:border-slate-700">
                  <ReadOnlyField label="사업자등록번호" value={selectedCustomer.businessNumber} mono />
                  <ReadOnlyField label="대표자" value={selectedCustomer.representative} />
                  <ReadOnlyField label="사업지 주소" value={selectedCustomer.businessAddress} />
                  <ReadOnlyField label="업태" value={selectedCustomer.businessSector} />
                  <ReadOnlyField label="업종" value={selectedCustomer.businessItem} />
                </dl>
              )}
            </div>
          )}
        </div>

        <YooAnField label="연결 견적서" hint="선택 시 견적서 합계가 계약금액으로 기본 채워집니다.">
          {linkedQuotation ? (
            <div className="rounded-md bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/40 px-3 py-2 text-sm flex items-center justify-between gap-2">
              <div className="text-brand-800 dark:text-brand-200 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link to={`/quotations/${linkedQuotation.id}`} className="font-mono font-medium underline shrink-0">
                    {linkedQuotation.quotationNumber}
                  </Link>
                  <span className="text-brand-700/70 dark:text-brand-300/70">·</span>
                  <span className="truncate">{linkedQuotation.customerName}</span>
                </div>
                {linkedQuotation.title && (
                  <div className="text-xs text-brand-700 dark:text-brand-300 mt-0.5 truncate" title={linkedQuotation.title}>
                    {linkedQuotation.title}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={openQuotationPicker}
                  className="text-xs text-brand-600 dark:text-brand-400 hover:underline"
                >
                  변경
                </button>
                <button
                  type="button"
                  onClick={unlinkQuotation}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  연결 해제
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={openQuotationPicker}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-dashed border-gray-300 dark:border-slate-700 text-sm text-gray-500 dark:text-gray-400 rounded-md hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-brand-500 dark:hover:border-brand-500 hover:text-brand-700 dark:hover:text-brand-300 text-left"
            >
              + 견적서 검색해서 연결
            </button>
          )}
        </YooAnField>
      </section>

      <section className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-5 sm:p-6 space-y-4">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100">금액</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <YooAnField label="계약금액" hint={form.vatIncluded ? '입력 금액에 부가세 포함' : '입력 금액은 공급가액 (부가세 별도)'}>
            <YooAnAmountInput
              value={form.amount}
              onChange={(v) => setField('amount', v)}
            />
          </YooAnField>
          <YooAnField label="정산금액">
            <YooAnAmountInput
              value={form.paidAmount}
              onChange={(v) => setField('paidAmount', v)}
            />
          </YooAnField>
        </div>

        <fieldset className="flex items-center gap-4 text-sm text-gray-700 dark:text-gray-200">
          <legend className="sr-only">부가세 처리</legend>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="vatIncluded"
              checked={form.vatIncluded === true}
              onChange={() => setField('vatIncluded', true)}
            />
            <span>부가세 포함</span>
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="vatIncluded"
              checked={form.vatIncluded === false}
              onChange={() => setField('vatIncluded', false)}
            />
            <span>부가세 별도 (공급가액)</span>
          </label>
        </fieldset>

        <div className="rounded-md bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/40 px-4 py-3 text-xs text-brand-800 dark:text-brand-200 space-y-1">
          <div className="font-medium">계산 규칙</div>
          {form.vatIncluded ? (
            <ul className="space-y-0.5 leading-relaxed">
              <li>· 입력하신 <strong>계약금액</strong> 이 부가세 포함된 <strong>합계</strong> 입니다.</li>
              <li>· 공급가액 = 합계 ÷ 1.1</li>
              <li>· 부가세 = 합계 − 공급가액 (≈ 합계 × 1/11)</li>
            </ul>
          ) : (
            <ul className="space-y-0.5 leading-relaxed">
              <li>· 입력하신 <strong>계약금액</strong> 이 <strong>공급가액</strong> (부가세 제외) 입니다.</li>
              <li>· 부가세 = 공급가액 × 10%</li>
              <li>· 합계 = 공급가액 × 1.1 (= 공급가액 + 부가세)</li>
            </ul>
          )}
        </div>

        {Number(form.amount) > 0 && (
          (() => {
            const b = calcVatBreakdown(Number(form.amount), form.vatIncluded);
            return (
              <dl className="rounded-md border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 px-4 py-3 text-sm w-full sm:max-w-sm sm:ml-auto space-y-1.5">
                <div className="flex justify-between text-gray-700 dark:text-gray-300">
                  <dt>공급가액</dt>
                  <dd className="font-medium">{formatCurrency(b.supply)}</dd>
                </div>
                <div className="flex justify-between text-gray-700 dark:text-gray-300">
                  <dt>부가세 (10%)</dt>
                  <dd className="font-medium">{formatCurrency(b.vat)}</dd>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-gray-200 dark:border-slate-700 text-gray-900 dark:text-gray-100">
                  <dt className="font-semibold">
                    합계
                    <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                      ({form.vatIncluded ? '부가세 포함' : '부가세 별도'})
                    </span>
                  </dt>
                  <dd className="font-bold text-base">{formatCurrency(b.total)}</dd>
                </div>
              </dl>
            );
          })()
        )}
      </section>

      <section className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-5 sm:p-6 space-y-4">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100">기간 / 비고</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <YooAnField label="시작일">
            <YooAnInput
              type="date"
              value={form.startDate}
              onChange={(e) => setField('startDate', e.target.value)}
            />
          </YooAnField>
          <YooAnField label="종료일">
            <YooAnInput
              type="date"
              value={form.endDate}
              onChange={(e) => setField('endDate', e.target.value)}
            />
          </YooAnField>
        </div>

        <YooAnField label="비고">
          <YooAnTextarea
            rows={4}
            value={form.notes}
            onChange={(e) => setField('notes', e.target.value)}
          />
        </YooAnField>
      </section>

      <div className="flex justify-end gap-2">
        <Link
          to={mode === 'edit' && id ? `/contracts/${id}` : '/contracts'}
          className="px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 text-sm rounded-md hover:bg-gray-50 dark:hover:bg-slate-600"
        >
          취소
        </Link>
        <YooAnButton type="submit" disabled={saving}>
          {saving ? '저장 중...' : '저장'}
        </YooAnButton>
      </div>

      <YooAnModal
        open={pickerOpen}
        title="견적서 연결"
        size="lg"
        onClose={() => setPickerOpen(false)}
      >
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              autoFocus
              value={pickerQuery}
              onChange={(e) => setPickerQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  runPickerSearch(pickerQuery);
                }
              }}
              placeholder="견적번호 또는 고객명"
              className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <YooAnButton
              type="button"
              onClick={() => runPickerSearch(pickerQuery)}
              disabled={pickerLoading}
              className="!bg-gray-800 hover:!bg-gray-900 dark:!bg-brand-600 dark:hover:!bg-brand-500"
            >
              검색
            </YooAnButton>
          </div>

          {pickerError && <YooAnAlert>{pickerError}</YooAnAlert>}

          <div className="border border-gray-200 dark:border-slate-700 rounded-md max-h-96 overflow-y-auto">
            {pickerLoading ? (
              <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">검색 중...</div>
            ) : pickerResults.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">검색 결과가 없습니다.</div>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-slate-700">
                {pickerResults.map((q) => {
                  const breakdown = calcVatBreakdown(Number(q.totalAmount), q.vatIncluded);
                  return (
                    <li key={q.id}>
                      <button
                        type="button"
                        onClick={() => selectQuotation(q)}
                        className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-gray-50 dark:hover:bg-slate-700/40 text-left"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs text-brand-600 dark:text-brand-400">{q.quotationNumber}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {STATUS_LABELS[q.status]}
                            </span>
                          </div>
                          {q.title && (
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate mt-0.5" title={q.title}>
                              {q.title}
                            </div>
                          )}
                          <div className={`text-sm truncate ${q.title ? 'text-gray-600 dark:text-gray-400 mt-0' : 'text-gray-900 dark:text-gray-100 mt-0.5'}`}>
                            {q.customerName}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {formatDate(q.issueDate)}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(breakdown.total)}</div>
                          <div className="text-[10px] text-gray-500 dark:text-gray-400">
                            {q.vatIncluded ? 'VAT 포함' : 'VAT 별도'}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </YooAnModal>
    </form>
  );
}

function ReadOnlyField({
  label,
  value,
  mono,
}: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className={`text-gray-800 dark:text-gray-200 mt-0.5 break-words ${mono ? 'font-mono' : ''}`}>
        {value && value.trim() ? value : <span className="text-gray-400 dark:text-gray-500">-</span>}
      </dd>
    </div>
  );
}
