const init = require('connect-session-sequelize');
const adb = require('./adb');
const redirect = require('./redirect');

class ReceiverFactory {
    constructor() {
        this.receivers = {
            "adb": adb,
            "redirect": redirect,
        };
    }
    async init(settings) {
        var tasks = [];
        Object.keys(this.receivers).forEach(key => {
            tasks.push(this.receivers[key].init(settings));
        });
        return await Promise.all(tasks);
    }
    async update(settings) {
        var tasks = [];
        Object.keys(this.receivers).forEach(key => {
            tasks.push(async () => {
                await this.receivers[key].disconnect();
                await this.receivers[key].init(settings);
            });
        });
        return await Promise.all(tasks);
    }    
    getReceiver(name) {
        switch(name) {
            case "googletv":
            case "firetv":
                return this.receivers["adb"];
            default:
                return this.receivers["redirect"];
        }
    }
}
module.exports = new ReceiverFactory();