import CodeMirror, { type Extension } from '@uiw/react-codemirror';
import { html } from '@codemirror/lang-html';
import { oneDark } from '@codemirror/theme-one-dark';
import { useEffect, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface CodeEditorProps {
  value: string;
  onChange: (next: string) => void;
  /** 라이트모드용 기본 light, 다크모드 자동 전환 */
  language?: 'html'; // 추후 확장 시 분기
  /** 픽셀 고정 높이 (기본 480) */
  height?: number;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
}

const baseExtensions: Extension[] = [html({ matchClosingTags: true, autoCloseTags: true })];

/**
 * HTML 코드 에디터 (CodeMirror 6 기반).
 * - 문법 하이라이트 / 자동 들여쓰기 / 닫는 태그 자동 완성
 * - 다크모드 자동 (One Dark)
 * - 모노스페이스, 라인 넘버 자동
 */
export default function CodeEditor({
  value,
  onChange,
  height = 480,
  readOnly,
  placeholder,
  className,
}: CodeEditorProps) {
  const { theme } = useTheme();
  // 다크 모드는 ThemeContext 가 'system' / 'dark' / 'light' 중 하나일 수 있음
  // class html.dark 가 붙어있는지로 실제 적용된 테마 추론
  const [isDark, setIsDark] = useState<boolean>(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  );

  useEffect(() => {
    const update = () =>
      setIsDark(document.documentElement.classList.contains('dark'));
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [theme]);

  return (
    <div
      className={`rounded-md overflow-hidden border border-gray-300 dark:border-slate-700 ${className ?? ''}`}
    >
      <CodeMirror
        value={value}
        onChange={(v) => onChange(v)}
        extensions={baseExtensions}
        theme={isDark ? oneDark : 'light'}
        height={`${height}px`}
        readOnly={readOnly}
        placeholder={placeholder}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLine: true,
          highlightActiveLineGutter: true,
          foldGutter: true,
          autocompletion: true,
          bracketMatching: true,
          closeBrackets: true,
          indentOnInput: true,
        }}
        style={{ fontSize: 13 }}
      />
    </div>
  );
}
