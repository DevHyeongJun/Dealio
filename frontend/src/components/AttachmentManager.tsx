import { useEffect, useRef, useState } from 'react';
import {
  attachmentApi,
  type Attachment,
  type AttachmentEntity,
} from '../api/attachments';

interface Props {
  entityType: AttachmentEntity;
  entityId: string;
  /** 작성자만 삭제 가능하게 하고 싶으면 비활성화 */
  canDelete?: boolean;
  /** 첨부 변경 시 콜백 (옵션) */
  onChange?: (count: number) => void;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatDateTime(s: string): string {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function iconFor(mimetype: string): string {
  if (mimetype.startsWith('image/')) return '🖼️';
  if (mimetype === 'application/pdf') return '📄';
  if (mimetype.includes('zip') || mimetype.includes('rar') || mimetype.includes('7z')) return '🗜️';
  if (mimetype.includes('sheet') || mimetype.includes('excel')) return '📊';
  if (mimetype.includes('word') || mimetype.includes('document')) return '📝';
  if (mimetype.includes('presentation')) return '📑';
  return '📎';
}

export default function AttachmentManager({
  entityType,
  entityId,
  canDelete = true,
  onChange,
}: Props) {
  const [items, setItems] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function reload() {
    setLoading(true);
    try {
      const res = await attachmentApi.list(entityType, entityId);
      setItems(res.items);
      onChange?.(res.items.length);
    } catch (e: any) {
      setError(e?.message || '첨부 파일을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  async function uploadFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    if (!arr.length) return;
    setUploading(true);
    setError(null);
    try {
      const failures: string[] = [];
      for (const f of arr) {
        try {
          await attachmentApi.upload(entityType, entityId, f);
        } catch (e: any) {
          failures.push(`${f.name}: ${e?.message || '실패'}`);
        }
      }
      if (failures.length) setError(failures.join('\n'));
      await reload();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function onPickClick() {
    fileInputRef.current?.click();
  }

  async function handleDelete(att: Attachment) {
    if (!confirm(`'${att.filename}' 을 삭제하시겠습니까?`)) return;
    try {
      await attachmentApi.remove(att.id);
      await reload();
    } catch (e: any) {
      alert(e?.message || '삭제에 실패했습니다.');
    }
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }
  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={[
          'border-2 border-dashed rounded-md px-4 py-6 text-center transition-colors',
          dragOver
            ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
            : 'border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40',
        ].join(' ')}
      >
        <p className="text-sm text-gray-600 dark:text-gray-300">
          파일을 이곳에 끌어다 놓거나{' '}
          <button
            type="button"
            onClick={onPickClick}
            disabled={uploading}
            className="text-brand-600 dark:text-brand-400 hover:underline font-medium"
          >
            파일 선택
          </button>
          {' '}하세요.
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          여러 파일을 한 번에 첨부할 수 있습니다 (개당 최대 50MB).
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
          className="hidden"
        />
        {uploading && (
          <p className="text-xs text-brand-600 dark:text-brand-400 mt-2">업로드 중...</p>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 px-3 py-2 text-xs whitespace-pre-wrap">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">불러오는 중...</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">첨부된 파일이 없습니다.</div>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-slate-700/60 border border-gray-200 dark:border-slate-700 rounded-md overflow-hidden">
          {items.map((att) => (
            <li key={att.id} className="flex items-center gap-3 px-3 py-2.5 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700/40">
              <span className="text-xl shrink-0" aria-hidden="true">
                {iconFor(att.mimetype)}
              </span>
              <div className="flex-1 min-w-0">
                <a
                  href={attachmentApi.downloadUrl(att.id)}
                  className="block text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-brand-600 dark:hover:text-brand-400 truncate"
                  download={att.filename}
                >
                  {att.filename}
                </a>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {formatBytes(att.size)}
                  {att.uploadedBy && ` · ${att.uploadedBy.name}`}
                  {' · '}
                  {formatDateTime(att.createdAt)}
                </div>
              </div>
              {canDelete && (
                <button
                  type="button"
                  onClick={() => handleDelete(att)}
                  className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 shrink-0 px-2 py-1"
                  aria-label={`${att.filename} 삭제`}
                >
                  삭제
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
