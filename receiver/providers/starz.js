class Starz {
  provides(uri) {
    // this probably no longer works
    return uri.includes('starz');
  }

  getData(uri) {
    return uri;
  }

  getComponent(/* uri */) {
    return 'com.bydeluxe.d3.android.program.starz/com.starz.amznfiretv.SplashActivity';
  }
}
module.exports = Starz;
