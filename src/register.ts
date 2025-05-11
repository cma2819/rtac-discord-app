import { REST } from '@discordjs/rest';
import { DiscordConfig } from './config/discord';
import { CalendarCommandCollection } from './commands';
import { Routes } from 'discord.js';
import logger from './logger';

const commands = CalendarCommandCollection.map((command) => {
  return command.data.toJSON();
});

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(DiscordConfig.token);

// and deploy your commands!
(async () => {
  try {
    logger.info(
      `Started refreshing ${commands.length} application (/) commands.`,
    );

    // The put method is used to fully refresh all commands in the guild with the current set
    const data = await rest.put(
      Routes.applicationGuildCommands(
        DiscordConfig.clientId,
        DiscordConfig.guildId,
      ),
      { body: commands },
    );

    logger.info(
      `Successfully reloaded ${(data as string).length} application (/) commands.`,
    );
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    console.error(error);
  }
})();
