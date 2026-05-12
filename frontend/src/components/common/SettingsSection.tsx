import type { ReactNode } from 'react';

interface SettingsSectionProps {
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
}

/**
 * 도큐먼트 스타일 설정 섹션.
 * - 카드/배경/외곽선 없음
 * - 부모(SettingsLayout)의 divide-y 가 자동으로 섹션 간 구분선 처리
 * - 굵은 제목 + 부제로 시각 계층 강조
 */
export default function SettingsSection({ id, title, description, children }: SettingsSectionProps) {
  return (
    <section id={id} data-settings-section={id} className="pt-10 scroll-mt-24">
      <header className="mb-5 px-1">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
          {title}
        </h2>
        {description && (
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-2xl">
            {description}
          </p>
        )}
      </header>
      <div className="text-gray-800 dark:text-gray-200">{children}</div>
    </section>
  );
}
