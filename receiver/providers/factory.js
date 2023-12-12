import AmazonPrime from './amazonprime';
import AMCPlus from './amcplus';
import AppleTV from './appletv';
import BritBox from './britbox';
import DisneyPlus from './disneyplus';
import Hulu from './hulu';
import Max from './max';
import Netflix from './netflix';
import PBS from './pbs';
import PeacockTV from './peacocktv';
import Starz from './starz';

class ProviderFactory {
  constructor(providers) {
    this.providers = providers;
  }

  getCommand(uri) {
    for (let i = 0; i < this.providers.length; i++) {
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

export default new ProviderFactory([
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
