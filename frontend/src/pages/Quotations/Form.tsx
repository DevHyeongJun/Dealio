import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  quotationApi,
  type QuotationInput,
  type QuotationItem,
  type QuotationStatus,
  STATUS_LABELS,
} from '../../api/quotations';
import { formatCurrency } from '../../lib/format';

const emptyItem: QuotationItem = { name: '', description: '', quantity: 1, unitPrice: 0 };

const initialState: QuotationInput = {
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  customerAddress: '',
  issueDate: new Date().toISOString().slice(0, 10),
  validUntil: '',
  status: 'DRAFT',
  notes: '',
  items: [{ ...emptyItem }],
};

export default function QuotationForm({ mode }: { mode: 'create' | 'edit' }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<QuotationInput>(initialState);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && id) {
      quotationApi.get(id).then((q) =>
        setForm({
          customerName: q.customerName,
          customerEmail: q.customerEmail ?? '',
          customerPhone: q.customerPhone ?? '',
          customerAddress: q.customerAddress ?? '',
          issueDate: q.issueDate ? q.issueDate.slice(0, 10) : '',
          validUntil: q.validUntil ? q.validUntil.slice(0, 10) : '',
          status: q.status,
          notes: q.notes ?? '',
          items: (q.items ?? []).map((it) => ({
            name: it.name,
            description: it.description ?? '',
            quantity: Number(it.quantity),
            unitPrice: Number(it.unitPrice),
          })),
        })
      ).catch((e) => setError(e.message));
    }
  }, [mode, id]);

  function setField<K extends keyof QuotationInput>(key: K, value: QuotationInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateItem(idx: number, patch: Partial<QuotationItem>) {
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    }));
  }

  function addItem() {
    setForm((f) => ({ ...f, items: [...f.items, { ...emptyItem }] }));
  }

  function removeItem(idx: number) {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  }

  const totalAmount = form.items.reduce(
    (sum, it) => sum + Number(it.quantity || 0) * Number(it.unitPrice || 0),
    0
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload: QuotationInput = {
        ...form,
        customerEmail: form.customerEmail || null,
        customerPhone: form.customerPhone || null,
        customerAddress: form.customerAddress || null,
        validUntil: form.validUntil || null,
        notes: form.notes || null,
        items: form.items.map((it) => ({
          ...it,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
        })),
      };
      if (mode === 'create') {
        const created = await quotationApi.create(payload);
        navigate(`/quotations/${created.id}`);
      } else if (id) {
        await quotationApi.update(id, payload);
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
        <Link to="/quotations" className="text-sm text-gray-500 hover:text-gray-700">← 목록으로</Link>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
          {mode === 'create' ? '새 견적서' : '견적서 수정'}
        </h2>
      </div>

      {error && <div className="rounded-md bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>}

      <section className="bg-white rounded-lg shadow-sm border p-5 sm:p-6">
        <h3 className="font-semibold text-gray-800 mb-4">고객 정보</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="고객명 *" value={form.customerName} onChange={(v) => setField('customerName', v)} required />
          <Input label="이메일" type="email" value={form.customerEmail ?? ''} onChange={(v) => setField('customerEmail', v)} />
          <Input label="연락처" value={form.customerPhone ?? ''} onChange={(v) => setField('customerPhone', v)} />
          <Input label="주소" value={form.customerAddress ?? ''} onChange={(v) => setField('customerAddress', v)} />
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border p-5 sm:p-6">
        <h3 className="font-semibold text-gray-800 mb-4">견적서 정보</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="발행일" type="date" value={form.issueDate ?? ''} onChange={(v) => setField('issueDate', v)} />
          <Input label="유효기한" type="date" value={form.validUntil ?? ''} onChange={(v) => setField('validUntil', v)} />
          <div>
            <label className="block text-xs text-gray-500 mb-1">상태</label>
            <select
              value={form.status}
              onChange={(e) => setField('status', e.target.value as QuotationStatus)}
              className="w-full px-3 py-2 border rounded-md text-sm bg-white"
            >
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="flex items-center justify-between p-5 sm:p-6 border-b">
          <h3 className="font-semibold text-gray-800">품목</h3>
          <button type="button" onClick={addItem} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-900 text-white text-sm rounded-md">
            + 품목 추가
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
              <tr>
                <th className="text-left px-3 py-2 font-medium">품목명</th>
                <th className="text-left px-3 py-2 font-medium hidden md:table-cell">설명</th>
                <th className="text-right px-3 py-2 font-medium w-24">수량</th>
                <th className="text-right px-3 py-2 font-medium w-32">단가</th>
                <th className="text-right px-3 py-2 font-medium w-32">금액</th>
                <th className="px-3 py-2 w-12" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {form.items.map((it, idx) => (
                <tr key={idx}>
                  <td className="px-3 py-2">
                    <input
                      value={it.name}
                      onChange={(e) => updateItem(idx, { name: e.target.value })}
                      placeholder="품목명"
                      className="w-full px-2 py-1.5 border rounded-md text-sm"
                      required
                    />
                  </td>
                  <td className="px-3 py-2 hidden md:table-cell">
                    <input
                      value={it.description ?? ''}
                      onChange={(e) => updateItem(idx, { description: e.target.value })}
                      className="w-full px-2 py-1.5 border rounded-md text-sm"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={1}
                      value={it.quantity}
                      onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 border rounded-md text-sm text-right"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={it.unitPrice}
                      onChange={(e) => updateItem(idx, { unitPrice: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 border rounded-md text-sm text-right"
                    />
                  </td>
                  <td className="px-3 py-2 text-right font-medium whitespace-nowrap">
                    {formatCurrency(Number(it.quantity || 0) * Number(it.unitPrice || 0))}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {form.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="text-red-600 hover:text-red-700 text-sm"
                        aria-label="품목 삭제"
                      >
                        ✕
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50">
                <td colSpan={4} className="px-3 py-3 text-right text-sm font-medium text-gray-700">합계</td>
                <td className="px-3 py-3 text-right font-bold text-base">{formatCurrency(totalAmount)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border p-5 sm:p-6">
        <label className="block text-xs text-gray-500 mb-1">비고</label>
        <textarea
          value={form.notes ?? ''}
          onChange={(e) => setField('notes', e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border rounded-md text-sm"
        />
      </section>

      <div className="flex justify-end gap-2">
        <Link to="/quotations" className="px-4 py-2 bg-white border text-sm rounded-md hover:bg-gray-50">취소</Link>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-md shadow-sm"
        >
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
    </form>
  );
}

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
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
    </div>
  );
}
