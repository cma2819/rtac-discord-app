import {
  type APIActionRowComponent,
  type APIButtonComponent,
  type APIModalInteractionResponseCallbackData,
  type APITextInputComponent,
  ButtonStyle,
  ComponentType,
  TextInputStyle,
} from 'discord-api-types/v10';

export const textInput = (
  customId: string,
  label: string,
  style: TextInputStyle,
  options: Partial<
    Pick<APITextInputComponent, 'placeholder' | 'required' | 'value'>
  > = {},
): APITextInputComponent => ({
  type: ComponentType.TextInput,
  custom_id: customId,
  label,
  style,
  ...options,
});

export const modal = (
  customId: string,
  title: string,
  inputs: APITextInputComponent[],
): APIModalInteractionResponseCallbackData => ({
  custom_id: customId,
  title,
  components: inputs.map((input) => ({
    type: ComponentType.ActionRow,
    components: [input],
  })),
});

export const button = (
  customId: string,
  label: string,
  style: Exclude<ButtonStyle, ButtonStyle.Link | ButtonStyle.Premium>,
): APIButtonComponent => ({
  type: ComponentType.Button,
  custom_id: customId,
  label,
  style,
});

export const linkButton = (url: string, label: string): APIButtonComponent => ({
  type: ComponentType.Button,
  url,
  label,
  style: ButtonStyle.Link,
});

export const actionRow = (
  ...components: APIButtonComponent[]
): APIActionRowComponent<APIButtonComponent> => ({
  type: ComponentType.ActionRow,
  components,
});

/**
 * モーダル送信の components から custom_id → value のマップを作る。
 * ActionRow 形式・Label 形式どちらにも対応する。
 */
export const collectModalValues = (
  components: unknown[] | undefined,
): Record<string, string> => {
  const values: Record<string, string> = {};
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    const c = node as {
      custom_id?: string;
      value?: unknown;
      components?: unknown[];
      component?: unknown;
    };
    if (typeof c.custom_id === 'string' && typeof c.value === 'string') {
      values[c.custom_id] = c.value;
    }
    c.components?.forEach(walk);
    walk(c.component);
  };
  components?.forEach(walk);
  return values;
};

export const parseCustomId = (customId: string) => {
  const [prefix, rest] = customId.split(':', 2);
  const args = (rest as string | undefined)?.split('-');
  return {
    prefix,
    args: args ?? [],
  };
};

export const bold = (text: string) => `**${text}**`;
export const inlineCode = (text: string) => `\`${text}\``;
export const codeBlock = (language: string, text: string) =>
  `\`\`\`${language}\n${text}\n\`\`\``;
