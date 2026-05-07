import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit, forwardRef } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Telegraf, Markup } from "telegraf";
import { TelegramLinkService } from "./telegram-link.service";
import { SendMessageOptions } from "./interfaces/telegram.interface";
import { UserService } from "src/user/user.service";
import { TelegramReminderService } from "./telegram-reminder.service";

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
    @Inject(forwardRef(() => TelegramReminderService))
    private readonly telegramReminderService: TelegramReminderService,
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
    if (!this.bot) return;

    this.setupBotCommands();
    this.setupTextHandler();
    this.setupActionHandlers();

    this.bot.catch((err: any) => {
      this.logger.error(`Telegram bot error: ${err.message}`);
    });

    this.bot.launch()
      .then(() => {
        this.launched = true;
        this.logger.log("Telegram bot started in polling mode");
      })
      .catch((err) => {
        this.logger.error(`Failed to launch bot: ${err.message}`);
        this.launched = false;
      });
  }

  async onModuleDestroy() {
    if (this.bot && this.launched) {
      this.bot.stop("application shutdown");
      this.launched = false;
      this.logger.log("Telegram bot stopped");
    }
  }

  private setupBotCommands() {
    if (!this.bot) return;

    this.bot.start(async (ctx: any) => {
      const chatId = String(ctx.from?.id ?? "");
      if (!chatId) return;

      const linkedUser = await this.userService.getByTelegramChatId(chatId);
      if (linkedUser) {
        await ctx.reply(
          this.escapeMarkdown(
            "Florally — ваш персональный помощник по уходу за растениями\n\n" +
            "Доступные команды:\n" +
            "/tasks — задачи на сегодня\n" +
            "/profile — информация о профиле\n" +
            "/settings — настройки уведомлений\n" +
            "/unlink — отвязать аккаунт\n" +
            "/help — справка"
          ),
          { parse_mode: "MarkdownV2" }
        );
        return;
      }

      await this.telegramLinkService.markAwaitingCode(chatId);
      await ctx.reply(
        this.escapeMarkdown(
          "Подключение к Florally\n\n" +
          "Введите код подключения из личного кабинета Florally, чтобы связать аккаунт\n\n" +
          "Код можно найти в разделе Telegram → Подключить бота"
        ),
        { parse_mode: "MarkdownV2" }
      );
    });

    this.bot.help(async (ctx: any) => {
      await ctx.reply(
        this.escapeMarkdown(
          "Справка Florally\n\n" +
          "Команды бота:\n" +
          "/start — начать работу или привязать аккаунт\n" +
          "/tasks — показать задачи на сегодня\n" +
          "/profile — информация о вашем профиле\n" +
          "/settings — настройки уведомлений\n" +
          "/unlink — отвязать Telegram от аккаунта\n" +
          "/help — эта справка\n\n" +
          "Как привязать аккаунт:\n" +
          "1. Зайдите в личный кабинет Florally\n" +
          "2. Перейдите в раздел Telegram\n" +
          "3. Нажмите Сгенерировать код\n" +
          "4. Введите полученный код в этот чат\n\n" +
          "Хорошего дня"
        ),
        { parse_mode: "MarkdownV2" }
      );
    });

    this.bot.command("tasks", async (ctx: any) => {
      const chatId = String(ctx.from?.id ?? "");
      if (!chatId) return;

      try {
        const tasks = await this.telegramReminderService.getTodayTasksByChatId(chatId);
        if (!tasks.length) {
          await ctx.reply(
            this.escapeMarkdown("На сегодня задач нет\n\nОтдыхайте"),
            { parse_mode: "MarkdownV2" }
          );
          return;
        }

        let message = "Задачи на сегодня\n\n";
        
        for (let i = 0; i < tasks.length; i++) {
          const task = tasks[i];
          message += `${i + 1}. ${task.name}\n`;
          if (task.description) {
            message += `   ${task.description}\n`;
          }
        }
        
        message += `\nВсего задач: ${tasks.length}`;
        
        await ctx.reply(this.escapeMarkdown(message), { parse_mode: "MarkdownV2" });
      } catch (error) {
        this.logger.error(`Ошибка в /tasks: ${error.message}`);
        await ctx.reply(
          this.escapeMarkdown("Ошибка\n\nНе удалось загрузить задачи. Попробуйте позже"),
          { parse_mode: "MarkdownV2" }
        );
      }
    });

    this.bot.command("profile", async (ctx: any) => {
      const chatId = String(ctx.from?.id ?? "");
      if (!chatId) return;

      try {
        const stats = await this.telegramReminderService.getProfileStatsByChatId(chatId);
        if (!stats) {
          await ctx.reply(
            this.escapeMarkdown("Профиль не найден\n\nСначала привяжите аккаунт через команду /start"),
            { parse_mode: "MarkdownV2" }
          );
          return;
        }

        const message = 
          "Мой профиль\n\n" +
          `Имя: ${stats.username}\n` +
          `Задач на сегодня: ${stats.todayTasksCount}\n` +
          `Время дайджеста: ${stats.digestTime}\n` +
          `Напоминания: ${stats.remindersEnabled ? "включены" : "выключены"}\n` +
          `Дайджест: ${stats.dailyDigestEnabled ? "включен" : "выключен"}\n\n` +
          `Для изменения настроек используйте /settings`;
        
        await ctx.reply(this.escapeMarkdown(message), { parse_mode: "MarkdownV2" });
      } catch (error) {
        this.logger.error(`Ошибка в /profile: ${error.message}`);
        await ctx.reply(
          this.escapeMarkdown("Ошибка\n\nНе удалось загрузить профиль. Попробуйте позже"),
          { parse_mode: "MarkdownV2" }
        );
      }
    });

    this.bot.command("settings", async (ctx: any) => {
      const chatId = String(ctx.from?.id ?? "");
      if (!chatId) return;

      try {
        const stats = await this.telegramReminderService.getProfileStatsByChatId(chatId);
        if (!stats) {
          await ctx.reply("Сначала привяжите аккаунт через /start");
          return;
        }

        const keyboard = Markup.inlineKeyboard([
          [Markup.button.callback(`Время дайджеста (${stats.digestTime})`, "set_digest_time")],
          [Markup.button.callback(
            stats.remindersEnabled ? "Выключить напоминания" : "Включить напоминания",
            "toggle_reminders"
          )],
          [Markup.button.callback(
            stats.dailyDigestEnabled ? "Выключить дайджест" : "Включить дайджест",
            "toggle_digest"
          )],
          [Markup.button.callback("Назад", "back_to_profile")],
        ]);

        const message = 
          "Настройки уведомлений\n\n" +
          `• Время дайджеста: ${stats.digestTime}\n` +
          `• Напоминания: ${stats.remindersEnabled ? "включены" : "выключены"}\n` +
          `• Ежедневный дайджест: ${stats.dailyDigestEnabled ? "включен" : "выключен"}\n\n` +
          `Выберите действие:`;

        await ctx.reply(this.escapeMarkdown(message), keyboard);
      } catch (error) {
        this.logger.error(`Ошибка в /settings: ${error.message}`);
        await ctx.reply("Не удалось загрузить настройки");
      }
    });

    this.bot.command("unlink", async (ctx: any) => {
      const chatId = String(ctx.from?.id ?? "");
      if (!chatId) return;

      const inlineKeyboard = Markup.inlineKeyboard([
        [Markup.button.callback("Да, отвязать", "confirm_unlink")],
        [Markup.button.callback("Нет, отмена", "cancel_unlink")],
      ]);

      await ctx.reply(
        this.escapeMarkdown(
          "Подтверждение отвязки\n\n" +
          "Вы действительно хотите отвязать Telegram от аккаунта Florally\n\n" +
          "После отвязки:\n" +
          "• Вы перестанете получать уведомления\n" +
          "• Напоминания о задачах больше не будут приходить\n" +
          "• Для повторной привязки потребуется новый код\n\n" +
          "Вы уверены"
        ),
        inlineKeyboard
      );
    });

    this.bot.telegram.setMyCommands([
      { command: "start", description: "Привязать аккаунт" },
      { command: "tasks", description: "Задачи на сегодня" },
      { command: "profile", description: "Информация о профиле" },
      { command: "settings", description: "Настройки уведомлений" },
      { command: "unlink", description: "Отвязать Telegram" },
      { command: "help", description: "Справка" },
    ]).catch(err => this.logger.error(`Failed to set commands: ${err.message}`));
  }

  private setupTextHandler() {
    if (!this.bot) return;

    this.bot.on("text", async (ctx: any) => {
      const chatId = String(ctx.from?.id ?? "");
      const text = ctx.message?.text;
      if (!chatId || !text || text.startsWith("/")) return;

      const isAwaitingCode = await this.telegramLinkService.isAwaitingCode(chatId);
      if (!isAwaitingCode) {
        await ctx.reply(
          this.escapeMarkdown("Доступные команды\n\nИспользуйте /start для начала работы или /help для справки"),
          { parse_mode: "MarkdownV2" }
        );
        return;
      }

      try {
        await this.telegramLinkService.connectChatByCode(text, chatId);
        
        await this.telegramReminderService.updateSettings(chatId, { digestTime: "10:00" });
        
        await ctx.reply(
          this.escapeMarkdown(
            "Аккаунт успешно привязан\n\n" +
            "Добро пожаловать в Florally\n\n" +
            "Теперь вы будете получать:\n" +
            "• Уведомления о событиях\n" +
            "• Напоминания за час\n" +
            "• Ежедневные дайджесты в выбранное время\n\n" +
            "Доступные команды:\n" +
            "/tasks – список задач на сегодня\n" +
            "/profile – информация о профиле\n" +
            "/settings – настройка времени уведомлений\n" +
            "/unlink – отвязать аккаунт\n" +
            "/help – справка\n\n" +
            "Хорошего дня"
          ),
          { parse_mode: "MarkdownV2" }
        );
      } catch (error: any) {
        await ctx.reply(
          this.escapeMarkdown(
            `Ошибка привязки\n\n${error?.message ?? "Не удалось привязать аккаунт. Проверьте код и попробуйте снова"}`
          ),
          { parse_mode: "MarkdownV2" }
        );
      }
    });
  }

  private setupActionHandlers() {
    if (!this.bot) return;

    this.bot.action("confirm_unlink", async (ctx: any) => {
      const chatId = String(ctx.from?.id ?? "");
      try {
        await this.telegramLinkService.unlinkChat(chatId);
        await ctx.answerCbQuery("Аккаунт отвязан");
        await ctx.reply(
          this.escapeMarkdown(
            "Telegram успешно отвязан\n\n" +
            "Ваш аккаунт Florally больше не привязан к Telegram\n\n" +
            "Чтобы снова привязать:\n" +
            "1. Используйте команду /start\n" +
            "2. Сгенерируйте новый код в личном кабинете\n" +
            "3. Введите код в этот чат\n\n" +
            "Будем рады видеть вас снова"
          ),
          { parse_mode: "MarkdownV2" }
        );
      } catch (error: any) {
        await ctx.answerCbQuery("Ошибка");
        await ctx.reply(
          this.escapeMarkdown(`Ошибка\n\n${error?.message ?? "Не удалось отвязать аккаунт"}`),
          { parse_mode: "MarkdownV2" }
        );
      }
      await ctx.deleteMessage();
    });

    this.bot.action("cancel_unlink", async (ctx: any) => {
      await ctx.answerCbQuery("Отмена");
      await ctx.reply(
        this.escapeMarkdown("Отвязка отменена\n\nВаш аккаунт остаётся привязанным к Florally"),
        { parse_mode: "MarkdownV2" }
      );
      await ctx.deleteMessage();
    });

    this.bot.action("set_digest_time", async (ctx: any) => {
      const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, "0")}:00`);
      const hourButtons = [];
      for (let i = 0; i < hours.length; i += 4) {
        hourButtons.push(hours.slice(i, i + 4).map(h => Markup.button.callback(h, `select_hour_${h}`)));
      }
      
      await ctx.editMessageText(
        this.escapeMarkdown(
          "Выберите час для ежедневного дайджеста\n\n" +
          "После выбора часа можно будет выбрать минуты"
        ),
        {
          parse_mode: "MarkdownV2",
          ...Markup.inlineKeyboard([...hourButtons, [Markup.button.callback("Назад", "settings_back")]]),
        }
      );
      await ctx.answerCbQuery();
    });

    this.bot.action(/select_hour_(\d{2}:\d{2})/, async (ctx: any) => {
      const hour = ctx.match[1];
      const minutes = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];
      const minuteButtons = [];
      for (let i = 0; i < minutes.length; i += 4) {
        minuteButtons.push(minutes.slice(i, i + 4).map(m => Markup.button.callback(`${hour.substring(0, 3)}${m}`, `set_time_${hour.substring(0, 3)}${m}`)));
      }
      
      await ctx.editMessageText(
        this.escapeMarkdown(`Выбран час ${hour}\n\nВыберите минуты:`),
        {
          parse_mode: "MarkdownV2",
          ...Markup.inlineKeyboard([...minuteButtons, [Markup.button.callback("Назад к выбору часа", "set_digest_time")]]),
        }
      );
      await ctx.answerCbQuery();
    });

    this.bot.action(/set_time_(\d{2}:\d{2})/, async (ctx: any) => {
      const chatId = String(ctx.from?.id ?? "");
      const time = ctx.match[1];
      
      try {
        await this.telegramReminderService.updateSettings(chatId, { digestTime: time });
        await ctx.answerCbQuery(`Время дайджеста установлено на ${time}`);
        
        const stats = await this.telegramReminderService.getProfileStatsByChatId(chatId);
        const keyboard = Markup.inlineKeyboard([
          [Markup.button.callback(`Время дайджеста (${stats.digestTime})`, "set_digest_time")],
          [Markup.button.callback(
            stats.remindersEnabled ? "Выключить напоминания" : "Включить напоминания",
            "toggle_reminders"
          )],
          [Markup.button.callback(
            stats.dailyDigestEnabled ? "Выключить дайджест" : "Включить дайджест",
            "toggle_digest"
          )],
          [Markup.button.callback("Назад", "back_to_profile")],
        ]);
        
        await ctx.editMessageText(
          this.escapeMarkdown(
            `Время дайджеста изменено на ${time}\n\n` +
            `Теперь вы будете получать уведомления каждый день в ${time}`
          ),
          { parse_mode: "MarkdownV2", ...keyboard }
        );
      } catch (error) {
        await ctx.answerCbQuery("Ошибка");
        await ctx.reply("Не удалось изменить время");
      }
    });

    this.bot.action("toggle_reminders", async (ctx: any) => {
      const chatId = String(ctx.from?.id ?? "");
      const stats = await this.telegramReminderService.getProfileStatsByChatId(chatId);
      const newState = !stats.remindersEnabled;
      
      await this.telegramReminderService.updateSettings(chatId, { remindersEnabled: newState });
      await ctx.answerCbQuery(newState ? "Напоминания включены" : "Напоминания выключены");
      
      const newStats = await this.telegramReminderService.getProfileStatsByChatId(chatId);
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback(`Время дайджеста (${newStats.digestTime})`, "set_digest_time")],
        [Markup.button.callback(
          newStats.remindersEnabled ? "Выключить напоминания" : "Включить напоминания",
          "toggle_reminders"
        )],
        [Markup.button.callback(
          newStats.dailyDigestEnabled ? "Выключить дайджест" : "Включить дайджест",
          "toggle_digest"
        )],
        [Markup.button.callback("Назад", "back_to_profile")],
      ]);
      
      await ctx.editMessageReplyMarkup(keyboard.reply_markup);
    });

    this.bot.action("toggle_digest", async (ctx: any) => {
      const chatId = String(ctx.from?.id ?? "");
      const stats = await this.telegramReminderService.getProfileStatsByChatId(chatId);
      const newState = !stats.dailyDigestEnabled;
      
      await this.telegramReminderService.updateSettings(chatId, { dailyDigestEnabled: newState });
      await ctx.answerCbQuery(newState ? "Дайджест включен" : "Дайджест выключен");
      
      if (!newState) {
        await ctx.reply("Вы отключили ежедневный дайджест. Включить можно в любой момент через /settings");
      }
      
      const newStats = await this.telegramReminderService.getProfileStatsByChatId(chatId);
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback(`Время дайджеста (${newStats.digestTime})`, "set_digest_time")],
        [Markup.button.callback(
          newStats.remindersEnabled ? "Выключить напоминания" : "Включить напоминания",
          "toggle_reminders"
        )],
        [Markup.button.callback(
          newStats.dailyDigestEnabled ? "Выключить дайджест" : "Включить дайджест",
          "toggle_digest"
        )],
        [Markup.button.callback("Назад", "back_to_profile")],
      ]);
      
      await ctx.editMessageReplyMarkup(keyboard.reply_markup);
    });

    this.bot.action("settings_back", async (ctx: any) => {
      const chatId = String(ctx.from?.id ?? "");
      const stats = await this.telegramReminderService.getProfileStatsByChatId(chatId);
      
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback(`Время дайджеста (${stats.digestTime})`, "set_digest_time")],
        [Markup.button.callback(
          stats.remindersEnabled ? "Выключить напоминания" : "Включить напоминания",
          "toggle_reminders"
        )],
        [Markup.button.callback(
          stats.dailyDigestEnabled ? "Выключить дайджест" : "Включить дайджест",
          "toggle_digest"
        )],
        [Markup.button.callback("Назад", "back_to_profile")],
      ]);
      
      await ctx.editMessageText(
        this.escapeMarkdown(
          "Настройки уведомлений\n\n" +
          `• Время дайджеста: ${stats.digestTime}\n` +
          `• Напоминания: ${stats.remindersEnabled ? "включены" : "выключены"}\n` +
          `• Ежедневный дайджест: ${stats.dailyDigestEnabled ? "включен" : "выключен"}\n\n` +
          `Выберите действие`
        ),
        { parse_mode: "MarkdownV2", ...keyboard }
      );
      await ctx.answerCbQuery();
    });

    this.bot.action("back_to_profile", async (ctx: any) => {
      const chatId = String(ctx.from?.id ?? "");
      
      const stats = await this.telegramReminderService.getProfileStatsByChatId(chatId);
      const message = 
        "Мой профиль\n\n" +
        `Имя: ${stats.username}\n` +
        `Задач на сегодня: ${stats.todayTasksCount}\n` +
        `Время дайджеста: ${stats.digestTime}\n` +
        `Напоминания: ${stats.remindersEnabled ? "включены" : "выключены"}\n` +
        `Дайджест: ${stats.dailyDigestEnabled ? "включен" : "выключен"}\n\n` +
        `Для изменения настроек используйте /settings`;
      
      await ctx.editMessageText(this.escapeMarkdown(message), { parse_mode: "MarkdownV2" });
      await ctx.answerCbQuery();
    });
  }

  private escapeMarkdown(text: string): string {
    if (!text) return '';
    
    const specialChars = [
      '_', '*', '[', ']', '(', ')', '~', '`', 
      '>', '#', '+', '-', '=', '|', '{', '}', 
      '.', '!'
    ];
    
    let escaped = text;
    for (const char of specialChars) {
      escaped = escaped.replace(new RegExp('\\' + char, 'g'), '\\' + char);
    }
    
    return escaped;
  }

  async sendMessage(options: SendMessageOptions): Promise<void> {
    if (!this.bot) throw new Error("Telegram bot is not configured");
    await this.bot.telegram.sendMessage(options.chatId, options.text, {
      parse_mode: options.parseMode,
      reply_markup: options.replyMarkup,
    });
  }

  async notifyUser(chatId: number, message: string, parseMode?: 'HTML' | 'MarkdownV2'): Promise<void> {
    await this.sendMessage({ chatId, text: message, parseMode });
  }

  async getBotInfo() {
    if (!this.bot) throw new Error("Telegram bot is not configured");
    return await this.bot.telegram.getMe();
  }
}