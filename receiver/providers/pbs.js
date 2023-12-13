class PBS {
  static provides(uri) {
    // this probably no longer works
    return uri.includes('www.pbs.org');
  }

  static getData(uri) {
    return uri;
  }

  static getComponent(/* uri */) {
    return 'com.pbs.video/.ui.main.activities.StartupActivity';
  }
}
module.exports = PBS;
