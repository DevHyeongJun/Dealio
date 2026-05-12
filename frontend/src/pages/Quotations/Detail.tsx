import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  quotationApi,
  calcVatBreakdown,
  type Quotation,
  type QuotationHistoryEntry,
  type QuotationSendLog,
  type SendQuotationInput,
  STATUS_COLORS,
  STATUS_LABELS,
  SEND_STATUS_COLORS,
  SEND_STATUS_LABELS,
  HISTORY_ACTION_LABELS,
  HISTORY_ACTION_COLORS,
} from '../../api/quotations';
import { formatCurrency, formatDate } from '../../lib/format';
import { YooAnCollapsibleSection } from '../../components/yooan';
import { userApi, type User } from '../../api/users';
import { useAuth } from '../../contexts/AuthContext';
import AttachmentManager from '../../components/AttachmentManager';
import { attachmentApi, type Attachment } from '../../api/attachments';
import CustomerPreviewModal from '../../components/CustomerPreviewModal';

function formatBytesShort(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

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

export default function QuotationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [q, setQ] = useState<Quotation | null>(null);
  const [history, setHistory] = useState<QuotationHistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [logOpen, setLogOpen] = useState<QuotationSendLog | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [attachmentCount, setAttachmentCount] = useState(0);
  const [customerPreviewOpen, setCustomerPreviewOpen] = useState(false);

  async function reload() {
    if (!id) return;
    try {
      const [fresh, hist] = await Promise.all([
        quotationApi.get(id),
        quotationApi.history(id),
      ]);
      setQ(fresh);
      setHistory(hist.items);
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => {
    reload();
  }, [id]);

  async function handleDelete() {
    if (!q || !confirm('정말 삭제하시겠습니까?')) return;
    await quotationApi.remove(q.id);
    navigate('/quotations');
  }

  async function handleDownloadPdf() {
    if (!q || pdfBusy) return;
    setPdfBusy(true);
    setPdfError(null);
    try {
      await quotationApi.downloadPdf(q.id);
    } catch (e: any) {
      setPdfError(e?.message || 'PDF 다운로드에 실패했습니다.');
    } finally {
      setPdfBusy(false);
    }
  }

  if (error) return <div className="rounded-md bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 px-4 py-3 text-sm">{error}</div>;
  if (!q) return <div className="text-gray-500 dark:text-gray-400">불러오는 중...</div>;

  const breakdown = calcVatBreakdown(Number(q.totalAmount), q.vatIncluded);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Link to="/quotations" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">← 목록으로</Link>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
            {q.title || q.quotationNumber}
          </h2>
          {q.title && (
            <div className="font-mono text-xs text-gray-500 dark:text-gray-400 mt-1">{q.quotationNumber}</div>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSendOpen(true)}
            className="px-3 py-2 bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600 text-white text-sm rounded-md"
          >
            메일 발송
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={pdfBusy}
            className="px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 text-sm rounded-md hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {pdfBusy ? 'PDF 생성중...' : 'PDF 다운로드'}
          </button>
          <Link
            to={`/contracts?fromQuotation=${q.id}`}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white text-sm rounded-md inline-flex items-center gap-1.5"
            title="이 견적서를 성사 처리하고 계약을 생성합니다"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            계약 생성
          </Link>
          <Link to={`/quotations/${q.id}/edit`} className="px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 text-sm rounded-md hover:bg-gray-50 dark:hover:bg-slate-600">수정</Link>
          <button onClick={handleDelete} className="px-3 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white text-sm rounded-md">삭제</button>
        </div>
      </div>

      {pdfError && (
        <div className="rounded-md bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
          PDF 생성 실패: {pdfError}
        </div>
      )}

      <section className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-5 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">기본 정보</h3>
          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[q.status]}`}>
            {STATUS_LABELS[q.status]}
          </span>
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <div>
            <dt className="text-xs text-gray-500 dark:text-gray-400 mb-1">고객명</dt>
            <dd>
              <button
                type="button"
                onClick={() => setCustomerPreviewOpen(true)}
                className="text-brand-600 dark:text-brand-400 hover:underline text-left"
                title="거래처 상세 보기"
              >
                {q.customerName}
              </button>
            </dd>
          </div>
          <Field label="이메일" value={q.customerEmail || '-'} />
          <Field label="연락처" value={q.customerPhone || '-'} />
          <Field label="주소" value={q.customerAddress || '-'} />
          <Field label="발행일" value={formatDate(q.issueDate)} />
          <Field label="유효기한" value={formatDate(q.validUntil)} />
        </dl>
        {q.notes && (
          <div className="mt-5 pt-5 border-t border-gray-200 dark:border-slate-700">
            <dt className="text-xs text-gray-500 dark:text-gray-400 mb-1">비고</dt>
            <dd className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{q.notes}</dd>
          </div>
        )}

        <div className="mt-5 pt-5 border-t border-gray-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs">
          <UserStamp label="작성자" user={q.createdBy} at={q.createdAt} />
          <UserStamp label="최근 수정" user={q.updatedBy} at={q.updatedAt} />
        </div>
      </section>

      <section className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-gray-200 dark:border-slate-700">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">품목</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-900 text-gray-600 dark:text-gray-400 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3 font-medium">품목명</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">설명</th>
                <th className="text-right px-4 py-3 font-medium">수량</th>
                <th className="text-right px-4 py-3 font-medium">단가</th>
                <th className="text-right px-4 py-3 font-medium">금액</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700 text-gray-800 dark:text-gray-200">
              {(q.items ?? []).map((it, idx) => (
                <tr key={it.id ?? idx}>
                  <td className="px-4 py-3 font-medium">{it.name}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">{it.description || '-'}</td>
                  <td className="px-4 py-3 text-right">{it.quantity}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(it.unitPrice)}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatCurrency(it.amount ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 sm:px-6 py-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 flex justify-end">
          <dl className="text-sm w-full sm:w-72 space-y-1.5">
            <div className="flex justify-between text-gray-700 dark:text-gray-300">
              <dt>공급가액</dt>
              <dd className="font-medium">{formatCurrency(breakdown.supply)}</dd>
            </div>
            <div className="flex justify-between text-gray-700 dark:text-gray-300">
              <dt>부가세 (10%)</dt>
              <dd className="font-medium">{formatCurrency(breakdown.vat)}</dd>
            </div>
            <div className="flex justify-between pt-1.5 border-t border-gray-200 dark:border-slate-700 text-gray-900 dark:text-gray-100">
              <dt className="font-semibold">
                합계
                <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                  ({q.vatIncluded ? '부가세 포함' : '부가세 별도'})
                </span>
              </dt>
              <dd className="font-bold text-base">{formatCurrency(breakdown.total)}</dd>
            </div>
          </dl>
        </div>
      </section>

      <YooAnCollapsibleSection title="발송 이력" count={q.sendLogs?.length ?? 0}>
        {!q.sendLogs || q.sendLogs.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">발송 이력이 없습니다.</div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-900 text-gray-600 dark:text-gray-400 text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">발송일시</th>
                    <th className="text-left px-4 py-3 font-medium">발송자</th>
                    <th className="text-left px-4 py-3 font-medium">수신자</th>
                    <th className="text-left px-4 py-3 font-medium">제목</th>
                    <th className="text-center px-4 py-3 font-medium">상태</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700 text-gray-800 dark:text-gray-200">
                  {q.sendLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/40">
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{formatDateTime(log.sentAt)}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{log.user?.name ?? '-'}</td>
                      <td className="px-4 py-3">{log.recipient}</td>
                      <td className="px-4 py-3 truncate max-w-xs">{log.subject}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${SEND_STATUS_COLORS[log.status]}`}>
                          {SEND_STATUS_LABELS[log.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setLogOpen(log)} className="text-brand-600 dark:text-brand-400 hover:underline text-sm">
                          상세
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="md:hidden divide-y divide-gray-200 dark:divide-slate-700">
              {q.sendLogs.map((log) => (
                <li key={log.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDateTime(log.sentAt)}
                        {log.user?.name && <span className="ml-1.5">· {log.user.name}</span>}
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate mt-0.5">{log.recipient}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5">{log.subject}</div>
                    </div>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium shrink-0 ${SEND_STATUS_COLORS[log.status]}`}>
                      {SEND_STATUS_LABELS[log.status]}
                    </span>
                  </div>
                  <button onClick={() => setLogOpen(log)} className="mt-2 text-brand-600 dark:text-brand-400 text-sm">상세 보기</button>
                </li>
              ))}
            </ul>
          </>
        )}
      </YooAnCollapsibleSection>

      <YooAnCollapsibleSection title="첨부파일" count={attachmentCount}>
        <div className="p-5">
          <AttachmentManager
            entityType="QUOTATION"
            entityId={q.id}
            onChange={setAttachmentCount}
          />
        </div>
      </YooAnCollapsibleSection>

      <YooAnCollapsibleSection title="변경 이력" count={history.length}>
        {history.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">기록된 이력이 없습니다.</div>
        ) : (
          <ol className="divide-y divide-gray-200 dark:divide-slate-700">
            {history.map((h) => (
              <li key={h.id} className="p-4 sm:p-5 flex items-start gap-3">
                <span className={`inline-block px-2 py-1 rounded text-xs font-medium shrink-0 ${HISTORY_ACTION_COLORS[h.action]}`}>
                  {HISTORY_ACTION_LABELS[h.action]}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-gray-900 dark:text-gray-100">{h.summary}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {h.user?.name ?? '알 수 없음'}
                    </span>
                    {h.user?.email && <span className="ml-1">({h.user.email})</span>}
                    <span className="mx-1.5">·</span>
                    {formatDateTime(h.createdAt)}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </YooAnCollapsibleSection>

      {sendOpen && (
        <SendModal
          quotation={q}
          onClose={() => setSendOpen(false)}
          onSent={async () => {
            setSendOpen(false);
            await reload();
          }}
        />
      )}

      {logOpen && <SendLogModal log={logOpen} onClose={() => setLogOpen(null)} />}

      {customerPreviewOpen && (
        <CustomerPreviewModal
          customerId={q.customerId ?? null}
          fallback={{
            name: q.customerName,
            email: q.customerEmail,
            phone: q.customerPhone,
            address: q.customerAddress,
          }}
          onClose={() => setCustomerPreviewOpen(false)}
        />
      )}
    </div>
  );
}

function UserStamp({
  label,
  user,
  at,
}: {
  label: string;
  user?: { id: string; name: string; email: string } | null;
  at: string;
}) {
  return (
    <div>
      <div className="text-gray-500 dark:text-gray-400 mb-0.5">{label}</div>
      <div className="text-gray-800 dark:text-gray-200">
        <span className="font-medium">{user?.name ?? '알 수 없음'}</span>
        <span className="text-gray-400 dark:text-gray-500 ml-1.5">· {formatDateTime(at)}</span>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</dt>
      <dd className="text-gray-900 dark:text-gray-100">{value}</dd>
    </div>
  );
}

const inputClass =
  'w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 rounded-md text-sm';

function SendModal({
  quotation,
  onClose,
  onSent,
}: {
  quotation: Quotation;
  onClose: () => void;
  onSent: () => void | Promise<void>;
}) {
  const { user: me } = useAuth();
  const [form, setForm] = useState<SendQuotationInput>({
    to: quotation.customerEmail ?? '',
    cc: '',
    subject: '',
    markAsSent: true,
    attachPdf: true,
    attachBusinessRegistration: false,
    attachBusinessCard: !!me?.businessCardPath,
    businessCardUserId: me?.id ?? null,
    attachmentIds: [],
  });
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [htmlPreview, setHtmlPreview] = useState<string>('');

  // 견적서에 이미 등록된 첨부파일 목록 (선택용)
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(true);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  async function reloadAttachments() {
    try {
      const res = await attachmentApi.list('QUOTATION', quotation.id);
      setAttachments(res.items);
    } catch {
      /* skip */
    }
  }
  useEffect(() => {
    let alive = true;
    setAttachmentsLoading(true);
    attachmentApi.list('QUOTATION', quotation.id)
      .then((res) => { if (alive) setAttachments(res.items); })
      .catch(() => undefined)
      .finally(() => { if (alive) setAttachmentsLoading(false); });
    return () => { alive = false; };
  }, [quotation.id]);

  async function handleQuickUpload(file: File) {
    setAttachmentError(null);
    setUploadingAttachment(true);
    try {
      const created = await attachmentApi.upload('QUOTATION', quotation.id, file);
      setAttachments((prev) => [created, ...prev]);
      // 새로 올린 파일은 자동 체크
      setForm((f) => ({ ...f, attachmentIds: [...(f.attachmentIds ?? []), created.id] }));
    } catch (e: any) {
      setAttachmentError(e?.message || '업로드 실패');
    } finally {
      setUploadingAttachment(false);
    }
  }

  function toggleAttachment(id: string) {
    setForm((f) => {
      const cur = f.attachmentIds ?? [];
      return {
        ...f,
        attachmentIds: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
      };
    });
  }

  // 같은 회사 소속 사용자 목록 (명함 선택용). 회사 미배정이면 본인만.
  const [coworkers, setCoworkers] = useState<User[]>([]);
  useEffect(() => {
    if (!me?.companyId) return;
    let alive = true;
    userApi.list({ companyId: me.companyId })
      .then((res) => { if (alive) setCoworkers(res.items); })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [me?.companyId]);

  // 명함 선택 후보 — 본인 + 같은 회사 사람들 (중복 제거). 비활성/명함 없는 사람 표시는 disabled
  const cardCandidates = useMemo<User[]>(() => {
    if (!me) return [];
    const list = me.companyId ? coworkers : [];
    const hasMe = list.some((u) => u.id === me.id);
    return hasMe ? list : [me as unknown as User, ...list];
  }, [me, coworkers]);

  // 모달 열릴 때 환경설정 템플릿을 견적서 데이터로 렌더링해서 prefill
  useEffect(() => {
    let alive = true;
    quotationApi
      .mailPreview(quotation.id)
      .then((preview) => {
        if (!alive) return;
        setForm((f) => ({ ...f, subject: preview.subject }));
        setHtmlPreview(preview.html);
      })
      .catch(() => {
        // 미리보기 실패해도 발송은 가능 (백엔드가 빈 값일 때 템플릿 적용)
      })
      .finally(() => alive && setPreviewLoading(false));
    return () => {
      alive = false;
    };
  }, [quotation.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSending(true);
    try {
      const payload: SendQuotationInput = {
        to: form.to.trim(),
        cc: form.cc?.trim() || null,
        subject: form.subject?.trim() || null,
        markAsSent: form.markAsSent,
        attachPdf: form.attachPdf,
        attachBusinessRegistration: form.attachBusinessRegistration,
        attachBusinessCard: form.attachBusinessCard,
        businessCardUserId: form.attachBusinessCard ? (form.businessCardUserId || null) : null,
        attachmentIds: form.attachmentIds ?? [],
      };
      const res = await quotationApi.send(quotation.id, payload);
      if (!res.ok) {
        setErr(res.error || '발송에 실패했습니다.');
        return;
      }
      await onSent();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-40 flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-800 rounded-lg shadow-lg w-full max-w-xl max-h-[90vh] overflow-y-auto"
      >
        <div className="px-5 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">메일 발송</h3>
          <button type="button" onClick={onClose} aria-label="닫기" className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {err && <div className="rounded-md bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 px-3 py-2 text-sm whitespace-pre-wrap">{err}</div>}

          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">수신자 *</label>
            <input
              type="email"
              required
              value={form.to}
              onChange={(e) => setForm({ ...form, to: e.target.value })}
              className={inputClass}
              placeholder="customer@example.com"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">참조 (CC)</label>
            <input
              type="email"
              value={form.cc ?? ''}
              onChange={(e) => setForm({ ...form, cc: e.target.value })}
              className={inputClass}
              placeholder="(선택)"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">제목</label>
            <input
              value={form.subject ?? ''}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className={inputClass}
              placeholder={previewLoading ? '환경설정 템플릿 불러오는 중...' : ''}
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              환경설정의 메일 제목 템플릿이 적용된 결과입니다. 필요하면 직접 수정하세요.
            </p>
          </div>

          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">본문 미리보기 (수신자에게 표시되는 형태)</label>
            {previewLoading ? (
              <div className="rounded-md border border-gray-200 dark:border-slate-700 px-3 py-6 text-center text-xs text-gray-500 dark:text-gray-400">
                불러오는 중...
              </div>
            ) : (
              <div className="rounded-md border border-gray-200 dark:border-slate-700 overflow-hidden">
                <iframe
                  title="send-html-preview"
                  srcDoc={htmlPreview}
                  sandbox=""
                  className="w-full bg-white block"
                  style={{ height: 360, border: 0 }}
                />
              </div>
            )}
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              본문은 환경설정의 HTML 템플릿이 적용되어 발송됩니다. 변경하려면 환경설정 → 메일 본문 HTML 템플릿에서 수정하세요.
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
            <input
              type="checkbox"
              checked={form.attachPdf ?? true}
              onChange={(e) => setForm({ ...form, attachPdf: e.target.checked })}
            />
            <span>견적서 PDF 첨부</span>
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
            <input
              type="checkbox"
              checked={form.attachBusinessRegistration ?? false}
              onChange={(e) => setForm({ ...form, attachBusinessRegistration: e.target.checked })}
            />
            <span>사업자등록증 첨부 <span className="text-xs text-gray-400 dark:text-gray-500">(환경설정에 업로드된 파일이 있을 때만)</span></span>
          </label>

          <div>
            <label className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
              <input
                type="checkbox"
                checked={form.attachBusinessCard ?? false}
                onChange={(e) => setForm({ ...form, attachBusinessCard: e.target.checked })}
              />
              <span>
                명함 첨부
                {!me?.companyId && (
                  <span className="text-xs text-gray-400 dark:text-gray-500"> (회사 미배정 — 본인 명함만 가능)</span>
                )}
              </span>
            </label>
            {form.attachBusinessCard && (
              <div className="mt-2 ml-6">
                <select
                  value={form.businessCardUserId ?? me?.id ?? ''}
                  onChange={(e) => setForm({ ...form, businessCardUserId: e.target.value })}
                  className={inputClass + ' max-w-md'}
                >
                  {cardCandidates.length === 0 ? (
                    <option value="">(같은 회사 사용자 없음)</option>
                  ) : (
                    cardCandidates.map((u) => {
                      const noCard = !u.businessCardPath;
                      const label = `${u.name}${u.jobTitle ? ` (${u.jobTitle})` : ''}${u.id === me?.id ? ' — 본인' : ''}${noCard ? ' [명함 없음]' : ''}`;
                      return (
                        <option key={u.id} value={u.id} disabled={noCard}>
                          {label}
                        </option>
                      );
                    })
                  )}
                </select>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  본인 회사 소속 사용자만 선택 가능합니다. 명함이 등록된 사용자만 활성화됩니다.
                </p>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-gray-800 dark:text-gray-200">추가 첨부파일</span>
              <label className={`text-xs text-brand-600 dark:text-brand-400 hover:underline cursor-pointer ${uploadingAttachment ? 'opacity-60 pointer-events-none' : ''}`}>
                {uploadingAttachment ? '업로드 중...' : '+ 새 파일 업로드'}
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleQuickUpload(f);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
            {attachmentError && (
              <div className="rounded-md bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 px-3 py-1.5 text-xs mb-1.5">
                {attachmentError}
              </div>
            )}
            <div className="rounded-md border border-gray-200 dark:border-slate-700 max-h-40 overflow-y-auto">
              {attachmentsLoading ? (
                <div className="p-4 text-center text-xs text-gray-500 dark:text-gray-400">불러오는 중...</div>
              ) : attachments.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-500 dark:text-gray-400">
                  등록된 첨부파일이 없습니다. 위의 "새 파일 업로드"로 추가하세요.
                </div>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-slate-700/60">
                  {attachments.map((a) => {
                    const checked = (form.attachmentIds ?? []).includes(a.id);
                    return (
                      <li key={a.id}>
                        <label className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/40">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleAttachment(a.id)}
                          />
                          <span className="flex-1 min-w-0 text-sm text-gray-800 dark:text-gray-200 truncate" title={a.filename}>
                            {a.filename}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                            {formatBytesShort(a.size)}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              체크된 파일이 메일에 첨부됩니다. 업로드한 파일은 견적서에도 영구 보관됩니다.
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
            <input
              type="checkbox"
              checked={form.markAsSent ?? true}
              onChange={(e) => setForm({ ...form, markAsSent: e.target.checked })}
            />
            <span>발송 성공 시 견적서 상태를 "발송됨"으로 변경 (DRAFT 상태일 때만)</span>
          </label>
        </div>

        <div className="px-5 py-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 text-sm rounded-md hover:bg-gray-50 dark:hover:bg-slate-600">취소</button>
          <button
            type="submit"
            disabled={sending || !form.to.trim()}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-medium rounded-md"
          >
            {sending ? '발송 중...' : '발송'}
          </button>
        </div>
      </form>
    </div>
  );
}

function SendLogModal({ log, onClose }: { log: QuotationSendLog; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-40 flex items-center justify-center p-4">
      <div
        className="bg-white dark:bg-slate-800 rounded-lg shadow-lg w-full max-w-xl max-h-[90vh] overflow-y-auto"
      >
        <div className="px-5 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">발송 이력 상세</h3>
          <button type="button" onClick={onClose} aria-label="닫기" className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">✕</button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <Row label="발송일시">{formatDateTime(log.sentAt)}</Row>
          <Row label="상태">
            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${SEND_STATUS_COLORS[log.status]}`}>
              {SEND_STATUS_LABELS[log.status]}
            </span>
          </Row>
          <Row label="수신자">{log.recipient}</Row>
          {log.cc && <Row label="CC">{log.cc}</Row>}
          <Row label="제목">{log.subject}</Row>
          {log.messageId && <Row label="Message-ID"><code className="text-xs">{log.messageId}</code></Row>}
          {log.error && (
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">에러</div>
              <pre className="bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs p-3 rounded whitespace-pre-wrap">{log.error}</pre>
            </div>
          )}
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">본문</div>
            <pre className="bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-gray-200 text-xs p-3 rounded whitespace-pre-wrap font-mono">{log.body}</pre>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 text-sm rounded-md hover:bg-gray-50 dark:hover:bg-slate-600">닫기</button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="w-20 shrink-0 text-xs text-gray-500 dark:text-gray-400 pt-0.5">{label}</div>
      <div className="flex-1 text-gray-800 dark:text-gray-200">{children}</div>
    </div>
  );
}
