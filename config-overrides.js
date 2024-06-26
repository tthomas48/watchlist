const paths = require('react-scripts/config/paths');
const path = require('path');

// Make the "app" folder be treated as the "src" folder
paths.appSrc = path.resolve(__dirname, 'frontend/src');
// Tell the app that "src/index.js" has moved to "app/index.js"
paths.appIndexJs = path.resolve(__dirname, 'frontend/src/index.js');
paths.appPublic = path.resolve(__dirname, 'frontend/public');
paths.appHtml = path.resolve(__dirname, 'frontend/public/index.html');

module.exports = {
  devServer(configFunction) {
    return function devServer(proxy, allowedHost) {
      const config = configFunction(proxy, allowedHost);
      config.open = `https://${process.env.NGROK_DOMAIN}/`;
      config.client = {
        webSocketURL: {
          hostname: process.env.NGROK_DOMAIN,
          port: 0,
          protocol: 'wss',
        },
      };
      return config;
    };
  },
};
