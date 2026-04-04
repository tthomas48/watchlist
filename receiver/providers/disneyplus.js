/* eslint-disable class-methods-use-this */
class DisneyPlus {
  getReceiverKey() {
    return 'disneyplus';
  }

  provides(uri) {
    return uri.includes('www.disneyplus.com');
  }

  getStreamingUrl(homepageUrl) {
    return homepageUrl.replace('http://', 'https://');
  }

  getData(uri) {
    return uri;
  }

  getComponent(/* uri */) {
    return 'com.disney.disneyplus/com.bamtechmedia.dominguez.main.MainActivity';
  }
}
module.exports = DisneyPlus;
