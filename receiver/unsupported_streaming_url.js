function unsupportedStreamingUrlError(uri) {
  const err = new Error(`Unsupported streaming URL: ${uri}`);
  err.status = 400;
  return err;
}

module.exports = { unsupportedStreamingUrlError };
