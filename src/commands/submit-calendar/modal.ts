import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  TextInputStyle,
  bold,
  codeBlock,
  inlineCode,
} from 'discord.js';
import { buildModal, makeInput } from '../command';
import { z } from 'zod';

export const SubmitCalendarModal = buildModal(
  {
    id: 'submit-calendar',
    title: 'Submit Calendar',
  },
  [
    makeInput('event-name', 'イベント名', TextInputStyle.Short),
    makeInput('start-at', '開始日', TextInputStyle.Short).setPlaceholder(
      'yyyy/mm/dd',
    ),
    makeInput('end-at', '終了日', TextInputStyle.Short).setPlaceholder(
      'yyyy/mm/dd',
    ),
    makeInput('details', '詳細', TextInputStyle.Paragraph).setRequired(false),
  ],
  async (interaction) => {
    const schema = z.object({
      eventName: z.string().min(1, 'イベント名は必須です'),
      startAt: z
        .string()
        .regex(/^\d{4}\/\d{2}\/\d{2}$/, 'yyyy/mm/dd形式で入力してください'),
      endAt: z
        .string()
        .regex(/^\d{4}\/\d{2}\/\d{2}$/, 'yyyy/mm/dd形式で入力してください'),
      details: z.string().optional(),
    });

    const input = {
      eventName: interaction.fields.getTextInputValue('event-name'),
      startAt: interaction.fields.getTextInputValue('start-at'),
      endAt: interaction.fields.getTextInputValue('end-at'),
      details: interaction.fields.getTextInputValue('details'),
    };
    const result = schema.safeParse(input);

    const message = result.success
      ? 'カレンダーを作成しました！'
      : 'カレンダーの作成に失敗しました';

    const errors = result.success
      ? []
      : result.error.issues.map((issue) => {
          return `- ${inlineCode(issue.path.join('.'))}: ${issue.message}`;
        });

    const reply = await interaction.reply({
      content: [
        `${bold(message)}`,
        codeBlock('json', JSON.stringify(input, null, 2)),
        ...errors,
      ].join('\n'),
      flags: MessageFlags.Ephemeral,
    });

    const deleteButton = new ButtonBuilder()
      .setCustomId(`delete-${reply.id}`)
      .setLabel('削除')
      .setStyle(ButtonStyle.Danger);
    const openButton = new ButtonBuilder()
      .setURL('https://example.com')
      .setLabel('開く')
      .setStyle(ButtonStyle.Link);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      openButton,
      deleteButton,
    );
    await interaction.editReply({ components: [row] });
  },
);
