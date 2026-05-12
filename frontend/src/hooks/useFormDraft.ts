import { useCallback, useRef } from 'react';

/**
 * 폼 입력값을 sessionStorage 에 자동 저장/복원하는 훅.
 *
 * - 탭 전환으로 컴포넌트가 unmount 됐다 다시 mount 됐을 때 입력 중이던 값을 복원하기 위해 사용.
 * - sessionStorage 라 브라우저 탭(=window) 단위 영속. 새 창 / 다른 브라우저로 가면 사라짐. (의도된 동작)
 * - key 는 폼별로 유일해야 함 (예: `form:quotation:edit:abc123`, `form:quotation:new`)
 *
 * 사용법:
 *   const draft = useFormDraft<FormState>('form:quotation:new');
 *   // 마운트 시: setForm(draft.load() ?? initialState)
 *   // 변경 시 : draft.save(form)
 *   // 저장 성공/취소 시: draft.clear()
 */
export interface FormDraft<T> {
  load: () => T | null;
  save: (value: T) => void;
  clear: () => void;
}

export function useFormDraft<T>(key: string): FormDraft<T> {
  const keyRef = useRef(key);
  keyRef.current = key;

  const load = useCallback((): T | null => {
    try {
      const raw = sessionStorage.getItem(keyRef.current);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }, []);

  const save = useCallback((value: T) => {
    try {
      sessionStorage.setItem(keyRef.current, JSON.stringify(value));
    } catch {
      /* quota or serialization error — silently ignore */
    }
  }, []);

  const clear = useCallback(() => {
    try {
      sessionStorage.removeItem(keyRef.current);
    } catch {
      /* ignore */
    }
  }, []);

  return { load, save, clear };
}
