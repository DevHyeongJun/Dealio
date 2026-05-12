import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  quotationApi,
  calcVatBreakdown,
  type QuotationInput,
  type QuotationItemInput,
  type QuotationStatus,
  STATUS_LABELS,
} from '../../api/quotations';
import { customerApi, type Customer } from '../../api/customers';
import { productApi, type Product } from '../../api/products';
import { formatCurrency } from '../../lib/format';
import SegmentedControl from '../../components/common/SegmentedControl';
import { YooAnPicker } from '../../components/yooan';
import { useFormDraft } from '../../hooks/useFormDraft';

interface FormState {
  title: string;
  customerId: string;
  issueDate: string;
  validUntil: string;
  status: QuotationStatus;
  notes: string;
  vatIncluded: boolean;
  items: QuotationItemInput[];
}

const emptyItem: QuotationItemInput = { productId: '', description: '', quantity: 1 };

const initialState: FormState = {
  title: '',
  customerId: '',
  issueDate: new Date().toISOString().slice(0, 10),
  validUntil: '',
  status: 'DRAFT',
  notes: '',
  vatIncluded: false,
  items: [{ ...emptyItem }],
};

export default function QuotationForm({ mode }: { mode: 'create' | 'edit' }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const draftKey = `form:quotation:${mode}:${id ?? 'new'}`;
  const draft = useFormDraft<FormState>(draftKey);

  const [form, setForm] = useState<FormState>(() => draft.load() ?? initialState);
  const [hasDraft, setHasDraft] = useState<boolean>(() => draft.load() !== null);

  // 드래그 앤 드롭용 안정 key (form.items 와 길이 동기화)
  const uidCounterRef = useRef(0);
  const makeUid = () => `i-${++uidCounterRef.current}`;
  const [itemUids, setItemUids] = useState<string[]>(() => {
    const initial = draft.load()?.items ?? initialState.items;
    return initial.map(() => `i-${++uidCounterRef.current}`);
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [mastersLoading, setMastersLoading] = useState(true);

  // 고객/품목 마스터 로드 (활성만)
  useEffect(() => {
    let alive = true;
    Promise.all([
      customerApi.list({ activeOnly: true }),
      productApi.list({ activeOnly: true }),
    ])
      .then(([cRes, pRes]) => {
        if (!alive) return;
        setCustomers(cRes.items);
        setProducts(pRes.items);
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setMastersLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  // 수정 모드: 기존 견적서 로드
  // 단, draft 가 있으면 draft 가 우선 (사용자가 입력하던 값 보존).
  useEffect(() => {
    if (mode !== 'edit' || !id) return;
    if (draft.load() !== null) return; // draft 우선
    quotationApi.get(id).then((q) =>
      setForm({
        title: q.title ?? '',
        customerId: q.customerId ?? '',
        issueDate: q.issueDate ? q.issueDate.slice(0, 10) : '',
        validUntil: q.validUntil ? q.validUntil.slice(0, 10) : '',
        status: q.status,
        notes: q.notes ?? '',
        vatIncluded: q.vatIncluded ?? true,
        items: (q.items ?? []).map((it) => ({
          productId: it.productId ?? '',
          description: it.description ?? '',
          quantity: Number(it.quantity),
        })),
      })
    ).catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, id]);

  // 폼이 바뀔 때마다 draft 저장 (sessionStorage)
  useEffect(() => {
    draft.save(form);
    if (!hasDraft) setHasDraft(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  // form.items 길이가 외부에서 바뀌면 itemUids 길이 동기화 (edit-mode 로드, discardDraft 등)
  useEffect(() => {
    if (itemUids.length === form.items.length) return;
    setItemUids((prev) => {
      if (prev.length < form.items.length) {
        const adds = Array.from({ length: form.items.length - prev.length }, () => makeUid());
        return [...prev, ...adds];
      }
      return prev.slice(0, form.items.length);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.items.length]);

  // 폼의 customerId / productId 가 로컬 캐시에 없으면 보충 fetch (수정 모드 또는 비활성/오래된 항목 대응)
  useEffect(() => {
    if (mastersLoading) return;
    if (form.customerId && !customers.some((c) => c.id === form.customerId)) {
      customerApi
        .get(form.customerId)
        .then((c) => setCustomers((prev) => (prev.some((x) => x.id === c.id) ? prev : [c, ...prev])))
        .catch(() => undefined);
    }
    const missingProductIds = Array.from(
      new Set(form.items.map((it) => it.productId).filter((pid) => pid && !products.some((p) => p.id === pid))),
    );
    for (const pid of missingProductIds) {
      productApi
        .get(pid)
        .then((p) => setProducts((prev) => (prev.some((x) => x.id === p.id) ? prev : [p, ...prev])))
        .catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mastersLoading, form.customerId, form.items]);

  function discardDraft() {
    draft.clear();
    setHasDraft(false);
    if (mode === 'edit' && id) {
      // 서버 값으로 재초기화
      quotationApi.get(id).then((q) =>
        setForm({
          title: q.title ?? '',
          customerId: q.customerId ?? '',
          issueDate: q.issueDate ? q.issueDate.slice(0, 10) : '',
          validUntil: q.validUntil ? q.validUntil.slice(0, 10) : '',
          status: q.status,
          notes: q.notes ?? '',
          vatIncluded: q.vatIncluded ?? true,
          items: (q.items ?? []).map((it) => ({
            productId: it.productId ?? '',
            description: it.description ?? '',
            quantity: Number(it.quantity),
          })),
        })
      );
    } else {
      setForm(initialState);
    }
  }

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const selectedCustomer = customers.find((c) => c.id === form.customerId) ?? null;

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateItem(idx: number, patch: Partial<QuotationItemInput>) {
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    }));
  }

  function addItem() {
    setForm((f) => ({ ...f, items: [...f.items, { ...emptyItem }] }));
    setItemUids((prev) => [...prev, makeUid()]);
  }

  function removeItem(idx: number) {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
    setItemUids((prev) => prev.filter((_, i) => i !== idx));
  }

  // 드래그 앤 드롭으로 품목 순서 변경
  const [dragFromIdx, setDragFromIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  function handleRowDragStart(idx: number, e: React.DragEvent) {
    setDragFromIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  }

  function handleRowDragOver(idx: number, e: React.DragEvent) {
    if (dragFromIdx === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIdx !== idx) setDragOverIdx(idx);
  }

  function handleRowDrop(idx: number, e: React.DragEvent) {
    e.preventDefault();
    const from = dragFromIdx;
    setDragFromIdx(null);
    setDragOverIdx(null);
    if (from === null || from === idx) return;
    setForm((f) => {
      const next = [...f.items];
      const [moved] = next.splice(from, 1);
      next.splice(idx, 0, moved);
      return { ...f, items: next };
    });
    setItemUids((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(idx, 0, moved);
      return next;
    });
  }

  function handleRowDragEnd() {
    setDragFromIdx(null);
    setDragOverIdx(null);
  }

  // 합계 (선택된 품목의 단가 × 수량)
  const itemsSum = form.items.reduce((sum, it) => {
    const product = productById.get(it.productId);
    if (!product) return sum;
    return sum + Number(product.unitPrice) * Number(it.quantity || 0);
  }, 0);
  const breakdown = calcVatBreakdown(itemsSum, form.vatIncluded);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload: QuotationInput = {
        title: form.title.trim() || null,
        customerId: form.customerId,
        issueDate: form.issueDate,
        validUntil: form.validUntil || null,
        status: form.status,
        notes: form.notes || null,
        vatIncluded: form.vatIncluded,
        items: form.items.map((it) => ({
          productId: it.productId,
          description: it.description?.toString().trim() || null,
          quantity: Number(it.quantity),
        })),
      };
      if (mode === 'create') {
        const created = await quotationApi.create(payload);
        draft.clear();
        navigate(`/quotations/${created.id}`);
      } else if (id) {
        await quotationApi.update(id, payload);
        draft.clear();
        navigate(`/quotations/${id}`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      <div>
        <Link to="/quotations" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">← 목록으로</Link>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
          {mode === 'create' ? '새 견적서' : '견적서 수정'}
        </h2>
      </div>

      {error && <div className="rounded-md bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 px-4 py-3 text-sm">{error}</div>}

      <section className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">고객 정보</h3>
          <Link
            to="/customers"
            className="text-xs text-brand-600 dark:text-brand-400 hover:underline"
          >
            고객 관리로 이동 →
          </Link>
        </div>

        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            고객 <span className="text-red-500">*</span>
          </label>
          <YooAnPicker<Customer>
            value={selectedCustomer ?? null}
            placeholder={mastersLoading ? '불러오는 중...' : '고객을 선택하세요'}
            disabled={mastersLoading}
            title="고객 선택"
            searchPlaceholder="고객명 / 이메일 / 전화 검색"
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
          {!mastersLoading && customers.length === 0 && !selectedCustomer && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">
              등록된 활성 고객이 없습니다. 먼저 고객 관리에서 고객을 추가하세요.
            </p>
          )}
        </div>

        {selectedCustomer && (
          <div className="mt-4 rounded-md bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-700 px-4 py-3 space-y-3">
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
              <ReadOnlyField label="이메일" value={selectedCustomer.email} />
              <ReadOnlyField label="연락처" value={selectedCustomer.phone} />
              <ReadOnlyField label="주소" value={selectedCustomer.address} />
            </dl>
            {(selectedCustomer.businessNumber || selectedCustomer.representative
              || selectedCustomer.businessAddress || selectedCustomer.businessSector
              || selectedCustomer.businessItem) && (
              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm pt-3 border-t border-gray-200 dark:border-slate-700">
                <ReadOnlyField label="사업자등록번호" value={selectedCustomer.businessNumber} />
                <ReadOnlyField label="대표자" value={selectedCustomer.representative} />
                <ReadOnlyField label="사업지 주소" value={selectedCustomer.businessAddress} />
                <ReadOnlyField label="업태" value={selectedCustomer.businessSector} />
                <ReadOnlyField label="업종" value={selectedCustomer.businessItem} />
              </dl>
            )}
          </div>
        )}
      </section>

      <section className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-5 sm:p-6 space-y-4">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100">견적서 정보</h3>

        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">제목</label>
          <input
            value={form.title}
            onChange={(e) => setField('title', e.target.value)}
            placeholder="예: 2026년 상반기 웹사이트 리뉴얼 견적"
            maxLength={200}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="발행일" type="date" value={form.issueDate} onChange={(v) => setField('issueDate', v)} />
          <Input label="유효기한" type="date" value={form.validUntil} onChange={(v) => setField('validUntil', v)} />
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">상태</label>
            <select
              value={form.status}
              onChange={(e) => setField('status', e.target.value as QuotationStatus)}
              className={inputClass}
            >
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100">품목</h3>
            <Link
              to="/products"
              className="text-xs text-brand-600 dark:text-brand-400 hover:underline"
            >
              품목 관리로 이동 →
            </Link>
          </div>
          <button
            type="button"
            onClick={addItem}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-900 dark:bg-brand-600 dark:hover:bg-brand-500 text-white text-sm rounded-md"
          >
            + 품목 추가
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-900 text-gray-600 dark:text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-2 py-2 w-8" />
                <th className="text-left px-3 py-2 font-medium">품목</th>
                <th className="text-left px-3 py-2 font-medium hidden md:table-cell">설명</th>
                <th className="text-right px-3 py-2 font-medium w-24">수량</th>
                <th className="text-right px-3 py-2 font-medium w-32">단가</th>
                <th className="text-right px-3 py-2 font-medium w-32">금액</th>
                <th className="px-3 py-2 w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700 text-gray-800 dark:text-gray-200">
              {form.items.map((it, idx) => {
                const product = productById.get(it.productId);
                const unitPrice = product ? Number(product.unitPrice) : 0;
                const lineAmount = unitPrice * Number(it.quantity || 0);
                const isDragging = dragFromIdx === idx;
                const isDropTarget = dragOverIdx === idx && dragFromIdx !== null && dragFromIdx !== idx;
                return (
                  <tr
                    key={itemUids[idx] ?? idx}
                    onDragOver={(e) => handleRowDragOver(idx, e)}
                    onDragLeave={() => setDragOverIdx(null)}
                    onDrop={(e) => handleRowDrop(idx, e)}
                    className={[
                      isDragging ? 'opacity-40' : '',
                      isDropTarget ? 'bg-brand-50 dark:bg-brand-500/10' : '',
                    ].join(' ')}
                  >
                    <td className="px-2 py-2 align-middle text-center">
                      <button
                        type="button"
                        draggable
                        onDragStart={(e) => handleRowDragStart(idx, e)}
                        onDragEnd={handleRowDragEnd}
                        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200 select-none px-1"
                        aria-label="드래그하여 순서 변경"
                        title="드래그하여 순서 변경"
                      >
                        ⋮⋮
                      </button>
                    </td>
                    <td className="px-3 py-2 align-top min-w-[240px]">
                      <YooAnPicker<Product>
                        value={product ?? null}
                        placeholder={mastersLoading ? '불러오는 중...' : '품목 선택'}
                        disabled={mastersLoading}
                        title="품목 선택"
                        searchPlaceholder="품목명 / 코드 검색"
                        itemKey={(p) => p.id}
                        renderSelected={(p) => `${p.name} · ${formatCurrency(Number(p.unitPrice))}/${p.unit}`}
                        renderItem={(p) => (
                          <>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{p.name}</span>
                                <span className="font-mono text-[10px] text-gray-500 dark:text-gray-400">{p.code}</span>
                              </div>
                              {p.description && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{p.description}</div>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {formatCurrency(Number(p.unitPrice))}<span className="text-xs text-gray-500 dark:text-gray-400">/{p.unit}</span>
                              </div>
                              <div className="text-[10px] text-gray-400 dark:text-gray-500">사용 {p.usageCount ?? 0}회</div>
                            </div>
                          </>
                        )}
                        onSearch={async (q) => {
                          const res = await productApi.list({ activeOnly: true, q: q || undefined });
                          return res.items;
                        }}
                        onSelect={(p) => {
                          setProducts((prev) => (prev.some((x) => x.id === p.id) ? prev : [p, ...prev]));
                          updateItem(idx, { productId: p.id });
                        }}
                      />
                    </td>
                    <td className="px-3 py-2 hidden md:table-cell align-top">
                      <input
                        value={it.description ?? ''}
                        onChange={(e) => updateItem(idx, { description: e.target.value })}
                        placeholder={product?.description ?? ''}
                        className={cellInputClass}
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <input
                        type="number"
                        min={1}
                        value={it.quantity}
                        onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                        className={cellInputClass + ' text-right'}
                      />
                    </td>
                    <td className="px-3 py-2 align-top text-right whitespace-nowrap text-gray-700 dark:text-gray-300">
                      {product ? formatCurrency(unitPrice) : '-'}
                    </td>
                    <td className="px-3 py-2 align-top text-right font-medium whitespace-nowrap">
                      {product ? formatCurrency(lineAmount) : '-'}
                    </td>
                    <td className="px-3 py-2 align-top text-center">
                      {form.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm"
                          aria-label="품목 삭제"
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!mastersLoading && products.length === 0 && (
          <div className="px-5 sm:px-6 py-3 text-xs text-amber-600 dark:text-amber-400 border-t border-gray-200 dark:border-slate-700">
            등록된 활성 품목이 없습니다. 먼저 품목 관리에서 품목을 추가하세요.
          </div>
        )}

        <div className="px-5 sm:px-6 py-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">부가세 처리</div>
            <SegmentedControl<'separate' | 'included'>
              ariaLabel="부가세 처리 선택"
              value={form.vatIncluded ? 'included' : 'separate'}
              onChange={(v) => setField('vatIncluded', v === 'included')}
              options={[
                { value: 'separate', label: '부가세 별도' },
                { value: 'included', label: '부가세 포함' },
              ]}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {form.vatIncluded
                ? '단가는 부가세가 포함된 가격입니다.'
                : '단가는 공급가액이며 합계에 부가세 10% 가 추가됩니다.'}
            </p>
          </div>
          <dl className="text-sm w-full sm:w-72 sm:shrink-0 space-y-1.5">
            <div className="flex justify-between text-gray-700 dark:text-gray-300">
              <dt>공급가액</dt>
              <dd className="font-medium">{formatCurrency(breakdown.supply)}</dd>
            </div>
            <div className="flex justify-between text-gray-700 dark:text-gray-300">
              <dt>부가세 (10%)</dt>
              <dd className="font-medium">{formatCurrency(breakdown.vat)}</dd>
            </div>
            <div className="flex justify-between pt-1.5 border-t border-gray-200 dark:border-slate-700 text-gray-900 dark:text-gray-100">
              <dt className="font-semibold">합계</dt>
              <dd className="font-bold text-base">{formatCurrency(breakdown.total)}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-5 sm:p-6">
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">비고</label>
        <textarea
          value={form.notes}
          onChange={(e) => setField('notes', e.target.value)}
          rows={4}
          className={inputClass}
        />
      </section>

      <div className="flex justify-end gap-2">
        <Link to="/quotations" className="px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 text-sm rounded-md hover:bg-gray-50 dark:hover:bg-slate-600">취소</Link>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-medium rounded-md shadow-sm"
        >
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
    </form>
  );
}

const inputClass =
  'w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60 disabled:cursor-not-allowed';

const cellInputClass =
  'w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 rounded-md text-sm disabled:opacity-60 disabled:cursor-not-allowed';

function Input({
  label,
  value,
  onChange,
  type = 'text',
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className={inputClass}
      />
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="text-gray-800 dark:text-gray-200 mt-0.5 break-words">
        {value && value.trim() ? value : <span className="text-gray-400 dark:text-gray-500">-</span>}
      </dd>
    </div>
  );
}
