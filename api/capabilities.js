/**
 * Non-secret feature flags for UI / automation (env-only, v1).
 */

function isStreamingEnabled() {
  return Boolean((process.env.RAPIDAPI_KEY || '').trim());
}

function getCapabilities() {
  return {
    streamingEnabled: isStreamingEnabled(),
  };
}

module.exports = {
  getCapabilities,
  isStreamingEnabled,
};
