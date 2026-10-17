const {
  isStreamingSnapshotStale,
  buildSubscriptionSnapshot,
  extractRentalOptions,
  streamingSummaryFromWatchable,
  STREAMING_SNAPSHOT_STALE_MS,
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
    it('exposes checkedAt, stale, subscription', () => {
      const now = Date.now();
      const summary = streamingSummaryFromWatchable({
        streaming_checked_at: new Date(now - 1000),
        streaming_options_json: JSON.stringify({
          country: 'us',
          subscription: [{ serviceId: 'netflix', link: 'https://x', type: 'subscription' }],
        }),
      }, now);
      expect(summary.stale).toBe(false);
      expect(summary.subscription).toHaveLength(1);
      expect(summary.checkedAt).toMatch(/T/);
    });
  });
});
