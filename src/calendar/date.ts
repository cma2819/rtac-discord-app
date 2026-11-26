/** `yyyy/mm/dd` → `yyyy-mm-dd` */
export const slashToIso = (date: string) => date.replaceAll('/', '-');

/** `yyyy-mm-dd` → `yyyy/mm/dd` */
export const isoToSlash = (date: string) => date.replaceAll('-', '/');

/** `yyyy/mm/dd` が実在する日付か */
export const isValidSlashDate = (date: string): boolean => {
  const match = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(date);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
};

/** `yyyy-mm-dd` に日数を加算する */
export const addDays = (date: string, days: number): string => {
  const dt = new Date(`${date}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
};

/** 日時文字列を日本時間の `yyyy-mm-dd` にする */
export const toJstDate = (dateTime: string): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(dateTime));
