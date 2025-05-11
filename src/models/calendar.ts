import { Dayjs } from 'dayjs';

export type Event = {
  url: string;
  id: string;
  name: string;
  startAt: Dayjs;
  endAt: Dayjs;
  details?: string;
};

export type DraftEvent = Omit<Event, 'id' | 'url'>;
