/* eslint-disable class-methods-use-this */
class AmazonPrime {
  provides(uri) {
    return uri.includes('intent://watch.amazon.com') || uri.includes('amazon.com');
  }

  getData(uri) {
    //https://www.amazon.com/gp/video/detail/B0CLRSTMPQ/ref=atv_dp_share_cu_r
    //https://www.amazon.com/Official-Trailer/dp/B089XXLCST/ref=sr_1_1
    if (uri.match(/.*\/([A-Z0-9]{10}$)/)) {
      return uri.replace(/.*\/([A-Z0-9]{10})/, 'https://watch.amazon.com/detail?asin=$1');
    }
    if (uri.match(/.*\/([A-Z0-9]{10})\/.*/)) {
      return uri.replace(/.*\/([A-Z0-9]{10})\/.*/, 'https://watch.amazon.com/detail?asin=$1');
    }
    throw new Error(`Unknown amazon URI ${uri}`);
  }

  getComponent(/* uri */) {
    return 'com.amazon.amazonvideo.livingroom/com.amazon.ignition.IgnitionActivity';
  }
}
module.exports = AmazonPrime;
