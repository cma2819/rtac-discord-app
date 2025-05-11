import {
  ActionRowBuilder,
  bold,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  MessageFlags,
} from 'discord.js';
import { Event } from '../../models/calendar';
import { deleteEvent } from '../../services/google/calendar';

type DeleteEventProps = {
  event: Event;
};

export const confirmDeleteEvent = async (
  interaction: ButtonInteraction,
  { event }: DeleteEventProps,
) => {
  const confirm = new ButtonBuilder()
    .setCustomId('confirm')
    .setLabel('削除する')
    .setStyle(ButtonStyle.Danger);

  const cancel = new ButtonBuilder()
    .setCustomId('cancel')
    .setLabel('キャンセル')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    cancel,
    confirm,
  );
  const response = await interaction.reply({
    content: bold(`カレンダー "${event.name}" を削除しますか？`),
    flags: MessageFlags.Ephemeral,
    components: [row],
    withResponse: true,
  });

  try {
    const confirmation =
      await response.resource?.message?.awaitMessageComponent({
        filter: (i) => i.user.id === interaction.user.id,
        time: 30_000,
      });
    if (confirmation?.customId === 'confirm') {
      await confirmation.update({
        content: `カレンダー "${event.name}" を削除しました！`,
        components: [],
      });
      return await deleteEvent(event.id);
    }
    if (confirmation?.customId === 'cancel') {
      await confirmation.update({
        content: 'カレンダーの削除がキャンセルされました。',
        components: [],
      });
    }
  } catch {
    await interaction.editReply({
      content: 'カレンダーの削除がキャンセルされました。',
      components: [],
    });
  }
};
