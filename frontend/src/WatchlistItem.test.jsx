import { render, screen, within, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import WatchlistItem from './WatchlistItem';
import { MessageContext } from './context/MessageContext';

jest.mock('./WatchableDetailDialog', () => ({
  useWatchableDetail: () => ({ openDetail: jest.fn() }),
}));

jest.mock('./WatchableEditDialog', () => ({
  useWatchableEdit: () => ({ openEdit: jest.fn() }),
}));

jest.mock('./PlayButton', () => ({
  __esModule: true,
  default: function MockPlayButton() {
    return <button type="button">Play</button>;
  },
}));

jest.mock('./TrailerButton', () => ({
  __esModule: true,
  default: function MockTrailerButton({ buttonRef }) {
    return (
      <button type="button" ref={buttonRef} data-testid="hidden-trailer-trigger">
        Trailer
      </button>
    );
  },
}));

jest.mock('./CommentButton', () => ({
  __esModule: true,
  default: function MockCommentButton({ buttonRef, item }) {
    const label = item?.comment ? 'Comment' : 'Add comment';
    return (
      <button type="button" ref={buttonRef} data-testid="hidden-comment-trigger" aria-label={label}>
        {label}
      </button>
    );
  },
}));

jest.mock('./EditButton', () => ({
  __esModule: true,
  default: function MockEditButton() {
    return <button type="button">Edit</button>;
  },
}));

jest.mock('./ViewOnTraktButton', () => ({
  __esModule: true,
  default: function MockViewOnTraktButton() {
    return <button type="button">View on Trakt</button>;
  },
}));

jest.mock('./HideButton', () => ({
  __esModule: true,
  default: function MockHideButton() {
    return <button type="button">Hide</button>;
  },
}));

jest.mock('./streamingServiceIcon', () => ({
  __esModule: true,
  default: () => null,
}));

const baseItem = {
  id: 7,
  title: 'Compact Card Movie',
  web_url: 'https://example.com/watch',
  trailer_url: 'https://youtu.be/abc',
  comment: null,
  local: false,
  trakt_id: 1,
  media_type: 'movie',
};

function renderItem(item = baseItem) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MessageContext.Provider value={{ sendMessage: jest.fn() }}>
        <WatchlistItem
          item={item}
          player="browser"
          saveWatchable={jest.fn()}
          notifications={[]}
          list="default"
        />
      </MessageContext.Provider>
    </QueryClientProvider>,
  );
}

describe('WatchlistItem card actions', () => {
  it('shows Play and overflow menu; Trailer and Comment only appear in the menu', () => {
    renderItem();

    expect(screen.getByRole('button', { name: 'Play' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'more actions' })).toBeVisible();

    expect(screen.getByTestId('hidden-trailer-trigger')).not.toBeVisible();
    expect(screen.getByTestId('hidden-comment-trigger')).not.toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'more actions' }));

    const menu = screen.getByRole('menu');
    expect(within(menu).getByRole('button', { name: 'Trailer' })).toBeVisible();
    expect(within(menu).getByRole('button', { name: 'Add comment' })).toBeVisible();
    expect(within(menu).getByRole('button', { name: 'Edit' })).toBeVisible();
  });

  it('labels the comment menu item when a comment already exists', () => {
    renderItem({ ...baseItem, comment: 'Worth a rewatch' });

    fireEvent.click(screen.getByRole('button', { name: 'more actions' }));

    const menu = screen.getByRole('menu');
    expect(within(menu).getByRole('button', { name: 'Comment' })).toBeVisible();
  });
});
