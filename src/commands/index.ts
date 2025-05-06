import { provideCommands, provideModals } from './command';
import { SubmitCalendarModal } from './submit-calendar/modal';
import { SubmitCalendarCommand } from './submit-calendar/command';

export const CommandCollection = provideCommands([SubmitCalendarCommand]);

export const ModalCollection = provideModals([SubmitCalendarModal]);
