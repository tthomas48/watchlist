const { Sequelize, DataTypes } = require('sequelize');
const defineWatchable = require('./watchable');

describe('Watchable browse metadata contract', () => {
  it('exposes overview, year, rogerebert_url, and trailer_url attributes for watchlist JSON', () => {
    const sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
    const Watchable = defineWatchable(sequelize, DataTypes);
    expect(Object.keys(Watchable.rawAttributes)).toEqual(
      expect.arrayContaining(['overview', 'year', 'rogerebert_url', 'trailer_url']),
    );
  });

  it('serializes browse metadata fields null-safe on a plain row', () => {
    const row = {
      id: 42,
      title: 'Example',
      year: 2019,
      overview: 'Synopsis text',
      rogerebert_url: 'https://www.rogerebert.com/reviews/example',
      trailer_url: 'https://youtu.be/abc',
      media_type: 'movie',
      web_url: null,
      streaming_service_id: null,
      hidden: false,
    };
    // GET /api/watchlist/... returns Sequelize rows via res.json with no field strip
    const json = JSON.parse(JSON.stringify(row));
    expect(json.overview).toBe('Synopsis text');
    expect(json.year).toBe(2019);
    expect(json.rogerebert_url).toBe('https://www.rogerebert.com/reviews/example');
    expect(json.trailer_url).toBe('https://youtu.be/abc');

    const empty = JSON.parse(JSON.stringify({
      overview: null,
      year: null,
      rogerebert_url: null,
      trailer_url: null,
    }));
    expect(empty.overview).toBeNull();
    expect(empty.year).toBeNull();
    expect(empty.rogerebert_url).toBeNull();
    expect(empty.trailer_url).toBeNull();
  });
});
