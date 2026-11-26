import type { DraftEvent, Event } from '../calendar/model';
import { addDays, toJstDate } from '../calendar/date';
import { getAccessToken } from './auth';

type GoogleEventTime = { date?: string; dateTime?: string; timeZone?: string };
type GoogleEvent = {
  id: string;
  htmlLink: string;
  summary?: string;
  description?: string;
  status?: string;
  start: GoogleEventTime;
  end: GoogleEventTime;
};

export type CalendarConfig = {
  calendarId: string;
  serviceAccountKey: string;
};

const TIME_ZONE = 'Asia/Tokyo';

const toEvent = (g: GoogleEvent): Event => ({
  url: g.htmlLink,
  id: g.id,
  name: g.summary ?? '',
  startDate: g.start.date ?? toJstDate(g.start.dateTime!),
  // 終日イベントの end.date は翌日（排他的）なので 1 日戻す
  endDate: g.end.date ? addDays(g.end.date, -1) : toJstDate(g.end.dateTime!),
  details: g.description ?? undefined,
});

const toRequestBody = (event: DraftEvent) => ({
  summary: event.name,
  start: { date: event.startDate, timeZone: TIME_ZONE },
  end: { date: addDays(event.endDate, 1), timeZone: TIME_ZONE },
  description: event.details,
});

export class GoogleCalendar {
  constructor(private readonly config: CalendarConfig) {}

  private async request(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<Response> {
    const token = await getAccessToken(this.config.serviceAccountKey);
    return fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(this.config.calendarId)}/events${path}`,
      {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      },
    );
  }

  private static async ensureOk(res: Response, action: string) {
    if (!res.ok) {
      throw new Error(
        `Failed to ${action} event: ${res.status} ${await res.text()}`,
      );
    }
  }

  async add(event: DraftEvent): Promise<Event> {
    const res = await this.request('POST', '', toRequestBody(event));
    await GoogleCalendar.ensureOk(res, 'create');
    return toEvent((await res.json()) as GoogleEvent);
  }

  async find(eventId: string): Promise<Event | null> {
    const res = await this.request('GET', `/${encodeURIComponent(eventId)}`);
    if (res.status === 404 || res.status === 410) {
      return null;
    }
    await GoogleCalendar.ensureOk(res, 'find');
    const g = (await res.json()) as GoogleEvent;
    if (g.status === 'cancelled') {
      return null;
    }
    return toEvent(g);
  }

  async update(eventId: string, event: DraftEvent): Promise<Event> {
    const res = await this.request(
      'PUT',
      `/${encodeURIComponent(eventId)}`,
      toRequestBody(event),
    );
    await GoogleCalendar.ensureOk(res, 'update');
    return toEvent((await res.json()) as GoogleEvent);
  }

  async delete(eventId: string): Promise<void> {
    const res = await this.request('DELETE', `/${encodeURIComponent(eventId)}`);
    await GoogleCalendar.ensureOk(res, 'delete');
  }
}
