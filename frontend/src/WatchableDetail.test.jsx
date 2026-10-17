import { render, screen, fireEvent } from '@testing-library/react';
import WatchableDetailContent from './WatchableDetail';

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

const baseItem = {
  id: 42,
  title: 'Example Movie',
  year: 2019,
  overview: 'A short synopsis about the film.',
  rogerebert_url: 'https://www.rogerebert.com/reviews/example-movie',
  web_url: 'https://example.com/watch',
  streaming_service_id: 'netflix',
};

describe('WatchableDetailContent', () => {
  it('renders title, year, overview, and Ebert link', () => {
    render(
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
  });

  it('renders genre and mood chips when present', () => {
    render(
      <WatchableDetailContent
        item={{ ...baseItem, genres: ['comedy'], moods: ['light'] }}
        player="browser"
        onEdit={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByText('Comedy')).toBeInTheDocument();
    expect(screen.getByText('Light')).toBeInTheDocument();
  });

  it('calls onEdit when Edit is clicked', () => {
    const onEdit = jest.fn();
    render(
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
    render(
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
