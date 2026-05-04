import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { randomBytes } from "crypto";
import { RedisService } from "src/redis/redis.service";
import { UserService } from "src/user/user.service";

@Injectable()
export class TelegramLinkService {
  private readonly CODE_TTL_SECONDS = 10 * 60;
  private readonly AWAIT_CODE_TTL_SECONDS = 15 * 60;
  private readonly CODE_PREFIX = "telegram:link:code:";
  private readonly USER_PREFIX = "telegram:link:user:";
  private readonly AWAIT_PREFIX = "telegram:await-code:";

  constructor(
    private readonly redisService: RedisService,
    private readonly userService: UserService,
  ) {}

  async generateLinkCode(userId: string) {
    const user = await this.userService.getById(userId);
    if (!user.is_enabled) {
      throw new HttpException("Пользователь не активирован", HttpStatus.FORBIDDEN);
    }

    const existingCodeRaw = await this.redisService.get(`${this.USER_PREFIX}${userId}`);
    if (existingCodeRaw) {
      const existingCode = JSON.parse(existingCodeRaw) as string;
      await this.redisService.del(`${this.CODE_PREFIX}${existingCode}`);
      await this.redisService.del(`${this.USER_PREFIX}${userId}`);
    }

    const code = randomBytes(4).toString("hex").toUpperCase();
    await this.redisService.set(
      `${this.CODE_PREFIX}${code}`,
      { userId },
      this.CODE_TTL_SECONDS,
    );
    await this.redisService.set(`${this.USER_PREFIX}${userId}`, code, this.CODE_TTL_SECONDS);

    return {
      code,
      expiresInSeconds: this.CODE_TTL_SECONDS,
    };
  }

  async markAwaitingCode(chatId: string) {
    await this.redisService.set(
      `${this.AWAIT_PREFIX}${chatId}`,
      { awaiting: true },
      this.AWAIT_CODE_TTL_SECONDS,
    );
  }

  async clearAwaitingCode(chatId: string) {
    await this.redisService.del(`${this.AWAIT_PREFIX}${chatId}`);
  }

  async isAwaitingCode(chatId: string): Promise<boolean> {
    const flag = await this.redisService.get(`${this.AWAIT_PREFIX}${chatId}`);
    return Boolean(flag);
  }

  async connectChatByCode(codeInput: string, chatId: string) {
    const code = codeInput.trim().toUpperCase();
    const linkDataRaw = await this.redisService.get(`${this.CODE_PREFIX}${code}`);
    if (!linkDataRaw) {
      throw new HttpException(
        "Код подключения недействителен или истек",
        HttpStatus.BAD_REQUEST,
      );
    }

    const linkData = JSON.parse(linkDataRaw) as { userId: string };
    const existingChatUser = await this.userService.getByTelegramChatId(chatId);

    if (existingChatUser && existingChatUser.id !== linkData.userId) {
      throw new HttpException(
        "Этот Telegram уже привязан к другому аккаунту",
        HttpStatus.CONFLICT,
      );
    }

    const linkedUser = await this.userService.setTelegramChatId(linkData.userId, chatId);
    await this.redisService.del(`${this.CODE_PREFIX}${code}`);
    await this.redisService.del(`${this.USER_PREFIX}${linkData.userId}`);
    await this.clearAwaitingCode(chatId);

    return linkedUser;
  }
}
