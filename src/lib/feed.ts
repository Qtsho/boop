import type { AnimalKind, FeedFilter, FeedItem, MediaKind } from '../types';

const CAPTIONS: Record<AnimalKind, string[]> = {
  cat: [
    'the meeting could have been a nap',
    'has never paid a bill',
    'tiny landlord inspecting the premises',
    'the loaf is experiencing weather',
    'currently buffering one thought',
    'made of soup and confidence',
  ],
  dog: [
    'brought absolutely everything',
    'the ears arrived first',
    'promoted to assistant snack manager',
    'a very serious little employee',
    'the plan is mostly wiggling',
    'wearing the good face today',
  ],
  other: [
    'hamster has entered the spreadsheet',
    'the cheeks contain classified materials',
    'bunny.exe is responding beautifully',
    'otterly unqualified for this position',
    'red panda forgot the assignment',
    'raccoon acquired one forbidden snack',
    'small citizen with a complicated hat',
    'the council has reached no decision',
    'built for one specific puddle',
    'a pocket-sized administrative error',
    'the creature has brought a leaf',
    'minding a very tiny business',
  ],
  people: [
    'confidence arrived before the plan',
    'this seemed easier in the group chat',
    'a flawless execution of the wrong idea',
    'the dignity has left the building',
    'nobody rehearsed any part of this',
    'the intrusive thought won politely',
  ],
};

interface DogApiResponse {
  message: string[];
  status: string;
}

interface RandomDogResponse { url: string }
interface DuckResponse { url: string; message?: string }
interface CatApiItem { id: string; url: string }

interface CommonsImageInfo {
  url: string;
  thumburl?: string;
  mime?: string;
  extmetadata?: {
    LicenseShortName?: { value?: string };
  };
}

interface CommonsPage {
  title: string;
  imageinfo?: CommonsImageInfo[];
}

interface CommonsResponse {
  query?: { pages?: Record<string, CommonsPage> };
}

export function makeId(prefix = 'creature'): string {
  const randomPart = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${randomPart}`;
}

export function captionFor(kind: AnimalKind, seed = Math.random()): string {
  const choices = CAPTIONS[kind];
  return choices[Math.floor(Math.abs(seed) * choices.length) % choices.length];
}

export function mediaKindFromMime(mime = '', url = ''): MediaKind {
  if (mime.startsWith('video/')) return 'video';
  if (mime === 'image/gif' || /\.gif(?:$|\?)/i.test(url)) return 'gif';
  if (/\.(webm|mp4|ogv)(?:$|\?)/i.test(url)) return 'video';
  return 'image';
}

export function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function withTimeout<T>(promise: Promise<T>, milliseconds = 4500): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error('This animal source took a tiny nap.')), milliseconds);
    }),
  ]);
}

async function fetchDogs(): Promise<FeedItem[]> {
  const response = await withTimeout(fetch('https://dog.ceo/api/breeds/image/random/4'));
  if (!response.ok) throw new Error('Dog CEO did not answer.');
  const data = (await response.json()) as DogApiResponse;
  if (data.status !== 'success' || !Array.isArray(data.message)) return [];

  return data.message.map((url) => ({
    id: makeId('dog'),
    url,
    kind: 'dog' as const,
    mediaKind: mediaKindFromMime('', url),
    caption: captionFor('dog'),
    source: { name: 'Dog CEO', url: 'https://dog.ceo/' },
  }));
}

async function fetchRandomDog(): Promise<FeedItem[]> {
  const requests = Array.from({ length: 4 }, () => withTimeout(fetch('https://random.dog/woof.json')));
  const responses = await Promise.allSettled(requests);
  const items = await Promise.all(responses.flatMap((result) =>
    result.status === 'fulfilled' && result.value.ok ? [result.value.json() as Promise<RandomDogResponse>] : [],
  ));
  return items
    .filter(({ url }) => !/\.txt(?:$|\?)/i.test(url))
    .map(({ url }) => ({
      id: makeId('random-dog'), url, kind: 'dog' as const,
      mediaKind: mediaKindFromMime('', url), caption: captionFor('dog'),
      source: { name: 'Random Dog', url: 'https://random.dog/' },
    }));
}

async function fetchCatApi(): Promise<FeedItem[]> {
  const response = await withTimeout(fetch('https://api.thecatapi.com/v1/images/search?limit=6&mime_types=gif,jpg,png'));
  if (!response.ok) throw new Error('The Cat API did not answer.');
  const data = await response.json() as CatApiItem[];
  return data.map(({ id, url }) => ({
    id: `cat-api-${id}-${makeId()}`, url, kind: 'cat' as const,
    mediaKind: mediaKindFromMime('', url), caption: captionFor('cat'),
    source: { name: 'The Cat API', url: 'https://thecatapi.com/' },
  }));
}

async function fetchShibes(kind: 'cat' | 'dog'): Promise<FeedItem[]> {
  const endpoint = kind === 'cat' ? 'cats' : 'shibes';
  const response = await withTimeout(fetch(`https://shibe.online/api/${endpoint}?count=4&urls=true&httpsUrls=true`));
  if (!response.ok) throw new Error('Shibe Online did not answer.');
  const urls = await response.json() as string[];
  return urls.map((url) => ({
    id: makeId('shibe'), url, kind, mediaKind: mediaKindFromMime('', url),
    caption: captionFor(kind), source: { name: 'Shibe Online', url: 'https://shibe.online/' },
  }));
}

