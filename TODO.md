TODO:
* max urls from trakt.tv can be used directly
http://play.max.com/show/64e28eee-b3cc-4e08-b071-5a795b911dd2
http://www.max.com/shows/our-flag-means-death/86312320-8f2e-4b45-b06f-376224def821
* maybe with hulu?
http://www.hulu.com/series/52c074a7-5680-4f60-9b7e-a6008238207d
* maybe with peacocktv?
http://www.peacocktv.com/stream-tv/fight-night-the-million-dollar-heist
* maybe with amazon?
http://www.amazon.com/dp/B0B8QRH6YG
* maybe with netflix?
http://www.netflix.com/title/81677257 
* maybe with disneyplus?
http://www.disneyplus.com/series/percy-jackson-and-the-olympians/ql33aq42HBdr
https://www.disneyplus.com/series/details/ql33aq42HBdr
* maybe with appleplus
http://tv.apple.com/show/umc.cmc.apzybj6eqf6pzccd97kev7bs


Note these all have http rather than https?

Maybe add a bookmarklet that can add a show if you go to it on a website.
Add the ability to mark as completely watched, and check for new episodes
MUI has ratings - we could add that feature

Later
* Allow configuring different databases
* Allow not using trakt.tv
* Add more info on how to setup trakt.tv for auth
* Investigate if the adb code can be moved into the browser. 
    * There's no reason a server instance couldn't be shared between multiple unrelated user accounts.


  Scrobbling:

  dumpsys media_session | grep PlaybackState

# this lists all the url endpoints
 dumpsys package com.hulu.livingroomplus

#
dumsys statusbar seems to do a good job of showin what's playing