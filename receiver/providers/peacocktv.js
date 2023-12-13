class PeacockTV {
  static provides(uri) {
    return uri.includes('www.peacocktv.com');
  }

  static getData(uri) {
    if (uri.includes('https://www.peacocktv.com/watch/asset/tv/')) {
      const id = uri.replace(/https:\/\/www.peacocktv.com\/watch\/asset\/tv\/[^/]+\/([^/]+)/, '$1');
      const json = { providerSeriesId: id, type: 'SERIES', action: 'PDP' };
      return `https://www.peacocktv.com/deeplink?deeplinkData%3D${encodeURIComponent(JSON.stringify(json))}`;
    }
    if (uri.includes('https://www.peacocktv.com/watch/asset/movies/')) {
      const id = uri.replace(/https:\/\/www.peacocktv.com\/watch\/asset\/movies\/[^/]+\/([^/]+)/, '$1');
      const json = { pvid: id, type: 'PROGRAMME', action: 'PDP' };
      return `https://www.peacocktv.com/deeplink?deeplinkData%3D${encodeURIComponent(JSON.stringify(json))}`;
    }
    return uri;
  }

  static getComponent(/* uri */) {
    return 'com.peacocktv.peacockandroid/com.peacock.peacocktv.GoogleMainActivity';
  }
}
module.exports = PeacockTV;
