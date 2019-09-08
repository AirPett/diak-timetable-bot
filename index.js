const fs = require('fs');
const util = require('util');
const uuid = require('uuid');
const request = require('request');
const moment = require('moment');
const cron = require('cron').CronJob;
const readline = require('readline');
const {google} = require('googleapis');

// Create reader for command line input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify legacy functions
fs.readFile = util.promisify(fs.readFile);
fs.writeFile = util.promisify(fs.writeFile);

rl.question[util.promisify.custom] = (question) => {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
};

// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_FILE = 'token.json';

// File to store client secrets. Get file from 
// https://developers.google.com/calendar/quickstart/nodejs
const CREDENTIALS_FILE = 'credentials.json';

// Authorization scopes
// If modifying these scopes, delete token.json.
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events'
];

// File to hold config, i.e. selected Google calendar for timetable
const CONFIG_FILE = 'config.json';
let config = loadConfig();

var timetableSyncTask = new cron('00 00 01 * * *', function() {
  console.log(getLogTime() + ' [CRON] Timetable sync initiated');
  syncTimetable();
}, null, true, 'Europe/Helsinki');
console.log(getLogTime() + ' [CRON] Timetable sync task started');

// ============================================================================

function syncTimetable() {
  let timetableData = getTimeTableData();
  let currentCalendarEvents = getCurrentCalendarEvents();
}

function getTimeTableData() {
}

function getCurrentCalendarEvents(calendarId) {
}

async function getCalendars() {
  const oAuth2Client = await authorize();

  const calendar = google.calendar({
    version: 'v3',
    auth: oAuth2Client
  });

  try {
    return (await calendar.calendarList.list()).data.items;
  } catch(e) {
    error(e);
  }
}

async function selectCalendar() {
  const calendars = await getCalendars();
  console.log(calendars);
}

async function loadConfig() {
  let conf = {};

  try {
    conf = JSON.parse(await fs.readFile(CONFIG_FILE));

    if (conf.calendarId === undefined || conf.calendarId == '') {
      conf.calendarId = await selectCalendar();
    }
  } catch(e) {
    if (e.code == 'ENOENT') {
      conf.calendarId = await selectCalendar();
    } else {
      error(e);
    }
  }

  return conf;
}

async function loadCredentials() {
  try {
    return JSON.parse(await fs.readFile(CREDENTIALS_FILE));
  } catch(e) {
    error(e);
  }
}

async function authorize() {
  const {client_secret, client_id, redirect_uris} = (await loadCredentials()).installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  try {
    oAuth2Client.setCredentials(JSON.parse(await fs.readFile(TOKEN_FILE)));
    return oAuth2Client;
  } catch(e) {
    return await getAccessToken(oAuth2Client);
  }
}

async function getAccessToken(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  
  console.log(getLogTime() + ' [AUTH] Authorize this app by visiting this url: ', authUrl);

  const code = await util.promisify(rl.question)(getLogTime() + ' [AUTH] Enter'
    + ' the code from that page here: ');
  let tokens;
  try {
    tokens = (await oAuth2Client.getToken(code)).tokens;
  } catch(e) {
    error(e);
  }
  
  oAuth2Client.setCredentials(tokens);
  
  try {
    fs.writeFile(TOKEN_FILE, JSON.stringify(tokens));
  } catch(e) {
    error(e);
  }

  return oAuth2Client;
}

function getLogTime() {
  return moment().format('DD.MM.YYYY HH:mm:ss')
}

function error(message) {
  console.error(getLogTime() + ' [ERROR] ' + message);
  process.exit(1);
}
