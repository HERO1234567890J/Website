import { useCallback, useRef, useState } from 'react';
import { api } from './client.js';

interface SignResult {
  uploadUrl: string;
  publicUrl: string;
  path: string;
  headers: Record<string, string>;
}

interface ImageUploadProps {
  folder: string;
  value: string;
  onChange: (url: string) => void;
  label?: string;
  accept?: string;
}

export function ImageUpload({ folder, value, onChange, label = 'Upload Image', accept = 'image/jpeg,image/png,image/webp,image/gif' }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const sign = await api<SignResult>('/admin/uploads/sign', {
        method: 'POST',
        body: {
          folder,
          filename: file.name,
          mimeType: file.type,
          fileSize: file.size,
        },
      });

      const res = await fetch(sign.uploadUrl, {
        method: 'PUT',
        headers: sign.headers,
        body: file,
      });

      if (!res.ok) {
        throw new Error(`Upload failed (${res.status})`);
      }

      onChange(sign.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [folder, onChange]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div>
      {label && <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>{label}</label>}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? 'var(--sun)' : 'var(--line)'}`,
          borderRadius: 8,
          padding: 20,
          textAlign: 'center',
          cursor: 'pointer',
          background: dragOver ? 'var(--sand)' : 'transparent',
          transition: 'all 0.15s',
        }}
      >
        {value ? (
          <div>
            <img src={value} alt="" style={{ maxWidth: 200, maxHeight: 120, borderRadius: 6, marginBottom: 8 }} />
            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Click or drag to replace</div>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
            {uploading ? 'Uploading…' : 'Drag & drop an image or click to browse'}
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept={accept} onChange={onInputChange} style={{ display: 'none' }} />
      {error && <p role="alert" style={{ color: 'var(--error)', fontSize: 12, marginTop: 6 }}>{error}</p>}
      {value && (
        <div style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{ flex: 1, fontSize: 12, padding: '4px 8px' }}
            placeholder="Or paste a URL"
          />
          <button type="button" className="btn-ghost" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => onChange('')}>
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
