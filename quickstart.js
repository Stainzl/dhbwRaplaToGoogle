var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var jsonQuery = require('json-query');
var request = require('request');
var cheerio = require('cheerio');
var dateFormat = require('dateformat');

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/calendar-nodejs-quickstart.json
var SCOPES = ['https://www.googleapis.com/auth/calendar'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'calendar-nodejs-quickstart.json';
// Load client secrets from a local file.

function loadTable(response, auth) {
    request({
        uri: "https://rapla.dhbw-stuttgart.de/rapla?key=txB1FOi5xd1wUJBWuX8lJhGDUgtMSFmnKLgAG_NVMhC8Gu9-6yMIGKvQs4ec02Ag"
    }, function (error, response, body) {
        if (error === null) {
            var $ = cheerio.load(body);
            $(".tooltip").each(function () {
                var days = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
                var datesplit = this.children[2].children[0].data.split(" ");
                var date = [];
                var timesplit = [];
                if (datesplit[2] !== "wöchentlich") {
                    date = datesplit[1].split(".");
                    date[2] = "20"+date[2];
                    timesplit = datesplit[2].split("-");
                }
                else{
                    timesplit = datesplit[1].split("-");
                    var dateObj = new Date();
                    var index = days.indexOf(datesplit[0]);
                    dateObj.setDate(dateObj.getDate() + (index - dateObj.getDay()));
                    date[2] = dateObj.getFullYear();
                    date[1] = dateObj.getMonth()+1;
                    date[0] = dateObj.getDate();
                    console.log("wöchentliches Event");
                }
                var starttime = timesplit[0].split(":");
                var endtime = timesplit[1].split(":");
                var start = new Date(date[2], date[1] - 1, date[0], starttime[0], starttime[1]);
                var end = new Date(date[2], date[1] - 1, date[0], endtime[0], endtime[1]);
                saveToG(this.children[4].children[0].children[0].children[3].children[0].data, start, end, auth);
            });
        }
        else {
            console.log(error)
        }
    });
}

function loadFromG(auth){
    var calendar = google.calendar("v3");
    calendar.events.list({
        auth: auth,
        calendarId: '666obp6ro6slnc0346ol54vook@group.calendar.google.com',
        timeMin: (new Date()).toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime'
    }, function(err, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        }
        loadTable(response, auth);
    });
}

function saveToG(name, start, end, auth){
    var calendar = google.calendar('v3');
    var event = {
        'summary': name,
        'start': {
            'dateTime': dateFormat(start, "isoDateTime"),
            'timeZone': 'Europe/Berlin'
        },
        'end': {
            'dateTime': dateFormat(end, "isoDateTime"),
            'timeZone': 'Europe/Berlin'
        }
    };
    console.log(event);
    calendar.events.insert({
        auth: auth,
        calendarId: '666obp6ro6slnc0346ol54vook@group.calendar.google.com',
        resource: event
    }, function(err, event) {
        if (err) {
            console.log('There was an error contacting the Calendar service: ' + err);
            return;
        }
        console.log('Event created: %s', event.htmlLink);
    });
}

fs.readFile('client_secret.json', function processClientSecrets(err, content) {
  if (err) {
    console.log('Error loading client secret file: ' + err);
    return;
  }
  // Authorize a client with the loaded credentials, then call the
  // Google Calendar API.
  authorize(JSON.parse(content), loadFromG);
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

/**
 * Lists the next 10 events on the user's primary calendar.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listEvents(auth) {
  var calendar = google.calendar('v3');
  var event = {
      'summary': 'Google I/O 2015',
      'start': {
          'dateTime': '2017-12-13T09:00:00-07:00',
          'timeZone': 'Europe/Berlin'
      },
      'end': {
          'dateTime': '2017-12-13T17:00:00-07:00',
          'timeZone': 'Europe/Berlin'
      }
  };
  /*calendar.events.insert({
      auth: auth,
      calendarId: '666obp6ro6slnc0346ol54vook@group.calendar.google.com',
    resource: event
  }, function(err, event) {
      if (err) {
          console.log('There was an error contacting the Calendar service: ' + err);
          return;
      }
      console.log('Event created: %s', event.htmlLink);
  });*/
  calendar.events.list({
    auth: auth,
    calendarId: '666obp6ro6slnc0346ol54vook@group.calendar.google.com',
    timeMin: (new Date()).toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime'
  }, function(err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
      return;
    }
    var events = response.items;
    if (events.length === 0) {
      console.log('No upcoming events found.');
    } else {
      var filtered = jsonQuery("[*summary=test]",{"data": events}).value;
      console.log('Upcoming 10 events:');
      for (var i = 0; i < filtered.length; i++) {
        var event = filtered[i];
        var start = event.start.dateTime || event.start.date;
        //console.log("\n\n\n");
        console.log('%s - %s', start, event.summary);
        //console.log(event);
      }
    }
  });
}

