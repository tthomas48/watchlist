import { personInitials, personAvatarSrc } from './personAvatar';

describe('personAvatar helpers', () => {
  it('personInitials builds one- or two-letter labels', () => {
    expect(personInitials('Sam')).toBe('SA');
    expect(personInitials('Sam Smith')).toBe('SS');
    expect(personInitials('  ')).toBe('?');
  });

  it('personAvatarSrc prefers snake then camel', () => {
    expect(personAvatarSrc({ avatar_url: '/a', avatarUrl: '/b' })).toBe('/a');
    expect(personAvatarSrc({ avatarUrl: '/b' })).toBe('/b');
    expect(personAvatarSrc({})).toBeNull();
  });

  it('personAvatarSrc appends cacheBust query', () => {
    expect(personAvatarSrc({ avatarUrl: '/api/img/people/1' }, 99))
      .toBe('/api/img/people/1?v=99');
    expect(personAvatarSrc({ avatarUrl: '/api/img/people/1?x=1' }, 99))
      .toBe('/api/img/people/1?x=1&v=99');
  });
});
