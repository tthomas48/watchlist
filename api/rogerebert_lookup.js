const axios = require('axios');

function slugifyTitle(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildCandidateUrl(title, year) {
  const slug = slugifyTitle(title);
  if (!slug || !year) {
    return null;
  }
  return `https://www.rogerebert.com/reviews/${slug}-${year}`;
}

async function urlExists(url) {
  try {
    const res = await axios.head(url, {
      timeout: 8000,
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 400,
    });
    return res.status >= 200 && res.status < 400;
  } catch (e) {
    if (e.response && e.response.status === 405) {
      try {
        const res = await axios.get(url, {
          timeout: 8000,
          maxRedirects: 5,
          validateStatus: (status) => status >= 200 && status < 400,
        });
        return res.status >= 200 && res.status < 400;
      } catch (getErr) {
        return false;
      }
    }
    return false;
  }
}

async function lookupRogerEbertReview({ title, year }) {
  const url = buildCandidateUrl(title, year);
  if (!url) {
    return null;
  }
  const exists = await urlExists(url);
  return exists ? url : null;
}

module.exports = {
  slugifyTitle,
  buildCandidateUrl,
  lookupRogerEbertReview,
};
