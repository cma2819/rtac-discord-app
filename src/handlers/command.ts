import { Client, MessageFlags } from 'discord.js';
import logger from '../logger';
import { Command, provideCommands } from '../commands/command';

export const handleCommands = (commands: Command[]) => {
  const collection = provideCommands(commands);

  return async (client: Client) => {
    client.on('interactionCreate', async (interaction) => {
      if (!interaction.isChatInputCommand()) {
        return;
      }

      const command = collection.get(interaction.commandName);
      if (!command) {
        logger.warn(
          `No command matching ${interaction.commandName} was found.`,
        );
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        logger.error(
          `Error executing command ${interaction.commandName}: ${error}`,
        );
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: 'There was an error while executing this command!',
            flags: MessageFlags.Ephemeral,
          });
        } else {
          await interaction.reply({
            content: 'There was an error while executing this command!',
            flags: MessageFlags.Ephemeral,
          });
        }
      }
    });
  };
};
