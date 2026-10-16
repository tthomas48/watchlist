import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Dialog } from '@mui/material';
import { MessageContext } from './context/MessageContext';
import Api from './service/api';
import { useWatchableEdit } from './WatchableEditDialog';
import WatchableDetailContent from './WatchableDetail';

const PLAYER_STORAGE_KEY = 'watchlist.player';

const WatchableDetailContext = createContext(null);

function readStoredPlayer() {
  try {
    const saved = localStorage.getItem(PLAYER_STORAGE_KEY);
    if (saved === null) {
      return '';
    }
    return JSON.parse(saved) || '';
  } catch {
    return '';
  }
}

export function useWatchableDetail() {
  const ctx = useContext(WatchableDetailContext);
  if (!ctx) {
    throw new Error('useWatchableDetail must be used within WatchableDetailProvider');
  }
  return ctx;
}

export function WatchableDeepLink() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { openDetail } = useWatchableDetail();
  const messageContext = useContext(MessageContext);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) {
        navigate('/', { replace: true });
        return;
      }
      try {
        const api = new Api(messageContext);
        const data = await api.getWatchable(id);
        if (cancelled) {
          return;
        }
        if (data?.watchable) {
          openDetail(data.watchable, readStoredPlayer());
        }
      } catch {
        // Api already surfaces errors via MessageContext when available
      } finally {
        if (!cancelled) {
          navigate('/', { replace: true });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, navigate, openDetail, messageContext]);

  return null;
}

export function WatchableDetailProvider({ children }) {
  const [detail, setDetail] = useState(null);
  const { openEdit } = useWatchableEdit();

  const openDetail = useCallback((item, player = '') => {
    if (item != null && item.id != null) {
      setDetail({ item, player: player || '' });
    }
  }, []);

  const closeDetail = useCallback(() => {
    setDetail(null);
  }, []);

  const handleEdit = useCallback(() => {
    if (!detail?.item?.id) {
      return;
    }
    const editId = detail.item.id;
    setDetail(null);
    openEdit(editId);
  }, [detail, openEdit]);

  const value = useMemo(
    () => ({ openDetail, closeDetail, detail }),
    [openDetail, closeDetail, detail],
  );

  return (
    <WatchableDetailContext.Provider value={value}>
      {children}
      <Dialog
        open={Boolean(detail)}
        onClose={closeDetail}
        maxWidth="md"
        fullWidth
        scroll="paper"
        aria-labelledby="watchable-detail-dialog-title"
      >
        {detail ? (
          <WatchableDetailContent
            key={detail.item.id}
            item={detail.item}
            player={detail.player}
            onEdit={handleEdit}
            onClose={closeDetail}
          />
        ) : null}
      </Dialog>
    </WatchableDetailContext.Provider>
  );
}
