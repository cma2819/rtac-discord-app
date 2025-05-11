import { Client } from 'discord.js';
import { parseCustomId } from '../command';
import { SubmitCalendarCommand } from './command';
import { EditCalendarModal, SubmitCalendarModal } from './modal';
import { handleCommands } from '../../handlers/command';
import { findEvent } from '../../services/google/calendar';
import logger from '../../logger';
import { confirmDeleteEvent } from './button';

export const handleCalendar = async (client: Client) => {
  handleCommands([SubmitCalendarCommand])(client);

  client.on('interactionCreate', async (interaction) => {
    if (interaction.isModalSubmit()) {
      logger.debug(
        `Received interaction: ${JSON.stringify(interaction.customId)}`,
      );
      const { prefix, args } = parseCustomId(interaction.customId);
      if (prefix === 'submit-calendar') {
        return SubmitCalendarModal.execute(interaction);
      }
      if (prefix === 'edit-calendar') {
        const [eventId] = args;
        const event = await findEvent(eventId);
        if (!event) {
          await interaction.reply({
            content: 'Event not found',
            ephemeral: true,
          });

          return;
        }

        logger.debug(`Going to edit event like ${JSON.stringify(event)}`);
        const modal = await EditCalendarModal({ event });
        return modal.execute(interaction);
      }
    }
    if (interaction.isButton()) {
      const { prefix, args } = parseCustomId(interaction.customId);
      if (prefix === 'edit-calendar') {
        const [eventId] = args;
        const event = await findEvent(eventId);
        if (!event) {
          await interaction.reply({
            content: 'Event not found',
            ephemeral: true,
          });

          return;
        }

        logger.debug(
          `Going to open edit modal for event like ${JSON.stringify(event)}`,
        );
        const modal = await EditCalendarModal({ event });
        return await interaction.showModal(modal.ctx);
      }
      if (prefix === 'delete-calendar') {
        const [eventId] = args;
        const event = await findEvent(eventId);
        if (!event) {
          await interaction.reply({
            content: 'Event not found',
            ephemeral: true,
          });

          return;
        }

        logger.debug(`Going to delete event like ${JSON.stringify(event)}`);
        return await confirmDeleteEvent(interaction, { event });
      }
    }
  });
};
