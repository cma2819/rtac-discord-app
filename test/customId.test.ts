import { describe, expect, it } from 'vitest';
import { collectModalValues, parseCustomId } from '../src/discord/components';

describe('parseCustomId', () => {
  it('prefix と引数に分ける', () => {
    expect(parseCustomId('edit-calendar:abc123')).toEqual({
      prefix: 'edit-calendar',
      args: ['abc123'],
    });
    expect(parseCustomId('submit-calendar')).toEqual({
      prefix: 'submit-calendar',
      args: [],
    });
  });
});

describe('collectModalValues', () => {
  it('ActionRow と Label の両形式から値を集める', () => {
    expect(
      collectModalValues([
        { type: 1, components: [{ type: 4, custom_id: 'a', value: '1' }] },
        { type: 18, component: { type: 4, custom_id: 'b', value: '2' } },
      ]),
    ).toEqual({ a: '1', b: '2' });
  });
});
