import { SubmitCalendarCommand } from './calendar/command';
import { provideCommands } from './command';

export { handleCalendar } from './calendar/handler';

export const CalendarCommandCollection = provideCommands([
  SubmitCalendarCommand,
]);
