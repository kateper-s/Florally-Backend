import { Inject, Injectable, Logger, forwardRef } from "@nestjs/common";
import { Cron, CronExpression, SchedulerRegistry } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { RedisService } from "src/redis/redis.service";
import { Repository, Between, In, Not, IsNull } from "typeorm";
import { Event } from "src/events/events.entity";
import { User } from "src/user/user.entity";
import { TelegramService } from "./telegram.service";
import { TelegramSettingsService } from "./telegram-settings.service";
import { CronJob } from "cron";

type ReminderType = "hour" | "start";

@Injectable()
export class TelegramReminderService {
  private readonly logger = new Logger(TelegramReminderService.name);
  private readonly REMINDER_PREFIX = "telegram:reminder:";
  private digestJobs: Map<string, CronJob> = new Map();

  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly redisService: RedisService,
    private readonly settingsService: TelegramSettingsService,
    private readonly schedulerRegistry: SchedulerRegistry,
    @Inject(forwardRef(() => TelegramService))
    private readonly telegramService: TelegramService,
  ) {}

  async onModuleInit() {
    await this.scheduleAllDigests();
  }

  async scheduleAllDigests() {
    if (!this.telegramService.isEnabled()) return;

    try {
      const users = await this.settingsService.getAllActiveDigestUsers();
      
      for (const user of users) {
        if (user.chatId && user.digestTime) {
          this.scheduleDigestForUser(user.userId, user.chatId, user.digestTime);
        }
      }
      
      this.logger.log(`Scheduled digests for ${users.length} users`);
    } catch (error) {
      this.logger.error(`Failed to schedule digests: ${error.message}`);
    }
  }

  async scheduleDigestForUser(userId: string, chatId: string, time: string) {
    const jobKey = `digest_${userId}`;
    
    if (this.digestJobs.has(jobKey)) {
      this.digestJobs.get(jobKey).stop();
      this.schedulerRegistry.deleteCronJob(jobKey);
      this.digestJobs.delete(jobKey);
    }

    const [hour, minute] = time.split(":");
    const cronTime = `${minute} ${hour} * * *`;

    try {
      const job = new CronJob(cronTime, async () => {
        await this.sendDigestForUser(userId, chatId);
      });
      
      this.schedulerRegistry.addCronJob(jobKey, job);
      job.start();
      this.digestJobs.set(jobKey, job);
      
      this.logger.log(`Scheduled digest for user ${userId} at ${time}`);
    } catch (error) {
      this.logger.error(`Failed to schedule digest for user ${userId}: ${error.message}`);
    }
  }

  async sendDigestForUser(userId: string, chatId: string) {
    try {
      const tasks = await this.getTodayTasksByUserIdJoin(userId);
      if (tasks.length === 0) return;

      const user = await this.userRepository.findOne({ where: { id: userId } });
      
      let message = `🌱 *Доброе утро, ${this.escapeMarkdown(user?.username || "Пользователь")}!*\n\n`;
      message += `*Ваши задачи на сегодня:*\n`;
      message += `\n`;
      
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        const time = task.data.toLocaleTimeString("ru-RU", {
          hour: "2-digit",
          minute: "2-digit",
        });
        message += `${i + 1}. *${this.escapeMarkdown(task.name)}* — ${time}\n`;
        if (task.description) {
          message += `   ${this.escapeMarkdown(task.description)}\n`;
        }
      }
      
      message += `\nХорошего дня!`;

      await this.telegramService.notifyUser(Number(chatId), message, 'MarkdownV2');
    } catch (error) {
      this.logger.error(`Failed to send digest for user ${userId}: ${error.message}`);
    }
  }

  async rescheduleUserDigest(userId: string, chatId: string, newTime: string) {
    await this.scheduleDigestForUser(userId, chatId, newTime);
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
        await this.telegramService.notifyUser(Number(user.telegramChatId), message, 'MarkdownV2');
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
    const date = new Date(event.data);
    const formattedDate = date.toLocaleString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    });
    
    const prefix = type === "hour" ? "через 1 час" : "начинается сейчас";
    
    let message = `🌱 Напоминание\n\n`;
    message += `${this.escapeMarkdown(username)}, событие "${this.escapeMarkdown(event.name)}" ${prefix}\n`;
    message += `Время: ${formattedDate}\n`;
    if (event.description) {
      message += `Описание: ${this.escapeMarkdown(event.description)}`;
    }
    
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

  private async getTodayTasksByUserIdJoin(userId: string): Promise<{ name: string; data: Date; description?: string }[]> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const events = await this.eventRepository
      .createQueryBuilder('event')
      .where('event.user_id = :userId', { userId })
      .andWhere('event.completed = false')
      .andWhere('event.data BETWEEN :start AND :end', {
        start: startOfDay,
        end: endOfDay,
      })
      .orderBy('event.data', 'ASC')
      .getMany();

    return events.map(event => ({
      name: event.name,
      data: event.data,
      description: event.description,
    }));
  }

  async getProfileStatsByChatId(chatId: string): Promise<{ username: string; todayTasksCount: number; digestTime: string; remindersEnabled: boolean; dailyDigestEnabled: boolean } | null> {
    const user = await this.userRepository.findOne({ where: { telegramChatId: chatId } });
    if (!user) return null;

    const todayTasks = await this.getTodayTasksByUserIdJoin(user.id);
    const settings = await this.settingsService.getSettings(user.id);
    
    return {
      username: user.username || "Пользователь",
      todayTasksCount: todayTasks.length,
      digestTime: settings.digest_time || "не установлено",
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
      await this.rescheduleUserDigest(user.id, chatId, updates.digestTime);
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
    const specialChars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];
    let escaped = text;
    for (const char of specialChars) {
      escaped = escaped.replace(new RegExp('\\' + char, 'g'), '\\' + char);
    }
    return escaped;
  }
}