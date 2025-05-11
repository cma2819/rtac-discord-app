import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  TextInputStyle,
  bold,
  codeBlock,
  inlineCode,
} from 'discord.js';
import { buildModal, makeInput } from '../command';
import { z } from 'zod';
import { DiscordConfig } from '../../config/discord';
import { addEvent, updateEvent } from '../../services/google/calendar';
import dayjs from 'dayjs';
import { Event } from '../../models/calendar';

const InputSchema = z.object({
  eventName: z.string().min(1, 'イベント名は必須です'),
  startAt: z
    .string()
    .regex(/^\d{4}\/\d{2}\/\d{2}$/, 'yyyy/mm/dd形式で入力してください'),
  endAt: z
    .string()
    .regex(/^\d{4}\/\d{2}\/\d{2}$/, 'yyyy/mm/dd形式で入力してください'),
  details: z.string().optional(),
});

type Input = z.infer<typeof InputSchema>;

const makeCalendarEmbed = (
  input: Input,
  created: Event,
  type: 'submit' | 'edit',
): EmbedBuilder => {
  const Messages = {
    submit: 'カレンダーを作成しました',
    edit: 'カレンダーを更新しました',
  } as const;
  const embed = new EmbedBuilder()
    .setColor('#bcbcff')
    .setTitle(input.eventName)
    .setDescription(`${Messages[type]} - ${created.id}`)
    .setURL(created.url)
    .addFields(
      { name: '開始日', value: input.startAt, inline: true },
      { name: '終了日', value: input.endAt, inline: true },
      { name: '詳細', value: input.details ?? '-' },
    );

  return embed;
};

const EventNameInput = () =>
  makeInput('event-name', 'イベント名', TextInputStyle.Short);

const StartAtInput = () =>
  makeInput('start-at', '開始日', TextInputStyle.Short).setPlaceholder(
    'yyyy/mm/dd',
  );
const EndAtInput = () =>
  makeInput('end-at', '終了日', TextInputStyle.Short).setPlaceholder(
    'yyyy/mm/dd',
  );
const DetailsInput = () =>
  makeInput('details', '詳細', TextInputStyle.Paragraph).setRequired(false);

const makeComponents = (event: Event) => {
  const editButton = new ButtonBuilder()
    .setCustomId(`edit-calendar:${event.id}`)
    .setLabel('編集')
    .setStyle(ButtonStyle.Primary);
  const deleteButton = new ButtonBuilder()
    .setCustomId(`delete-calendar:${event.id}`)
    .setLabel('削除')
    .setStyle(ButtonStyle.Danger);

  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    editButton,
    deleteButton,
  );
};

export const SubmitCalendarModal = buildModal(
  {
    id: 'submit-calendar',
    title: 'Submit Calendar',
  },
  [EventNameInput(), StartAtInput(), EndAtInput(), DetailsInput()],
  async (interaction) => {
    const input = {
      eventName: interaction.fields.getTextInputValue('event-name'),
      startAt: interaction.fields.getTextInputValue('start-at'),
      endAt: interaction.fields.getTextInputValue('end-at'),
      details: interaction.fields.getTextInputValue('details'),
    };
    const result = InputSchema.safeParse(input);

    const message = result.success
      ? 'カレンダーを作成しています...'
      : 'カレンダーの作成に失敗しました';

    const errors = result.success
      ? []
      : result.error.issues.map((issue) => {
          return `- ${inlineCode(issue.path.join('.'))}: ${issue.message}`;
        });

    await interaction.reply({
      content: [
        `${bold(message)}`,
        codeBlock('json', JSON.stringify(input, null, 2)),
        ...errors,
      ].join('\n'),
      flags: MessageFlags.Ephemeral,
    });

    const calendarEvent = await addEvent({
      name: input.eventName,
      startAt: dayjs(input.startAt),
      endAt: dayjs(input.endAt),
      details: input.details,
    });

    const channel = interaction.client.channels.cache.get(
      DiscordConfig.notificationChannelId,
    );
    if (channel?.isSendable()) {
      const embed = makeCalendarEmbed(input, calendarEvent, 'submit');
      const notification = await channel.send({
        embeds: [embed],
        components: [makeComponents(calendarEvent)],
      });
      if (notification) {
        const openButton = new ButtonBuilder()
          .setURL(notification.url)
          .setLabel('開く')
          .setStyle(ButtonStyle.Link);
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          openButton,
        );
        await interaction.editReply({
          content: `カレンダー "${calendarEvent.name}" を作成しました！`,
          components: [row],
        });
      }
    }
  },
);

type EditCalendarModalProps = {
  event: Event;
};

export const EditCalendarModal = async ({ event }: EditCalendarModalProps) => {
  return buildModal(
    {
      id: `edit-calendar:${event.id}`,
      title: 'Edit Calendar',
    },
    [
      EventNameInput().setValue(event.name),
      StartAtInput().setValue(event.startAt.format('YYYY/MM/DD')),
      EndAtInput().setValue(event.endAt.format('YYYY/MM/DD')),
      DetailsInput().setValue(event.details ?? ''),
    ],
    async (interaction) => {
      const input = {
        eventName: interaction.fields.getTextInputValue('event-name'),
        startAt: interaction.fields.getTextInputValue('start-at'),
        endAt: interaction.fields.getTextInputValue('end-at'),
        details: interaction.fields.getTextInputValue('details'),
      };
      const result = InputSchema.safeParse(input);

      const message = result.success
        ? 'カレンダーを更新しています...'
        : 'カレンダーの更新に失敗しました';

      const errors = result.success
        ? []
        : result.error.issues.map((issue) => {
            return `- ${inlineCode(issue.path.join('.'))}: ${issue.message}`;
          });

      await interaction.reply({
        content: [
          `${bold(message)}`,
          codeBlock('json', JSON.stringify(input, null, 2)),
          ...errors,
        ].join('\n'),
        flags: MessageFlags.Ephemeral,
      });

      if (result.success) {
        const calendarEvent = await updateEvent(event.id, {
          name: input.eventName,
          startAt: dayjs(input.startAt),
          endAt: dayjs(input.endAt),
          details: input.details,
        });

        const channel = interaction.client.channels.cache.get(
          DiscordConfig.notificationChannelId,
        );
        if (channel?.isSendable()) {
          const embed = makeCalendarEmbed(input, calendarEvent, 'edit');
          const notification = await channel.send({
            embeds: [embed],
            components: [makeComponents(calendarEvent)],
          });
          if (notification) {
            const openButton = new ButtonBuilder()
              .setURL(notification.url)
              .setLabel('開く')
              .setStyle(ButtonStyle.Link);
            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
              openButton,
            );
            await interaction.editReply({
              content: `カレンダー "${calendarEvent.name}" を更新しました！`,
              components: [row],
            });
          }
        }
      }
    },
  );
};
