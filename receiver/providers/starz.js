class Starz {
  static provides(uri) {
    // this probably no longer works
    return uri.includes('starz');
  }

  static getData(uri) {
    return uri;
  }

  static getComponent(/* uri */) {
    return 'com.bydeluxe.d3.android.program.starz/com.starz.amznfiretv.SplashActivity';
  }
}
export default Starz;
