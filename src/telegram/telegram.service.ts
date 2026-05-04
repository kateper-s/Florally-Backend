import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Context, Telegraf } from "telegraf";
import { TelegramLinkService } from "./telegram-link.service";
import { SendMessageOptions } from "./interfaces/telegram.interface";
import { UserService } from "src/user/user.service";

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private readonly botToken?: string;
  private readonly bot?: Telegraf;
  private launched = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly telegramLinkService: TelegramLinkService,
    private readonly userService: UserService,
  ) {
    this.botToken = this.configService.get<string>("TELEGRAM_BOT_TOKEN");
    if (!this.botToken) {
      this.logger.warn("TELEGRAM_BOT_TOKEN is not defined, bot is disabled");
      return;
    }

    this.bot = new Telegraf(this.botToken);
  }

  isEnabled(): boolean {
    return Boolean(this.bot);
  }

  async onModuleInit() {
    if (!this.bot) {
      return;
    }

    this.setupBotCommands();
    this.setupTextHandler();
    await this.bot.launch();
    this.launched = true;
    this.logger.log("Telegram bot started in polling mode");
  }

  async onModuleDestroy() {
    if (this.bot && this.launched) {
      this.bot.stop("application shutdown");
      this.launched = false;
    }
  }

  private setupBotCommands() {
    if (!this.bot) {
      return;
    }

    this.bot.start(async (ctx) => {
      const chatId = String(ctx.from?.id ?? "");
      if (!chatId) {
        return;
      }

      const linkedUser = await this.userService.getByTelegramChatId(chatId);
      if (linkedUser) {
        await ctx.reply(
          "Ваш Telegram уже привязан к Florally. Здесь вы будете получать уведомления о событиях.",
        );
        return;
      }

      await this.telegramLinkService.markAwaitingCode(chatId);
      await ctx.reply(
        "Введите код подключения из личного кабинета Florally, чтобы связать аккаунт.",
      );
    });

    this.bot.help(async (ctx) => {
      await ctx.reply(
        "Для привязки аккаунта используйте /start и введите код подключения с сайта Florally.",
      );
    });

    this.bot.telegram.setMyCommands([
      { command: "start", description: "Привязать аккаунт Florally" },
      { command: "help", description: "Справка по боту" },
    ]);
  }

  private setupTextHandler() {
    if (!this.bot) {
      return;
    }

    this.bot.on("text", async (ctx: Context) => {
      const chatId = String(ctx.from?.id ?? "");
      const message = "message" in ctx.update ? ctx.update.message : null;
      const text = message && "text" in message ? message.text : undefined;

      if (!chatId || !text || text.startsWith("/")) {
        return;
      }

      const isAwaitingCode = await this.telegramLinkService.isAwaitingCode(chatId);
      if (!isAwaitingCode) {
        await ctx.reply("Чтобы подключить Florally, отправьте /start.");
        return;
      }

      try {
        await this.telegramLinkService.connectChatByCode(text, chatId);
        await ctx.reply(
          "Рады приветствовать вас в Florally! Здесь вы будете получать уведомления об установленных вами событиях.",
        );
      } catch (error) {
        await ctx.reply(error?.message ?? "Не удалось привязать аккаунт. Попробуйте снова.");
      }
    });
  }

  async sendMessage(options: SendMessageOptions): Promise<void> {
    if (!this.bot) {
      throw new Error("Telegram bot is not configured");
    }

    await this.bot.telegram.sendMessage(options.chatId, options.text, {
      parse_mode: options.parseMode,
      reply_markup: options.replyMarkup,
    });
  }

  async notifyUser(chatId: number, message: string): Promise<void> {
    await this.sendMessage({
      chatId,
      text: message,
    });
  }

  async getBotInfo() {
    if (!this.bot) {
      throw new Error("Telegram bot is not configured");
    }

    return await this.bot.telegram.getMe();
  }
}