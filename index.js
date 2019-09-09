const fs = require('fs');
const util = require('util');
const uuid = require('uuid');
const requestMod = require('request');
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
request = util.promisify(requestMod);

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

const DIAK_BASE_URL = 'https://lukujarjestykset.diak.fi/muodostaKori.php?1=1&g[]=';
const DIAK_DATA_URL = 'https://lukujarjestykset.diak.fi/listData.php';

// File to hold config, e.g. selected Google calendar for timetable
const CONFIG_FILE = 'config.json';
let config;
loadConfig().then(conf => {
  config = conf;
  startScheduledTasks();
  syncTimetable();
});

// ============================================================================

async function syncTimetable() {
  console.log(getLogTime() + ' [SYNC] Timetable sync initiated!');

  let timetableData = await getTimetableData();
  if (timetableData.length  == 0) {
    console.log(getLogTime() + ' [SYNC] No timetable entries to sync!');
    return;
  }

  let currentCalendarEvents = await getCurrentCalendarEvents(config.calendarId,
    moment(timetableData[0].begin).startOf('day').format());

  let newEvents = [];

  for (const timetableEvent of timetableData) {
    if (!currentCalendarEvents.find(event =>
      event.start.dateTime == timetableEvent.begin
      && event.end.dateTime == timetableEvent.end
      && event.summary == timetableEvent.title)) {

      newEvents.push(timetableEvent);
    }
  }

  if (newEvents.length > 0) {
    await addCalendarEvents(newEvents, config.calendarId);
  } else {
    console.log(getLogTime() + ' [SYNC] No new events to create!');
  }

  console.log(getLogTime() + ' [SYNC] Timetable sync finished!');
}

async function getTimetableData() {
  let cookieJar = request.jar();
  
  const options = {
    url: DIAK_BASE_URL + config.group,
    jar: cookieJar,
    strictSSL: false
  };
  await request(options);

  const options2 = {
    url: DIAK_DATA_URL,
    jar: cookieJar,
    strictSSL: false
  };
  const timetableData = JSON.parse((await request(options2)).body).aaData;

  let timetableEntries = [];

  /*if (timetableData.length  == 0) {
    console.log(getLogTime() + ' [SYNC] No timetable entries to sync!');
    return timetableEntries;
  }*/

  for (const timetableRow of timetableData) {
    const timeParts = (timetableRow[2].split('&nbsp;')[1]).split(' ');
    const beginMoment = moment(timeParts[0] + ' ' + timeParts[2],
      'DD.MM.YY HH:mm').format();
    const endMoment = moment(timeParts[0] + ' ' + timeParts[4],
      'DD.MM.YY HH:mm').format();

    const timetableEntry = {
      dateTimeStart: timetableRow[1],
      begin: beginMoment,
      end: endMoment,
      title: timetableRow[3],
      location: timetableRow[4],
      id: timetableRow[5],
      groups: (timetableRow[6] != null) ? timetableRow[6] : [],
      teachers: (timetableRow[7] != null) ? timetableRow[7] : [],
      additionalInfo: timetableRow[8],
      smallGroups: timetableRow[9]
    };

    timetableEntries.push(timetableEntry);
  }

  return timetableEntries;
}

async function getCurrentCalendarEvents(calendarId, timeMin) {
  const oAuth2Client = await authorize();

  const calendar = google.calendar({
    version: 'v3',
    auth: oAuth2Client
  });

  try {
    return (await calendar.events.list({
      calendarId: calendarId,
      timeMin: timeMin,
      maxResults: 2500,
      singleEvents: true,
      orderBy: 'startTime'
    })).data.items;
  } catch(e) {
    error(e);
  }
}

async function addCalendarEvents(newEvents, calendarId) {
  for (const newEvent of newEvents) {
    addCalendarEvent(newEvent, calendarId);
  }
}

