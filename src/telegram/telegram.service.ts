import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf, Context } from 'telegraf';
import { SendMessageOptions } from './interfaces/telegram.interface';

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private bot: Telegraf;
  private readonly botToken: string;
  private readonly webhookDomain: string;
  private readonly webhookPath: string;

  constructor(private configService: ConfigService) {
    this.botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    this.webhookDomain = this.configService.get<string>('TELEGRAM_WEBHOOK_DOMAIN');
    this.webhookPath = this.configService.get<string>('TELEGRAM_WEBHOOK_PATH');
    
    if (!this.botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN is not defined');
    }
    
    this.bot = new Telegraf(this.botToken);
  }

  async onModuleInit() {
    await this.setupWebhook();
    this.setupBotCommands();
  }

  private async setupWebhook() {
    try {
      if (this.webhookDomain && this.webhookPath) {
        const webhookUrl = `${this.webhookDomain}${this.webhookPath}`;
        await this.bot.telegram.setWebhook(webhookUrl);
        this.logger.log(`Webhook set to: ${webhookUrl}`);
      } else {
        this.logger.warn('Webhook configuration missing, using polling mode');
        await this.bot.launch();
      }
    } catch (error) {
      this.logger.error(`Failed to setup webhook: ${error.message}`);
      throw error;
    }
  }

  private setupBotCommands() {
    // Устанавливаем команды бота
    this.bot.telegram.setMyCommands([
      { command: 'start', description: 'Start the bot' },
      { command: 'help', description: 'Get help' },
      { command: 'info', description: 'Get information' },
    ]);
  }

  async handleWebhook(body: any): Promise<void> {
    try {
      await this.bot.handleUpdate(body);
    } catch (error) {
      this.logger.error(`Error handling webhook: ${error.message}`);
      throw error;
    }
  }

  async sendMessage(options: SendMessageOptions): Promise<void> {
    try {
      await this.bot.telegram.sendMessage(options.chatId, options.text, {
        parse_mode: options.parseMode,
        reply_markup: options.replyMarkup,
      });
    } catch (error) {
      this.logger.error(`Failed to send message: ${error.message}`);
      throw error;
    }
  }

  async sendPhoto(chatId: number, photo: string, caption?: string): Promise<void> {
    try {
      await this.bot.telegram.sendPhoto(chatId, photo, { caption });
    } catch (error) {
      this.logger.error(`Failed to send photo: ${error.message}`);
      throw error;
    }
  }

  async getBotInfo() {
    try {
      return await this.bot.telegram.getMe();
    } catch (error) {
      this.logger.error(`Failed to get bot info: ${error.message}`);
      throw error;
    }
  }

  // Методы для интеграции с вашим сайтом
  async notifyUser(chatId: number, message: string): Promise<void> {
    await this.sendMessage({
      chatId,
      text: message,
      parseMode: 'HTML',
    });
  }

  async broadcastToUsers(chatIds: number[], message: string): Promise<void> {
    const promises = chatIds.map(chatId => 
      this.sendMessage({ chatId, text: message }).catch(error => 
        this.logger.error(`Failed to send to ${chatId}: ${error.message}`)
      )
    );
    await Promise.all(promises);
  }
}