const Server = require('../server');

module.exports = function setupProxy(app) {
  const server = new Server();
  server.init(app);
};
