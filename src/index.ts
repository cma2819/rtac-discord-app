import { Client, Events, GatewayIntentBits } from 'discord.js';
import { DiscordConfig } from './config/discord';
import logger from './logger';
import { handleCommands } from './handlers/command';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { handleModals } from './handlers/modal';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Tokyo');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (readyClient) => {
  logger.info(`Logged in as ${readyClient.user.tag}`);
});

handleCommands(client);
handleModals(client);

client.login(DiscordConfig.token);
