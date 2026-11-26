import {
  type APIEmbed,
  ButtonStyle,
  TextInputStyle,
} from 'discord-api-types/v10';
import { actionRow, button, modal, textInput } from '../discord/components';
import { isoToSlash } from './date';
import type { Event } from './model';

export const CustomId = {
  submitModal: 'submit-calendar',
  edit: 'edit-calendar',
  delete: 'delete-calendar',
  deleteConfirm: 'delete-calendar-confirm',
  deleteCancel: 'delete-calendar-cancel',
} as const;

export const InputId = {
  eventName: 'event-name',
  startAt: 'start-at',
  endAt: 'end-at',
  details: 'details',
} as const;

export type CalendarInput = {
  eventName: string;
  startAt: string;
  endAt: string;
  details?: string;
};

const inputs = (event?: Event) => [
  textInput(InputId.eventName, 'イベント名', TextInputStyle.Short, {
    value: event?.name,
  }),
  textInput(InputId.startAt, '開始日', TextInputStyle.Short, {
    placeholder: 'yyyy/mm/dd',
    value: event && isoToSlash(event.startDate),
  }),
  textInput(InputId.endAt, '終了日', TextInputStyle.Short, {
    placeholder: 'yyyy/mm/dd',
    value: event && isoToSlash(event.endDate),
  }),
  textInput(InputId.details, '詳細', TextInputStyle.Paragraph, {
    required: false,
    value: event?.details || undefined,
  }),
];

export const submitCalendarModal = () =>
  modal(CustomId.submitModal, 'Submit Calendar', inputs());

export const editCalendarModal = (event: Event) =>
  modal(`${CustomId.edit}:${event.id}`, 'Edit Calendar', inputs(event));

export const calendarEmbed = (
  input: CalendarInput,
  event: Event,
  type: 'submit' | 'edit',
  author: string,
): APIEmbed => {
  const Messages = {
    submit: 'カレンダーを作成しました',
    edit: 'カレンダーを更新しました',
  } as const;
  return {
    color: 0xbcbcff,
    title: input.eventName,
    description: `${Messages[type]} - ${event.id}`,
    url: event.url,
    fields: [
      { name: '開始日', value: input.startAt, inline: true },
      { name: '終了日', value: input.endAt, inline: true },
      { name: '詳細', value: input.details || '-' },
    ],
    footer: { text: `${author} が操作` },
  };
};

export const eventButtons = (event: Event) =>
  actionRow(
    button(`${CustomId.edit}:${event.id}`, '編集', ButtonStyle.Primary),
    button(`${CustomId.delete}:${event.id}`, '削除', ButtonStyle.Danger),
  );

export const deleteConfirmButtons = (event: Event) =>
  actionRow(
    button(
      `${CustomId.deleteCancel}:${event.id}`,
      'キャンセル',
      ButtonStyle.Secondary,
    ),
    button(
      `${CustomId.deleteConfirm}:${event.id}`,
      '削除する',
      ButtonStyle.Danger,
    ),
  );
