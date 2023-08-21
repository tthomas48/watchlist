const ADB = require('@devicefarmer/adbkit');

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
        // '192.168.86.21', 5555
    }
    async disconnect() {
        if (this.host && this.port) {
            await this.client.disconnect(this.host, this.port);
        }
    }
    async play(uri, attempt = 0) {
        try {
            console.log(uri);
            const component = this.getComponent(uri);
            const data = this.getData(uri);
            const extras = [{key: 'source', value: 30}];
            this.addExtras(extras, uri);
            // const cmd = 'am start -a android.intent.action.VIEW -d https://www.netflix.com/title/70264888 -f 0x10808000 -e source 30 com.netflix.ninja/.MainActivity';
            const device = this.client.getDevice(this.remoteID);
            // let result = await device.shell("input keyevent MENU");
            // console.log(`Waiting on menu`, result);

            // const isRunningStream = await device.shell(`dumpsys activity activities | grep ${component}`);
            // const isRunningOutput = await ADB.Adb.util.readAll(isRunningStream);
            // console.log('*****');
            // console.log(component, isRunningOutput.length);
            // console.log('*****');
            // if (isRunningOutput.length === 0) {
                // so I only want to start the activity if it's not already running
                // otherwise I want to just send the intent using am start

                // adb shell am start
                var options = {
                    action: 'android.intent.action.VIEW',
                    category: 'android.intent.category.LEANBACK_LAUNCHER',
                    data,
                    wait: true,
                    flags: 0x10808000,
                    extras,
                    component,
                };
                let result = await device.startActivity(options);
                console.log(result);
            // }
            // the activity should be running, and this lets us reuse an open activity that is potentially
            // already logged in
            // console.log(`am start -a android.intent.action.VIEW -d ${uri}`);
            // const result = await device.shell(`am start -a android.intent.action.VIEW -d ${uri}`);
            return result;
        } catch(e) {
            console.error(e);
            if (attempt == 0 && String(e).includes("not found")) {
                return this.play(uri, 1);
            }            
        }
    }
    addExtras(extras, uri) {
        if (uri.includes("www.netflix.com/")) {
            const id = uri.replace(/.*\/title\/([0-9]+)/, "$1");
            extras.push({"key": "amzn_deeplink_data", "value": id})
        } 
    }
    getData(uri) {
        if (uri.includes("www.amcplus.com")) {
            return uri.replace(/.*-([0-9]+)/, "$1");
        }
        if (uri.includes("www.netflix.com/")) {
            const id = uri.replace(/.*\/title\/([0-9]+)/, "$1");
            return `"netflix://title/${id}"`;
        }
        
        return uri;
    }
    getComponent(uri) {
        if (String(uri).length === 0) {
            return "unknown";
        }
        // detect compponent type
        if (uri.startsWith("intent://tv.apple.com")) {
            return "com.apple.atve.androidtv.appletv/.MainActivity";
        }
        if (uri.includes("www.netflix.com/")) {
            return "com.netflix.ninja/.MainActivity";
        }
        if (uri.startsWith("intent://www.peacocktv.com/")) {
            return "com.peacocktv.peacockandroid/com.peacock.peacocktv.GoogleMainActivity";
        }
        if (uri.includes("www.amcplus.com")) {
            return "com.amcplus.amcandroidtv/com.amcplus.tv.MainActivity";
        }
        if (uri.includes("package=com.hulu.livingroomplus") || uri.includes("www.hulu.com")) {
            return "com.hulu.livingroomplus/.WKFactivity";
        }
        if (uri.includes("intent://watch.amazon.com") || uri.includes("watch.amazon.com")) {
            return "com.amazon.amazonvideo.livingroom/com.amazon.ignition.IgnitionActivity";
        }
        if (uri.includes("intent://www.disneyplus.com/")) {
            return "com.disney.disneyplus/com.bamtechmedia.dominguez.main.MainActivity";
        }
        if (uri.includes("intent://play.max.com/") || uri.includes("play.max.com")) {
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
        return "unknown";
    }
}
module.exports = new Adb();