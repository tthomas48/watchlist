const AmazonPrime = require('./amazonprime');
const AMCPlus = require('./amcplus');
const AppleTV = require('./appletv');
const BritBox = require('./britbox');
const DisneyPlus = require('./disneyplus');
const Hulu = require('./hulu');
const Max = require('./max');
const Netflix = require('./netflix');
const PBS = require('./pbs');
const PeacockTV = require('./peacocktv');
const Roku = require('./roku');
const Starz = require('./starz');
const YouTube = require('./youtube');

class ProviderFactory {
  constructor(providers) {
    this.providers = providers;
  }

  getStreamingUrl(homepageUrl) {
    if (homepageUrl == null) {
      return '';
    }
    for (let i = 0; i < this.providers.length; i += 1) {
      const provider = this.providers[i];
      if (provider.provides(homepageUrl)) {
        const streamingUrl = provider.getStreamingUrl(homepageUrl);
        if (streamingUrl) {
          return streamingUrl;
        }
      }
    }
    return '';
  }

  getCommand(uri) {
    const params = this.getParams(uri);
    if (params == null) {
      return params;
    }
    return `am start -a android.intent.action.VIEW -d ${params.data} -f 0x10808000 -e source 30 ${params.component}`;
  }

  getParams(uri) {
    for (let i = 0; i < this.providers.length; i += 1) {
      const provider = this.providers[i];
      if (provider.provides(uri)) {
        const data = provider.getData(uri);
        const component = provider.getComponent(uri);
        return { data, component };
      }
    }
    return null;
  }

  registerProvider(key, provider) {
    this.providers[key] = provider;
  }
}

module.exports = new ProviderFactory([
  new AmazonPrime(),
  new AMCPlus(),
  new AppleTV(),
  new BritBox(),
  new DisneyPlus(),
  new Hulu(),
  new Max(),
  new Netflix(),
  new PeacockTV(),
  new PBS(),
  new Roku(),
  new Starz(),
  new YouTube(),
]);
