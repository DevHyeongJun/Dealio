import { useEffect, useMemo, useState } from 'react';
import SettingsSection from '../../components/common/SettingsSection';
import SettingsToc, { type TocItem } from '../../components/common/SettingsToc';
import SettingsRow from '../../components/common/SettingsRow';
import SegmentedControl from '../../components/common/SegmentedControl';
import { useTheme, type Theme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  settingsApi,
  COMPANY_FIELD_ORDER,
  QUOTATION_PDF_FIELD_ORDER,
  type AppSettings,
  type CompanyProfile,
  type MailSubjectPlaceholder,
  type QuotationPdfTheme,
} from '../../api/settings';
import { YooAnAlert, YooAnButton, YooAnInput, YooAnModal, YooAnTextarea } from '../../components/yooan';
import { accessLogApi } from '../../api/accessLogs';
import CodeEditor from '../../components/CodeEditor';

const SunIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);

const MoonIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const themeOptions: { value: Theme; label: string; icon: JSX.Element }[] = [
  { value: 'light', label: '라이트', icon: SunIcon },
  { value: 'dark', label: '다크', icon: MoonIcon },
];

function renderPreview(template: string, placeholders: MailSubjectPlaceholder[]): string {
  const map = Object.fromEntries(placeholders.map((p) => [p.key, p.sample]));
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in map ? map[key] : `{${key}}`,
  );
}

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  // 메일 HTML 본문 템플릿 모달
  const [htmlModalOpen, setHtmlModalOpen] = useState(false);
  const [htmlDraft, setHtmlDraft] = useState('');
  const [htmlSaving, setHtmlSaving] = useState(false);
  const [htmlError, setHtmlError] = useState<string | null>(null);

  // 회사정보 (PDF 헤더용)
  const emptyCompany: CompanyProfile = {
    name: '',
    businessNumber: '',
    representative: '',
    address: '',
    phone: '',
    fax: '',
    email: '',
    contactPerson: '',
    contactPhone: '',
  };
  const [companyDraft, setCompanyDraft] = useState<CompanyProfile>(emptyCompany);
  const [companySaving, setCompanySaving] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [companyFlash, setCompanyFlash] = useState(false);

  // 사업자등록증 업로드
  const [bizRegUploading, setBizRegUploading] = useState(false);
  const [bizRegError, setBizRegError] = useState<string | null>(null);
  const [bizRegFlash, setBizRegFlash] = useState(false);

  async function handleBizRegUpload(file: File) {
    setBizRegUploading(true);
    setBizRegError(null);
    try {
      const meta = await settingsApi.uploadBusinessRegistration(file);
      setSettings((prev) => (prev ? { ...prev, businessRegistration: meta } : prev));
      setBizRegFlash(true);
      setTimeout(() => setBizRegFlash(false), 2000);
    } catch (e: any) {
      setBizRegError(e?.message || '업로드 실패');
    } finally {
      setBizRegUploading(false);
    }
  }

  async function handleBizRegDelete() {
    if (!confirm('사업자등록증을 삭제하시겠습니까?')) return;
    setBizRegError(null);
    try {
      await settingsApi.deleteBusinessRegistration();
      setSettings((prev) => (prev ? { ...prev, businessRegistration: null } : prev));
    } catch (e: any) {
      setBizRegError(e?.message || '삭제 실패');
    }
  }

  // 견적서 PDF 설정
  const emptyPdfTheme: QuotationPdfTheme = {
    headerTitle: '견 적 서',
    accentColor: '#2563EB',
    footerNote: '',
    showStamp: false,
  };
  const [pdfDraft, setPdfDraft] = useState<QuotationPdfTheme>(emptyPdfTheme);
  const [pdfSaving, setPdfSaving] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfFlash, setPdfFlash] = useState(false);

  // 견적서 PDF 템플릿 (HTML/Handlebars)
  const [pdfTplDraft, setPdfTplDraft] = useState<string>('');
  const [pdfTplSaving, setPdfTplSaving] = useState(false);
  const [pdfTplError, setPdfTplError] = useState<string | null>(null);
  const [pdfTplFlash, setPdfTplFlash] = useState(false);
  const [pdfTplPreviewBusy, setPdfTplPreviewBusy] = useState(false);

  // 접속 로그 자동 삭제
  const [retentionDraft, setRetentionDraft] = useState<string>('0');
  const [retentionSaving, setRetentionSaving] = useState(false);
  const [retentionError, setRetentionError] = useState<string | null>(null);
  const [retentionFlash, setRetentionFlash] = useState<string | null>(null);
  const [cleanupBusy, setCleanupBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    settingsApi
      .get()
      .then((res) => {
        if (!alive) return;
        setSettings(res);
        setSubject(res.mailSubjectTemplate);
        setCompanyDraft(res.company);
        setPdfDraft(res.quotationPdf);
        setPdfTplDraft(res.quotationPdfTemplate);
        setRetentionDraft(String(res.accessLogRetentionDays ?? 0));
      })
      .catch((e) => alive && setLoadError(e.message));
    return () => {
      alive = false;
    };
  }, []);

  const dirty = settings ? subject !== settings.mailSubjectTemplate : false;

  const livePreview = useMemo(
    () => (settings ? renderPreview(subject, settings.placeholders) : ''),
    [subject, settings],
  );

  async function save() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await settingsApi.update({ mailSubjectTemplate: subject });
      setSettings(res);
      setSubject(res.mailSubjectTemplate);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (e: any) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function resetToDefault() {
    if (!settings) return;
    setSubject(settings.defaults.mailSubjectTemplate);
  }

  function insertPlaceholder(key: string) {
    setSubject((prev) => `${prev}{${key}}`);
  }

  const companyDirty = settings
    ? COMPANY_FIELD_ORDER.some(
        (k) => (companyDraft[k] ?? '').trim() !== (settings.company[k] ?? '').trim(),
      )
    : false;

  async function saveCompany() {
    if (!settings) return;
    setCompanySaving(true);
    setCompanyError(null);
    try {
      const res = await settingsApi.update({ company: companyDraft });
      setSettings(res);
      setCompanyDraft(res.company);
      setCompanyFlash(true);
      setTimeout(() => setCompanyFlash(false), 2000);
    } catch (e: any) {
      setCompanyError(e.message);
    } finally {
      setCompanySaving(false);
    }
  }

  function resetCompany() {
    if (!settings) return;
    setCompanyDraft(settings.company);
  }

  const pdfDirty = settings
    ? QUOTATION_PDF_FIELD_ORDER.some((k) => pdfDraft[k] !== settings.quotationPdf[k])
    : false;

  async function savePdf() {
    if (!settings) return;
    setPdfSaving(true);
    setPdfError(null);
    try {
      const res = await settingsApi.update({ quotationPdf: pdfDraft });
      setSettings(res);
      setPdfDraft(res.quotationPdf);
      setPdfFlash(true);
      setTimeout(() => setPdfFlash(false), 2000);
    } catch (e: any) {
      setPdfError(e.message);
    } finally {
      setPdfSaving(false);
    }
  }

  function resetPdf() {
    if (!settings) return;
    setPdfDraft(settings.quotationPdf);
  }

  function resetPdfToDefault() {
    if (!settings) return;
    setPdfDraft(settings.defaults.quotationPdf);
  }

  // ── 견적서 PDF 템플릿 (HTML/Handlebars)
  const pdfTplDirty = settings ? pdfTplDraft !== settings.quotationPdfTemplate : false;

  async function savePdfTpl() {
    if (!settings) return;
    setPdfTplSaving(true);
    setPdfTplError(null);
    try {
      const res = await settingsApi.update({ quotationPdfTemplate: pdfTplDraft });
      setSettings(res);
      setPdfTplDraft(res.quotationPdfTemplate);
      setPdfTplFlash(true);
      setTimeout(() => setPdfTplFlash(false), 2000);
    } catch (e: any) {
      setPdfTplError(e.message);
    } finally {
      setPdfTplSaving(false);
    }
  }

  function resetPdfTpl() {
    if (!settings) return;
    setPdfTplDraft(settings.quotationPdfTemplate);
  }

  function resetPdfTplToDefault() {
    if (!settings) return;
    setPdfTplDraft(settings.defaults.quotationPdfTemplate);
  }

  // ── 접속 로그 자동 삭제
  const retentionDirty = settings
    ? (parseInt(retentionDraft, 10) || 0) !== (settings.accessLogRetentionDays ?? 0)
    : false;

  async function saveRetention() {
    if (!settings) return;
    const n = parseInt(retentionDraft, 10);
    if (Number.isNaN(n) || n < 0) {
      setRetentionError('0 이상의 정수를 입력하세요 (0 = 자동 삭제 비활성)');
      return;
    }
    setRetentionSaving(true);
    setRetentionError(null);
    try {
      const res = await settingsApi.update({ accessLogRetentionDays: n || 0 });
      setSettings(res);
      setRetentionDraft(String(res.accessLogRetentionDays ?? 0));
      setRetentionFlash('저장되었습니다.');
      setTimeout(() => setRetentionFlash(null), 2000);
    } catch (e: any) {
      setRetentionError(e.message);
    } finally {
      setRetentionSaving(false);
    }
  }

  async function runCleanupNow() {
    if (!settings) return;
    if (!confirm('지금 보존 기간을 초과한 접속 로그를 삭제할까요?')) return;
    setCleanupBusy(true);
    setRetentionError(null);
    try {
      const res = await accessLogApi.cleanupNow();
      if (res.retentionDays <= 0) {
        setRetentionError('자동 삭제가 비활성 상태입니다. 보존 일수를 먼저 설정하세요.');
      } else {
        setRetentionFlash(`${res.deleted.toLocaleString()}건 삭제 완료 (보존 ${res.retentionDays}일 초과분).`);
        setTimeout(() => setRetentionFlash(null), 4000);
      }
    } catch (e: any) {
      setRetentionError(e.message);
    } finally {
      setCleanupBusy(false);
    }
  }

  async function previewPdfTpl() {
    setPdfTplPreviewBusy(true);
    setPdfTplError(null);
    try {
      const url = await settingsApi.pdfPreview(pdfTplDraft);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e: any) {
      setPdfTplError(e.message || 'PDF 미리보기에 실패했습니다.');
    } finally {
      setPdfTplPreviewBusy(false);
    }
  }

  function openHtmlEditor() {
    if (!settings) return;
    setHtmlDraft(settings.mailBodyHtmlTemplate);
    setHtmlError(null);
    setHtmlModalOpen(true);
  }

  async function saveHtml() {
    if (!htmlDraft.trim()) {
      setHtmlError('HTML 본문은 비워둘 수 없습니다.');
      return;
    }
    setHtmlSaving(true);
    setHtmlError(null);
    try {
      const res = await settingsApi.update({ mailBodyHtmlTemplate: htmlDraft });
      setSettings(res);
      setHtmlModalOpen(false);
    } catch (e: any) {
      setHtmlError(e.message);
    } finally {
      setHtmlSaving(false);
    }
  }

  function insertHtmlPlaceholder(key: string) {
    setHtmlDraft((prev) => `${prev}{${key}}`);
  }

  function resetHtmlToDefault() {
    if (!settings) return;
    setHtmlDraft(settings.defaults.mailBodyHtmlTemplate);
  }

  const htmlPreview = useMemo(() => {
    if (!settings) return '';
    const map = Object.fromEntries(
      (settings.htmlBodyPlaceholders ?? settings.placeholders).map((p) => [p.key, p.sample]),
    );
    return htmlDraft.replace(/\{(\w+)\}/g, (_, key: string) =>
      key in map ? map[key] : `{${key}}`,
    );
  }, [htmlDraft, settings]);

  const tocItems: TocItem[] = [
    { id: 'appearance', title: '외관' },
    { id: 'company', title: '회사 정보' },
    { id: 'quotation-pdf', title: '견적서 PDF' },
    { id: 'quotation-pdf-template', title: 'PDF 템플릿' },
    { id: 'access-log', title: '접속 로그 자동 삭제' },
    { id: 'mail-subject', title: '메일 발송' },
    { id: 'mail-body', title: '메일 본문 HTML 템플릿' },
  ];

  return (
    <div className="max-w-6xl mx-auto lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-12">
      <aside className="hidden lg:block">
        <SettingsToc items={tocItems} />
      </aside>
      <div className="max-w-3xl divide-y divide-gray-200 dark:divide-slate-800">
      <header className="pb-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">환경설정</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          시스템 동작과 외관을 설정합니다.
        </p>
      </header>

      <SettingsSection id="appearance" title="외관" description="화면 테마를 선택합니다.">
        <SettingsRow label="테마" description="라이트 또는 다크 모드">
          <SegmentedControl<Theme>
            ariaLabel="테마 선택"
            value={theme}
            onChange={setTheme}
            options={themeOptions}
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection
        id="company"
        title="회사 정보"
        description="견적서 PDF 상단의 공급자 정보로 사용됩니다."
      >
        <div className="px-5 py-4 space-y-3">
          {settings ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                {COMPANY_FIELD_ORDER.map((field) => {
                  const isFullWidth = field === 'address';
                  return (
                    <div key={field} className={isFullWidth ? 'sm:col-span-2' : ''}>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                        {settings.companyFieldLabels[field]}
                      </label>
                      <YooAnInput
                        value={companyDraft[field]}
                        onChange={(e) =>
                          setCompanyDraft((prev) => ({ ...prev, [field]: e.target.value }))
                        }
                        disabled={!isAdmin}
                        placeholder={field === 'businessNumber' ? '000-00-00000' : ''}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 mt-3 border-t border-gray-200 dark:border-slate-700">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-100">사업자등록증</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">PNG / JPEG / WEBP / PDF, 최대 5MB</div>
                  </div>
                </div>
                {settings.businessRegistration ? (
                  <div className="rounded-md bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 px-3 py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <a
                        href={settingsApi.businessRegistrationUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-brand-600 dark:text-brand-400 hover:underline truncate inline-block max-w-full"
                      >
                        {settings.businessRegistration.filename}
                      </a>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {settings.businessRegistration.mimetype} · {(settings.businessRegistration.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-2 shrink-0">
                        <label className="cursor-pointer text-xs text-gray-700 dark:text-gray-200 px-2 py-1 rounded border border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700">
                          교체
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,application/pdf"
                            className="hidden"
                            disabled={bizRegUploading}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              e.currentTarget.value = '';
                              if (f) handleBizRegUpload(f);
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={handleBizRegDelete}
                          className="text-xs text-red-600 dark:text-red-400 hover:underline"
                        >
                          삭제
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {isAdmin ? (
                      <label className="cursor-pointer inline-block text-sm text-gray-700 dark:text-gray-200 px-3 py-2 rounded-md bg-white dark:bg-slate-900 border border-dashed border-gray-300 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-500 hover:text-brand-700 dark:hover:text-brand-300">
                        {bizRegUploading ? '업로드 중...' : '+ 파일 선택해서 업로드'}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,application/pdf"
                          className="hidden"
                          disabled={bizRegUploading}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            e.currentTarget.value = '';
                            if (f) handleBizRegUpload(f);
                          }}
                        />
                      </label>
                    ) : (
                      <div className="text-xs text-gray-400 dark:text-gray-500">업로드된 파일이 없습니다.</div>
                    )}
                  </div>
                )}
                {bizRegError && <div className="mt-2"><YooAnAlert>{bizRegError}</YooAnAlert></div>}
                {bizRegFlash && <div className="mt-2"><YooAnAlert tone="success">업로드되었습니다.</YooAnAlert></div>}
              </div>

              {companyError && <YooAnAlert>{companyError}</YooAnAlert>}
              {companyFlash && <YooAnAlert tone="success">저장되었습니다.</YooAnAlert>}

              {isAdmin && (
                <div className="flex items-center justify-end gap-2 pt-1">
                  <YooAnButton
                    variant="ghost"
                    type="button"
                    onClick={resetCompany}
                    disabled={!companyDirty || companySaving}
                  >
                    되돌리기
                  </YooAnButton>
                  <YooAnButton
                    onClick={saveCompany}
                    disabled={!companyDirty || companySaving}
                  >
                    {companySaving ? '저장 중...' : '저장'}
                  </YooAnButton>
                </div>
              )}
              {!isAdmin && (
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  관리자만 변경할 수 있습니다.
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400">불러오는 중...</div>
          )}
        </div>
      </SettingsSection>

      <SettingsSection
        id="quotation-pdf"
        title="견적서 PDF"
        description="견적서 PDF 다운로드 시 적용되는 디자인 설정입니다."
      >
        <div className="px-5 py-4 space-y-4">
          {settings ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {settings.quotationPdfFieldLabels.headerTitle}
                  </label>
                  <YooAnInput
                    value={pdfDraft.headerTitle}
                    onChange={(e) => setPdfDraft({ ...pdfDraft, headerTitle: e.target.value })}
                    disabled={!isAdmin}
                    placeholder="견 적 서"
                  />
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">PDF 최상단에 가운데 정렬로 표시됩니다.</p>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {settings.quotationPdfFieldLabels.accentColor}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={pdfDraft.accentColor}
                      onChange={(e) => setPdfDraft({ ...pdfDraft, accentColor: e.target.value.toUpperCase() })}
                      disabled={!isAdmin}
                      className="w-10 h-9 rounded border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-60 cursor-pointer"
                    />
                    <YooAnInput
                      value={pdfDraft.accentColor}
                      onChange={(e) => setPdfDraft({ ...pdfDraft, accentColor: e.target.value })}
                      disabled={!isAdmin}
                      placeholder="#2563EB"
                      className="font-mono"
                    />
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">정보 박스 헤더, 합계 줄 배경색에 사용됩니다.</p>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {settings.quotationPdfFieldLabels.showStamp}
                  </label>
                  <label className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-md text-sm">
                    <input
                      type="checkbox"
                      checked={pdfDraft.showStamp}
                      onChange={(e) => setPdfDraft({ ...pdfDraft, showStamp: e.target.checked })}
                      disabled={!isAdmin}
                    />
                    <span className="text-gray-700 dark:text-gray-200">"위 견적과 같이 견적합니다." + (인) 박스 표시</span>
                  </label>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {settings.quotationPdfFieldLabels.footerNote}
                  </label>
                  <YooAnInput
                    value={pdfDraft.footerNote}
                    onChange={(e) => setPdfDraft({ ...pdfDraft, footerNote: e.target.value })}
                    disabled={!isAdmin}
                    placeholder="예: 본 견적서는 발행일로부터 30일간 유효합니다."
                  />
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">PDF 하단 회사 정보 위에 작은 글씨로 표시됩니다.</p>
                </div>
              </div>

              {pdfError && <YooAnAlert>{pdfError}</YooAnAlert>}
              {pdfFlash && <YooAnAlert tone="success">저장되었습니다.</YooAnAlert>}

              {isAdmin && (
                <div className="flex items-center justify-end gap-2 pt-1">
                  <YooAnButton variant="ghost" type="button" onClick={resetPdfToDefault}>
                    기본값
                  </YooAnButton>
                  <YooAnButton variant="ghost" type="button" onClick={resetPdf} disabled={!pdfDirty}>
                    되돌리기
                  </YooAnButton>
                  <YooAnButton onClick={savePdf} disabled={!pdfDirty || pdfSaving}>
                    {pdfSaving ? '저장 중...' : '저장'}
                  </YooAnButton>
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400">불러오는 중...</div>
          )}
        </div>
      </SettingsSection>

      <SettingsSection
        id="quotation-pdf-template"
        title="견적서 PDF 템플릿"
        description="PDF 본문은 Handlebars 템플릿(HTML)으로 직접 편집할 수 있습니다. 변수와 헬퍼는 아래 가이드를 참고하세요."
      >
        <div className="px-5 py-4 space-y-3">
          {settings ? (
            <>
              {pdfTplError && <YooAnAlert>{pdfTplError}</YooAnAlert>}
              {pdfTplFlash && <YooAnAlert tone="success">저장되었습니다.</YooAnAlert>}

              <details className="rounded border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 p-3">
                <summary className="text-xs text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                  사용 가능한 변수 / 헬퍼 가이드
                </summary>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-600 dark:text-gray-400">
                  <div>
                    <div className="font-semibold text-gray-700 dark:text-gray-300 mb-1">데이터</div>
                    <ul className="space-y-0.5 font-mono">
                      <li>{'{{quotation.quotationNumber}}'} — 견적번호</li>
                      <li>{'{{quotation.title}}'} — 사업명</li>
                      <li>{'{{quotation.customerName}}'} — 공급받는자</li>
                      <li>{'{{quotation.issueDate}}'} — 발행일 (Date)</li>
                      <li>{'{{quotation.validUntil}}'} — 유효기간 (Date)</li>
                      <li>{'{{quotation.notes}}'} — 특이사항</li>
                      <li>{'{{company.name}}'}, {'{{company.businessNumber}}'} 등</li>
                      <li>{'{{theme.headerTitle}}'}, {'{{theme.accentColor}}'}</li>
                      <li>{'{{totals.supply}}'} / {'{{totals.vat}}'} / {'{{totals.grand}}'}</li>
                      <li>{'{{totals.vatNote}}'} — VAT 안내 문구</li>
                      <li>{'{{dateLine}}'} — "YYYY년 MM월 DD일"</li>
                    </ul>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-700 dark:text-gray-300 mb-1">반복 / 조건</div>
                    <ul className="space-y-0.5 font-mono">
                      <li>{'{{#each items}} ... {{/each}}'}</li>
                      <li className="ml-3">item: {'{{name}}'}, {'{{unitLabel}}'}, {'{{quantity}}'}, {'{{unitPriceNum}}'}, {'{{amountNum}}'}, {'{{{descBlock}}}'}</li>
                      <li>{'{{#if quotation.notes}} ... {{/if}}'}</li>
                      <li>{'{{#if theme.showStamp}} ... {{/if}}'}</li>
                    </ul>
                    <div className="font-semibold text-gray-700 dark:text-gray-300 mt-3 mb-1">헬퍼</div>
                    <ul className="space-y-0.5 font-mono">
                      <li>{'{{formatKRW totals.grand}}'} → ₩1,100,000</li>
                      <li>{'{{formatNumber quantity}}'} → 100</li>
                      <li>{'{{formatDate quotation.issueDate}}'} → 2026.05.06</li>
                      <li>{'{{addOne @index}}'} → 행 번호 (1부터)</li>
                      <li>{'{{or a b c}}'} / {'{{and a b}}'} / {'{{eq a b}}'}</li>
                    </ul>
                  </div>
                </div>
                <p className="mt-3 text-xs text-gray-500 dark:text-gray-500">
                  {'{{var}}'}는 자동으로 HTML 이스케이프됩니다. 이미 HTML인 값(예: descBlock)은 {'{{{var}}}'}로 출력하세요.
                </p>
              </details>

              <CodeEditor
                value={pdfTplDraft}
                onChange={setPdfTplDraft}
                readOnly={!isAdmin}
                placeholder="<!DOCTYPE html>..."
                height={520}
              />

              {!isAdmin && (
                <div className="text-xs text-gray-500 dark:text-gray-400">관리자만 변경할 수 있습니다.</div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                <YooAnButton
                  variant="ghost"
                  size="sm"
                  onClick={resetPdfTplToDefault}
                  type="button"
                  disabled={!isAdmin}
                >
                  기본 템플릿으로 초기화
                </YooAnButton>
                <YooAnButton
                  variant="secondary"
                  onClick={previewPdfTpl}
                  type="button"
                  disabled={pdfTplPreviewBusy}
                >
                  {pdfTplPreviewBusy ? '미리보기 생성중...' : '미리보기 (PDF)'}
                </YooAnButton>
                <YooAnButton
                  variant="secondary"
                  onClick={resetPdfTpl}
                  type="button"
                  disabled={!pdfTplDirty || pdfTplSaving}
                >
                  되돌리기
                </YooAnButton>
                <YooAnButton
                  onClick={savePdfTpl}
                  type="button"
                  disabled={!isAdmin || !pdfTplDirty || pdfTplSaving}
                >
                  {pdfTplSaving ? '저장 중...' : '저장'}
                </YooAnButton>
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400">불러오는 중...</div>
          )}
        </div>
      </SettingsSection>

      <SettingsSection
        id="access-log"
        title="접속 로그 자동 삭제"
        description="설정한 일수보다 오래된 접속 로그를 자동으로 삭제합니다. 0 으로 설정하면 자동 삭제하지 않습니다."
      >
        <div className="px-5 py-4 space-y-3">
          {settings ? (
            <>
              {retentionError && <YooAnAlert>{retentionError}</YooAnAlert>}
              {retentionFlash && <YooAnAlert tone="success">{retentionFlash}</YooAnAlert>}

              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">보존 일수</label>
                  <div className="flex items-center gap-2">
                    <YooAnInput
                      type="number"
                      min={0}
                      step={1}
                      value={retentionDraft}
                      onChange={(e) => setRetentionDraft(e.target.value)}
                      disabled={!isAdmin}
                      placeholder="예: 90"
                      className="max-w-[140px]"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-300">일</span>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {(parseInt(retentionDraft, 10) || 0) === 0
                      ? '0 = 자동 삭제 비활성 (모든 로그 보존)'
                      : `${parseInt(retentionDraft, 10)}일이 지난 로그는 자동으로 삭제됩니다.`}
                  </p>
                </div>
              </div>

              {!isAdmin && (
                <div className="text-xs text-gray-500 dark:text-gray-400">관리자만 변경할 수 있습니다.</div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                <YooAnButton
                  variant="secondary"
                  onClick={runCleanupNow}
                  type="button"
                  disabled={!isAdmin || cleanupBusy}
                >
                  {cleanupBusy ? '정리 중...' : '지금 정리'}
                </YooAnButton>
                <YooAnButton
                  onClick={saveRetention}
                  type="button"
                  disabled={!isAdmin || !retentionDirty || retentionSaving}
                >
                  {retentionSaving ? '저장 중...' : '저장'}
                </YooAnButton>
              </div>

              <p className="text-xs text-gray-400 dark:text-gray-500">
                자동 삭제는 사용자 활동(라우트 이동) 발생 시 24시간에 한 번씩 백그라운드로 실행됩니다.
                "지금 정리" 버튼으로 즉시 실행할 수 있습니다.
              </p>
            </>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400">불러오는 중...</div>
          )}
        </div>
      </SettingsSection>

      <SettingsSection
        id="mail-subject"
        title="메일 발송"
        description="견적서 메일 발송 시 기본으로 채워질 제목 형식을 지정합니다. 발송 화면에서 사용자가 직접 제목을 입력하면 그 값이 우선합니다."
      >
        <div className="px-5 py-4 space-y-3">
          {loadError && <YooAnAlert>{loadError}</YooAnAlert>}

          <label className="block text-xs text-gray-500 dark:text-gray-400">제목 형식</label>
          <YooAnInput
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={settings?.defaults.mailSubjectTemplate ?? ''}
            disabled={!isAdmin || !settings}
          />

          {settings && (
            <>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                사용 가능한 변수
                {!isAdmin && (
                  <span className="ml-2 text-gray-400 dark:text-gray-500">
                    (관리자만 변경할 수 있습니다)
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {settings.placeholders.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => insertPlaceholder(p.key)}
                    disabled={!isAdmin}
                    className="px-2 py-1 text-xs font-mono rounded bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={p.description}
                  >
                    {`{${p.key}}`}
                    <span className="ml-1 text-gray-500 dark:text-gray-400 font-sans">
                      {p.description}
                    </span>
                  </button>
                ))}
              </div>

              <div className="rounded-md bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 px-3 py-2">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">미리보기</div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 break-all">
                  {livePreview || (
                    <span className="text-gray-400 dark:text-gray-500 italic">
                      (제목 형식이 비어 있습니다)
                    </span>
                  )}
                </div>
              </div>

              {saveError && <YooAnAlert>{saveError}</YooAnAlert>}
              {savedFlash && <YooAnAlert tone="success">저장되었습니다.</YooAnAlert>}

              {isAdmin && (
                <div className="flex items-center justify-end gap-2 pt-1">
                  <YooAnButton variant="ghost" type="button" onClick={resetToDefault}>
                    기본값 복원
                  </YooAnButton>
                  <YooAnButton onClick={save} disabled={!dirty || saving || !subject.trim()}>
                    {saving ? '저장 중...' : '저장'}
                  </YooAnButton>
                </div>
              )}
            </>
          )}
        </div>
      </SettingsSection>

      <SettingsSection
        id="mail-body"
        title="메일 본문 HTML 템플릿"
        description="실제 수신자에게 표시되는 스타일된 HTML 본문입니다. 인라인 CSS 만 안전하게 동작합니다 (외부 스타일시트, <style> 태그는 일부 메일 클라이언트에서 무시됨)."
      >
        <div className="px-5 py-4 space-y-3">
          {settings ? (
            <>
              <div className="rounded-md bg-white dark:bg-slate-100 border border-gray-200 dark:border-slate-700 overflow-hidden">
                <div className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-700 bg-gray-50 dark:bg-slate-200 border-b border-gray-200 dark:border-slate-300">
                  현재 미리보기 (실제 메일 형태)
                </div>
                <iframe
                  title="mail-html-preview"
                  srcDoc={settings.mailBodyHtmlPreview}
                  sandbox=""
                  className="w-full bg-white block"
                  style={{ height: 360, border: 0 }}
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                {!isAdmin && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    관리자만 변경할 수 있습니다
                  </span>
                )}
                <YooAnButton
                  variant="secondary"
                  type="button"
                  onClick={openHtmlEditor}
                  disabled={!isAdmin}
                >
                  HTML 템플릿 수정
                </YooAnButton>
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400">불러오는 중...</div>
          )}
        </div>
      </SettingsSection>

      <YooAnModal
        open={htmlModalOpen}
        title="메일 HTML 본문 템플릿 수정"
        size="lg"
        onClose={() => setHtmlModalOpen(false)}
        footer={
          <div className="flex items-center justify-between gap-2 w-full">
            <YooAnButton variant="ghost" type="button" onClick={resetHtmlToDefault}>
              기본값 복원
            </YooAnButton>
            <div className="flex items-center gap-2">
              <YooAnButton
                variant="secondary"
                type="button"
                onClick={() => setHtmlModalOpen(false)}
                disabled={htmlSaving}
              >
                취소
              </YooAnButton>
              <YooAnButton
                type="button"
                onClick={saveHtml}
                disabled={htmlSaving || !htmlDraft.trim()}
              >
                {htmlSaving ? '저장 중...' : '저장'}
              </YooAnButton>
            </div>
          </div>
        }
      >
        <div className="space-y-3">
          {htmlError && <YooAnAlert>{htmlError}</YooAnAlert>}

          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">HTML 본문 템플릿</label>
            <CodeEditor
              value={htmlDraft}
              onChange={setHtmlDraft}
              height={420}
            />
          </div>

          {settings && (
            <>
              <div className="text-xs text-gray-500 dark:text-gray-400">사용 가능한 변수</div>
              <div className="flex flex-wrap gap-1.5">
                {(settings.htmlBodyPlaceholders ?? settings.placeholders).map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => insertHtmlPlaceholder(p.key)}
                    className="px-2 py-1 text-xs font-mono rounded bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200"
                    title={p.description}
                  >
                    {`{${p.key}}`}
                    <span className="ml-1 text-gray-500 dark:text-gray-400 font-sans">{p.description}</span>
                  </button>
                ))}
              </div>

              <div className="rounded-md bg-white border border-gray-200 dark:border-slate-700 overflow-hidden">
                <div className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-700 bg-gray-50 border-b border-gray-200 dark:border-slate-300">
                  미리보기 (샘플 데이터)
                </div>
                <iframe
                  title="mail-html-edit-preview"
                  srcDoc={htmlPreview}
                  sandbox=""
                  className="w-full bg-white block"
                  style={{ height: 360, border: 0 }}
                />
              </div>
            </>
          )}
        </div>
      </YooAnModal>
      </div>
    </div>
  );
}
