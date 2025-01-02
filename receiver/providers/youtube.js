/* eslint-disable class-methods-use-this */
class YouTube {
  provides(uri) {
    // this probably no longer works
    return uri.includes('youtube');
  }

  getStreamingUrl(homepageUrl) {
    return homepageUrl.replace('http://', 'https://');
  }

  getData(uri) {
    return uri;
  }

  getComponent(/* uri */) {
    return 'com.google.android.youtube.tv/com.google.android.apps.youtube.tv.activity.ShellActivity';
  }
}
module.exports = YouTube;
