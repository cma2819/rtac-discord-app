import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord-api-types/v10';

/** `/calendar` コマンドの定義。`npm run register` で Discord に登録する。 */
export const CalendarCommand = {
  type: ApplicationCommandType.ChatInput,
  name: 'calendar',
  description: 'Commands related to calendar',
  options: [
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: 'submit',
      description: 'Open modal for submitting calendar',
    },
  ],
} satisfies RESTPostAPIChatInputApplicationCommandsJSONBody;

export const commands = [CalendarCommand];
