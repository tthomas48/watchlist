class PBS {
  provides(uri) {
    // this probably no longer works
    return uri.includes('www.pbs.org');
  }

  getData(uri) {
    return uri;
  }

  getComponent(/* uri */) {
    return 'com.pbs.video/.ui.main.activities.StartupActivity';
  }
}
module.exports = PBS;
