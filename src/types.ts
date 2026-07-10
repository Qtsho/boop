export type AnimalKind = 'cat' | 'dog' | 'other' | 'people';
export type FeedFilter = 'everything' | AnimalKind;
export type MediaKind = 'image' | 'gif' | 'video';

export interface MediaSource {
  name: string;
  url: string;
  detail?: string;
}

export interface FeedItem {
  id: string;
  url: string;
  poster?: string;
  kind: AnimalKind;
  mediaKind: MediaKind;
  caption: string;
  source: MediaSource;
  local?: boolean;
  objectUrl?: boolean;
}

export interface StoredCreature {
  id: string;
  blob: Blob;
  fileName: string;
  mimeType: string;
  caption: string;
  createdAt: number;
}
