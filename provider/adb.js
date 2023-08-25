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
        if (uri.includes("intent://watch.amazon.com") || uri.includes("watch.amazon.com")) {
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
        return "unknown";
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