async function fetchDucks(): Promise<FeedItem[]> {
  const requests = Array.from({ length: 3 }, () => withTimeout(fetch('https://random-d.uk/api/v2/random')));
  const responses = await Promise.allSettled(requests);
  const data = await Promise.all(responses.flatMap((result) =>
    result.status === 'fulfilled' && result.value.ok ? [result.value.json() as Promise<DuckResponse>] : [],
  ));
  return data.map(({ url }) => ({
    id: makeId('duck'), url, kind: 'other' as const, mediaKind: mediaKindFromMime('', url),
    caption: captionFor('other'), source: { name: 'Random Duck', url: 'https://random-d.uk/' },
  }));
}

function cataasItems(): FeedItem[] {
  const stamp = `${Date.now()}-${Math.random()}`;
  return Array.from({ length: 6 }, (_, index): FeedItem => {
    const gif = index < 3;
    return {
      id: makeId(gif ? 'cataas-gif' : 'cataas'),
      url: `https://cataas.com/cat/${gif ? 'gif' : 'cute'}?width=720&height=960&t=${stamp}-${index}`,
      kind: 'cat',
      mediaKind: gif ? 'gif' : 'image',
      caption: captionFor('cat'),
      source: { name: 'Cat as a Service', url: 'https://cataas.com/' },
    };
  });
}

function instantOtherItems(): FeedItem[] {
  const animals = ['hamster', 'bunny', 'otter', 'guinea-pig', 'red-panda', 'raccoon'];
  return animals.map((animal, index) => ({
    id: makeId(`instant-${animal}`),
    url: `https://loremflickr.com/720/960/funny,${animal}?lock=${101 + index}`,
    kind: 'other' as const,
    mediaKind: 'image' as const,
    caption: captionFor('other', index / animals.length),
    source: { name: `Flickr ${animal.replace('-', ' ')}`, url: `https://www.flickr.com/search/?text=funny%20${animal}` },
  }));
}

function instantDogItems(): FeedItem[] {
  return Array.from({ length: 4 }, (_, index) => ({
    id: makeId('instant-dog'),
    url: `https://placedog.net/720/960?id=${20 + index}`,
    kind: 'dog' as const,
    mediaKind: 'image' as const,
    caption: captionFor('dog', index / 4),
    source: { name: 'PlaceDog', url: 'https://placedog.net/' },
  }));
}

function instantPeopleItems(): FeedItem[] {
  const moments = ['funny-people', 'people-laughing', 'silly-people', 'funny-fail'];
  return moments.map((moment, index) => ({
    id: makeId('instant-people'),
    url: `https://loremflickr.com/720/960/${moment}?lock=${301 + index}`,
    kind: 'people' as const,
    mediaKind: 'image' as const,
    caption: captionFor('people', index / moments.length),
    source: { name: 'Flickr', url: `https://www.flickr.com/search/?text=${moment}` },
  }));
}

function instantVideoItems(): FeedItem[] {
  return [
    {
      id: makeId('instant-video-lion'),
      url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/4/46/African_Lion_funny_video.webm/African_Lion_funny_video.webm.240p.vp9.webm',
      poster: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/African_Lion_funny_video.webm/960px--African_Lion_funny_video.webm.jpg',
      kind: 'other', mediaKind: 'video', caption: 'the lion would like to revise that decision',
      source: { name: 'Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:African_Lion_funny_video.webm' },
    },
    {
      id: makeId('instant-video-chameleon'),
      url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/2/2a/My_Chameleon_is_funny.webm/My_Chameleon_is_funny.webm.240p.vp9.webm',
      poster: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/My_Chameleon_is_funny.webm/500px--My_Chameleon_is_funny.webm.jpg',
      kind: 'other', mediaKind: 'video', caption: 'chameleon performs one confusing little task',
      source: { name: 'Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:My_Chameleon_is_funny.webm' },
    },
    {
      id: makeId('instant-video-workout'),
      url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/d/d0/Animals_Workout_Mix_II_Funny_Animals_Working_Out_Compilation_II_Extreme_Pets_tv_show.webm/Animals_Workout_Mix_II_Funny_Animals_Working_Out_Compilation_II_Extreme_Pets_tv_show.webm.240p.vp9.webm',
      poster: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Animals_Workout_Mix_II_Funny_Animals_Working_Out_Compilation_II_Extreme_Pets_tv_show.webm/500px--Animals_Workout_Mix_II_Funny_Animals_Working_Out_Compilation_II_Extreme_Pets_tv_show.webm.jpg',
      kind: 'other', mediaKind: 'video', caption: 'the workout plan has become extremely personal',
      source: { name: 'Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Animals_Workout_Mix_II_Funny_Animals_Working_Out_Compilation_II_Extreme_Pets_tv_show.webm' },
    },
  ];
}

