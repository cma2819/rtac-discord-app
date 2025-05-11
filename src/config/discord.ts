import config from 'config';
import { z } from 'zod';

const schema = z.object({
  token: z.string(),
  clientId: z.string(),
  guildId: z.string(),
  notificationChannelId: z.string(),
});

export const DiscordConfig = schema.parse(config.get('discord'));
