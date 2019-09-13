# diak-timetable-sync

[![Build Status](https://travis-ci.com/AirPett/diak-timetable-sync.svg?branch=master)](https://travis-ci.com/AirPett/diak-timetable-sync) [![GitHub](https://img.shields.io/github/license/airpett/diak-timetable-sync)](LICENSE) ![GitHub last commit](https://img.shields.io/github/last-commit/airpett/diak-timetable-sync)

Sync DIAK timetable to Google Calendar.

This Node.js application synchronizes your DIAK timetable to a selected Google Calendar once a day. This way you can easily have your timetable available at all times without having to struggle with lukujarjestykset.diak.fi.

## Getting started

These instructions will get you a copy of the project up and running in a docker container on your local machine

### Install and start using Docker

```bash
sudo docker run -it --mount type=bind,source=,target=/config airpett/diak-timetable-sync:latest-amd64
```

On first start, you will be prompted to authorize access to your Google Calendar:

1. Browse to the provided URL in your web browser.
2. Click the Accept button.
