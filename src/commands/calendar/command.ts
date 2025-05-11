import { buildCommand } from '../command';
import { SubmitCalendarModal } from './modal';

export const SubmitCalendarCommand = buildCommand(
  {
    name: 'calendar',
    description: 'Commands related to calendar',
  },
  async (interaction) => {
    if (interaction.options.getSubcommand() === 'submit') {
      await interaction.showModal(SubmitCalendarModal.ctx);
    }
  },
  (builder) => {
    builder.addSubcommand((subCommand) =>
      subCommand
        .setName('submit')
        .setDescription('Open modal for submitting calendar'),
    );
  },
);
