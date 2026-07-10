import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  CaretDown,
  CaretUp,
  PawPrint,
  Shuffle,
  SpeakerHigh,
  SpeakerSlash,
  UploadSimple,
} from '@phosphor-icons/react';
import { MediaCard } from './components/MediaCard';
import { UploadDialog } from './components/UploadDialog';
import { Viewer } from './components/Viewer';
import { fetchCreatureBatch, mediaKindFromMime } from './lib/feed';
import { loadCreatures } from './lib/localCreatures';
import { playTinyChime } from './lib/sound';
import type { FeedFilter, FeedItem, StoredCreature } from './types';

const FILTERS: Array<{ value: FeedFilter; label: string }> = [
  { value: 'everything', label: 'everything' },
  { value: 'cat', label: 'cats' },
  { value: 'dog', label: 'dogs' },
  { value: 'other', label: 'other little guys' },
];

const CUTE_FEEDBACK = [
  'tiny paws approved',
  'a microscopic party happened',
  'the creature feels very important',
  'one gentle boop delivered',
  'the little ears are pleased',
  'a small tail has been wagged',
];

function deduplicate(items: FeedItem[]): FeedItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.local ? item.id : item.url.split('?')[0];
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function storedToFeedItem(creature: StoredCreature, objectUrl: string): FeedItem {
  return {
    id: creature.id,
    url: objectUrl,
    kind: 'other',
    mediaKind: mediaKindFromMime(creature.mimeType, creature.fileName),
    caption: creature.caption,
    source: { name: 'your device', url: '' },
    local: true,
    objectUrl: true,
  };
}

