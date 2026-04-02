const fs = require('fs');
const path = require('path');

const MANIFEST_PATH = path.join(__dirname, '..', 'receiver', 'streaming_manifest.json');

function loadStreamingManifest() {
  try {
    const raw = fs.readFileSync(MANIFEST_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return {
      country: (process.env.STREAMING_AVAILABILITY_COUNTRY || 'us').trim().toLowerCase(),
      generatedAt: null,
      services: [],
      receiverToServiceId: {},
    };
  }
}

module.exports = {
  loadStreamingManifest,
  MANIFEST_PATH,
};
