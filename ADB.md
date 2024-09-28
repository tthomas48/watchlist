# ADB Stuff
## get current activity
- dumpsys activity | grep -E 'mCurrentFocus|mFocusedApp'
- dumpsys activity activities
- dumpsys package com.pbs.video 
- More activities, etc:
  https://github.com/selfhostedshow/wiki/blob/81eacbd9352602244787866da71056faec667ae2/docs/home-automation/home-assistant/supervisor-addons/android-debug-bridge/adb.md?plain=1#L99

# Some test URLS
  am start -a android.intent.action.VIEW -d https://www.netflix.com/title/70264888 -f 0x10808000 -e source 30 com.netflix.ninja/.MainActivity
  am start -a android.intent.action.VIEW -d https://www.netflix.com/title/70264888 -f 0x10808000 -e source 30 com.netflix.mediaclient.ui.launch.UIWebViewActivity
  am start -a android.intent.action.VIEW -d https://www.hulu.com/watch/c6ebcc8a-ed80-4bc9-9d31-31b0f0bf9798
  am start -a android.intent.action.VIEW -d https://tv.apple.com/us/show/the-afterparty/umc.cmc.5wg8cnigwrkfzbdruaufzb6b0
  // https://www.netflix.com/browse?jbv=80986854
  am start -a android.intent.action.VIEW -d https://www.netflix.com/title/80986854

https://www.amazon.com/gp/video/detail/B0BYZ8NQTC/ref=atv_dp_share_cu_r / https://watch.amazon.com/detail?asin=B0BYZ8NQTC
https://tv.apple.com/us/show/the-afterparty/umc.cmc.5wg8cnigwrkfzbdruaufzb6b0 / https://tv.apple.com/us/show/the-afterparty/umc.cmc.5wg8cnigwrkfzbdruaufzb6b0
// amc uses a custom intent
https://www.hulu.com/series/0b10c46a-12f0-4357-8a00-547057b49bac / https://www.hulu.com/series/0b10c46a-12f0-4357-8a00-547057b49bac
// SNL
deeplinkData=%7B%22providerSeriesId%22%3A%228885992813767211112%22%2C%22type%22%3A%22SERIES%22%2C%22action%22%3A%22PDP%22%7D
https://www.peacocktv.com/deeplink?deeplinkData%3D%7B%22providerSeriesId%22%3A%22https%3A%2F%2Fwww.peacocktvcom%2Fwatch%2Fasset%2Ftv%2Fsaturday-night-live%2F8885992813767211112%22%2C%22type%22%3A%22SERIES%22%2C%22action%22%3A%22PDP%22%7D

  //
  // Hulu - I want the series URL - https://www.hulu.com/series/c6ebcc8a-ed80-4bc9-9d31-31b0f0bf9798 or https://www.hulu.com/movie/34fdd2c6-dd92-4440-ae64-4c820e476978
  // Disney - https://www.disneyplus.com/series/never-say-never-with-jeff-jenkins/6Qsx2pH8tIly

     https:
        b653eb5 com.roku.web.trc/.MainActivity filter a5b0bb
          Action: "android.intent.action.VIEW"
          Category: "android.intent.category.DEFAULT"
          Category: "android.intent.category.BROWSABLE"
          Scheme: "https"
          Authority: "therokuchannel.roku.com": -1
          AutoVerify=true