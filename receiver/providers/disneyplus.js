class DisneyPlus {
  static provides(uri) {
    return uri.includes('www.disneyplus.com');
  }

  static getData(uri) {
    return uri;
  }

  static getComponent(/* uri */) {
    return 'com.disney.disneyplus/com.bamtechmedia.dominguez.main.MainActivity';
  }
}
export default DisneyPlus;
