var spotifyWebApiNode = require('spotify-web-api-node'), 
    prompt = require('prompt'),
    request = require('request'),
    querystring = require('querystring'),
    lodash = require('lodash'),
    
    config = require('./config');

// Initialize Spotify JS Client API
var spotifyApi = new spotifyWebApiNode({
    clientId: config.Spotify.clientId,
    clientSecret: config.Spotify.clientSecret,
    redirectUri: config.Spotify.redirectUri
});


/**
* Picks up a person's Spotify list of music and does Echonest analysis
* @return Promise object
*/
function spotifyAnalysis() {

    // A promise that must end up providing an access code
    var accessTokenPromise;

    if (!config.code || !spotifyApi.getAccessToken()) {
        // No access code stored in config? Prompt the user!
        accessTokenPromise = new Promise(function (resolve, reject) {
            var authorizationUrl = spotifyApi.createAuthorizeURL([
                'playlist-read-private', 
                'streaming', 
                'user-read-private', 
                'user-read-email',
                'user-library-read',
                'user-follow-read'
            ]);
            console.log("Get the access code from: " + authorizationUrl);

            prompt.start();
            prompt.get(['accessCode'], function (err, result) {
                if (err) {
                    return reject(err);
                }
                resolve(result.accessCode);
            });
        });
    } else {
        // Access code in config? Use it!
        accessTokenPromise = new Promise(function (resolve, reject) {
            resolve(config.code);
        });
    }

    // Obtain current user's access and refresh token
    return accessTokenPromise.then(function (accessCode) {
        return spotifyApi.authorizationCodeGrant(accessCode);
    }, function (error) {
        console.log("Could not get access code from prompt. " + error);
    })

    // Obtain current user's Spotify Playlist
    .then(function (data) {
        spotifyApi.setAccessToken(data.body.access_token);
        spotifyApi.setRefreshToken(data.body.refresh_token);

        return spotifyApi.getMySavedTracks();
    }, function (error) {
        console.log("Could not get access tokens from access code. " + error);
    })
    
    // Do Echonest Music Analysis on Spotify Playlist
    .then(function (data) {

        return Promise.all(data.body.items.reduce(function (trackPromisesList, trackObject) {
            var musicPreviewUrl = trackObject.track.preview_url,
                musicName = trackObject.track.name,
                musicArtist = trackObject.track.artists[0].name,
                spotifyMusicId = trackObject.track.id;

            // The music has a preview url - let's use it!
            if (musicPreviewUrl && trackPromisesList.length < 10) {
                trackPromisesList.push(new Promise(function (resolve, reject) {
                    request.get({
                        url: 'http://developer.echonest.com/api/v4/song/search',
                        qs: {
                            api_key: config.Echonest.apiKey, 
                            artist: musicArtist,
                            title: musicName,
                        }
                    }, function (err, httpResponse, body) {
                        var apiOutput = JSON.parse(body),
                            echonestMusicId =  (apiOutput.response.songs[0] && apiOutput.response.songs[0].id) || 0;

                        if (err instanceof Error) {
                            return reject(err);
                        }
                        if (apiOutput.response.status.message !== "Success") {
                            return reject(new Error(apiOutput.response.status.message));
                        }

                        resolve({
                            musicFileUrl: musicPreviewUrl,
                            musicName: musicName,
                            musicArtist: musicArtist,
                            echonestMusicId: echonestMusicId,
                            spotifyMusicId: spotifyMusicId
                        });
                    });
                }));
            }

            return trackPromisesList;

        }, []));
    })
    .then(function (data) {

        return Promise.all(data.reduce(function (trackPromisesList, musicObject) {

            // The music has corresponding Echonest information - let's grab that information
            if (musicObject.echonestMusicId !== 0 && trackPromisesList.length < 10) {
                trackPromisesList.push(new Promise(function (resolve, reject) {
                    request.get({
                        url: 'http://developer.echonest.com/api/v4/song/profile',
                        qs: {
                            api_key: config.Echonest.apiKey,
                            id: musicObject.echonestMusicId,
                            bucket: "audio_summary"
                        }
                    }, function (err, httpResponse, body) {
                        var apiOutput = JSON.parse(body);
                        if (err) {
                            return reject(err);
                        }
                        if (apiOutput.response.status.message !== "Success") {
                            return reject(new Error(apiOutput.response.status.message));
                        }

                        resolve(lodash.merge(musicObject, {
                            audioStats: apiOutput.response.songs[0].audio_summary
                        }));
                    });
                }));
            }

            return trackPromisesList;
        }, []));
    });
    
}


module.exports = exports = spotifyAnalysis;