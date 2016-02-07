# FistBump
Use the Myo Armband to detect your activity level and play a similarly active song on your Spotify playlist

## Behind the scenes...
I was actually at a loss for ideas and teammates when I started on this project. I also started this project relatively late, at 8:00PM of Saturday evening. I was glad to have been able to churn out the amount of code I had and make this project work.

## A more specific description
FistBump runs on your terminal. It accesses your Spotify Playlist, uses the Echonest music analysis engine to understand the "brutality" and "hype" of the music in your Spotify Playlist and then, based on the gyrometer reading on your Myo armband, it fluctuates between "soft", "medium" and "hard" music categories. It's quite ridiculous.

## Technologies used
* Spotify API
* Echonest API
* Myo Armband

## Credentials
Credentials are in `config.js`. It's bad practice to commit them on a Git repo. However, this is a Hackathon - this is war.