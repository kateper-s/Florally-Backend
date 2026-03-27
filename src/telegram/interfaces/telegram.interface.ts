export interface TelegramMessage {
  message_id: number;
  from: {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
  };
  chat: {
    id: number;
    first_name?: string;
    last_name?: string;
    username?: string;
    type: string;
  };
  date: number;
  text?: string;
}

export interface TelegramWebhookBody {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: {
    id: string;
    from: TelegramMessage['from'];
    message: TelegramMessage;
    data: string;
  };
}

export interface SendMessageOptions {
  chatId: number;
  text: string;
  parseMode?: 'HTML' | 'MarkdownV2';
  replyMarkup?: any;
}

export interface KeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}