class AmazonPrime {
  static provides(uri) {
    return uri.includes('intent://watch.amazon.com') || uri.includes('amazon.com');
  }

  static getData(uri) {
    if (uri.includes('www.amazon.com/')) {
      // https://watch.amazon.com/detail?asin=B0BYWHZ2FR
      return uri.replace(/https:\/\/www.amazon.com\/gp\/video\/detail\/(.*?)\/.*/, 'https://watch.amazon.com/detail?asin=$1');
    }
    return uri;
  }

  static getComponent(/* uri */) {
    return 'com.amazon.amazonvideo.livingroom/com.amazon.ignition.IgnitionActivity';
  }
}
export default AmazonPrime;
