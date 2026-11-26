import {
  type APIApplicationCommandInteractionDataSubcommandOption,
  type APIChatInputApplicationCommandInteraction,
  type APIInteraction,
  type APIInteractionResponse,
  type APIMessageComponentInteraction,
  type APIModalSubmitInteraction,
  type APIUser,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  InteractionResponseType,
  InteractionType,
  MessageFlags,
} from 'discord-api-types/v10';
import { z } from 'zod';
import type { Env } from '../env';
import {
  createMessage,
  editOriginalResponse,
  messageUrl,
} from '../discord/api';
import {
  actionRow,
  bold,
  codeBlock,
  collectModalValues,
  inlineCode,
  linkButton,
  parseCustomId,
} from '../discord/components';
import { GoogleCalendar } from '../google/calendar';
import { CalendarCommand } from './commands';
import { isValidSlashDate, slashToIso } from './date';
import {
  type CalendarInput,
  CustomId,
  InputId,
  calendarEmbed,
  deleteConfirmButtons,
  editCalendarModal,
  eventButtons,
  submitCalendarModal,
} from './views';

type Ctx = {
  env: Env;
  waitUntil: (promise: Promise<unknown>) => void;
};

const dateSchema = z
  .string()
  .regex(/^\d{4}\/\d{2}\/\d{2}$/, 'yyyy/mm/dd形式で入力してください')
  .refine(isValidSlashDate, '存在しない日付です');

const InputSchema = z.object({
  eventName: z.string().min(1, 'イベント名は必須です'),
  startAt: dateSchema,
  endAt: dateSchema,
  details: z.string().optional(),
});

const calendarOf = (env: Env) =>
  new GoogleCalendar({
    calendarId: env.GOOGLE_CALENDAR_ID,
    serviceAccountKey: env.GOOGLE_SERVICE_ACCOUNT_KEY,
  });

const ephemeral = (content: string): APIInteractionResponse => ({
  type: InteractionResponseType.ChannelMessageWithSource,
  data: { content, flags: MessageFlags.Ephemeral },
});

const userOf = (interaction: APIInteraction): APIUser | undefined =>
  interaction.member?.user ?? interaction.user;

const displayName = (user: APIUser | undefined) =>
  user?.global_name ?? user?.username ?? 'unknown';

/** 応答後のバックグラウンド処理。失敗したらエフェメラル応答をエラー表示に差し替える。 */
const runInBackground = (
  ctx: Ctx,
  interaction: APIInteraction,
  task: () => Promise<void>,
) => {
  ctx.waitUntil(
    task().catch(async (error) => {
      console.error(error);
      await editOriginalResponse(ctx.env, interaction.token, {
        content: 'There was an error while executing this command!',
        components: [],
      }).catch((e) => console.error(e));
    }),
  );
};

const handleCommand = (
  interaction: APIChatInputApplicationCommandInteraction,
): APIInteractionResponse => {
  if (interaction.data.name !== CalendarCommand.name) {
    console.warn(`No command matching ${interaction.data.name} was found.`);
    return ephemeral('Unknown command');
  }
  const sub = interaction.data.options?.find(
    (o): o is APIApplicationCommandInteractionDataSubcommandOption =>
      o.type === ApplicationCommandOptionType.Subcommand,
  );
  if (sub?.name === 'submit') {
    return {
      type: InteractionResponseType.Modal,
      data: submitCalendarModal(),
    };
  }
  return ephemeral('Unknown subcommand');
};

