/** @type {import('vite').UserConfig} */
import react from '@vitejs/plugin-react';

export default {
  build: { outDir: 'build' },
  base: '/',
  plugins: [react()],
  root: __dirname,
  optimizeDeps: {
    include: [ 
      "@mui/material/Unstable_Grid2"
    ],
  },
};
