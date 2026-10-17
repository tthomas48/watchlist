import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import WatchableDetailContent from './WatchableDetail';
import { MessageContext } from './context/MessageContext';

jest.mock('./PlayButton', () => ({
  __esModule: true,
  default: function MockPlayButton() {
    return <button type="button">Play</button>;
  },
}));

jest.mock('./TrailerButton', () => ({
  __esModule: true,
  default: function MockTrailerButton() {
    return <button type="button">Trailer</button>;
  },
}));

jest.mock('./service/api', () => ({
  __esModule: true,
  default: class MockApi {
    // eslint-disable-next-line class-methods-use-this
    async getMoods() {
      return { moods: [{ slug: 'light', label: 'Light' }], mappings: [] };
    }

    // eslint-disable-next-line class-methods-use-this
    async getGenres() {
      return [{ slug: 'comedy', label: 'Comedy' }];
    }

    // eslint-disable-next-line class-methods-use-this
    async getWatchableRentals() {
      return { options: [] };
    }

    // eslint-disable-next-line class-methods-use-this
    async refreshWatchableStreaming() {
      return { ok: true, streaming: { subscription: [], other: [] } };
    }
  },
}));

const baseItem = {
  id: 42,
  title: 'Example Movie',
  year: 2019,
  overview: 'A short synopsis about the film.',
  rogerebert_url: 'https://www.rogerebert.com/reviews/example-movie',
  web_url: 'https://example.com/watch',
  streaming_service_id: 'netflix',
};

function renderDetail(ui) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MessageContext.Provider value={{ sendMessage: jest.fn() }}>
        {ui}
      </MessageContext.Provider>
    </QueryClientProvider>,
  );
}

describe('WatchableDetailContent', () => {
  it('renders title, year, overview, and Ebert link', () => {
    renderDetail(
      <WatchableDetailContent
        item={baseItem}
        player="browser"
        onEdit={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText('Example Movie')).toBeInTheDocument();
    expect(screen.getByText('2019')).toBeInTheDocument();
    expect(screen.getByText('A short synopsis about the film.')).toBeInTheDocument();
    const ebert = screen.getByRole('link', { name: /roger ebert review/i });
    expect(ebert).toHaveAttribute('href', baseItem.rogerebert_url);
    expect(screen.getByText('Netflix')).toBeInTheDocument();
    expect(screen.getByText('Where to watch')).toBeInTheDocument();
    expect(screen.getByText('On your plan')).toBeInTheDocument();
    expect(screen.getByText('Also available')).toBeInTheDocument();
    expect(screen.getByText('Rent / buy')).toBeInTheDocument();
  });

  it('lists on-plan and other streaming options', () => {
    renderDetail(
      <WatchableDetailContent
        item={{
          ...baseItem,
          streaming: {
            checkedAt: '2026-10-17T12:00:00.000Z',
            stale: false,
            subscription: [{
              serviceId: 'netflix',
              serviceName: 'Netflix',
              type: 'subscription',
              link: 'https://www.netflix.com/title/1',
            }],
            other: [{
              serviceId: 'hulu',
              serviceName: 'Hulu',
              type: 'subscription',
              link: 'https://www.hulu.com/movie/1',
            }],
          },
        }}
        player="browser"
        onEdit={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByText('Hulu')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /open/i }).length).toBeGreaterThanOrEqual(2);
  });

  it('renders genre and mood chips when present', async () => {
    renderDetail(
      <WatchableDetailContent
        item={{ ...baseItem, genres: ['comedy'], moods: ['light'] }}
        player="browser"
        onEdit={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(await screen.findByText('Comedy')).toBeInTheDocument();
    expect(await screen.findByText('Light')).toBeInTheDocument();
  });

  it('calls onEdit when Edit is clicked', () => {
    const onEdit = jest.fn();
    renderDetail(
      <WatchableDetailContent
        item={baseItem}
        player="browser"
        onEdit={onEdit}
        onClose={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('omits Ebert link when rogerebert_url is missing', () => {
    renderDetail(
      <WatchableDetailContent
        item={{ ...baseItem, rogerebert_url: null }}
        player="browser"
        onEdit={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(screen.queryByRole('link', { name: /roger ebert review/i })).toBeNull();
  });
});
