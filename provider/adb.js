const ADB = require('@devicefarmer/adbkit');

class Adb {
    async init() {
        this.client = ADB.Adb.createClient();
        this.remoteID = await this.client.connect('192.168.86.21', 5555);
    }
    async play(uri) {        
        try {
            console.log(uri);
            const component = this.getComponent(uri);
            // const cmd = 'am start -a android.intent.action.VIEW -d https://www.netflix.com/title/70264888 -f 0x10808000 -e source 30 com.netflix.ninja/.MainActivity';
            const device = this.client.getDevice(this.remoteID);
            let result = await device.shell("input keyevent MENU");
            console.log(`Waiting on menu ${result}`);

            result = await device.startActivity({
                action: 'android.intent.action.VIEW',
                data: uri,
                wait: true,
                flags: 0x10808000,
                extras: [
                    {key: 'source', value: 30}
                ],
                component,
            });
            return result;
        } catch(e) {
            console.error(e);
        }
    }
    getComponent(uri) {
        // detect compponent type
        if (uri.startsWith("intent://tv.apple.com")) {
            return "com.apple.atve.androidtv.appletv/.MainActivity";
        }
        if (uri.startsWith("intent://www.netflix.com/")) {
            return "com.netflix.ninja/.MainActivity";
        }
        return "unknown";
        // com.disney.disneyplus/com.bamtechmedia.dominguez.main.MainActivity
        // com.discovery.discoveryplus.androidtv/com.discovery.plus.presentation.activities.TVSplashActivity
        // com.hulu.livingroomplus/.WKFactivity

        //  com.hulu.livingroomplus/.MainActivity
        // com.amazon.amazonvideo.livingroom/com.amazon.ignition.IgnitionActivity
        // com.pbs.video/.ui.main.activities.StartupActivity
        //  eu.hbogo.androidtv.production/eu.hbogo.androidtv.MainActivity
        // com.plexapp.android/com.plexapp.plex.activities.SplashActivity
    }
}
module.exports = new Adb();