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

  it('Rent mode keeps all non-rental options in matchedProviders', () => {
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
    expect(out.matchedProviders.length).toBe(2);
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
