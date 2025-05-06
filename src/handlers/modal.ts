import { Client, Events, MessageFlags } from 'discord.js';
import { ModalCollection } from '../commands';
import logger from '../logger';

export const handleModals = async (client: Client) => {
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isModalSubmit()) {
      return;
    }

    const modal = ModalCollection.get(interaction.customId);

    if (!modal) {
      logger.warn(`No modal matching ${interaction.customId} was found.`);
      return;
    }

    try {
      await modal.execute(interaction);
    } catch (error) {
      logger.error(`Error executing modal ${interaction.customId}: ${error}`);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: 'There was an error while executing this modal!',
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content: 'There was an error while executing this modal!',
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  });
};
