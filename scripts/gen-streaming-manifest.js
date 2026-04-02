#!/usr/bin/env node
/**
 * Fetch /countries/{country} and emit receiver/streaming_manifest.json.
 * Requires RAPIDAPI_KEY. Optional: RAPIDAPI_HOST.
 *
 * Run: npm run streaming:manifest
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  Client,
  Configuration,
} = require('streaming-availability');
const { RECEIVER_KEYS } = require('../receiver/receiver_keys');

/** Receiver key → API service id for STREAMING_AVAILABILITY_COUNTRY; null if not in country. */
const RECEIVER_SERVICE_SLUG = {
  amazonprime: 'prime',
  amcplus: null,
  appletv: 'apple',
  britbox: 'britbox',
  disneyplus: 'disney',
  hulu: 'hulu',
  max: 'hbo',
  netflix: 'netflix',
  peacocktv: 'peacock',
  pbs: null,
  roku: null,
  starz: 'starz',
  youtube: null,
};

function createClient() {
  const apiKey = (process.env.RAPIDAPI_KEY || '').trim();
  if (!apiKey) {
    throw new Error('RAPIDAPI_KEY is not set');
  }
  const hostRaw = (process.env.RAPIDAPI_HOST || '').trim().replace(/\/$/, '');
  const basePath = hostRaw
    ? `https://${hostRaw.replace(/^https?:\/\//, '')}`
    : '';
  const config = { apiKey };
  if (basePath) {
    config.basePath = basePath;
  }
  return new Client(new Configuration(config));
}

async function main() {
  const country = (process.env.STREAMING_AVAILABILITY_COUNTRY || 'us').trim().toLowerCase();
  const client = createClient();
  const data = await client.countriesApi.getCountry({ countryCode: country });
  const services = data.services || [];
  const byId = new Map(services.map((s) => [s.id, s]));

  const receiverToServiceId = {};
  const missing = RECEIVER_KEYS.filter((key) => RECEIVER_SERVICE_SLUG[key] == null);
  RECEIVER_KEYS.forEach((key) => {
    const slug = RECEIVER_SERVICE_SLUG[key];
    if (slug == null) {
      return;
    }
    if (!byId.has(slug)) {
      throw new Error(
        `Receiver "${key}" maps to "${slug}" but that service id is not in /countries/${country}`,
      );
    }
    receiverToServiceId[key] = slug;
  });
  if (missing.length) {
    // eslint-disable-next-line no-console
    console.warn(
      '[streaming:manifest] No API service id for receivers (ok if not in this country):',
      missing.join(', '),
    );
  }

  const manifest = {
    country,
    generatedAt: new Date().toISOString(),
    receiverToServiceId,
    services: services.map((s) => ({
      id: s.id,
      name: s.name,
      addons: (s.addons || []).map((a) => ({
        id: a.id,
        name: a.name,
      })),
    })),
  };

  const outPath = path.join(__dirname, '..', 'receiver', 'streaming_manifest.json');
  fs.writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  // eslint-disable-next-line no-console
  console.log(`Wrote ${outPath} (${services.length} services)`);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
