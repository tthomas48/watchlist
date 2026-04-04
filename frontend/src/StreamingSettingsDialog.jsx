import {
  createContext, useContext, useState, useMemo, useCallback,
} from 'react';
import {
  Dialog, DialogTitle, DialogContent, Tab, Tabs, Box, MenuItem, Button,
} from '@mui/material';
import StreamIcon from '@mui/icons-material/Stream';
import StreamingAccess from './StreamingAccess';
import Settings from './Settings';

const StreamingSettingsContext = createContext(null);

function TabPanel({ children, value, index }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`streaming-settings-tabpanel-${index}`}
    >
      {value === index ? <Box sx={{ pt: 1 }}>{children}</Box> : null}
    </div>
  );
}

export function useStreamingSettingsDialog() {
  const ctx = useContext(StreamingSettingsContext);
  if (!ctx) {
    throw new Error('useStreamingSettingsDialog must be used within StreamingSettingsProvider');
  }
  return ctx;
}

export function StreamingSettingsProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(0);

  const openDialog = useCallback((initialTab = 0) => {
    setTab(initialTab);
    setOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setOpen(false);
  }, []);

  const value = useMemo(
    () => ({ openDialog, closeDialog, open, tab, setTab }),
    [openDialog, closeDialog, open, tab],
  );

  return (
    <StreamingSettingsContext.Provider value={value}>
      {children}
      <Dialog
        open={open}
        onClose={closeDialog}
        maxWidth="md"
        fullWidth
        scroll="paper"
        aria-labelledby="streaming-settings-dialog-tabs"
      >
        <DialogTitle id="streaming-settings-dialog-tabs" sx={{ pb: 0 }}>
          <Tabs
            value={tab}
            onChange={(_, newValue) => setTab(newValue)}
            aria-label="Streaming and Google TV settings"
          >
            <Tab
              label="Streaming"
              id="streaming-settings-tab-0"
              aria-controls="streaming-settings-tabpanel-0"
            />
            <Tab
              label="Google TV"
              id="streaming-settings-tab-1"
              aria-controls="streaming-settings-tabpanel-1"
            />
          </Tabs>
        </DialogTitle>
        <DialogContent dividers>
          <TabPanel value={tab} index={0}>
            <StreamingAccess onClose={closeDialog} embedded />
          </TabPanel>
          <TabPanel value={tab} index={1}>
            <Settings onClose={closeDialog} embedded />
          </TabPanel>
        </DialogContent>
      </Dialog>
    </StreamingSettingsContext.Provider>
  );
}

export function StreamingSettingsMenuItem({ onMenuClose }) {
  const { openDialog } = useStreamingSettingsDialog();
  return (
    <MenuItem disableRipple sx={{ py: 0.5 }}>
      <Button
        aria-label="streaming and Google TV settings"
        color="primary"
        fullWidth
        startIcon={<StreamIcon />}
        onClick={() => {
          onMenuClose();
          openDialog(0);
        }}
        sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
      >
        SETTINGS
      </Button>
    </MenuItem>
  );
}
