import { Inject, Injectable, Logger, forwardRef } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { RedisService } from "src/redis/redis.service";
import { Repository, Between, In, Not, IsNull } from "typeorm";
import { Event } from "src/events/events.entity";
import { User } from "src/user/user.entity";
import { TelegramService } from "./telegram.service";
import { TelegramSettingsService } from "./telegram-settings.service";

type ReminderType = "hour" | "start";

@Injectable()
export class TelegramReminderService {
  private readonly logger = new Logger(TelegramReminderService.name);
  private readonly REMINDER_PREFIX = "telegram:reminder:";

  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly redisService: RedisService,
    private readonly settingsService: TelegramSettingsService,
    @Inject(forwardRef(() => TelegramService))
    private readonly telegramService: TelegramService,
  ) {}

  private getMskTime(): Date {
    const now = new Date();
    const mskOffset = 3 * 60 * 60 * 1000;
    return new Date(now.getTime() + mskOffset);
  }

  private getMskHoursAndMinutes(): { hours: number; minutes: number } {
    const mskDate = this.getMskTime();
    return {
      hours: mskDate.getUTCHours(),
      minutes: mskDate.getUTCMinutes(),
    };
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processReminders() {
    if (!this.telegramService.isEnabled()) {
      return;
    }

    const now = new Date();
    const currentWindowEnd = new Date(now.getTime() + 60 * 1000);
    const oneHourStart = new Date(now.getTime() + 60 * 60 * 1000);
    const oneHourEnd = new Date(oneHourStart.getTime() + 60 * 1000);

    const [startEvents, hourEvents] = await Promise.all([
      this.eventRepository.find({
        where: { completed: false, data: Between(now, currentWindowEnd) },
      }),
      this.eventRepository.find({
        where: { completed: false, data: Between(oneHourStart, oneHourEnd) },
      }),
    ]);

    await this.sendReminderBatch(startEvents, "start");
    await this.sendReminderBatch(hourEvents, "hour");
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processDailyDigests() {
    if (!this.telegramService.isEnabled()) {
      return;
    }

    const { hours: currentHour, minutes: currentMinute } = this.getMskHoursAndMinutes();
    const currentTime = `${currentHour.toString().padStart(2, "0")}:${currentMinute.toString().padStart(2, "0")}:00`;

    const users = await this.userRepository.find({
      where: { 
        telegramChatId: Not(IsNull()),
        telegram_daily_digest_enabled: true
      },
      select: ["id", "username", "telegramChatId", "telegram_digest_time"],
    });

    for (const user of users) {
      const digestTime = user.telegram_digest_time || "10:00:00";
      if (digestTime !== currentTime) continue;

      const tasks = await this.getTodayTasksByUserIdJoin(user.id);
      if (tasks.length === 0) continue;

      const message = this.buildDigestMessage(user.username, tasks);
      
      try {
        const escapedMessage = this.escapeMarkdown(message);
        await this.telegramService.notifyUser(Number(user.telegramChatId), escapedMessage, 'MarkdownV2');
        this.logger.log(`Daily digest sent to user ${user.id} at ${currentTime} MSK`);
      } catch (error) {
        this.logger.error(`Failed to send digest to user ${user.id}: ${error.message}`);
      }
    }
  }

  private async sendReminderBatch(events: Event[], type: ReminderType) {
    if (!events.length) return;

    const userIds = [...new Set(events.map((event) => event.user_id))];
    const users = await this.userRepository.find({
      where: { id: In(userIds) },
      select: ["id", "username", "telegramChatId"],
    });
    const usersMap = new Map(users.map((user) => [user.id, user]));

    for (const event of events) {
      const user = usersMap.get(event.user_id);
      if (!user?.telegramChatId) continue;

      const settings = await this.settingsService.getSettings(user.id);
      if (!settings.reminders_enabled) continue;

      const dedupeKey = `${this.REMINDER_PREFIX}${type}:${event.id}`;
      const ttlSeconds = this.resolveReminderTtl(event.data);
      const acquired = await this.redisService.setIfNotExists(dedupeKey, { sentAt: new Date().toISOString() }, ttlSeconds);

      if (!acquired) continue;

      try {
        const message = this.buildReminderMessage(user.username, event, type);
        const escapedMessage = this.escapeMarkdown(message);
        await this.telegramService.notifyUser(Number(user.telegramChatId), escapedMessage, 'MarkdownV2');
      } catch (error) {
        await this.redisService.del(dedupeKey);
        this.logger.error(`Failed to send reminder for event=${event.id}: ${error.message}`);
      }
    }
  }

  private resolveReminderTtl(eventDate: Date): number {
    const diffInSeconds = Math.floor((new Date(eventDate).getTime() - Date.now()) / 1000);
    return Math.max(diffInSeconds + 24 * 60 * 60, 60 * 60);
  }

  private buildReminderMessage(username: string, event: Event, type: ReminderType): string {
    const prefix = type === "hour" ? "через 1 час" : "начинается сейчас";
    
    let message = `Напоминание\n\n`;
    message += `${username || "Пользователь"}, событие "${event.name}" ${prefix}\n`;
    if (event.description) {
      message += `Описание: ${event.description}`;
    }
    
    return message;
  }

  private buildDigestMessage(username: string, tasks: { name: string; data: Date; description?: string }[]): string {
    let message = `Привет, ${username || "Пользователь"}!\n\n`;
    message += `Твои задачи на сегодня:\n\n`;
    
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      message += `${i + 1}. ${task.name}\n`;
      if (task.description) {
        message += `   ${task.description}\n`;
      }
    }
    
    message += `\nХорошего дня!`;
    return message;
  }

  async getTodayTasksByChatId(chatId: string): Promise<{ name: string; data: Date; description?: string }[]> {
    const user = await this.userRepository.findOne({
      where: { telegramChatId: chatId },
      select: ["id"],
    });
    if (!user) return [];
    return this.getTodayTasksByUserIdJoin(user.id);
  }

  private async getTodayTasksByUserIdJoin(userId: string) {
    const mskNow = this.getMskTime();
    
    const startMsk = new Date(mskNow);
    startMsk.setUTCHours(0, 0, 0, 0);
    
    const endMsk = new Date(startMsk);
    endMsk.setUTCDate(startMsk.getUTCDate() + 1);
    
    const startUtc = new Date(startMsk.getTime() - 3 * 60 * 60 * 1000);
    const endUtc = new Date(endMsk.getTime() - 3 * 60 * 60 * 1000);
    
    const events = await this.eventRepository
      .createQueryBuilder('event')
      .where('event.user_id = :userId', { userId })
      .andWhere('event.completed = false')
      .andWhere('event.data BETWEEN :start AND :end', {
        start: startUtc,
        end: endUtc,
      })
      .orderBy('event.data', 'ASC')
      .getMany();
      
    return events.map(event => ({
      name: event.name,
      data: event.data,
      description: event.description,
    }));
  }

  async getProfileStatsByChatId(chatId: string): Promise<{ 
    username: string; 
    todayTasksCount: number; 
    digestTime: string; 
    remindersEnabled: boolean; 
    dailyDigestEnabled: boolean 
  } | null> {
    const user = await this.userRepository.findOne({ where: { telegramChatId: chatId } });
    if (!user) return null;

    const todayTasks = await this.getTodayTasksByUserIdJoin(user.id);
    const settings = await this.settingsService.getSettings(user.id);
    
    const displayDigestTime = settings.digest_time.substring(0, 5);
    
    return {
      username: user.username || "Пользователь",
      todayTasksCount: todayTasks.length,
      digestTime: displayDigestTime,
      remindersEnabled: settings.reminders_enabled,
      dailyDigestEnabled: settings.daily_digest_enabled,
    };
  }

  async updateSettings(
    chatId: string,
    updates: { digestTime?: string; remindersEnabled?: boolean; dailyDigestEnabled?: boolean }
  ): Promise<any> {
    const user = await this.userRepository.findOne({ where: { telegramChatId: chatId } });
    if (!user) throw new Error("Пользователь не найден");

    if (updates.digestTime) {
      await this.settingsService.setDigestTime(user.id, updates.digestTime);
    }
    if (updates.remindersEnabled !== undefined) {
      await this.settingsService.toggleReminders(user.id, updates.remindersEnabled);
    }
    if (updates.dailyDigestEnabled !== undefined) {
      await this.settingsService.toggleDailyDigest(user.id, updates.dailyDigestEnabled);
    }

    return this.getProfileStatsByChatId(chatId);
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
}