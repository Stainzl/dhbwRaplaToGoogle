/*
(c) by Michael Schweiker
 */


var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var request = require('request');
var cheerio = require('cheerio');
var _ = require('lodash');

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/calendar-nodejs-quickstart.json
var SCOPES = ['https://www.googleapis.com/auth/calendar'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'calendar-nodejs-quickstart.json';

var same = [];
var config = {};

function loadTable(responseFromG, start, auth) {
    start.setDate(start.getDate() + 1);
    var innerStart = start;
    var url = "https://rapla.dhbw-stuttgart.de/rapla?key="+config.calendar_key
        +"&day="+start.getDate()+"&month="+(start.getMonth() + 1)+"&year="+start.getFullYear();
    request({
        uri: url
    }, function (error, response, body) {
        if (error === null) {
            var $ = cheerio.load(body);
            $(".tooltip").each(function () {
                var days = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
                var datesplit = this.children[2].children[0].data.split(" ");
                var date = [];
                var timesplit = [];
                if (datesplit[2] === "wöchentlich") {
                    timesplit = datesplit[1].split("-");
                    var dateObj = new Date(innerStart);
                    var index = days.indexOf(datesplit[0]);
                    dateObj.setDate(dateObj.getDate() + (index - dateObj.getDay()));
                    date[2] = dateObj.getFullYear();
                    date[1] = dateObj.getMonth() + 1;
                    date[0] = dateObj.getDate();
                }
                else if (datesplit[1] === "täglich"){
                    return;
                }
                else {
                    date = datesplit[1].split(".");
                    date[2] = "20" + date[2];
                    timesplit = datesplit[2].split("-");
                }
                var starttime = timesplit[0].split(":");
                var endtime = timesplit[1].split(":");
                var start = new Date(date[2], date[1] - 1, date[0], starttime[0], starttime[1]);
                var end = new Date(date[2], date[1] - 1, date[0], endtime[0], endtime[1]);
                saveToG(this.children[4].children[0].children[0].children[3].children[0].data, start, end, responseFromG, auth);
            });
            for(var i = 0; i < responseFromG.items.length; i++){
                if(same.indexOf(responseFromG.items[i].id)<0){
                    var calendar = google.calendar("v3");
                    console.log("Delete id",responseFromG.items[i].id);
                    calendar.events.delete({
                        auth: auth,
                        calendarId: config.g_cal,
                        eventId: responseFromG.items[i].id
                    },function (error, response){
                        if(error){
                            console.log(error);
                        }
                        console.log("responseFromDelete",response)
                    })
                }
            }
        }
        else {
            console.log(error)
        }
    });
}

function loadFromG(auth){
    var calendar = google.calendar("v3");
    var start = new Date();
    start.setDate(start.getDate() - start.getDay()-7);
    start.setHours(1, 0, 0, 0);
    for(var i=0; i<config.weeks; i++) {
        start.setDate(start.getDate() + (7));
        (function (start) {
            var end = new Date(start);
            end.setDate(end.getDate() + 7);
            calendar.events.list({
                auth: auth,
                calendarId: config.g_cal,
                timeMin: start.toISOString(),
                timeMax: end.toISOString(),
                singleEvents: true,
                orderBy: 'startTime'
            }, function (err, response) {
                if (err) {
                    console.log('The API returned an error: ' + err);
                    return;
                }
                loadTable(response, new Date(start), auth);
            });
        })(new Date(start));
    }
}

function isInG(event, list){
    var filtered = _.filter(list.items, function (object) {
        return event.summary === object.summary
            && event.start.dateTime === object.start.dateTime
            && event.end.dateTime === object.end.dateTime;
    });
    if(filtered.length === 1){
        same.push(filtered[0].id);
        return true;
    }
    return false;
}

function saveToG(name, start, end, existing, auth){
    var calendar = google.calendar('v3');
    start.setTime(start.getTime() + 60*60*1000);
    var startStr = start.toISOString();
    startStr = startStr.substring(0, startStr.length-5);
    end.setTime(end.getTime() + 60*60*1000);
    var endStr = end.toISOString();
    endStr = endStr.substring(0, startStr.length);
    var event = {};
    event = Object.assign(event, config.event);
    event.summary = name;
    event.start = {
        'dateTime': startStr+"+01:00",
        'timeZone': 'Europe/Berlin'
    };
    event.end = {
        'dateTime': endStr+"+01:00",
        'timeZone': 'Europe/Berlin'
    };
    if(!isInG(event, existing)) {
        calendar.events.insert({
            auth: auth,
            calendarId: config.g_cal,
            resource: event
        }, function (err, event) {
            if (err) {
                console.log('There was an error contacting the Calendar service: ' + err);
                return;
            }
            console.log('Event created: %s', event.htmlLink);
        });
    }
}

fs.readFile('client_secret.json', function processClientSecrets(err, content) {
  if (err) {
    console.log('Error loading client secret file: ' + err);
    return;
  }
  // Authorize a client with the loaded credentials, then call the
  // Google Calendar API.
    var secret = JSON.parse(content);
    fs.readFile('config.json', function (err, content) {
        if(err) {
            console.log('Error loading config: ' + err);
            return;
        }
        config = JSON.parse(content);
        authorize(secret, loadFromG);
    });
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  var clientSecret = credentials.installed.client_secret;
  var clientId = credentials.installed.client_id;
  var redirectUrl = credentials.installed.redirect_uris[0];
  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function(err, token) {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
      oauth2Client.credentials = JSON.parse(token);
      callback(oauth2Client);
    }
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {callback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function(code) {
    rl.close();
    oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token));
  console.log('Token stored to ' + TOKEN_PATH);
}
