/**
 * Maps streaming_service_id (catalog id from manifest, or receiver key fallback) to icons
 * under /streaming-icons/{id}.svg.
 */
const SERVICE_LABELS = {
  netflix: 'Netflix',
  prime: 'Prime Video',
  apple: 'Apple TV+',
  britbox: 'BritBox',
  disney: 'Disney+',
  hulu: 'Hulu',
  hbo: 'Max',
  peacock: 'Peacock',
  starz: 'STARZ',
  // Receiver-key fallbacks (no streaming-availability catalog entry)
  youtube: 'YouTube',
  pbs: 'PBS',
  amcplus: 'AMC+',
  roku: 'The Roku Channel',
};

const ICON_FILES = new Set(Object.keys(SERVICE_LABELS));

/**
 * @param {string | null | undefined} serviceId
 * @returns {{ type: 'img', src: string, alt: string } | { type: 'fallback', alt: string } | null}
 */
function getStreamingServiceIcon(serviceId) {
  if (!serviceId) return null;
  const id = String(serviceId).toLowerCase();
  const alt = SERVICE_LABELS[id] || serviceId;
  if (ICON_FILES.has(id)) {
    return { type: 'img', src: `/streaming-icons/${id}.svg`, alt };
  }
  return { type: 'fallback', alt };
}

export default getStreamingServiceIcon;
