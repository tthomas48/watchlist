/* eslint-disable class-methods-use-this */
class Roku {
  provides(uri) {
    return uri.includes('roku.com');
  }

  getStreamingUrl(homepageUrl) {
    return homepageUrl.replace('http://', 'https://');
  }

  getData(uri) {
    if (uri.includes('https://therokuchannel.roku.com/details/')) {
      const formatted = uri.replace(/(https:\/\/therokuchannel.roku.com\/details\/[^/]+).*/, '$1');
      return formatted;
    }

    return uri;
  }

  getComponent(/* uri */) {
    return 'com.roku.web.trc/.MainActivity';
  }
}
module.exports = Roku;
