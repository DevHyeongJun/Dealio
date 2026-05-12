import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { customerApi, type Customer } from '../api/customers';
import { ApiError } from '../api/client';
import { YooAnAlert, YooAnButton, YooAnModal } from './yooan';

interface Props {
  customerId: string | null;
  /** customerId 가 null 인 경우(legacy 견적서 등) 보여줄 폴백 스냅샷 */
  fallback?: {
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  };
  onClose: () => void;
}

function errorMessage(e: unknown, fallback: string): string {
  if (e instanceof ApiError && typeof e.message === 'string') return e.message;
  return e instanceof Error ? e.message : fallback;
}

export default function CustomerPreviewModal({ customerId, fallback, onClose }: Props) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(!!customerId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customerId) return;
    let cancelled = false;
    setLoading(true);
    customerApi
      .get(customerId)
      .then((c) => { if (!cancelled) setCustomer(c); })
      .catch((e) => { if (!cancelled) setError(errorMessage(e, '고객을 불러오지 못했습니다.')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [customerId]);

  const hasBiz = !!(
    customer?.businessNumber ||
    customer?.representative ||
    customer?.businessAddress ||
    customer?.businessSector ||
    customer?.businessItem
  );

  return (
    <YooAnModal
      open
      title={customer?.name || fallback?.name || '거래처 정보'}
      size="lg"
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          {customerId && (
            <Link
              to={`/customers/${customerId}/edit`}
              onClick={onClose}
              className="px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 text-sm rounded-md hover:bg-gray-50 dark:hover:bg-slate-600"
            >
              고객 정보 편집
            </Link>
          )}
          <YooAnButton onClick={onClose}>닫기</YooAnButton>
        </div>
      }
    >
      {loading ? (
        <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">불러오는 중...</div>
      ) : error ? (
        <YooAnAlert>{error}</YooAnAlert>
      ) : customer ? (
        <div className="space-y-4">
          {!customer.isActive && (
            <div className="rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-900/60 px-3 py-2 text-xs">
              이 고객은 비활성 상태입니다.
            </div>
          )}

          <section>
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">기본 정보</h4>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
              <Item label="이메일" value={customer.email} />
              <Item label="연락처" value={customer.phone} />
              <Item label="주소" value={customer.address} fullSpan />
            </dl>
          </section>

          {hasBiz && (
            <section className="pt-4 border-t border-gray-200 dark:border-slate-700">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">사업자 정보</h4>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
                <Item label="사업자등록번호" value={customer.businessNumber} mono />
                <Item label="대표자" value={customer.representative} />
                <Item label="사업지 주소" value={customer.businessAddress} fullSpan />
                <Item label="업태" value={customer.businessSector} />
                <Item label="업종 / 종목" value={customer.businessItem} />
              </dl>
            </section>
          )}

          {customer.memo && (
            <section className="pt-4 border-t border-gray-200 dark:border-slate-700">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">메모</h4>
              <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{customer.memo}</div>
            </section>
          )}
        </div>
      ) : fallback ? (
        <div className="space-y-3">
          <div className="rounded-md bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-700 px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
            등록된 고객 마스터와 연결되지 않은 항목입니다. 발행 당시 스냅샷 정보만 표시합니다.
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
            <Item label="이메일" value={fallback.email} />
            <Item label="연락처" value={fallback.phone} />
            <Item label="주소" value={fallback.address} fullSpan />
          </dl>
        </div>
      ) : null}
    </YooAnModal>
  );
}

function Item({
  label, value, mono, fullSpan,
}: { label: string; value?: string | null; mono?: boolean; fullSpan?: boolean }) {
  return (
    <div className={fullSpan ? 'sm:col-span-2' : ''}>
      <dt className="text-xs text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className={`text-gray-900 dark:text-gray-100 mt-0.5 break-words ${mono ? 'font-mono' : ''}`}>
        {value && value.trim() ? value : <span className="text-gray-400 dark:text-gray-500">-</span>}
      </dd>
    </div>
  );
}
