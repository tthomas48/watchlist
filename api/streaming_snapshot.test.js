jest.mock('./streaming_availability_client', () => ({
  fetchShowStreaming: jest.fn(),
}));
jest.mock('./streaming_access_service', () => ({
  getOrCreateUserStreamingAccess: jest.fn(),
}));

const { fetchShowStreaming } = require('./streaming_availability_client');
const { getOrCreateUserStreamingAccess } = require('./streaming_access_service');
const {
  isStreamingSnapshotStale,
  buildSubscriptionSnapshot,
  extractRentalOptions,
  streamingSummaryFromWatchable,
  canRefreshPlayUrl,
  pickPlayUrlOption,
  applyPlayUrlOption,
  applyPlayUrlFromStoredSnapshot,
  needsMotNStreamingRefresh,
  refreshWatchableStreamingSnapshot,
  STREAMING_SNAPSHOT_STALE_MS,
  PLAY_URL_REFRESH_MAX_AGE_MS,
} = require('./streaming_snapshot');

describe('streaming_snapshot', () => {
  describe('isStreamingSnapshotStale', () => {
    it('is stale when missing', () => {
      expect(isStreamingSnapshotStale(null)).toBe(true);
    });

    it('is stale after threshold', () => {
      const now = Date.now();
      const old = new Date(now - STREAMING_SNAPSHOT_STALE_MS - 1000);
      expect(isStreamingSnapshotStale(old, now)).toBe(true);
    });

    it('is fresh within threshold', () => {
      const now = Date.now();
      expect(isStreamingSnapshotStale(new Date(now - 1000), now)).toBe(false);
    });
  });

  describe('buildSubscriptionSnapshot', () => {
    it('keeps subscription matches and drops rentals', () => {
      const snap = buildSubscriptionSnapshot({
        matchedProviders: [
          {
            serviceId: 'netflix',
            serviceName: 'Netflix',
            type: 'subscription',
            addonId: null,
            link: 'https://netflix/x',
          },
          {
            serviceId: 'prime',
            serviceName: 'Prime',
            type: 'rent',
            addonId: null,
            link: 'https://prime/rent',
          },
        ],
      }, 'us');
      expect(snap.country).toBe('us');
      expect(snap.subscription).toHaveLength(1);
      expect(snap.subscription[0].serviceId).toBe('netflix');
      expect(snap.other).toEqual([]);
    });

    it('puts non-profile subscription options in other (never rentals)', () => {
      const mine = {
        matchedProviders: [{
          serviceId: 'netflix',
          serviceName: 'Netflix',
          type: 'subscription',
          addonId: null,
          link: 'https://www.netflix.com/title/1',
        }],
      };
      const all = {
        matchedProviders: [
          {
            serviceId: 'netflix',
            serviceName: 'Netflix',
            type: 'subscription',
            addonId: null,
            link: 'https://www.netflix.com/title/1',
          },
          {
            serviceId: 'hulu',
            serviceName: 'Hulu',
            type: 'subscription',
            addonId: null,
            link: 'https://www.hulu.com/movie/1',
          },
          {
            serviceId: 'prime',
            serviceName: 'Prime',
            type: 'rent',
            addonId: null,
            link: 'https://prime/rent',
          },
        ],
      };
      const snap = buildSubscriptionSnapshot(mine, 'us', all);
      expect(snap.subscription.map((s) => s.serviceId)).toEqual(['netflix']);
      expect(snap.other.map((s) => s.serviceId)).toEqual(['hulu']);
    });
  });

  describe('extractRentalOptions', () => {
    it('returns rent and buy with prices', () => {
      const options = extractRentalOptions({
        ok: true,
        show: {
          streamingOptions: {
            us: [
              {
                service: { id: 'netflix', name: 'Netflix' },
                type: 'subscription',
                link: 'https://netflix',
              },
              {
                service: { id: 'prime', name: 'Prime Video' },
                type: 'rent',
                link: 'https://prime/rent',
                price: { amount: '3.99', currency: 'USD', formatted: '$3.99' },
              },
              {
                service: { id: 'apple', name: 'Apple TV' },
                type: 'buy',
                link: 'https://apple/buy',
                price: { amount: '12.99', currency: 'USD', formatted: '$12.99' },
              },
            ],
          },
        },
      });
      expect(options).toHaveLength(2);
      expect(options[0]).toMatchObject({
        serviceId: 'prime',
        type: 'rent',
        price: { amount: '3.99', currency: 'USD', formatted: '$3.99' },
      });
      expect(options[1].type).toBe('buy');
    });
  });

  describe('streamingSummaryFromWatchable', () => {
    it('exposes checkedAt, stale, subscription, other', () => {
      const now = Date.now();
      const summary = streamingSummaryFromWatchable({
        streaming_checked_at: new Date(now - 1000),
        streaming_options_json: JSON.stringify({
          country: 'us',
          subscription: [{ serviceId: 'netflix', link: 'https://x', type: 'subscription' }],
          other: [{ serviceId: 'hulu', link: 'https://h', type: 'subscription' }],
        }),
      }, now);
      expect(summary.stale).toBe(false);
      expect(summary.subscription).toHaveLength(1);
      expect(summary.other).toHaveLength(1);
      expect(summary.checkedAt).toMatch(/T/);
    });
  });

  describe('applyPlayUrlFromStoredSnapshot', () => {
    it('fills missing web_url from stored subscription (not other)', async () => {
      const w = {
        web_url: null,
        streaming_service_id: null,
        streaming_addon_id: null,
        last_played: null,
        streaming_options_json: JSON.stringify({
          country: 'us',
          subscription: [{
            serviceId: 'netflix',
            type: 'subscription',
            link: 'https://www.netflix.com/title/81282091',
          }],
          other: [{
            serviceId: 'hulu',
            type: 'subscription',
            link: 'https://www.hulu.com/movie/should-not-use',
          }],
        }),
        save: jest.fn().mockResolvedValue(undefined),
      };
      const out = await applyPlayUrlFromStoredSnapshot(w);
      expect(out.playUrlUpdated).toBe(true);
      expect(w.web_url).toBe('https://www.netflix.com/title/81282091');
      expect(w.streaming_service_id).toBe('netflix');
      expect(w.save).toHaveBeenCalled();
    });

    it('does not use other or rentals for play url', async () => {
      const w = {
        web_url: null,
        last_played: null,
        streaming_options_json: JSON.stringify({
          subscription: [],
          other: [{
            serviceId: 'hulu',
            type: 'subscription',
            link: 'https://www.hulu.com/movie/x',
          }],
        }),
        save: jest.fn(),
      };
      const out = await applyPlayUrlFromStoredSnapshot(w);
      expect(out.playUrlUpdated).toBe(false);
      expect(w.web_url).toBeNull();
      expect(w.save).not.toHaveBeenCalled();
    });
  });

  describe('needsMotNStreamingRefresh', () => {
    const now = Date.now();

    it('is true when snapshot is stale', () => {
      expect(needsMotNStreamingRefresh({
        imdb_id: 'tt1',
        web_url: 'https://x',
        streaming_checked_at: new Date(now - STREAMING_SNAPSHOT_STALE_MS - 1),
      }, now)).toBe(true);
    });

    it('is true when web_url missing and subscription has links', () => {
      expect(needsMotNStreamingRefresh({
        imdb_id: 'tt1',
        web_url: null,
        streaming_checked_at: new Date(now),
        streaming_options_json: JSON.stringify({
          subscription: [{ serviceId: 'netflix', link: 'https://n', type: 'subscription' }],
          other: [],
        }),
      }, now)).toBe(true);
    });

    it('is false when fresh, has play url', () => {
      expect(needsMotNStreamingRefresh({
        imdb_id: 'tt1',
        web_url: 'https://x',
        streaming_checked_at: new Date(now),
        streaming_options_json: JSON.stringify({ subscription: [], other: [] }),
      }, now)).toBe(false);
    });

    it('is false when fresh, no play url, empty subscription, has other field', () => {
      expect(needsMotNStreamingRefresh({
        imdb_id: 'tt1',
        web_url: null,
        streaming_checked_at: new Date(now),
        streaming_options_json: JSON.stringify({ subscription: [], other: [] }),
      }, now)).toBe(false);
    });
  });

  describe('canRefreshPlayUrl', () => {
    const now = Date.parse('2026-10-17T12:00:00.000Z');

    it('allows fill when web_url is missing', () => {
      expect(canRefreshPlayUrl({ web_url: null, last_played: new Date(now) }, now)).toBe(true);
      expect(canRefreshPlayUrl({ web_url: '   ', last_played: new Date(now) }, now)).toBe(true);
    });

    it('allows rewrite when last_played is null', () => {
      expect(canRefreshPlayUrl({
        web_url: 'https://old.example/title',
        last_played: null,
      }, now)).toBe(true);
    });

    it('allows rewrite when last_played older than 3 months', () => {
      expect(canRefreshPlayUrl({
        web_url: 'https://old.example/title',
        last_played: new Date(now - PLAY_URL_REFRESH_MAX_AGE_MS - 1000),
      }, now)).toBe(true);
    });

    it('blocks rewrite when played within 3 months', () => {
      expect(canRefreshPlayUrl({
        web_url: 'https://old.example/title',
        last_played: new Date(now - 1000),
      }, now)).toBe(false);
    });
  });

  describe('pickPlayUrlOption', () => {
    const options = [
      {
        serviceId: 'netflix',
        type: 'subscription',
        addonId: null,
        link: 'https://www.netflix.com/title/1',
      },
      {
        serviceId: 'prime',
        type: 'subscription',
        addonId: null,
        link: 'https://www.amazon.com/gp/video/detail/B0CLRSTMPQ',
      },
      {
        serviceId: 'prime',
        type: 'rent',
        addonId: null,
        link: 'https://www.amazon.com/gp/video/detail/RENT',
      },
    ];

    it('never chooses rent/buy', () => {
      const chosen = pickPlayUrlOption([
        { serviceId: 'prime', type: 'rent', link: 'https://rent' },
        { serviceId: 'apple', type: 'buy', link: 'https://buy' },
        { serviceId: 'netflix', type: 'subscription', link: 'https://www.netflix.com/title/2' },
      ], {});
      expect(chosen.serviceId).toBe('netflix');
      expect(chosen.type).toBe('subscription');
    });

    it('prefers matching streaming_service_id', () => {
      const chosen = pickPlayUrlOption(options, { streaming_service_id: 'prime' });
      expect(chosen.link).toBe('https://www.amazon.com/gp/video/detail/B0CLRSTMPQ');
      expect(chosen.type).toBe('subscription');
    });

    it('prefers matching service and addon', () => {
      const withAddon = [
        {
          serviceId: 'disney',
          type: 'addon',
          addonId: 'hulu',
          link: 'https://www.disneyplus.com/movies/a',
        },
        {
          serviceId: 'disney',
          type: 'addon',
          addonId: 'other',
          link: 'https://www.disneyplus.com/movies/b',
        },
      ];
      const chosen = pickPlayUrlOption(withAddon, {
        streaming_service_id: 'disney',
        streaming_addon_id: 'hulu',
      });
      expect(chosen.link).toBe('https://www.disneyplus.com/movies/a');
    });

    it('falls back to first subscription when no service match', () => {
      const chosen = pickPlayUrlOption(options, { streaming_service_id: 'hulu' });
      expect(chosen.serviceId).toBe('netflix');
    });

    it('returns null when only rentals exist', () => {
      expect(pickPlayUrlOption([
        { serviceId: 'prime', type: 'rent', link: 'https://rent' },
      ], {})).toBeNull();
    });
  });

  describe('applyPlayUrlOption', () => {
    it('sets web_url and resolves streaming_service_id', () => {
      const w = {
        web_url: null,
        streaming_service_id: null,
        streaming_addon_id: null,
      };
      expect(applyPlayUrlOption(w, {
        serviceId: 'netflix',
        addonId: null,
        link: 'https://www.netflix.com/title/80986854',
      })).toBe(true);
      expect(w.web_url).toBe('https://www.netflix.com/title/80986854');
      expect(w.streaming_service_id).toBe('netflix');
      expect(w.streaming_addon_id).toBeNull();
    });

    it('persists addon id when present', () => {
      const w = { web_url: null, streaming_service_id: null, streaming_addon_id: null };
      applyPlayUrlOption(w, {
        serviceId: 'disney',
        addonId: 'hulu',
        link: 'https://www.disneyplus.com/movies/foo',
      });
      expect(w.streaming_addon_id).toBe('hulu');
    });
  });

  describe('refreshWatchableStreamingSnapshot play url', () => {
    beforeEach(() => {
      fetchShowStreaming.mockReset();
      getOrCreateUserStreamingAccess.mockReset();
      getOrCreateUserStreamingAccess.mockResolvedValue({
        country: 'us',
        directServiceIds: JSON.stringify(['netflix', 'prime']),
        addonsByHost: JSON.stringify({}),
        receiversEnabled: JSON.stringify({}),
      });
    });

    function mockMotN() {
      fetchShowStreaming.mockResolvedValue({
        ok: true,
        show: {
          streamingOptions: {
            us: [
              {
                service: { id: 'netflix', name: 'Netflix' },
                type: 'subscription',
                link: 'https://www.netflix.com/title/new',
              },
              {
                service: { id: 'prime', name: 'Prime Video' },
                type: 'subscription',
                link: 'https://www.amazon.com/gp/video/detail/B0NEWID',
              },
              {
                service: { id: 'hulu', name: 'Hulu' },
                type: 'subscription',
                link: 'https://www.hulu.com/movie/other',
              },
              {
                service: { id: 'prime', name: 'Prime Video' },
                type: 'rent',
                link: 'https://www.amazon.com/gp/video/detail/RENT',
                price: { amount: '3.99', currency: 'USD', formatted: '$3.99' },
              },
            ],
          },
        },
      });
    }

    function watchableStub(overrides = {}) {
      const w = {
        id: 1,
        media_type: 'movie',
        imdb_id: 'tt1',
        tmdb_id: 1,
        web_url: null,
        streaming_service_id: null,
        streaming_addon_id: null,
        last_played: null,
        streaming_options_json: null,
        streaming_checked_at: null,
        save: jest.fn().mockResolvedValue(undefined),
        ...overrides,
      };
      return w;
    }

    it('fills missing web_url from subscription options and stores other', async () => {
      mockMotN();
      const w = watchableStub();
      const out = await refreshWatchableStreamingSnapshot({}, 1, w);
      expect(out.ok).toBe(true);
      expect(out.playUrlUpdated).toBe(true);
      expect(w.web_url).toBe('https://www.netflix.com/title/new');
      expect(w.streaming_service_id).toBe('netflix');
      expect(w.save).toHaveBeenCalled();
      const snap = JSON.parse(w.streaming_options_json);
      expect(snap.other.map((o) => o.serviceId)).toEqual(['hulu']);
      expect(snap.other.every((o) => o.type !== 'rent')).toBe(true);
    });

    it('rewrites existing web_url when last_played is null', async () => {
      mockMotN();
      const w = watchableStub({
        web_url: 'https://www.netflix.com/title/old',
        streaming_service_id: 'netflix',
        last_played: null,
      });
      const out = await refreshWatchableStreamingSnapshot({}, 1, w);
      expect(out.playUrlUpdated).toBe(true);
      expect(w.web_url).toBe('https://www.netflix.com/title/new');
    });

    it('rewrites when last_played older than 3 months and prefers matching service', async () => {
      mockMotN();
      const now = Date.now();
      const w = watchableStub({
        web_url: 'https://www.amazon.com/gp/video/detail/OLD',
        streaming_service_id: 'prime',
        last_played: new Date(now - PLAY_URL_REFRESH_MAX_AGE_MS - 5000),
      });
      const out = await refreshWatchableStreamingSnapshot({}, 1, w);
      expect(out.playUrlUpdated).toBe(true);
      expect(w.web_url).toBe('https://www.amazon.com/gp/video/detail/B0NEWID');
      expect(w.streaming_service_id).toBe('prime');
    });

    it('does not rewrite when played recently', async () => {
      mockMotN();
      const w = watchableStub({
        web_url: 'https://www.netflix.com/title/keep',
        streaming_service_id: 'netflix',
        last_played: new Date(),
      });
      const out = await refreshWatchableStreamingSnapshot({}, 1, w);
      expect(out.playUrlUpdated).toBe(false);
      expect(w.web_url).toBe('https://www.netflix.com/title/keep');
      expect(w.streaming_options_json).toContain('netflix');
      expect(w.save).toHaveBeenCalled();
    });
  });
});
