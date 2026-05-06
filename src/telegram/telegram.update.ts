import { Injectable, Logger } from '@nestjs/common';
import { Ctx, Start, Help, Hears, On, Command, Action } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { TelegramService } from './telegram.service';
import { TelegramReminderService } from './telegram-reminder.service';

@Injectable()
export class TelegramUpdate {
  private readonly logger = new Logger(TelegramUpdate.name);

  constructor(private telegramService: TelegramService,
    private telegramReminderService: TelegramReminderService,
  ) {}

  @Start()
  async startCommand(@Ctx() ctx: Context) {
    const userId = ctx.from?.id;
    const username = ctx.from?.username || ctx.from?.first_name;
    
    this.logger.log(`User ${username} (${userId}) started the bot`);
    
    await ctx.reply(
      `👋 Hello ${username}!\n\n` +
      `Welcome to our bot. I'm here to help you.\n\n` +
      `Available commands:\n` +
      `/help - Show help information\n` +
      `/info - Get information about this bot`
    );
  }

  @Help()
  async helpCommand(@Ctx() ctx: Context) {
    await ctx.reply(
      `📚 *Help Information*\n\n` +
      `Available commands:\n` +
      `• /start - Start the bot\n` +
      `• /help - Show this help message\n` +
      `• /info - Get bot information\n\n` +
      `You can also send any message and I'll respond!`,
      { parse_mode: 'MarkdownV2' }
    );
  }

  @Command('info')
  async infoCommand(@Ctx() ctx: Context) {
    try {
      const botInfo = await this.telegramService.getBotInfo();
      await ctx.reply(
        `🤖 *Bot Information*\n\n` +
        `Name: ${botInfo.first_name}\n` +
        `Username: @${botInfo.username}\n` +
        `Status: Online ✅\n\n` +
        `Feel free to ask any questions!`,
        { parse_mode: 'MarkdownV2' }
      );
    } catch (error) {
      await ctx.reply('Sorry, unable to fetch bot information at the moment.');
    }
  }

  @Command('tasks')
async tasksCommand(@Ctx() ctx: Context) {
  const chatId = ctx.from?.id.toString();
  if (!chatId) {
    await ctx.reply('Не удалось идентифицировать чат.');
    return;
  }

  try {
    const tasks = await this.telegramReminderService.getTodayTasksByChatId(chatId);
    if (!tasks.length) {
      await ctx.reply('На сегодня задач нет. Отдыхайте! 🌿');
      return;
    }

    let message = '📋 *Ваши задачи на сегодня:*\n\n';
    for (const task of tasks) {
      const time = task.data.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      message += `• *${task.name}* в ${time}\n`;
      if (task.description) {
        message += `  _${task.description}_\n`;
      }
    }
    await ctx.reply(message, { parse_mode: 'MarkdownV2' });
  } catch (error) {
    console.error('Ошибка при получении задач:', error);
    await ctx.reply('Произошла ошибка при загрузке задач. Попробуйте позже.');
  }
}

  @Hears(/.*/)
  async onMessage(@Ctx() ctx: Context) {
    const message = ctx.message;
    if ('text' in message) {
      const userMessage = message.text;
      const userId = ctx.from?.id;
      
      this.logger.log(`Received message from ${userId}: ${userMessage}`);
      
      // Простая логика ответа
      if (userMessage.toLowerCase().includes('hello') || 
          userMessage.toLowerCase().includes('hi')) {
        await ctx.reply(`Hello ${ctx.from?.first_name}! How can I help you today?`);
      } else if (userMessage.toLowerCase().includes('help')) {
        await ctx.reply('Type /help to see available commands');
      } else {
        await ctx.reply(
          `Thanks for your message! I'll get back to you soon.\n\n` +
          `In the meantime, you can use /help to see what I can do.`
        );
      }
    }
  }

  @Action(/.*/)
  async onCallbackQuery(@Ctx() ctx: Context) {
    const callbackQuery = ctx.callbackQuery;
    if ('data' in callbackQuery) {
      const data = callbackQuery.data;
      this.logger.log(`Callback query: ${data}`);
      
      await ctx.answerCbQuery('Processing your request...');
      await ctx.reply(`You clicked on: ${data}`);
    }
  }
}