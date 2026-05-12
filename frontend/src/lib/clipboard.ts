/**
 * 클립보드 복사 — secure context (HTTPS/localhost) 에서는 navigator.clipboard,
 * 그 외(HTTP LAN 접속 등)에서는 document.execCommand 폴백을 사용.
 */
export async function copyText(text: string): Promise<void> {
  // 1) 최신 API — secure context 에서만 동작
  if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // 권한/포커스 문제 → 폴백
    }
  }

  // 2) execCommand 폴백 — deprecated 지만 HTTP 환경에서 유일하게 동작
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.top = '0';
  ta.style.left = '0';
  ta.style.width = '1px';
  ta.style.height = '1px';
  ta.style.opacity = '0';
  ta.style.pointerEvents = 'none';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  ta.setSelectionRange(0, ta.value.length);
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  document.body.removeChild(ta);
  if (!ok) throw new Error('clipboard not available');
}
