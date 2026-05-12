import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  contractApi,
  type Contract,
  type ContractHistoryEntry,
  CONTRACT_TYPE_LABELS,
  CONTRACT_TYPE_COLORS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  CONTRACT_HISTORY_LABELS,
  CONTRACT_HISTORY_COLORS,
} from '../../api/contracts';
import { formatCurrency, formatDate } from '../../lib/format';
import { toKoreanAmount } from '../../lib/koreanAmount';
import { ApiError } from '../../api/client';
import { YooAnAlert, YooAnButton, YooAnCollapsibleSection, YooAnEmptyState } from '../../components/yooan';
import {
  expenseApi,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_CATEGORY_COLORS,
  type Expense,
} from '../../api/expenses';
import AttachmentManager from '../../components/AttachmentManager';
import CustomerPreviewModal from '../../components/CustomerPreviewModal';
import { useToast } from '../../contexts/ToastContext';
import { copyText } from '../../lib/clipboard';

function formatDateTime(value?: string | null): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function errorMessage(e: unknown, fallback: string): string {
  if (e instanceof ApiError && typeof e.message === 'string') return e.message;
  return e instanceof Error ? e.message : fallback;
}

export default function ContractDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contract, setContract] = useState<Contract | null>(null);
  const [history, setHistory] = useState<ContractHistoryEntry[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expensesTotal, setExpensesTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [customerPreviewOpen, setCustomerPreviewOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    Promise.all([
      contractApi.get(id),
      contractApi.history(id),
      expenseApi.list({ contractId: id, take: 500 }),
    ])
      .then(([c, h, e]) => {
        if (cancelled) return;
        setContract(c);
        setHistory(h.items);
        setExpenses(e.items);
        setExpensesTotal(e.totalAmount);
      })
      .catch((e) => !cancelled && setError(errorMessage(e, '계약을 불러오지 못했습니다.')));
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleDelete() {
    if (!contract || !confirm(`'${contract.title}' 계약을 삭제하시겠습니까?`)) return;
    try {
      await contractApi.remove(contract.id);
      navigate('/contracts');
    } catch (e) {
      alert(errorMessage(e, '삭제에 실패했습니다.'));
    }
  }

  if (error) return <YooAnAlert>{error}</YooAnAlert>;
  if (!contract) return <div className="text-gray-500 dark:text-gray-400">불러오는 중...</div>;

  const outstanding = Number(contract.amount) - Number(contract.paidAmount);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Link to="/contracts" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">← 목록으로</Link>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{contract.title}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{contract.contractNumber}</span>
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${CONTRACT_TYPE_COLORS[contract.type]}`}>
              {CONTRACT_TYPE_LABELS[contract.type]}
            </span>
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${PAYMENT_STATUS_COLORS[contract.paymentStatus]}`}>
              {PAYMENT_STATUS_LABELS[contract.paymentStatus]}
            </span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            to={`/contracts/${contract.id}/edit`}
            className="px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 text-sm rounded-md hover:bg-gray-50 dark:hover:bg-slate-600"
          >
            수정
          </Link>
          <YooAnButton variant="danger" onClick={handleDelete}>삭제</YooAnButton>
        </div>
      </div>

      <section className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-5 sm:p-6">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-5">기본 정보</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <Field label="거래처">
            {contract.customer ? (
              <button
                type="button"
                onClick={() => setCustomerPreviewOpen(true)}
                className="text-brand-600 dark:text-brand-400 hover:underline text-left"
                title="거래처 상세 보기"
              >
                {contract.customer.name}
              </button>
            ) : (
              contract.counterpartyName
            )}
          </Field>
          <Field label="연결 견적서">
            {contract.quotation ? (
              <Link
                to={`/quotations/${contract.quotation.id}`}
                className="text-brand-600 dark:text-brand-400 font-mono hover:underline"
              >
                {contract.quotation.quotationNumber}
              </Link>
            ) : (
              <span className="text-gray-400 dark:text-gray-500">-</span>
            )}
          </Field>
          <Field label="시작일">{formatDate(contract.startDate)}</Field>
          <Field label="종료일">{formatDate(contract.endDate)}</Field>
        </dl>

        {contract.notes && (
          <div className="mt-5 pt-5 border-t border-gray-200 dark:border-slate-700">
            <dt className="text-xs text-gray-500 dark:text-gray-400 mb-1">비고</dt>
            <dd className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{contract.notes}</dd>
          </div>
        )}

        <div className="mt-5 pt-5 border-t border-gray-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs">
          <UserStamp label="작성자" user={contract.createdBy} at={contract.createdAt} />
          <UserStamp label="최근 수정" user={contract.updatedBy} at={contract.updatedAt} />
        </div>
      </section>

      <section className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-5 sm:p-6">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-5">금액</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <AmountField label="계약금액" value={Number(contract.amount)} tone={contract.type === 'SALES' ? 'brand' : 'amber'} />
          <AmountField label="정산금액" value={Number(contract.paidAmount)} tone="success" />
          <AmountField label="잔여금액" value={outstanding} tone={outstanding > 0 ? 'danger' : 'neutral'} />
        </dl>

        <TaxInvoiceBreakdown amount={Number(contract.amount)} vatIncluded={contract.vatIncluded ?? true} />
      </section>

      <YooAnCollapsibleSection
        title="연결된 경비"
        count={expenses.length}
        rightSlot={
          <Link
            to={`/expenses/new?contractId=${contract.id}`}
            className="text-xs px-2 py-1 rounded text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/15 font-medium"
          >
            + 경비 추가
          </Link>
        }
      >
        {expenses.length === 0 ? (
          <YooAnEmptyState message="이 계약에 연결된 경비가 없습니다." />
        ) : (
          <>
            <div className="px-5 py-3 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">경비 합계</span>
              <span className="font-bold text-gray-900 dark:text-gray-100">
                {formatCurrency(expensesTotal)}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-900 text-gray-600 dark:text-gray-400 text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium">날짜</th>
                    <th className="text-left px-4 py-2.5 font-medium">카테고리</th>
                    <th className="text-left px-4 py-2.5 font-medium">내용</th>
                    <th className="text-right px-4 py-2.5 font-medium">금액</th>
                    <th className="px-4 py-2.5 w-16" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700 text-gray-800 dark:text-gray-200">
                  {expenses.map((e) => (
                    <tr key={e.id}>
                      <td className="px-4 py-2.5 whitespace-nowrap text-gray-700 dark:text-gray-300">
                        {formatDate(e.expenseDate)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${EXPENSE_CATEGORY_COLORS[e.category]}`}>
                          {EXPENSE_CATEGORY_LABELS[e.category]}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <Link
                          to={`/expenses/${e.id}/edit`}
                          className="text-gray-900 dark:text-gray-100 hover:underline"
                        >
                          {e.description}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium whitespace-nowrap">
                        {formatCurrency(Number(e.amount))}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Link
                          to={`/expenses/${e.id}/edit`}
                          className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                        >
                          수정
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </YooAnCollapsibleSection>

      <YooAnCollapsibleSection title="첨부 파일">
        <div className="px-5 py-4">
          <AttachmentManager entityType="CONTRACT" entityId={contract.id} />
        </div>
      </YooAnCollapsibleSection>

      <YooAnCollapsibleSection title="변경 이력" count={history.length}>
        {history.length === 0 ? (
          <YooAnEmptyState message="변경 이력이 없습니다." />
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-slate-700">
            {history.map((h) => (
              <li key={h.id} className="px-5 py-3 flex items-start gap-3">
                <span className={`inline-block px-2 py-1 rounded text-xs font-medium shrink-0 ${CONTRACT_HISTORY_COLORS[h.action]}`}>
                  {CONTRACT_HISTORY_LABELS[h.action]}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-800 dark:text-gray-200">{h.summary}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {h.user?.name ?? '시스템'} · {formatDateTime(h.createdAt)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </YooAnCollapsibleSection>

      {customerPreviewOpen && contract.customer && (
        <CustomerPreviewModal
          customerId={contract.customer.id}
          onClose={() => setCustomerPreviewOpen(false)}
        />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</dt>
      <dd className="text-gray-900 dark:text-gray-100">{children}</dd>
    </div>
  );
}

const TONE_CLASSES: Record<string, string> = {
  neutral: 'text-gray-900 dark:text-gray-100',
  brand: 'text-brand-700 dark:text-brand-300',
  amber: 'text-amber-700 dark:text-amber-300',
  success: 'text-green-700 dark:text-green-300',
  danger: 'text-red-700 dark:text-red-300',
};

function AmountField({ label, value, tone = 'neutral' }: { label: string; value: number; tone?: keyof typeof TONE_CLASSES }) {
  return (
    <div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
      <div className={`text-lg font-bold mt-1 ${TONE_CLASSES[tone]}`}>{formatCurrency(value)}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{toKoreanAmount(value)}</div>
    </div>
  );
}

function TaxInvoiceBreakdown({ amount, vatIncluded }: { amount: number; vatIncluded: boolean }) {
  const toast = useToast();
  const supply = vatIncluded ? Math.round(amount / 1.1) : Math.round(amount);
  const vat = vatIncluded ? amount - supply : Math.round(amount * 0.1);
  const grand = vatIncluded ? Math.round(amount) : supply + vat;

  async function copy(value: number, label: string) {
    try {
      await copyText(String(value));
      toast.success(`${label} 복사되었습니다 (${value.toLocaleString()})`);
    } catch {
      toast.error('복사에 실패했습니다.');
    }
  }

  return (
    <div className="mt-6 pt-5 border-t border-gray-200 dark:border-slate-700">
      <div className="flex items-baseline justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">세금계산서 발행</h4>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {vatIncluded ? '※ 계약금액에 부가세 포함' : '※ 계약금액은 공급가액 (부가세 별도)'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-x-4">
        <button
          type="button"
          onClick={() => copy(supply, '공급가액을')}
          className="group text-left py-1 px-1 -mx-1 hover:bg-gray-50 dark:hover:bg-slate-700/40 rounded transition-colors"
          title="클릭하면 복사됩니다"
        >
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <span>공급가액</span>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-brand-600 dark:text-brand-400">복사</span>
          </div>
          <div className="text-base font-semibold text-gray-900 dark:text-gray-100 font-mono">
            ₩{supply.toLocaleString()}
          </div>
        </button>

        <div className="py-1 select-none">
          <div className="text-xs text-gray-500 dark:text-gray-400">세액</div>
          <div className="text-base font-semibold text-gray-600 dark:text-gray-300 font-mono">
            ₩{vat.toLocaleString()}
          </div>
        </div>

        <button
          type="button"
          onClick={() => copy(grand, '합계금액을')}
          className="group text-left py-1 px-1 -mx-1 hover:bg-gray-50 dark:hover:bg-slate-700/40 rounded transition-colors"
          title="클릭하면 복사됩니다"
        >
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <span>합계금액</span>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-brand-600 dark:text-brand-400">복사</span>
          </div>
          <div className="text-base font-semibold text-gray-900 dark:text-gray-100 font-mono">
            ₩{grand.toLocaleString()}
          </div>
        </button>
      </div>

      <div className="px-4 py-2 mt-3 text-xs text-gray-500 dark:text-gray-400 space-y-1 bg-gray-50 dark:bg-slate-900/30 rounded">
        <div className="font-medium text-gray-600 dark:text-gray-300">계산 규칙</div>
        {vatIncluded ? (
          <ul className="space-y-0.5 leading-relaxed">
            <li>· 계약금액 = 부가세 포함 합계 → 공급가액 = 합계 ÷ 1.1</li>
            <li>· 부가세 = 합계 − 공급가액 (≈ 합계 × 1/11)</li>
          </ul>
        ) : (
          <ul className="space-y-0.5 leading-relaxed">
            <li>· 계약금액 = 공급가액 (부가세 제외) → 부가세 = 공급가액 × 10%</li>
            <li>· 합계 = 공급가액 × 1.1 (= 공급가액 + 부가세)</li>
          </ul>
        )}
      </div>
    </div>
  );
}

function UserStamp({ label, user, at }: { label: string; user: { name: string } | null | undefined; at: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-gray-500 dark:text-gray-400 shrink-0">{label}</span>
      <span className="text-gray-700 dark:text-gray-300">
        {user?.name ?? '시스템'}
        <span className="ml-1.5 text-gray-400 dark:text-gray-500">{formatDateTime(at)}</span>
      </span>
    </div>
  );
}
