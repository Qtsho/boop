import { describe, expect, it } from 'vitest';
import { captionFor, mediaKindFromMime, shuffled } from './feed';

describe('feed helpers', () => {
  it('recognizes video and gif media', () => {
    expect(mediaKindFromMime('video/webm', 'anything')).toBe('video');
    expect(mediaKindFromMime('', 'https://example.test/creature.gif?x=1')).toBe('gif');
    expect(mediaKindFromMime('image/jpeg', 'https://example.test/cat.jpg')).toBe('image');
  });

  it('returns a real caption for every animal kind', () => {
    expect(captionFor('cat', 0)).toBeTruthy();
    expect(captionFor('dog', 0.5)).toBeTruthy();
    expect(captionFor('other', 0.99)).toBeTruthy();
  });

  it('does not mutate arrays while shuffling', () => {
    const original = [1, 2, 3, 4];
    const result = shuffled(original);
    expect(original).toEqual([1, 2, 3, 4]);
    expect(result).toHaveLength(4);
    expect(result.sort()).toEqual(original);
  });
});
