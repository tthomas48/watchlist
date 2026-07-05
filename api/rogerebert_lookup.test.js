// global test, expect, describe, it
const { slugifyTitle, buildCandidateUrl } = require('./rogerebert_lookup');

describe('rogerebert_lookup', () => {
  it('slugifies titles for review URLs', () => {
    expect(slugifyTitle('Blue Velvet')).toBe('blue-velvet');
    expect(buildCandidateUrl('Blue Velvet', 1986)).toBe(
      'https://www.rogerebert.com/reviews/blue-velvet-1986',
    );
  });

  it('returns null without year', () => {
    expect(buildCandidateUrl('Blue Velvet', null)).toBeNull();
  });
});
