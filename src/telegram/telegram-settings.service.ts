import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "src/user/user.entity";

@Injectable()
export class TelegramSettingsService {
  private readonly logger = new Logger(TelegramSettingsService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getSettings(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: [
        "id", 
        "username", 
        "telegramChatId",
        "telegram_digest_time",
        "telegram_reminders_enabled",
        "telegram_daily_digest_enabled"
      ],
    });
    
    if (!user) {
      throw new Error("User not found");
    }
    
    return {
      user_id: user.id,
      digest_time: user.telegram_digest_time || "10:00",
      reminders_enabled: user.telegram_reminders_enabled !== false,
      daily_digest_enabled: user.telegram_daily_digest_enabled !== false,
    };
  }

  async setDigestTime(userId: string, time: string) {
    await this.userRepository.update(userId, { telegram_digest_time: time });
    this.logger.log(`User ${userId} set digest time to ${time}`);
    return this.getSettings(userId);
  }

  async toggleReminders(userId: string, enabled: boolean) {
    await this.userRepository.update(userId, { telegram_reminders_enabled: enabled });
    this.logger.log(`User ${userId} set reminders to ${enabled}`);
    return this.getSettings(userId);
  }

  async toggleDailyDigest(userId: string, enabled: boolean) {
    await this.userRepository.update(userId, { telegram_daily_digest_enabled: enabled });
    this.logger.log(`User ${userId} set daily digest to ${enabled}`);
    return this.getSettings(userId);
  }

  async getAllActiveDigestUsers() {
    try {
      const users = await this.userRepository
        .createQueryBuilder("user")
        .where("user.telegramChatId IS NOT NULL")
        .andWhere("user.telegram_daily_digest_enabled = :enabled", { enabled: true })
        .select([
          "user.id as userId",
          "user.telegramChatId as chatId",
          "user.telegram_digest_time as digestTime",
        ])
        .getRawMany();
      
      return users;
    } catch (error) {
      this.logger.error(`Error getting active digest users: ${error.message}`);
      return [];
    }
  }
}