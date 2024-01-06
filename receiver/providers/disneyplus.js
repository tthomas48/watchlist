/* eslint-disable class-methods-use-this */
class DisneyPlus {
  provides(uri) {
    return uri.includes('www.disneyplus.com');
  }

  getData(uri) {
    return uri;
  }

  getComponent(/* uri */) {
    return 'com.disney.disneyplus/com.bamtechmedia.dominguez.main.MainActivity';
  }
}
module.exports = DisneyPlus;
