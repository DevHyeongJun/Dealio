import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { quotationApi, type Quotation, STATUS_COLORS, STATUS_LABELS } from '../../api/quotations';
import { formatCurrency, formatDate } from '../../lib/format';

export default function QuotationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [q, setQ] = useState<Quotation | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    quotationApi.get(id).then(setQ).catch((e) => setError(e.message));
  }, [id]);

  async function handleDelete() {
    if (!q || !confirm('정말 삭제하시겠습니까?')) return;
    await quotationApi.remove(q.id);
    navigate('/quotations');
  }

  if (error) return <div className="rounded-md bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>;
  if (!q) return <div className="text-gray-500">불러오는 중...</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Link to="/quotations" className="text-sm text-gray-500 hover:text-gray-700">← 목록으로</Link>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{q.quotationNumber}</h2>
        </div>
        <div className="flex gap-2">
          <Link to={`/quotations/${q.id}/edit`} className="px-3 py-2 bg-white border text-sm rounded-md hover:bg-gray-50">수정</Link>
          <button onClick={handleDelete} className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md">삭제</button>
        </div>
      </div>

      <section className="bg-white rounded-lg shadow-sm border p-5 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-gray-800">기본 정보</h3>
          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[q.status]}`}>
            {STATUS_LABELS[q.status]}
          </span>
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <Field label="고객명" value={q.customerName} />
          <Field label="이메일" value={q.customerEmail || '-'} />
          <Field label="연락처" value={q.customerPhone || '-'} />
          <Field label="주소" value={q.customerAddress || '-'} />
          <Field label="발행일" value={formatDate(q.issueDate)} />
          <Field label="유효기한" value={formatDate(q.validUntil)} />
        </dl>
        {q.notes && (
          <div className="mt-5 pt-5 border-t">
            <dt className="text-xs text-gray-500 mb-1">비고</dt>
            <dd className="text-sm text-gray-800 whitespace-pre-wrap">{q.notes}</dd>
          </div>
        )}
      </section>

      <section className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="p-5 sm:p-6 border-b">
          <h3 className="font-semibold text-gray-800">품목</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3 font-medium">품목명</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">설명</th>
                <th className="text-right px-4 py-3 font-medium">수량</th>
                <th className="text-right px-4 py-3 font-medium">단가</th>
                <th className="text-right px-4 py-3 font-medium">금액</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(q.items ?? []).map((it, idx) => (
                <tr key={it.id ?? idx}>
                  <td className="px-4 py-3 font-medium">{it.name}</td>
                  <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{it.description || '-'}</td>
                  <td className="px-4 py-3 text-right">{it.quantity}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(it.unitPrice)}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatCurrency(it.amount ?? 0)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50">
                <td colSpan={4} className="px-4 py-3 text-right text-sm font-medium text-gray-700">합계</td>
                <td className="px-4 py-3 text-right font-bold text-base">{formatCurrency(q.totalAmount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-500 mb-1">{label}</dt>
      <dd className="text-gray-900">{value}</dd>
    </div>
  );
}
