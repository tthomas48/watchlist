import {
  createContext, useCallback, useContext, useMemo, useState,
} from 'react';
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
