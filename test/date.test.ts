import { describe, expect, it } from 'vitest';
import {
  addDays,
  isValidSlashDate,
  isoToSlash,
  slashToIso,
  toJstDate,
} from '../src/calendar/date';

describe('date', () => {
  it('形式を変換する', () => {
    expect(slashToIso('2026/01/02')).toBe('2026-01-02');
    expect(isoToSlash('2026-01-02')).toBe('2026/01/02');
  });

  it('日付の妥当性を判定する', () => {
    expect(isValidSlashDate('2026/02/28')).toBe(true);
    expect(isValidSlashDate('2026/02/29')).toBe(false);
    expect(isValidSlashDate('2026-02-01')).toBe(false);
  });

  it('日数を加算する', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('日本時間の日付にする', () => {
    expect(toJstDate('2026-01-01T15:00:00Z')).toBe('2026-01-02');
    expect(toJstDate('2026-01-01T00:00:00+09:00')).toBe('2026-01-01');
  });
});