const handleModalSubmit = (
  interaction: APIModalSubmitInteraction,
  ctx: Ctx,
): APIInteractionResponse => {
  const { prefix, args } = parseCustomId(interaction.data.custom_id);
  const type =
    prefix === CustomId.submitModal
      ? 'submit'
      : prefix === CustomId.edit
        ? 'edit'
        : undefined;
  if (!type) {
    return ephemeral('Unknown modal');
  }
  const [eventId] = args;
  if (type === 'edit' && !eventId) {
    return ephemeral('Event not found');
  }

  const values = collectModalValues(interaction.data.components);
  const input: CalendarInput = {
    eventName: values[InputId.eventName] ?? '',
    startAt: values[InputId.startAt] ?? '',
    endAt: values[InputId.endAt] ?? '',
    details: values[InputId.details] ?? '',
  };
  const result = InputSchema.safeParse(input);

  const Messages = {
    submit: {
      progress: 'カレンダーを作成しています...',
      failed: 'カレンダーの作成に失敗しました',
      done: (name: string) => `カレンダー "${name}" を作成しました！`,
    },
    edit: {
      progress: 'カレンダーを更新しています...',
      failed: 'カレンダーの更新に失敗しました',
      done: (name: string) => `カレンダー "${name}" を更新しました！`,
    },
  } as const;

  const errors = result.success
    ? []
    : result.error.issues.map(
        (issue) => `- ${inlineCode(issue.path.join('.'))}: ${issue.message}`,
      );

  const response = ephemeral(
    [
      bold(result.success ? Messages[type].progress : Messages[type].failed),
      codeBlock('json', JSON.stringify(input, null, 2)),
      ...errors,
    ].join('\n'),
  );

  if (!result.success) {
    return response;
  }

  runInBackground(ctx, interaction, async () => {
    const calendar = calendarOf(ctx.env);
    const draft = {
      name: input.eventName,
      startDate: slashToIso(input.startAt),
      endDate: slashToIso(input.endAt),
      details: input.details,
    };
    const event =
      type === 'submit'
        ? await calendar.add(draft)
        : await calendar.update(eventId, draft);

    const notification = await createMessage(
      ctx.env,
      ctx.env.DISCORD_NOTIFICATION_CHANNEL_ID,
      {
        embeds: [
          calendarEmbed(input, event, type, displayName(userOf(interaction))),
        ],
        components: [eventButtons(event)],
      },
    );

    await editOriginalResponse(ctx.env, interaction.token, {
      content: Messages[type].done(event.name),
      components: [
        actionRow(
          linkButton(messageUrl(interaction.guild_id, notification), '開く'),
        ),
      ],
    });
  });

  return response;
};

const handleComponent = async (
  interaction: APIMessageComponentInteraction,
  ctx: Ctx,
): Promise<APIInteractionResponse> => {
  const { prefix, args } = parseCustomId(interaction.data.custom_id);
  const [eventId] = args;
  const calendar = calendarOf(ctx.env);

  switch (prefix) {
    case CustomId.edit: {
      const event = eventId ? await calendar.find(eventId) : null;
      if (!event) return ephemeral('Event not found');
      return {
        type: InteractionResponseType.Modal,
        data: editCalendarModal(event),
      };
    }
    case CustomId.delete: {
      const event = eventId ? await calendar.find(eventId) : null;
      if (!event) return ephemeral('Event not found');
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: bold(`カレンダー "${event.name}" を削除しますか？`),
          flags: MessageFlags.Ephemeral,
          components: [deleteConfirmButtons(event)],
        },
      };
    }
    case CustomId.deleteConfirm: {
      runInBackground(ctx, interaction, async () => {
        const event = eventId ? await calendar.find(eventId) : null;
        if (!event) {
          await editOriginalResponse(ctx.env, interaction.token, {
            content: 'Event not found',
            components: [],
          });
          return;
        }
        await calendar.delete(event.id);
        await editOriginalResponse(ctx.env, interaction.token, {
          content: `カレンダー "${event.name}" を削除しました！`,
          components: [],
        });
      });
      return { type: InteractionResponseType.DeferredMessageUpdate };
    }
    case CustomId.deleteCancel:
      return {
        type: InteractionResponseType.UpdateMessage,
        data: {
          content: 'カレンダーの削除がキャンセルされました。',
          components: [],
        },
      };
    default:
      return ephemeral('Unknown component');
  }
};

/** PING 以外のインタラクションを処理し、Discord への応答を返す */
export const handleInteraction = async (
  interaction: APIInteraction,
  ctx: Ctx,
): Promise<APIInteractionResponse> => {
  try {
    switch (interaction.type) {
      case InteractionType.ApplicationCommand:
        if (interaction.data.type === ApplicationCommandType.ChatInput) {
          return handleCommand(
            interaction as APIChatInputApplicationCommandInteraction,
          );
        }
        return ephemeral('Unsupported command type');
      case InteractionType.ModalSubmit:
        return handleModalSubmit(interaction, ctx);
      case InteractionType.MessageComponent:
        return await handleComponent(interaction, ctx);
      default:
        return ephemeral('Unsupported interaction');
    }
  } catch (error) {
    console.error(error);
    return ephemeral('There was an error while executing this command!');
  }
};
