import { render, screen, fireEvent } from '@testing-library/react';
import TrailerDialog from './TrailerDialog';

jest.mock('react-player', () => {
  function MockReactPlayer({ src }) {
    return <div data-testid="react-player">{src}</div>;
  }
  MockReactPlayer.canPlay = (src) => typeof src === 'string' && src.includes('youtu');
  return { __esModule: true, default: MockReactPlayer };
});

describe('TrailerDialog', () => {
  it('embeds YouTube when open and URL is present', () => {
    render(
      <TrailerDialog
        open
        onClose={jest.fn()}
        url="https://www.youtube.com/watch?v=abc"
        title="Example"
      />,
    );
    expect(screen.getByText(/Example — Trailer/)).toBeInTheDocument();
    expect(screen.getByTestId('react-player')).toHaveTextContent(
      'https://www.youtube.com/watch?v=abc',
    );
  });

  it('does not mount player when closed (stops playback)', () => {
    render(
      <TrailerDialog
        open={false}
        onClose={jest.fn()}
        url="https://www.youtube.com/watch?v=abc"
        title="Example"
      />,
    );
    expect(screen.queryByTestId('react-player')).toBeNull();
  });

  it('offers open-in-new-tab for non-embeddable URLs', () => {
    render(
      <TrailerDialog
        open
        onClose={jest.fn()}
        url="https://example.com/trailer.mp4"
        title="Example"
      />,
    );
    const link = screen.getByRole('link', { name: /open in a new tab/i });
    expect(link).toHaveAttribute('href', 'https://example.com/trailer.mp4');
  });

  it('calls onClose when Close is clicked', () => {
    const onClose = jest.fn();
    render(
      <TrailerDialog
        open
        onClose={onClose}
        url="https://youtu.be/abc"
        title="Example"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
