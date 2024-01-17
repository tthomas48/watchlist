TODO:
// so we do /checkin to record that something is watched
// so we really just need an episodes object
// it has a trakt_id, title, overview, season, number
// when we do a refresh we can check if the number of seasons/episodes has changed and then do a full refresh if so
// maybe for now do this on demand?
// then we push in the ability to search for updates?
// we want an alert for "New Season". Basically if every season up to the last is watched and the last is not?
// we want an alert for "New Episodes". Basically when we add new episodes to the seasone we should get a new episodes
// create a persistent alerts table that can be used to add alerts and clear them

Can we work with this:
https://github.com/trakt-tools/universal-trakt-scrobbler
Is this too hard to use? Maybe not? Can we get better data back from 

A movie can be marked as watched.
A show can have current episodes etc.

Add the ability to mark an episode as watched. Add a checkbox for "mark all up to this epsiode as watched".
Add the ability to hide automatically if all the episodes are watched. Do this on refresh.
Can we then figure out per provider how to add episodes?

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