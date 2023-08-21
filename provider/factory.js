const init = require('connect-session-sequelize');
const adb = require('./adb');
const redirect = require('./redirect');

class ProviderFactory {
    constructor() {
        this.providers = {
            "adb": adb,
            "redirect": redirect,
        };
    }
    async init(settings) {
        var tasks = [];
        Object.keys(this.providers).forEach(key => {
            tasks.push(this.providers[key].init(settings));
        });
        return await Promise.all(tasks);
    }
    async update(settings) {
        var tasks = [];
        Object.keys(this.providers).forEach(key => {
            tasks.push(async () => {
                await this.providers[key].disconnect();
                await this.providers[key].init(settings);
            });
        });
        return await Promise.all(tasks);
    }
    getProvider(name) {
        switch(name) {
            case "googletv":
            case "firetv":
                return this.providers["adb"];
            default:
                return this.providers["redirect"];
        }
    }
}
module.exports = new ProviderFactory();