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
const Starz = require('./starz');

class ProviderFactory {
  constructor(providers) {
    this.providers = providers;
  }

  getCommand(uri) {
    for (let i = 0; i < this.providers.length; i += 1) {
      const provider = this.providers[i];
      if (provider.provides(uri)) {
        const data = provider.getData(uri);
        const component = provider.getComponent(uri);
        const cmd = `am start -a android.intent.action.VIEW -d ${data} -f 0x10808000 -e source 30 ${component}`;
        return cmd;
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
  new Starz(),
]);
