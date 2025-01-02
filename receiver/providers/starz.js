/* eslint-disable class-methods-use-this */
class Starz {
  provides(uri) {
    // this probably no longer works
    return uri.includes('starz');
  }

  getStreamingUrl(homepageUrl) {
    return homepageUrl.replace('http://', 'https://');
  }

  getData(uri) {
    return uri;
  }

  getComponent(/* uri */) {
    return 'com.bydeluxe.d3.android.program.starz/com.starz.amznfiretv.SplashActivity';
  }
}
module.exports = Starz;
