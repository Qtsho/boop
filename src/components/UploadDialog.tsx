import { useEffect, useId, useRef, useState } from 'react';
import { FileArrowUp, ImageSquare, LockSimple, X } from '@phosphor-icons/react';
import { makeId } from '../lib/feed';
import { saveCreature } from '../lib/localCreatures';
import type { StoredCreature } from '../types';

interface UploadDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: (creature: StoredCreature) => void;
}

const MAX_FILE_SIZE = 60 * 1024 * 1024;

export function UploadDialog({ open, onClose, onSaved }: UploadDialogProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.classList.add('dialog-open');
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.classList.remove('dialog-open');
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  if (!open) return null;

  const chooseFile = (nextFile?: File) => {
    if (!nextFile) return;
    if (!nextFile.type.startsWith('image/') && !nextFile.type.startsWith('video/')) {
      setError('That file is not a photo, GIF, or video creature.');
      return;
    }
    if (nextFile.size > MAX_FILE_SIZE) {
      setError('That creature is over 60 MB. It may need a tiny diet first.');
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(nextFile);
    setPreviewUrl(URL.createObjectURL(nextFile));
    setError('');
  };

  const submit = async () => {
    if (!file) {
      setError('Please drop one creature in the box first.');
      return;
    }
    setSaving(true);
    setError('');
    const creature: StoredCreature = {
      id: makeId('local'),
      blob: file,
      fileName: file.name,
      mimeType: file.type,
      caption: caption.trim() || 'a locally sourced little guy',
      createdAt: Date.now(),
    };
    try {
      await saveCreature(creature);
      onSaved(creature);
      setFile(null);
      setCaption('');
      setPreviewUrl('');
      onClose();
    } catch {
      setError('This browser could not tuck the creature away safely.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="upload-dialog" role="dialog" aria-modal="true" aria-labelledby="upload-title">
        <button className="icon-button dialog-close" type="button" onClick={onClose} aria-label="Close upload">
          <X size={22} weight="bold" />
        </button>

        <div
          className={`drop-zone ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
          onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => { if (event.currentTarget === event.target) setDragging(false); }}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            chooseFile(event.dataTransfer.files[0]);
          }}
        >
          {file ? (
            file.type.startsWith('video/') ? (
              <video className="upload-preview" src={previewUrl} controls playsInline />
            ) : (
              <img className="upload-preview" src={previewUrl} alt="Your creature preview" />
            )
          ) : (
            <div className="drop-empty">
              <span className="upload-icon"><FileArrowUp size={42} weight="duotone" /></span>
              <strong>drop it right here</strong>
              <span>photo, GIF, or tiny video</span>
            </div>
          )}
          <input
            ref={inputRef}
            id={inputId}
            className="visually-hidden"
            type="file"
            accept="image/*,video/*"
            onChange={(event) => chooseFile(event.target.files?.[0])}
          />
          <button className="button button-quiet choose-file" type="button" onClick={() => inputRef.current?.click()}>
            <ImageSquare size={18} weight="bold" />
            {file ? 'choose a different creature' : 'choose a file'}
          </button>
        </div>

        <div className="upload-fields">
          <div>
            <h2 id="upload-title">add your creature</h2>
            <p>No account. No ceremony. It goes straight into your feed.</p>
          </div>
          {file && <div className="file-name">{file.name}</div>}
          <label htmlFor="creature-caption">give it a tiny caption</label>
          <textarea
            id="creature-caption"
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            placeholder="for example: brought his own napkin"
            maxLength={90}
          />
          <div className="privacy-note">
            <LockSimple size={22} weight="duotone" aria-hidden="true" />
            <span>Your file stays on this device. Boop never sends it anywhere.</span>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary upload-submit" type="button" onClick={submit} disabled={saving}>
            {saving ? 'tucking it in...' : 'put it in my feed'}
          </button>
        </div>
      </section>
    </div>
  );
}
