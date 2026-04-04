import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Dialog } from '@mui/material';
import { WatchableEditor } from './Watchable';

const WatchableEditContext = createContext(null);

export function useWatchableEdit() {
  const ctx = useContext(WatchableEditContext);
  if (!ctx) {
    throw new Error('useWatchableEdit must be used within WatchableEditProvider');
  }
  return ctx;
}

export function WatchableDeepLink() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { openEdit } = useWatchableEdit();

  useEffect(() => {
    if (id) {
      openEdit(id);
    }
    navigate('/', { replace: true });
  }, [id, navigate, openEdit]);

  return null;
}

export function WatchableEditProvider({ children }) {
  const [editId, setEditId] = useState(null);

  const openEdit = useCallback((id) => {
    if (id != null && id !== '') {
      setEditId(String(id));
    }
  }, []);

  const closeEdit = useCallback(() => {
    setEditId(null);
  }, []);

  const value = useMemo(
    () => ({ openEdit, closeEdit, editId }),
    [openEdit, closeEdit, editId],
  );

  return (
    <WatchableEditContext.Provider value={value}>
      {children}
      <Dialog
        open={Boolean(editId)}
        onClose={closeEdit}
        maxWidth="md"
        fullWidth
        scroll="paper"
        aria-labelledby="watchable-edit-dialog-title"
      >
        {editId ? (
          <WatchableEditor key={editId} id={editId} onClose={closeEdit} />
        ) : null}
      </Dialog>
    </WatchableEditContext.Provider>
  );
}
