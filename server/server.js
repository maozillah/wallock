var fs = require('fs');
var path = require('path');
var express = require('express');
var bodyParser = require('body-parser');
var app = express();

var COMMENTS_FILE = path.join(__dirname, 'comments.json');

app.set('port', (process.env.PORT || 3000));

app.use('/', express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(function(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache');
    next();
});

app.get('/api/comments', function(req, res) {
    // when this route is called
    fs.readFile(COMMENTS_FILE, function(err, data) {
        if (err) {
            console.error(err);
            process.exit(1);
        }
        res.json(JSON.parse(data));
    });
});

// write to json file
app.post('/api/comments', function(req, res) {
    fs.readFile(COMMENTS_FILE, function(err, data) {
        if (err) {
            console.error(err);
            process.exit(1);
        }
        var comments = JSON.parse(data);

        var newComment = {
            id: Date.now(),
            locName: req.body.locName,
            lat: req.body.lat,
            long: req.body.long
        };

        comments.push(newComment);
        fs.writeFile(COMMENTS_FILE, JSON.stringify(comments, null, 4), function(err) {
            if (err) {
                console.error(err);
                process.exit(1);
            }
            res.json("location saved!");
        });
    });
});

app.post('/api/checkLocation', function(req, res) {
    var currentLat = req.body.currentLat;
    var currentLong = req.body.currentLong;
    var savedLat, savedLong;


    var result = false;

    fs.readFile(COMMENTS_FILE, function(err, data) {
        if (err) {
            console.error(err);
            process.exit(1);
        }
        var locations = JSON.parse(data);

        for (i = 0; i < locations.length; i++) {

          savedLat = locations[i].lat;
          savedLong = locations[i].long;

          // savedLat = 43.4675599;
          // savedLong = -79.6919376;

            if( Math.sqrt( Math.pow( savedLat - currentLat, 2) + Math.pow(savedLong - currentLong, 2) ) 
              <= 0.001){
                result= true;
            } 
        }

        res.json(result);
    });

});

app.listen(app.get('port'), function() {
    console.log('Server started: http://localhost:' + app.get('port') + '/');
});