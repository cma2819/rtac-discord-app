import { buildCommand } from '../command';
import { SubmitCalendarModal } from './modal';

export const SubmitCalendarCommand = buildCommand(
  {
    name: 'submit-calendar',
    description: 'Open modal for submitting calendar',
  },
  async (interaction) => {
    await interaction.showModal(SubmitCalendarModal.ctx);
  },
);
