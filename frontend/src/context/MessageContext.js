import React from 'react';
import { Alert, Snackbar } from '@mui/material';

export const MessageContext = React.createContext(undefined);

export default function MessageContextWrapper({ children }) {
  const emptyMessage = { open: false, message: "", severity: "info" };
  const [message, setMessage] = React.useState(emptyMessage);
  const sendMessage = (newMessage) => setMessage(newMessage);

  return (
    <MessageContext.Provider
      value={{
        value: message,
        sendMessage,
      }}>
      <Snackbar
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        open={message.open}
        autoHideDuration={6000}
        onClose={() => setMessage(emptyMessage)}
        severity={message.severity}
        key="SlideTransition">
        <Alert onClose={() => setMessage(emptyMessage)} severity={message.severity} sx={{ width: '100%' }}>{message.message}</Alert>
      </Snackbar>
      {children}
    </MessageContext.Provider>
  );
}