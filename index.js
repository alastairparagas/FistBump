var myoDevice = require('./myoDevice'),
    spotifyAnalysis = require('./spotifyAnalysis'), 
    
    colors = require('colors/safe');

spotifyAnalysis().then(function (data) {
    myoDevice(data);
}, function (error) {
    console.log(colors.red('ERROR WITH SPOTIFY/ECHONEST ANALYSIS ---> ' + error));
});