async function addCalendarEvent(newEvent, calendarId) {
  const oAuth2Client = await authorize();

  const calendar = google.calendar({
    version: 'v3',
    auth: oAuth2Client
  });

  let description = '';
  if (newEvent.teachers.length > 0) {
    description += 'Opettajat: ' + newEvent.teachers.join(', ');
  }
  if (newEvent.smallGroups != '') {
    description += '\nPienryhmÃt: ' + newEvent.smallGroups;
  }
  if (newEvent.id != '') {
    description += '\nTunnus: ' + newEvent.id;
  }
  if (newEvent.additionalInfo != '') {
    description += '\nLisÃtietoa: ' + newEvent.additionalInfo;
  }

  try {
    console.log(getLogTime() + ' [SYNC] Creating event: ' + newEvent.title
      + ' (' + newEvent.begin +  ' - ' + newEvent.end + ')');

    const event = {
      start: {
        dateTime: newEvent.begin
      },
      end: {
        dateTime: newEvent.end
      },
      summary: newEvent.title,
      description: description,
      location: newEvent.location
    };

    await calendar.events.insert({
      calendarId: calendarId,
      resource: event
    });
  } catch(e) {
    error(e);
  }
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

async function selectCalendar(conf) {
  const calendars = (await getCalendars()).filter(calendar =>
    calendar.accessRole == 'owner');

  for (const [index, calendar] of calendars.entries()) {
    console.log('[' + (index + 1) + '] ' + ((calendar.summaryOverride !== undefined)
      ? calendar.summaryOverride : calendar.summary));
  }

  let delectedCalendar;

  while (delectedCalendar === undefined) {
    try {
      delectedCalendar = calendars[parseInt(await util.promisify(rl.question)
        (getLogTime() + ' [CONFIG] Please enter the number of the calendar where '
          + 'you want to sync the timetable: ')) - 1];
      if (delectedCalendar === undefined) {
        console.log(getLogTime() + ' [CONFIG] That was an invalid calendar number!'
          + ' Please try again!');
      }
    } catch(e) {
      console.log(getLogTime() + ' [CONFIG] That was an invalid calendar number!'
        + ' Please try again!');
    }
  }

  return delectedCalendar.id;
}

async function selectGroup() {
  let selectedGroup;

  const regex = /[A-Z][0-9]{2}[A-z]+/;

  while (selectedGroup === undefined) {
    const group = await util.promisify(rl.question)
      (getLogTime() + ' [CONFIG] Please enter the group whose timetable you want'
        + 'to sync (e.g. A45sh)\nNOTE! The group name is case sensitive!: ');
    if (regex.test(group)) {
      selectedGroup = group;
    } else {
      console.log(getLogTime() + ' [CONFIG] That was an invalid group name!'
        + ' Please try again!');
    }
  }

  return selectedGroup;
}

async function loadConfig() {
  let conf = {};

  try {
    conf = JSON.parse(await fs.readFile(CONFIG_FILE));

    if (conf.calendarId === undefined || conf.calendarId == '') {
      conf.calendarId = await selectCalendar();
    }
    if (conf.group === undefined || conf.group == '') {
      conf.group = await selectGroup();
    }
  } catch(e) {
    if (e.code == 'ENOENT') {
      conf.calendarId = await selectCalendar();
      conf.group = await selectGroup();
    } else if (e == 'SyntaxError: Unexpected end of JSON input') {
      conf.calendarId = await selectCalendar();
      conf.group = await selectGroup();
    } else {
      error(e);
    }
  }

  try {
    await fs.writeFile(CONFIG_FILE, JSON.stringify(conf));
  } catch(e) {
    error(e);
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

function startScheduledTasks() {
  var timetableSyncTask = new cron('00 00 01 * * *', function() {
    syncTimetable();
  }, null, true, 'Europe/Helsinki');
  console.log(getLogTime() + ' [CRON] Timetable sync task started');
}

function getLogTime() {
  return moment().format('DD.MM.YYYY HH:mm:ss')
}

function error(message) {
  console.error(getLogTime() + ' [ERROR] ' + message);
  process.exit(1);
}
