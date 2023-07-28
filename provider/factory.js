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
    async init() {
        var tasks = [];
        Object.keys(this.providers).forEach(key => {
            console.log(this.providers[key]);
            tasks.push(this.providers[key].init());
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