import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  Collection,
  ModalActionRowComponentBuilder,
  ModalBuilder,
  ModalSubmitInteraction,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';

type CommandMeta = {
  name: string;
  description: string;
};

type CommandExecution = (
  interaction: ChatInputCommandInteraction,
) => Promise<void>;

export type Command = {
  data: SlashCommandBuilder;
  execute: CommandExecution;
};

export const buildCommand = (
  meta: CommandMeta,
  execute: CommandExecution,
  cb?: (builder: SlashCommandBuilder) => void,
): Command => {
  const command = new SlashCommandBuilder()
    .setName(meta.name)
    .setDescription(meta.description);
  cb?.(command);
  return {
    data: command,
    execute,
  };
};

export type ModalCommand = {
  ctx: ModalBuilder;
  execute: (interaction: ModalSubmitInteraction) => Promise<void>;
};

type ModalMeta = {
  id: string;
  title: string;
};
type ModalBuilderCb = (builder: ModalBuilder) => void;

export const buildModal = (
  meta: ModalMeta,
  inputs: [TextInputBuilder, ...TextInputBuilder[]],
  execute: (interaction: ModalSubmitInteraction) => Promise<void>,
  cb?: ModalBuilderCb,
): ModalCommand => {
  const modal = new ModalBuilder().setCustomId(meta.id).setTitle(meta.title);
  if (inputs.length > 0) {
    const components = inputs.map((input) => {
      const component =
        new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
          input,
        );
      return component;
    });
    modal.addComponents(...components);
  }
  cb?.(modal);
  return {
    ctx: modal,
    execute,
  };
};

export const makeInput = (
  customId: string,
  label: string,
  style: TextInputStyle,
): TextInputBuilder =>
  new TextInputBuilder().setCustomId(customId).setLabel(label).setStyle(style);

export const provideCommands = (
  commands: Command[],
): Collection<string, Command> => {
  const collection = new Collection<string, Command>();

  return commands.reduce((acc, command) => {
    acc.set(command.data.name, command);
    return acc;
  }, collection);
};

export const provideModals = (
  modals: ModalCommand[],
): Collection<string, ModalCommand> => {
  const collection = new Collection<string, ModalCommand>();

  return modals.reduce((acc, modal) => {
    if (modal.ctx.data.custom_id) {
      acc.set(modal.ctx.data.custom_id, modal);
    }
    return acc;
  }, collection);
};

export const parseCustomId = (customId: string) => {
  const [prefix, rest] = customId.split(':', 2);
  const args = (rest as string | undefined)?.split('-');
  return {
    prefix,
    args: args ?? [],
  };
};
