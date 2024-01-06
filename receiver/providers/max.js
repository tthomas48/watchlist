/* eslint-disable class-methods-use-this */
class Max {
  provides(uri) {
    return uri.includes('play.max.com');
  }

  getData(uri) {
    return uri;
  }

  getComponent(/* uri */) {
    return 'com.wbd.stream/com.wbd.beam.BeamActivity';
  }
}
module.exports = Max;
