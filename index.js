const fs = require('js');
const uuid = require('uuid');
const request = require('request');
const moment = require('moment');
const cron = require('cron').CronJob;

const confFilePath = 'config.json';

var timetableSyncTask = new cron('00 00 01 * * *', () => {
  console.log(getLogTime() + ' [CRON] Timetable sync initiated');
  syncTimetable();
});

const calendarId = loadCalendarId();

function syncTimetable() {
  let timetableData = getTimeTableData();
  let currentCalendarEvents = getCurrentCalendarEvents();
}

function getTimeTableData() {
}

function getCurrentCalendarEvents(calendarId) {
}

function getCalendars() {
}

function selectCalendar() {
}

function loadCalendarId() {
  if (!fs.existsSync(confFilePath)) {
    const calendarId = selectCalendar();
  } else {
    const conf = JSON.parse(fs.readFileSync(confFilePath));
    return conf.calendarId;
  }
}

function getLogTime() {
  return moment().format('DD.MM.YYYY HH:mm:ss')
}
