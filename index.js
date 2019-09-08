const fs = require('fs');
const uuid = require('uuid');
const request = require('request');
const moment = require('moment');
const cron = require('cron').CronJob;
const readlineSync = require('readline-sync');
const {google} = require('googleapis');

// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_FILE = 'token.json';

// File to store client secrets. Get file from 
// https://developers.google.com/calendar/quickstart/nodejs
const CREDENTIALS_FILE = 'credentials.json';
const CREDENTIALS = loadCredentials();

// Authorization scopes
const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

let oAuth2Client = authorize();
console.log(oAuth2Client);

// File to hold config, i.e. selected Google calendar for timetable
const CONFIG_FILE = 'config.json';
let config = loadConfig();

var timetableSyncTask = new cron('00 00 01 * * *', function() {
  console.log(getLogTime() + ' [CRON] Timetable sync initiated');
  syncTimetable();
}, null, true, 'Europe/Helsinki');
console.log(getLogTime() + ' [CRON] Timetable sync task started');

function syncTimetable() {
  let timetableData = getTimeTableData();
  let currentCalendarEvents = getCurrentCalendarEvents();
}

function getTimeTableData() {
}

function getCurrentCalendarEvents(calendarId) {
}

function getCalendars() {
  const calendar = google.calendar({
    version: 'v3',
    auth: 'AIzaSyDoOlYwOPLV6WiUmthVLWuqpvwOYu27bOU'
  });

  calendar.calendarList.list()
    .then((result) => {
      console.log(result);
    }).catch((e) => {
      error(e);
    });
}

function selectCalendar() {
  const calendars = getCalendars();
}

function loadConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    error(CONFIG_FILE + ' missing! Please add the required configuration '
      + 'file and try again!');
  } else {
    const conf = JSON.parse(fs.readFileSync(CONFIG_FILE));
    /*if (conf.apiKey === undefined || conf.apiKey == '') {
      error('API key missing in configuration file! Please add your Google '
        + 'Calendar API key to ' + confFilePath + 'and try again');
    }*/
    if (conf.calendarId === undefined || conf.calendarId == '') {
      conf.calendarId = selectCalendar();
    }
    return conf;
  }
}

function loadCredentials() {
  if (!fs.existsSync(CREDENTIALS_FILE)) {
    error(CREDENTIALS_FILE + ' missing! Please add the required '
      + 'credentials file and try again!');
  } else {
    return JSON.parse(fs.readFileSync(CREDENTIALS_FILE));
  }
}

async function authorize() {
  const {client_secret, client_id, redirect_uris} = CREDENTIALS.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  if (fs.existsSync(TOKEN_FILE)) {
    oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_FILE)));
    return oAuth2Client;
  } else {
    return await getAccessToken(oAuth2Client);
  }
}

async function getAccessToken(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  
  console.log(getLogTime() + ' [AUTH] Authorize this app by visiting this url: ', authUrl);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const code = readlineSync.question('Enter the code from that page here: ');
  const {tokens} = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens));

  return oAuth2Client;
}

function getLogTime() {
  return moment().format('DD.MM.YYYY HH:mm:ss')
}

function error(message) {
  console.log(getLogTime() + ' [ERROR] ' + message);
  process.exit(1);
}
