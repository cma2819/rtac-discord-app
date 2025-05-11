import config from 'config';
import { z } from 'zod';

const schema = z.object({
  calendarId: z.string(),
  credentials: z.object({
    serviceAccount: z.object({
      keyFile: z.string(),
    }),
  }),
});

export const GoogleConfig = schema.parse(config.get('google'));
