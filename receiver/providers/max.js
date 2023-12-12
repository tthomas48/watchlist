class Max {
  static provides(uri) {
    return uri.includes('play.max.com');
  }

  static getData(uri) {
    return uri;
  }

  static getComponent(/* uri */) {
    return 'com.wbd.stream/com.wbd.beam.BeamActivity';
  }
}
export default Max;
