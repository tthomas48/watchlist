function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function sendError(res, err, defaultStatus = 500) {
  const status = err.status || defaultStatus;
  res.status(status).json({ message: err.message || 'Error' });
}

module.exports = {
  asyncHandler,
  sendError,
};
