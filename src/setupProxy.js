const api = require('../routes');

module.exports = function setupProxy(app) {
  api.init(app);
};
