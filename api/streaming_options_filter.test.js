const {
  filterStreamingOptionsByMode,
  parseUserStreamingAccess,
  subscriptionProfileNonEmpty,
} = require('./streaming_options_filter');

describe('streaming_options_filter', () => {
  const sampleResult = {
    ok: true,
    show: {
      streamingOptions: {
        us: [
          {
            service: { id: 'netflix', name: 'Netflix' },
            type: 'subscription',
            link: 'https://netflix.com/x',
          },
          {
            service: { id: 'disney', name: 'Disney+' },
            addon: { id: 'hulu', name: 'Hulu' },
            type: 'subscription',
            link: 'https://hulu.com/disney',
          },
        ],
      },
    },
  };

  it('all mode (legacy rent alias) keeps all non-rental options in matchedProviders', () => {
    const access = parseUserStreamingAccess({
      country: 'us',
      directServiceIds: '[]',
      addonsByHost: '{}',
      receiversEnabled: '{}',
    });
    const out = filterStreamingOptionsByMode(sampleResult, {
      mode: 'rent',
      access,
      includeRentals: false,
    });
    expect(out.streamingFilterMode).toBe('all');
    expect(out.matchedProviders.length).toBe(2);
  });

  it('rentals mode keeps only rent/buy options', () => {
    const withRent = {
      ok: true,
      show: {
        streamingOptions: {
          us: [
            {
              service: { id: 'netflix', name: 'Netflix' },
              type: 'subscription',
              link: 'https://netflix.com/x',
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
    };
    const access = parseUserStreamingAccess({
      country: 'us',
      directServiceIds: '["netflix"]',
      addonsByHost: '{}',
      receiversEnabled: '{}',
    });
    const out = filterStreamingOptionsByMode(withRent, {
      mode: 'rentals',
      access,
      includeRentals: false,
    });
    expect(out.streamingFilterMode).toBe('rentals');
    expect(out.matchedProviders.map((m) => m.type).sort()).toEqual(['buy', 'rent']);
  });

  it('Subscription mode requires configured services', () => {
    const access = parseUserStreamingAccess({
      country: 'us',
      directServiceIds: '["netflix"]',
      addonsByHost: '{}',
      receiversEnabled: '{}',
    });
    const out = filterStreamingOptionsByMode(sampleResult, {
      mode: 'subscription',
      access,
      includeRentals: false,
    });
    expect(out.matchedProviders.length).toBe(1);
    expect(out.matchedProviders[0].serviceId).toBe('netflix');
  });

  it('Subscription mode matches hosted Disney+ via Hulu', () => {
    const access = parseUserStreamingAccess({
      country: 'us',
      directServiceIds: '[]',
      addonsByHost: JSON.stringify({ hulu: ['disney'] }),
      receiversEnabled: '{}',
    });
    expect(subscriptionProfileNonEmpty(access)).toBe(true);
    const out = filterStreamingOptionsByMode(sampleResult, {
      mode: 'subscription',
      access,
      includeRentals: false,
    });
    expect(out.matchedProviders.some((m) => m.serviceId === 'disney' && m.addonId === 'hulu')).toBe(true);
  });

  it('empty profile returns subscriptionProfileEmpty', () => {
    const access = parseUserStreamingAccess({
      country: 'us',
      directServiceIds: '[]',
      addonsByHost: '{}',
      receiversEnabled: '{}',
    });
    const out = filterStreamingOptionsByMode(sampleResult, {
      mode: 'subscription',
      access,
      includeRentals: false,
    });
    expect(out.subscriptionProfileEmpty).toBe(true);
    expect(out.matchedProviders.length).toBe(0);
  });
});
