import { useEffect } from 'react';
import { ArrowRight, SpeakerHigh, X } from '@phosphor-icons/react';
import type { FeedItem } from '../types';

interface ViewerProps {
  item: FeedItem | null;
  onClose: () => void;
  onNext: () => void;
  onSound: () => void;
}

export function Viewer({ item, onClose, onNext, onSound }: ViewerProps) {
  useEffect(() => {
    if (!item) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') onNext();
    };
    document.body.classList.add('dialog-open');
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.classList.remove('dialog-open');
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [item, onClose, onNext]);

  if (!item) return null;

  return (
    <div className="dialog-backdrop viewer-backdrop" role="presentation">
      <section className="viewer" role="dialog" aria-modal="true" aria-label={`Big view of ${item.caption}`}>
        <div className="viewer-topbar">
          <span className="mini-wordmark">boop!</span>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close big viewer">
            <X size={23} weight="bold" />
          </button>
        </div>
        <div className="viewer-media-wrap">
          {item.mediaKind === 'video' ? (
            <video className="viewer-media" src={item.url} poster={item.poster} controls autoPlay playsInline />
          ) : (
            <img className="viewer-media" src={item.url} alt={item.caption} />
          )}
        </div>
        <div className="viewer-details">
          <div>
            <h2>{item.caption}</h2>
            <a href={item.source.url} target="_blank" rel="noreferrer">
              {item.local ? 'from your device' : `rescued from ${item.source.name}`}
            </a>
          </div>
          <span className="cute-feedback">the little guy is delighted</span>
          <button className="button button-primary viewer-next" type="button" onClick={onNext}>
            another little guy <ArrowRight size={20} weight="bold" />
          </button>
          <button className="button button-text" type="button" onClick={onSound}>
            <SpeakerHigh size={19} weight="bold" /> make a tiny noise
          </button>
          <p className="viewer-whole-app">that is the whole app.</p>
        </div>
      </section>
    </div>
  );
}
