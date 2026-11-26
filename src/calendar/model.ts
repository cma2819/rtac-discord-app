export type Event = {
  url: string;
  id: string;
  name: string;
  /** 開始日 `yyyy-mm-dd` */
  startDate: string;
  /** 終了日 `yyyy-mm-dd`（この日を含む） */
  endDate: string;
  details?: string;
};

export type DraftEvent = Omit<Event, 'id' | 'url'>;
