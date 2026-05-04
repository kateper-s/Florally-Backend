import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { RedisService } from "src/redis/redis.service";
import { Repository, Between, In } from "typeorm";
import { Event } from "src/events/events.entity";
import { User } from "src/user/user.entity";
import { TelegramService } from "./telegram.service";

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
    private readonly telegramService: TelegramService,
  ) {}

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
        where: {
          completed: false,
          data: Between(now, currentWindowEnd),
        },
      }),
      this.eventRepository.find({
        where: {
          completed: false,
          data: Between(oneHourStart, oneHourEnd),
        },
      }),
    ]);

    await this.sendReminderBatch(startEvents, "start");
    await this.sendReminderBatch(hourEvents, "hour");
  }

  private async sendReminderBatch(events: Event[], type: ReminderType) {
    if (!events.length) {
      return;
    }

    const userIds = [...new Set(events.map((event) => event.user_id))];
    const users = await this.userRepository.find({
      where: { id: In(userIds) },
      select: ["id", "username", "telegramChatId"],
    });
    const usersMap = new Map(users.map((user) => [user.id, user]));

    for (const event of events) {
      const user = usersMap.get(event.user_id);
      if (!user?.telegramChatId) {
        continue;
      }

      const dedupeKey = `${this.REMINDER_PREFIX}${type}:${event.id}`;
      const ttlSeconds = this.resolveReminderTtl(event.data);
      const acquired = await this.redisService.setIfNotExists(
        dedupeKey,
        { sentAt: new Date().toISOString() },
        ttlSeconds,
      );

      if (!acquired) {
        continue;
      }

      try {
        const message = this.buildReminderMessage(user.username, event, type);
        await this.telegramService.notifyUser(Number(user.telegramChatId), message);
      } catch (error) {
        await this.redisService.del(dedupeKey);
        this.logger.error(
          `Не удалось отправить reminder ${type} для event=${event.id}: ${error.message}`,
        );
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
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    const prefix =
      type === "hour"
        ? "Напоминание: событие начнется через 1 час."
        : "Напоминание: событие начинается сейчас.";

    return (
      `Здравствуйте, ${username}!\n\n` +
      `${prefix}\n\n` +
      `Событие: ${event.name}\n` +
      `Когда: ${formattedDate}\n` +
      `Описание: ${event.description || "—"}`
    );
  }
}
