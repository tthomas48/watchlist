class Netflix {
  static provides(uri) {
    return uri.includes('www.netflix.com/');
  }

  static getData(uri) {
    let id = '';
    if (uri.match(/.*\/title\/([0-9]+)/)) {
      // id = uri.replace(/.*\/title\/([0-9]+)/, "$1");
      return uri;
    }
    if (uri.match(/.*\/browse\?jbv=([0-9]+)/)) {
      id = uri.replace(/.*\/browse\?jbv=([0-9]+)/, '$1');
      return `https://www.netflix.com/title/${id}`;
    }
    return uri;
  }

  static getComponent(/* uri */) {
    return 'com.netflix.ninja/.MainActivity';
  }
}
export default Netflix;
