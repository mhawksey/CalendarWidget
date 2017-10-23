/*
/* To setup click Resources > Advanced Google Services and switch Calendar API 'on'. 
/* In the same dialog window click 'Google API console' and in the cosole click 
/* 'Enable APIs and Services' and search and enable the Calendar API.
/* From this Script Editor finally click Publish > Deploy > Deploy as web app..
*/

function doGet(e) { 
  var isOwner = (Session.getActiveUser().getEmail() === Session.getEffectiveUser().getEmail()) ? "true" : "false";
  if (e.parameters.page == 'options' && isOwner){
    var file = 'options';
  } else {
    var file = 'browser';
  }
  return HtmlService.createTemplateFromFile(file+'_action')
                    .evaluate().setTitle('Google Calendar for New Sites')
                    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function optionsSet(optionKey, optionValue){
  options.set(optionKey, optionValue);
}

function optionsGet(optionKey){
  return options.get(optionKey);
}

function fetchCalendars(optCache){
  var storage = {};
  storage['calendars'] = JSON.parse(CacheService.getScriptCache().get(options.OPTION_KEY_PREFIX_ + 'calendars'));
  if (storage['calendars'] && optCache){
    return {calendars:storage['calendars']};
  }
  storage['calendars'] = options.get(options.OPTION_KEY_PREFIX_ + 'calendars');  
  var data = Calendar.CalendarList.list();
  var calendars = {};
  var storedCalendars = storage['calendars'] || {};
  for (var i = 0; i < data.items.length; i++) {
    var calendar = data.items[i];
    // The list of calendars from the server must be merged with the list of
    // stored calendars. The ID is the key for each calendar feed. The title
    // and color provided by the server override whatever is stored locally
    // (in case there were changes made through the Web UI). Whether the
    // calendar is shown in the browser action popup is determined by a
    // user preference set set locally (via Options) and overrides the
    // defaults provided by the server. If no such preference exists, then
    // a calendar is shown if it's selected and not hidden.
    
    var serverCalendarID = calendar.id;
    var storedCalendar = storedCalendars[serverCalendarID] || {};
    
    var visible = (typeof storedCalendar.visible !== 'undefined') ?
        storedCalendar.visible : calendar.selected;
    
    var mergedCalendar = {
      id: serverCalendarID,
      title: calendar.summary,
      editable: calendar.accessRole == 'writer' || calendar.accessRole == 'owner',
      description: calendar.description || '',
      foregroundColor: calendar.foregroundColor,
      backgroundColor: calendar.backgroundColor,
      visible: visible
    };
    
    calendars[serverCalendarID] = mergedCalendar;
  }
  options.set(options.OPTION_KEY_PREFIX_ + 'calendars', calendars);
  CacheService.getScriptCache().put(options.OPTION_KEY_PREFIX_ + 'calendars', JSON.stringify(calendars), 3600);
  return {calendars:calendars};
}

function getEvents(optCache){
  var storage = fetchCalendars(optCache);
  var calendars = storage['calendars'] || {};  
  var hiddenCalendars = [];
  var allEvents = [];
  var pendingRequests = 0;
  for (var calendarURL in calendars) {
    var calendar = calendars[calendarURL] || {};
    if (typeof calendar.visible !== 'undefined' && calendar.visible) {
      pendingRequests++;
      //feeds.fetchEventsFromCalendar_(calendar, function(events) {
      var events = fetchEventsFromCalendar_(calendar, optCache);
        // Merge events from all calendars into a single array.
        if (events) {
          // events can be undefined if the calendar fetch resulted in an HTTP error.
          allEvents = allEvents.concat(events);
        }
        
        if (--pendingRequests === 0) {
          allEvents.sort(function(first, second) {
            return first.start - second.start;
          });
          feeds.events = allEvents;
          //feeds.refreshUI();
        }
     // });
    } else {
      hiddenCalendars.push(calendar.title);
    }
  }
  if (hiddenCalendars.length > 0) {
    background.log('Not showing hidden calendars: ', hiddenCalendars);
  }
  return feeds.events;
}
  
function fetchEventsFromCalendar_(feed, optCache){
  var events = JSON.parse(CacheService.getScriptCache().get(feed.id));
  if (events && optCache){
    return events;
  }
  var fromDate = new Date();
  var toDate = new Date()
  toDate.setMonth( fromDate.getMonth( ) + 1 );
  var optionalArgs = { timeMin: fromDate.toISOString(),
                      timeMax: toDate.toISOString(),
                      maxResults: 500,
                      orderBy: 'startTime',
                      singleEvents: true};
  
  var data = Calendar.Events.list(feed.id, optionalArgs);

  var events = [];
  for (var i = 0; i < data.items.length; i++) {
    var eventEntry = data.items[i];
    var start = utils.fromIso8601(eventEntry.start.dateTime || eventEntry.start.date);
    var end = utils.fromIso8601(eventEntry.end.dateTime || eventEntry.end.date);
    var desc = eventEntry.description || '';
    var youtube_url = desc.match(/http(?:s?):\/\/(?:www\.)?youtu(?:be\.com\/watch\?v=|\.be\/)([\w\-\_]*)(&(amp;)?‌​[\w\?‌​=]*)?/g);
    var youtube_url = (youtube_url) ? youtube_url[0] : '';
    
    var responseStatus = '';
    if (eventEntry.attendees) {
      for (var attendeeId in eventEntry.attendees) {
        var attendee = eventEntry.attendees[attendeeId];
        if (attendee.self) {  // Of all attendees, only look at the entry for this user (self).
          responseStatus = attendee.responseStatus;
          break;
        }
      }
    }
    
    events.push({
      feed: feed,
      title: eventEntry.summary || chrome.i18n.getMessage('event_title_unknown'),
      description: eventEntry.description || '',
      start: start ? start.valueOf() : null,
      end: end ? end.valueOf() : null,
      allday: !end || (start.hours() === 0 && start.minutes() === 0 && end.hours() === 0 && end.minutes() === 0),
      location: eventEntry.location,
      hangout_url: eventEntry.hangoutLink || youtube_url,
      attachments: eventEntry.attachments,
      gcal_url: eventEntry.htmlLink,
      responseStatus: responseStatus
    });
  }
  CacheService.getScriptCache().put(feed.id, JSON.stringify(events), 3600);
  return events;
}

if (!Date.prototype.toISOString) {
  (function() {

    function pad(number) {
      if (number < 10) {
        return '0' + number;
      }
      return number;
    }

    Date.prototype.toISOString = function() {
      return this.getUTCFullYear() +
        '-' + pad(this.getUTCMonth() + 1) +
        '-' + pad(this.getUTCDate()) +
        'T' + pad(this.getUTCHours()) +
        ':' + pad(this.getUTCMinutes()) +
        ':' + pad(this.getUTCSeconds()) +
        '.' + (this.getUTCMilliseconds() / 1000).toFixed(3).slice(2, 5) +
        'Z';
    };

  }());
}
