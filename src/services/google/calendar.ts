import { google } from 'googleapis';
import { GoogleConfig } from '../../config/google';
import { DraftEvent, Event } from '../../models/calendar';
import dayjs from 'dayjs';
import logger from '../../logger';

const auth = new google.auth.GoogleAuth({
  keyFile: GoogleConfig.credentials.serviceAccount.keyFile,
  scopes: ['https://www.googleapis.com/auth/calendar'],
});

export const addEvent = async (event: DraftEvent): Promise<Event> => {
  logger.debug(`Adding event to Google Calendar: ${JSON.stringify(event)}`);

  const client = await google.calendar({ version: 'v3', auth });
  const gEvent = await client.events.insert({
    calendarId: GoogleConfig.calendarId,
    requestBody: {
      summary: event.name,
      start: {
        date: event.startAt.format('YYYY-MM-DD'),
        timeZone: 'Asia/Tokyo',
      },
      end: {
        date: event.endAt.add(1, 'day').format('YYYY-MM-DD'),
        timeZone: 'Asia/Tokyo',
      },
      description: event.details,
    },
  });

  if (!gEvent.data.id) {
    throw new Error(`Failed to create event: ${gEvent.data}`);
  }

  return {
    url: gEvent.data.htmlLink!,
    id: gEvent.data.id,
    name: gEvent.data.summary!,
    startAt: dayjs(gEvent.data.start!.dateTime ?? gEvent.data.start!.date!),
    endAt: dayjs(gEvent.data.end!.dateTime ?? gEvent.data.end!.date!),
    details: gEvent.data.description ?? undefined,
  };
};

export const findEvent = async (eventId: string) => {
  logger.debug(`Finding event in Google Calendar: ${eventId}`);

  const client = await google.calendar({ version: 'v3', auth });
  const gEvent = await client.events.get({
    calendarId: GoogleConfig.calendarId,
    eventId,
  });

  if (!gEvent.data.id) {
    return null;
  }

  return {
    url: gEvent.data.htmlLink!,
    id: gEvent.data.id,
    name: gEvent.data.summary!,
    startAt: dayjs(gEvent.data.start!.dateTime ?? gEvent.data.start!.date!),
    endAt: dayjs(gEvent.data.end!.dateTime ?? gEvent.data.end!.date!).subtract(
      1,
      'day',
    ),
    details: gEvent.data.description ?? undefined,
  };
};

export const updateEvent = async (
  id: Event['id'],
  event: DraftEvent,
): Promise<Event> => {
  logger.debug(`Updating event in Google Calendar: ${JSON.stringify(event)}`);

  const client = await google.calendar({ version: 'v3', auth });
  const gEvent = await client.events.update({
    calendarId: GoogleConfig.calendarId,
    eventId: id,
    requestBody: {
      summary: event.name,
      start: {
        dateTime: event.startAt.format(),
        timeZone: 'Asia/Tokyo',
      },
      end: {
        dateTime: event.endAt.format(),
        timeZone: 'Asia/Tokyo',
      },
      description: event.details,
    },
  });

  if (!gEvent.data.id) {
    throw new Error(`Failed to update event: ${gEvent.data}`);
  }

  return {
    url: gEvent.data.htmlLink!,
    id: gEvent.data.id,
    name: gEvent.data.summary!,
    startAt: dayjs(gEvent.data.start!.dateTime!),
    endAt: dayjs(gEvent.data.end!.dateTime!),
    details: gEvent.data.description ?? undefined,
  };
};

export const deleteEvent = async (id: Event['id']) => {
  logger.debug(`Deleting event in Google Calendar: ${id}`);

  const client = await google.calendar({ version: 'v3', auth });
  await client.events.delete({
    calendarId: GoogleConfig.calendarId,
    eventId: id,
  });
};
