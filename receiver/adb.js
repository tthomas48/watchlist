const ADB = require('@devicefarmer/adbkit');
const { urlencoded } = require('body-parser');

class Adb {
    async init(settings) {
        try {
            if (!settings || !settings.googletv_host || !settings.googletv_port) {
                return;
            }
            this.client = ADB.Adb.createClient();
            this.host = settings.googletv_host;
            this.port = settings.googletv_port;
            
            this.remoteID = await this.client.connect(this.host, this.port);
        } catch(e) {
            console.error(e);
        }
    }
    async disconnect() {
        if (this.host && this.port) {
            await this.client.disconnect(this.host, this.port);
        }
    }
    async goHome() {
        const device = this.client.getDevice(this.remoteID);
            
        const cmd = `am start -a android.intent.action.MAIN -c android.intent.category.HOME`;
        let result = await device.shell(cmd);
    }
    async play(uri, attempt = 0) {
        try {
            await this.goHome();
            console.log(uri);
            const data = this.getData(uri);
            console.log(`${uri} / ${data}`);
            // const extras = [{key: 'source', value: 30}];
            // this.addExtras(extras, uri);
            // const cmd = 'am start -a android.intent.action.VIEW -d https://www.netflix.com/title/70264888 -f 0x10808000 -e source 30 com.netflix.ninja/.MainActivity';
            // const cmd = 'am start -a android.intent.action.VIEW -d https://www.netflix.com/title/70264888 -f 0x10808000 -e source 30 com.netflix.mediaclient.ui.launch.UIWebViewActivity';
            // am start -a android.intent.action.VIEW -d https://www.hulu.com/watch/c6ebcc8a-ed80-4bc9-9d31-31b0f0bf9798
            // am start -a android.intent.action.VIEW -d https://tv.apple.com/us/show/the-afterparty/umc.cmc.5wg8cnigwrkfzbdruaufzb6b0
            // https://www.netflix.com/browse?jbv=80986854
            // am start -a android.intent.action.VIEW -d https://www.netflix.com/title/80986854
            const device = this.client.getDevice(this.remoteID);
            let action = 'android.intent.action.VIEW';
            // var options = {
            //     action: 'android.intent.action.VIEW',
            //     // category: 'android.intent.category.LEANBACK_LAUNCHER',
            //     data,
            //     wait: true,
            //     flags: '0x10808000',
            //     //extras,
            //     //component,
            // };
            const component = this.getComponent(uri);
            //if (component != null) {
            //    options.component = component;
            //}
            //this.addExtras(data, options);
            //console.log(options);
            //let result = await device.startActivity(options);
            let cmd = `am start -a ${action} -d ${data} -f 0x10808000 -e source 30 ${component}`;
            console.log(cmd);
            let result = await device.shell(cmd);
            return result;
        } catch(e) {
            console.error(e);
            if (attempt == 0 && String(e).includes("not found")) {
                return this.play(uri, 1);
            }            
        }
    }
    addExtras(uri, options) {
        if (uri.includes("www.netflix.com/")) {
            //const id = uri.replace(/.*\/title\/([0-9]+)/, "$1");
            //options.extras = {"key": "amzn_deeplink_data", "value": id};
            // options.flags = '0x10808000';
            //options.category = 'android.intent.category.LEANBACK_LAUNCHER';
        } 
    }
    getData(uri) {
        if (uri.includes("www.amcplus.com")) {
            return uri.replace(/.*-([0-9]+)/, "$1");
        }
        if (uri.includes("www.netflix.com/")) {
            // https://www.netflix.com/browse?jbv=80986854
            let id = "";
            if (uri.match(/.*\/title\/([0-9]+)/)) {
                // id = uri.replace(/.*\/title\/([0-9]+)/, "$1");
                return uri;
            }
            if (uri.match(/.*\/browse\?jbv=([0-9]+)/)) {
                id = uri.replace(/.*\/browse\?jbv=([0-9]+)/, "$1");
                return "https://www.netflix.com/title/" + id;
            }
            // return `"netflix://title/${id}"`;
        }
        if (uri.includes("https://www.peacocktv.com/watch/asset/tv/")) {
            
            let id = uri.replace(/https\:\/\/www.peacocktv.com\/watch\/asset\/tv\/[^\/]+\/([^\/]+)/, "$1");
            const json = {"providerSeriesId":id,"type":"SERIES","action":"PDP"};
            return "https://www.peacocktv.com/deeplink?deeplinkData%3D" + encodeURIComponent(JSON.stringify(json));
        }
        if (uri.includes("https://www.peacocktv.com/watch/asset/movies/")) {
            let id = uri.replace(/https\:\/\/www.peacocktv.com\/watch\/asset\/movies\/[^\/]+\/([^\/]+)/, "$1");
            const json = {"pvid":id,"type":"PROGRAMME","action":"PDP"};
            return "https://www.peacocktv.com/deeplink?deeplinkData%3D" + encodeURIComponent(JSON.stringify(json));
            
        }
        if (uri.includes("www.amazon.com/")) {
            // https://watch.amazon.com/detail?asin=B0BYWHZ2FR
            return uri.replace(/https\:\/\/www.amazon.com\/gp\/video\/detail\/(.*?)\/.*/, "https://watch.amazon.com/detail?asin=$1");
        }        
        return uri;
    }
    //
    // Hulu - I want the series URL - https://www.hulu.com/series/c6ebcc8a-ed80-4bc9-9d31-31b0f0bf9798 or https://www.hulu.com/movie/34fdd2c6-dd92-4440-ae64-4c820e476978
    // Disney - https://www.disneyplus.com/series/never-say-never-with-jeff-jenkins/6Qsx2pH8tIly
    getComponent(uri) {
        if (String(uri).length === 0) {
            return null;
        }
        // detect compponent type
        if (uri.includes("tv.apple.com")) {
            return "com.apple.atve.androidtv.appletv/.MainActivity";
        }
        if (uri.includes("www.netflix.com/")) {
            return "com.netflix.ninja/.MainActivity";
        }
        if (uri.includes("www.peacocktv.com")) {
            return "com.peacocktv.peacockandroid/com.peacock.peacocktv.GoogleMainActivity";
        }
        if (uri.includes("www.amcplus.com")) {
            return "com.amcplus.amcandroidtv/com.amcplus.tv.MainActivity";
        }
        if (uri.includes("package=com.hulu.livingroomplus") || uri.includes("www.hulu.com")) {
            return "com.hulu.livingroomplus/.WKFactivity";
        }
        if (uri.includes("intent://watch.amazon.com") || uri.includes("amazon.com")) {
            return "com.amazon.amazonvideo.livingroom/com.amazon.ignition.IgnitionActivity";
        }
        if (uri.includes("www.disneyplus.com")) {
            return "com.disney.disneyplus/com.bamtechmedia.dominguez.main.MainActivity";
        }
        if (uri.includes("play.max.com")) {
            return "com.wbd.stream/com.wbd.beam.BeamActivity";
        }
        if (uri.includes("component=com.britbox.us")) {
            return "com.britbox.tv/axis.androidtv.sdk.app.MainActivity";
        }
        // FIXME: needs more details
        if (uri.includes("www.pbs.org")) {
            return "com.pbs.video/.ui.main.activities.StartupActivity";
        }
        // FIXME: needs more details
        if (uri.includes("starz")) {
            return "com.bydeluxe.d3.android.program.starz/com.starz.amznfiretv.SplashActivity";
        }
        return null;
    }
    async pushButton(button) {
        let keyEvent = "";
        switch(button) {
            case "up":
                keyEvent = "DPAD_UP";
                break;
            case "down":
                keyEvent = "DPAD_DOWN";
                break;
            case "left":
                keyEvent = "DPAD_LEFT";
                break;
            case "right":
                keyEvent = "DPAD_RIGHT";
                break;
            case "enter":
                keyEvent = "ENTER";
                break;
            case "home":
                keyEvent = "HOME";
                break;
            case "back":
                keyEvent = "BACK";
                break;                
            default: 
                console.log(`unknown button ${button}`);                
        }
        if (keyEvent === "") {
            return;
        }

        console.log(`pushing button ${keyEvent}`);
        const device = this.client.getDevice(this.remoteID);
        await device.shell(`input keyevent ${keyEvent}`);
    }
}
module.exports = new Adb();