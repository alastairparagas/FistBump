var myo = require('myo'),
    player = require('player'),
    colors = require('colors/safe'),
    
    spotifyAnalysis = require('./spotifyAnalysis');

/**
* Plays music given music information and myo sensor gestures
* @param musicInfo Array[Object] {
*   musicFileUrl,
*   musicName,
*   musicArtist,
*   echonestMusicId,
*   spotifyMusicId,
*   audioStats: {
*       energy,
*       danceability
*   }
*  }
*/
function myoDevice(preliminaryMusicInfo) {
    
    /**
    * Generate a tree of music information
    */
    function generateMusicTree(musicInfo) {
        return musicInfo.reduce(function (musicTree, musicObject) {
            // Energy levels of music
            if (musicObject.audioStats.energy > 0.8) {
                musicTree.strong.push(musicObject);
            } else if (musicObject.audioStats.energy > 0.3) {
                musicTree.medium.push(musicObject);
            } else if (musicObject.audioStats.energy > 0) {
                musicTree.soft.push(musicObject);
            }

            return musicTree;
        }, {
            soft: [],
            medium: [],
            strong: []
        });
    }
    
    var musicTree = generateMusicTree(preliminaryMusicInfo), 
        spotifyDataRepull = setInterval(function () {
            spotifyAnalysis().then(function (newMusicInfo) {
                musicTree = generateMusicTree(newMusicInfo);
            });
        }, 61000);

    if (myo.myos.length === 0) {
        myo.connect('com.alastair.fistBump');
    }
    
    
    /**
    *   Calculates the gyroscope intensity
    *   @param gyroscope Object - x, y and z movement of gyroscope
    */
    function calculateGyroIntensityScore(gyroscope) {
        if (!gyroscope) {
            return 0;
        }
        if (!("x" in gyroscope) && !("y" in gyroscope) && !("z" in gyroscope)) {
            return 0;
        }
        
        return Math.abs(gyroscope.x) + Math.abs(gyroscope.y) + Math.abs(gyroscope.z);
    }
    
    
    /* 
        The algorithm that calculates the music intensity label to give off 
        based on the intensity of the myo armband movements
        @returns String - Either "soft", "medium" or "strong"
    */
    function calculateImuDataCategory(latestImuData) {
        var gyroscope = latestImuData.gyroscope, 
            gyroIntensityScore = calculateGyroIntensityScore(gyroscope);
        
        if (gyroIntensityScore >= 700 && musicTree.strong.length > 0) {
            return "strong";
        } else if (gyroIntensityScore >= 50 && musicTree.medium.length > 0) {
            return "medium";
        }
        
        return "soft";
    }
    
    var imuDataCategory,    // "soft", "medium", "strong" 
        latestImuData,      // {}
        intervalRef,        // Timer reference
        playerRef;

    myo.on('connected', function () {
        imuDataCategory = "soft";
        console.log(colors.yellow('Myo connected -->'));
        intervalRef = setInterval(function () {
            var newImuDataCategory = calculateImuDataCategory(latestImuData);
            latestImuData = 0;
            
            if (newImuDataCategory === imuDataCategory) {
                return;
            }
            
            if (playerRef) {
                playerRef.stop();
                imuDataCategory = newImuDataCategory;
            }
            
            var nextSongIndexToPlay = Math.floor(Math.random() * musicTree[imuDataCategory].length),
                nextSongToPlay = musicTree[imuDataCategory][nextSongIndexToPlay];
            
            console.log(colors.yellow(imuDataCategory + " - Playing song " + 
                                      nextSongToPlay.musicName + " by " + 
                                      nextSongToPlay.musicArtist));
            
            playerRef = new player(nextSongToPlay.musicFileUrl);
            playerRef.on('error', function () {});
            playerRef.play();
        }, 7000);
    });
    myo.on('disconnected', function () {
       imuDataCategory = "soft";
        clearInterval(intervalRef);
        clearInterval(spotifyDataRepull);
    });
    myo.on('imu', function (imuData) {
        if (!latestImuData || 
            calculateGyroIntensityScore(latestImuData.gyroscope) <= 
            calculateGyroIntensityScore(imuData.gyroscope)) {
            latestImuData = imuData;
        }
    });

}

module.exports = exports = myoDevice;