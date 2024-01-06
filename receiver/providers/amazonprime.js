/* eslint-disable class-methods-use-this */
class AmazonPrime {
  provides(uri) {
    return uri.includes('intent://watch.amazon.com') || uri.includes('amazon.com');
  }

  getData(uri) {
    if (uri.includes('www.amazon.com/')) {
      return uri.replace(/https:\/\/www.amazon.com\/gp\/video\/detail\/([^/?]+).*/, 'https://watch.amazon.com/detail?asin=$1');
    }
    return uri;
  }

  getComponent(/* uri */) {
    return 'com.amazon.amazonvideo.livingroom/com.amazon.ignition.IgnitionActivity';
  }
}
module.exports = AmazonPrime;
