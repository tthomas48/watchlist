const { RECEIVER_KEYS } = require('../receiver/receiver_keys');

/**
 * Default JSON for new users: all receivers enabled.
 */
function defaultReceiversEnabledJson() {
  const recv = {};
  for (let i = 0; i < RECEIVER_KEYS.length; i += 1) {
    recv[RECEIVER_KEYS[i]] = true;
  }
  return JSON.stringify(recv);
}

async function getOrCreateUserStreamingAccess(models, userId) {
  const existing = await models.UserStreamingAccess.findOne({ where: { userId } });
  if (existing) {
    return existing;
  }
  const country = (process.env.STREAMING_AVAILABILITY_COUNTRY || 'us').trim().toLowerCase();
  return models.UserStreamingAccess.create({
    userId,
    country,
    directServiceIds: '[]',
    addonsByHost: '{}',
    receiversEnabled: defaultReceiversEnabledJson(),
  });
}

function parseAccessResponse(row) {
  let direct = [];
  let addons = {};
  let receivers = {};
  try {
    direct = JSON.parse(row.directServiceIds || '[]');
  } catch { /* ignore */ }
  try {
    addons = JSON.parse(row.addonsByHost || '{}');
  } catch { /* ignore */ }
  try {
    receivers = JSON.parse(row.receiversEnabled || '{}');
  } catch { /* ignore */ }
  if (!receivers || typeof receivers !== 'object' || !Object.keys(receivers).length) {
    receivers = JSON.parse(defaultReceiversEnabledJson());
  }
  return {
    country: row.country,
    directServiceIds: Array.isArray(direct) ? direct : [],
    addonsByHost: addons && typeof addons === 'object' ? addons : {},
    receiversEnabled: receivers,
  };
}

function serializePutBody(body) {
  const country = String(body.country || '').trim().toLowerCase()
    || (process.env.STREAMING_AVAILABILITY_COUNTRY || 'us').trim().toLowerCase();
  const direct = Array.isArray(body.directServiceIds) ? body.directServiceIds.map(String) : [];
  const addons = body.addonsByHost && typeof body.addonsByHost === 'object' ? body.addonsByHost : {};
  const baseRecv = JSON.parse(defaultReceiversEnabledJson());
  const incoming = body.receiversEnabled && typeof body.receiversEnabled === 'object'
    ? body.receiversEnabled
    : {};
  const recv = { ...baseRecv, ...incoming };
  const outAddons = {};
  Object.keys(addons).forEach((hostId) => {
    const arr = addons[hostId];
    if (Array.isArray(arr) && arr.length) {
      outAddons[String(hostId)] = arr.map(String);
    }
  });
  return {
    country,
    directServiceIds: JSON.stringify(direct),
    addonsByHost: JSON.stringify(outAddons),
    receiversEnabled: JSON.stringify(recv),
  };
}

module.exports = {
  getOrCreateUserStreamingAccess,
  parseAccessResponse,
  serializePutBody,
  defaultReceiversEnabledJson,
};
