import { Client, Events, GatewayIntentBits } from 'discord.js';
import { DiscordConfig } from './config/discord';
import logger from './logger';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { handleCalendar } from './commands';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Tokyo');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (readyClient) => {
  logger.info(`Logged in as ${readyClient.user.tag}`);
});

handleCalendar(client);

client.login(DiscordConfig.token);
