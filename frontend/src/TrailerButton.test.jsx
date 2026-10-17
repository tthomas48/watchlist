import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TrailerButton from './TrailerButton';
import { MessageContext } from './context/MessageContext';

jest.mock('./TrailerDialog', () => ({
  __esModule: true,
  default: function MockTrailerDialog({ open, url }) {
    if (!open) {
      return null;
    }
    return <div data-testid="trailer-dialog">{url}</div>;
  },
}));

jest.mock('./service/api', () => {
  const getTrailer = jest.fn();
  function Api() {
    return { getTrailer };
  }
  Api.getTrailer = getTrailer;
  return { __esModule: true, default: Api };
});

const Api = require('./service/api').default;

function renderButton(props) {
  const sendMessage = jest.fn();
  return {
    sendMessage,
    ...render(
      <MessageContext.Provider value={{ sendMessage }}>
        <TrailerButton id={42} {...props} />
      </MessageContext.Provider>,
    ),
  };
}

describe('TrailerButton', () => {
  beforeEach(() => {
    Api.getTrailer.mockReset();
  });

  it('opens dialog when trailerUrl is already present', async () => {
    renderButton({ trailerUrl: 'https://youtu.be/abc', title: 'Film' });
    fireEvent.click(screen.getByRole('button', { name: /trailer/i }));
    expect(await screen.findByTestId('trailer-dialog')).toHaveTextContent(
      'https://youtu.be/abc',
    );
    expect(Api.getTrailer).not.toHaveBeenCalled();
  });

  it('fetches on-demand trailer when missing', async () => {
    Api.getTrailer.mockResolvedValue({ trailerUrl: 'https://youtu.be/live' });
    renderButton({ trailerUrl: null });
    fireEvent.click(screen.getByRole('button', { name: /trailer/i }));
    await waitFor(() => {
      expect(Api.getTrailer).toHaveBeenCalledWith(42);
    });
    expect(await screen.findByTestId('trailer-dialog')).toHaveTextContent(
      'https://youtu.be/live',
    );
  });
});
