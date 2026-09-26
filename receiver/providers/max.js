class Max {
  getReceiverKey() {
    return 'max';
  }

  provides(uri) {
    if (!uri) {
      return false;
    }
    return uri.includes('play.max.com')
      || uri.includes('www.max.com')
      || uri.includes('play.hbomax.com')
      || uri.includes('www.hbomax.com');
  }

  normalizePlayUrl(uri) {
    try {
      const url = new URL(uri);
      url.protocol = 'https:';
      url.search = '';
      url.hash = '';

      const host = url.hostname.replace(/^www\./, '');
      const isMaxFamily = host === 'max.com'
        || host === 'play.max.com'
        || host === 'hbomax.com'
        || host === 'play.hbomax.com';
      if (isMaxFamily) {
        url.hostname = 'play.max.com';
      }

      const uuidMatch = url.pathname.match(/\/([0-9a-f-]+)$/i);
      if (url.pathname.includes('/shows/') && uuidMatch) {
        url.pathname = `/show/${uuidMatch[1]}`;
      }
      return url.toString();
    } catch {
      return String(uri)
        .replace(/^http:\/\//, 'https://')
        .replace('hbomax.com', 'max.com')
        .replace('www.max.com', 'play.max.com');
    }
  }

  getStreamingUrl(homepageUrl) {
    return this.normalizePlayUrl(homepageUrl);
  }

  getData(uri) {
    return this.normalizePlayUrl(uri);
  }

  getComponent(/* uri */) {
    return 'com.wbd.stream/com.wbd.beam.BeamActivity';
  }
}
module.exports = Max;