export default function App() {
  const [filter, setFilter] = useState<FeedFilter>('everything');
  const [items, setItems] = useState<FeedItem[]>([]);
  const [localItems, setLocalItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [boopedIds, setBoopedIds] = useState<Set<string>>(() => new Set());
  const [toast, setToast] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('boop-sound') !== 'off');
  const inFlightFiltersRef = useRef(new Set<FeedFilter>());
  const activeFilterRef = useRef<FeedFilter>('everything');
  const sentinelRef = useRef<HTMLDivElement>(null);
  const objectUrlsRef = useRef(new Set<string>());
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(''), 2400);
  }, []);

  const scrollToItem = useCallback((index: number) => {
    const cards = document.querySelectorAll<HTMLElement>('[data-feed-card]');
    if (!cards.length) return;
    const bounded = Math.max(0, Math.min(index, cards.length - 1));
    cards[bounded]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleActive = useCallback((index: number) => setActiveIndex(index), []);

  const requestBatch = useCallback(async (activeFilter: FeedFilter, replace = false) => {
    if (inFlightFiltersRef.current.has(activeFilter)) return;
    inFlightFiltersRef.current.add(activeFilter);
    setLoading(true);
    if (activeFilterRef.current === activeFilter) setLoadError(false);
    try {
      const nextItems = await fetchCreatureBatch(activeFilter);
      if (activeFilterRef.current === activeFilter) {
        setItems((current) => deduplicate(replace ? nextItems : [...current, ...nextItems]));
      }
    } catch {
      if (activeFilterRef.current === activeFilter) setLoadError(true);
    } finally {
      inFlightFiltersRef.current.delete(activeFilter);
      if (activeFilterRef.current === activeFilter) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadCreatures()
      .then((creatures) => {
        if (cancelled) return;
        const restored = creatures.map((creature) => {
          const objectUrl = URL.createObjectURL(creature.blob);
          objectUrlsRef.current.add(objectUrl);
          return storedToFeedItem(creature, objectUrl);
        });
        setLocalItems(restored);
      })
      .catch(() => {
        // The public feed still works when private browser storage is unavailable.
      });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    activeFilterRef.current = filter;
    const matchingLocal = filter === 'everything' ? localItems : localItems.filter((item) => item.kind === filter);
    setItems(matchingLocal);
    void requestBatch(filter, false);
  }, [filter, localItems, requestBatch]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && items.length > 0) void requestBatch(filter, false);
    }, { rootMargin: '900px 0px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filter, items.length, requestBatch]);

  useEffect(() => () => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (uploadOpen || selectedItem) return;
      if (event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === ' ') {
        event.preventDefault();
        scrollToItem(activeIndex + 1);
      }
      if (event.key === 'ArrowUp' || event.key === 'PageUp') {
        event.preventDefault();
        scrollToItem(activeIndex - 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeIndex, scrollToItem, selectedItem, uploadOpen]);

  useEffect(() => {
    if (items.length && activeIndex >= items.length - 4) void requestBatch(filter, false);
  }, [activeIndex, filter, items.length, requestBatch]);

  const changeFilter = (nextFilter: FeedFilter) => {
    if (nextFilter === filter) return;
    activeFilterRef.current = nextFilter;
    setFilter(nextFilter);
    setActiveIndex(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('boop-sound', next ? 'on' : 'off');
    if (next) playTinyChime(1);
    showToast(next ? 'tiny noises are awake' : 'tiny noises are napping');
  };

  const boopItem = (item: FeedItem) => {
    setBoopedIds((current) => new Set(current).add(item.id));
    const feedback = CUTE_FEEDBACK[Math.floor(Math.random() * CUTE_FEEDBACK.length)];
    showToast(feedback);
    if (soundEnabled) playTinyChime(boopedIds.size);
  };

  const openRandom = () => {
    if (!items.length) {
      void requestBatch(filter, false);
      return;
    }
    scrollToItem(Math.floor(Math.random() * items.length));
  };

  const openNext = () => {
    if (!items.length) return;
    const currentIndex = selectedItem ? items.findIndex((item) => item.id === selectedItem.id) : -1;
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % items.length;
    setSelectedItem(items[nextIndex]);
    if (nextIndex >= items.length - 2) void requestBatch(filter, false);
  };

  const addLocalCreature = (creature: StoredCreature) => {
    const objectUrl = URL.createObjectURL(creature.blob);
    objectUrlsRef.current.add(objectUrl);
    const item = storedToFeedItem(creature, objectUrl);
    setLocalItems((current) => [item, ...current]);
    setFilter('everything');
    showToast('the creature has been gently deployed');
    if (soundEnabled) playTinyChime(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const removeBrokenItem = (item: FeedItem) => {
    setItems((current) => current.filter((candidate) => candidate.id !== item.id));
    if (selectedItem?.id === item.id) setSelectedItem(null);
  };

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="Boop feed home">boop!</a>

        <nav className="filter-nav" aria-label="Animal filters">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              className={filter === option.value ? 'active' : ''}
              type="button"
              onClick={() => changeFilter(option.value)}
              aria-pressed={filter === option.value}
            >
              {option.label}
            </button>
          ))}
        </nav>

        <label className="mobile-filter">
          <span className="visually-hidden">Choose animal filter</span>
          <select value={filter} onChange={(event) => changeFilter(event.target.value as FeedFilter)}>
            {FILTERS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <ArrowDown size={15} weight="bold" aria-hidden="true" />
        </label>

        <div className="header-actions">
          <button className="icon-button" type="button" onClick={toggleSound} aria-label={soundEnabled ? 'Turn off tiny sounds' : 'Turn on tiny sounds'}>
            {soundEnabled ? <SpeakerHigh size={22} weight="fill" /> : <SpeakerSlash size={22} weight="bold" />}
          </button>
          <button className="button button-quiet upload-header" type="button" onClick={() => setUploadOpen(true)}>
            <UploadSimple size={19} weight="bold" /> add yours
          </button>
          <button className="button button-primary surprise-header" type="button" onClick={openRandom}>
            <Shuffle size={19} weight="bold" /> surprise me
          </button>
        </div>
      </header>

      <main id="top" className="main-layout">
        <aside className="joy-rail joy-rail-left" aria-hidden="true">
          <div className="photo-sticker sticker-one">
            <img src="https://images.unsplash.com/photo-1474511320723-9a56873867b5?auto=format&fit=crop&w=360&q=82" alt="" />
          </div>
          <span className="doodle-heart">♡</span>
          <p>the animals<br />have arrived</p>
        </aside>

        <section className="feed-wrap" aria-labelledby="feed-title">
          <div className="feed-intro">
            <div>
              <h1 id="feed-title">tiny creatures forever</h1>
              <p>Open the link. Scroll the animals. That is the whole thing.</p>
            </div>
            <span className="no-pressure"><PawPrint size={18} weight="fill" /> nothing to achieve here</span>
          </div>

          <div className="feed" aria-live="polite">
            {items.map((item, index) => (
              <MediaCard
                key={item.id}
                item={item}
                index={index}
                active={index === activeIndex}
                booped={boopedIds.has(item.id)}
                onActive={handleActive}
                onOpen={setSelectedItem}
                onBoop={boopItem}
                onBroken={removeBrokenItem}
              />
            ))}

            {loading && <LoadingCards count={items.length ? 1 : 2} />}

            {!loading && !items.length && (
              <div className="empty-state">
                <PawPrint size={42} weight="duotone" />
                <h2>the little guys wandered off</h2>
                <p>We can call them back, or you can add one from your device.</p>
                <div>
                  <button className="button button-primary" type="button" onClick={() => void requestBatch(filter, true)}>call them back</button>
                  <button className="button button-quiet" type="button" onClick={() => setUploadOpen(true)}>add yours</button>
                </div>
              </div>
            )}

            {loadError && items.length > 0 && (
              <button className="load-error" type="button" onClick={() => void requestBatch(filter, false)}>
                one source is having a tiny nap. tap to try again.
              </button>
            )}
          </div>

          <div ref={sentinelRef} className="feed-sentinel" aria-hidden="true" />
          <p className="source-note">Media stays linked to its original public source. Your own uploads never leave this browser.</p>
        </section>

        <aside className="joy-rail joy-rail-right" aria-hidden="true">
          <div className="photo-sticker sticker-two">
            <img src="https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?auto=format&fit=crop&w=360&q=82" alt="" />
          </div>
          <p>just one more<br />little guy</p>
          <span className="doodle-heart">♡</span>
        </aside>
      </main>

      {items.length > 0 && (
        <div className="swipe-controls" aria-label="Feed navigation">
          <span>{activeIndex + 1}<small>/{items.length}</small></span>
          <button type="button" onClick={() => scrollToItem(activeIndex - 1)} disabled={activeIndex === 0} aria-label="Previous creature">
            <CaretUp size={22} weight="bold" />
          </button>
          <button type="button" onClick={() => scrollToItem(activeIndex + 1)} aria-label="Next creature">
            <CaretDown size={22} weight="bold" />
          </button>
        </div>
      )}

      <button className="mobile-upload" type="button" onClick={() => setUploadOpen(true)} aria-label="Add your creature">
        <UploadSimple size={23} weight="bold" />
      </button>

      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} onSaved={addLocalCreature} />
      <Viewer
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onNext={openNext}
        onSound={() => { playTinyChime(1); showToast('peep peep, respectfully'); }}
      />

      <div className={`toast ${toast ? 'show' : ''}`} role="status" aria-live="polite">
        <PawPrint size={20} weight="fill" aria-hidden="true" /> {toast}
      </div>
    </div>
  );
}

function LoadingCards({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div className="skeleton-card" key={index} aria-label="Finding another little guy">
          <div className="skeleton-line skeleton-title" />
          <div className="skeleton-media" />
          <div className="skeleton-footer"><span /><span /></div>
          <p>finding another little guy...</p>
        </div>
      ))}
    </>
  );
}
