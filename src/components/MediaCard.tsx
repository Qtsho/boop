import { useEffect, useRef } from 'react';
import { ArrowUpRight, ArrowsOutSimple, PawPrint } from '@phosphor-icons/react';
import type { FeedItem } from '../types';

interface MediaCardProps {
  item: FeedItem;
  index: number;
  active: boolean;
  booped: boolean;
  onActive: (index: number) => void;
  onOpen: (item: FeedItem) => void;
  onBoop: (item: FeedItem) => void;
  onBroken: (item: FeedItem) => void;
}

export function MediaCard({ item, index, active, booped, onActive, onOpen, onBoop, onBroken }: MediaCardProps) {
  const cardRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) onActive(index);
    }, { threshold: 0.62 });
    observer.observe(card);
    return () => observer.disconnect();
  }, [index, onActive]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (active) void video.play().catch(() => undefined);
    else video.pause();
  }, [active]);

  return (
    <article
      ref={cardRef}
      className={`media-card ${active ? 'is-active' : ''} ${booped ? 'is-booped' : ''}`}
      data-kind={item.kind}
      data-feed-card
      aria-label={`${index + 1}. ${item.caption}`}
    >
      <div className="media-stage">
        {item.mediaKind === 'video' ? (
          <video
            ref={videoRef}
            className="card-media"
            src={item.url}
            poster={item.poster}
            muted
            loop
            playsInline
            preload={index < 3 ? 'auto' : 'metadata'}
            onError={() => onBroken(item)}
          />
        ) : (
          <img
            className="card-media"
            src={item.url}
            alt={item.caption}
            loading={index < 3 ? 'eager' : 'lazy'}
            decoding="async"
            onError={() => onBroken(item)}
          />
        )}

        <div className="media-shade" aria-hidden="true" />

        <div className="card-copy">
          <div className="card-heading">
            {item.mediaKind !== 'image' && <span className="media-label">{item.mediaKind === 'gif' ? 'moving tiny guy' : 'tiny cinema'}</span>}
            <h2>{item.caption}</h2>
            {item.local ? (
              <span className="source-link">from your device</span>
            ) : (
              <a href={item.source.url} target="_blank" rel="noreferrer" className="source-link">
                from {item.source.name} <ArrowUpRight size={14} weight="bold" aria-hidden="true" />
              </a>
            )}
          </div>
        </div>

        <div className="card-actions" aria-label="Creature actions">
          <button className={`round-action boop-button ${booped ? 'booped' : ''}`} type="button" onClick={() => onBoop(item)}>
            <PawPrint size={26} weight={booped ? 'fill' : 'bold'} aria-hidden="true" />
            <span>{booped ? 'approved' : 'boop'}</span>
          </button>
          <button className="round-action" type="button" onClick={() => onOpen(item)}>
            <ArrowsOutSimple size={26} weight="bold" aria-hidden="true" />
            <span>big</span>
          </button>
        </div>

        {booped && <div className="boop-burst" aria-hidden="true"><span>♡</span><span>♡</span><span>♡</span></div>}
      </div>
    </article>
  );
}