export function instantCreatureItems(filter: FeedFilter): FeedItem[] {
  const cats = cataasItems();
  const dogs = instantDogItems();
  const others = instantOtherItems();
  const people = instantPeopleItems();
  const videos = instantVideoItems();
  if (filter === 'cat') return cats;
  if (filter === 'dog') return dogs;
  if (filter === 'other') return [...others, ...videos];
  if (filter === 'people') return people;
  return [cats[0], people[0], others[0], dogs[0], cats[1], people[1], others[1], dogs[1], ...cats.slice(2), ...people.slice(2), ...others.slice(2), ...dogs.slice(2), ...videos];
}

const COMMONS_CATEGORIES: Record<AnimalKind, string[]> = {
  cat: ['Category:Cats playing', 'Category:Animated GIFs of cats', 'Category:Videos of kittens'],
  dog: ['Category:Dogs playing', 'Category:Animated GIFs of dogs', 'Category:Videos of puppies'],
  other: ['Category:Animated GIFs of animals', 'Category:Animals playing', 'Category:Videos of ducks'],
  people: ['Category:Videos of people laughing', 'Category:Animated GIFs of people', 'Category:People playing'],
};

async function fetchCommons(kind: AnimalKind): Promise<FeedItem[]> {
  const categories = shuffled(COMMONS_CATEGORIES[kind]);
  const params = new URLSearchParams({
    origin: '*',
    action: 'query',
    format: 'json',
    generator: 'categorymembers',
    gcmtitle: categories[0],
    gcmtype: 'file',
    gcmlimit: '18',
    prop: 'imageinfo',
    iiprop: 'url|mime|extmetadata',
    iiurlwidth: '1200',
  });

  const response = await withTimeout(fetch(`https://commons.wikimedia.org/w/api.php?${params}`), 5000);
  if (!response.ok) throw new Error('Wikimedia Commons did not answer.');
  const data = (await response.json()) as CommonsResponse;
  const pages = Object.values(data.query?.pages ?? {});

  return shuffled(pages)
    .slice(0, 6)
    .flatMap((page): FeedItem[] => {
      const info = page.imageinfo?.[0];
      if (!info?.url) return [];
      const mediaKind = mediaKindFromMime(info.mime, info.url);
      const pageSlug = encodeURIComponent(page.title.replaceAll(' ', '_'));
      return [{
        id: makeId('commons'),
        url: mediaKind === 'video' ? info.url : (info.thumburl ?? info.url),
        poster: mediaKind === 'video' ? info.thumburl : undefined,
        kind,
        mediaKind,
        caption: captionFor(kind),
        source: {
          name: 'Wikimedia Commons',
          url: `https://commons.wikimedia.org/wiki/${pageSlug}`,
          detail: info.extmetadata?.LicenseShortName?.value,
        },
      }];
    });
}

function fallbackFor(filter: FeedFilter): FeedItem[] {
  if (filter === 'everything' || filter === 'cat') return cataasItems();
  return [];
}

export async function fetchCreatureBatch(filter: FeedFilter): Promise<FeedItem[]> {
  const jobs: Array<Promise<FeedItem[]>> = [];

  if (filter === 'everything' || filter === 'cat') {
    jobs.push(Promise.resolve(cataasItems()), fetchCatApi(), fetchShibes('cat'), fetchCommons('cat'));
  }
  if (filter === 'everything' || filter === 'dog') {
    jobs.push(fetchDogs(), fetchRandomDog(), fetchShibes('dog'), fetchCommons('dog'));
  }
  if (filter === 'everything' || filter === 'other') {
    jobs.push(fetchDucks(), fetchCommons('other'));
  }
  if (filter === 'everything' || filter === 'people') {
    jobs.push(fetchCommons('people'));
  }

  const results = await Promise.allSettled(jobs);
  const liveItems = results.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
  const fallbackItems = fallbackFor(filter);
  const unique = new Map<string, FeedItem>();

  shuffled([...liveItems, ...fallbackItems]).forEach((item) => {
    const key = item.url;
    if (!unique.has(key)) unique.set(key, item);
  });

  const gifs = shuffled([...unique.values()].filter((item) => item.mediaKind === 'gif'));
  const videos = shuffled([...unique.values()].filter((item) => item.mediaKind === 'video'));
  const stills = shuffled([...unique.values()].filter((item) => item.mediaKind === 'image'));
  const mixed = gifs.flatMap((item, index) => [item, stills[index]]).filter(Boolean) as FeedItem[];
  mixed.push(...stills.filter((item) => !mixed.includes(item)), ...videos);
  const remaining = [...unique.values()].filter((item) => !mixed.includes(item));
  return [...mixed, ...shuffled(remaining)].slice(0, filter === 'everything' ? 28 : 18);
}
