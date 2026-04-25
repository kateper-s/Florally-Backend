import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UserService } from "../user/user.service";
import { CreateUserDto, SignInDto } from "src/dtos/user.dto";
import { checkPassword, encryptPassword } from "src/utils/auth.utils";
import { RedisService } from "../redis/redis.service";
import { MailerService } from "@nestjs-modules/mailer";
import { Interval } from "@nestjs/schedule";
import { FRONT_API_URL } from "src/config/url.config";
import * as crypto from "crypto";

@Injectable()
export class AuthService {
  private readonly RECOVERY_PREFIX = "recovery:";
  private readonly VERIFIED_PREFIX = "verified:";
  private readonly CONFIRM_PREFIX = "confirm:";
  private readonly CONFIRM_TTL = 36000;
  private readonly RECOVERY_CODE_TTL = 600;
  private readonly VERIFIED_TOKEN_TTL = 300;
  private isCleanupRunning = false;

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly mailerService: MailerService,
  ) {}

  @Interval(60 * 60 * 1000)
  async cleanupUnconfirmedUsers() {
    if (this.isCleanupRunning) return;
    this.isCleanupRunning = true;

    try {
      const confirmKeys = await this.redisService.keys(`${this.CONFIRM_PREFIX}*`);
      const now = Date.now();

      for (const key of confirmKeys) {
        try {
          const tokenDataStr = await this.redisService.get(key);
          if (!tokenDataStr) continue;

          const tokenData = JSON.parse(tokenDataStr);
          if (!tokenData.userId || !tokenData.createdAt) {
            await this.redisService.del(key);
            continue;
          }

          const createdAt = new Date(tokenData.createdAt).getTime();
          const ageInHours = (now - createdAt) / (1000 * 60 * 60);
          
          if (ageInHours > 10) {
            const user = await this.userService.getById(tokenData.userId).catch(() => null);
            if (user && !user.is_enabled) {
              await this.userService.deleteUser(tokenData.userId);
            }
            await this.redisService.del(key);
          }
        } catch (error) {
          console.error(`Error processing key ${key}:`, error.message);
        }
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    } finally {
      this.isCleanupRunning = false;
    }
  }

  async signUp(createUserDto: CreateUserDto) {
    const existingUser = await this.userService.getByEmail(createUserDto.email);
    if (existingUser) {
      throw new HttpException(
        "Пользователь с таким email уже существует",
        HttpStatus.BAD_REQUEST,
      );
    }

    const hashedPassword = await encryptPassword(createUserDto.password);
    const user = await this.userService.create({
      ...createUserDto,
      password: hashedPassword,
      is_enabled: false,
    });

    const confirmationToken = crypto.randomBytes(14).toString('hex');
    const confirmKey = `${this.CONFIRM_PREFIX}${confirmationToken}`;
    
    await this.redisService.set(
      confirmKey,
      {
        userId: user.id,
        email: user.email,
        createdAt: new Date().toISOString(),
      },
      this.CONFIRM_TTL
    );

    const confirmationLink = `${FRONT_API_URL}/auth/signup/confirmation/${confirmationToken}`;

    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: 'Подтверждение регистрации',
        text: `Здравствуйте, ${user.username}!\n\nДля подтверждения регистрации перейдите по ссылке:\n${confirmationLink}\n\nСсылка действительна в течение 10 часов.`,
        html: `
          <div class="header">
            <h1>Florally</h1>
          </div>
          <div class="content">
            <h2>Добро пожаловать, ${user.username}!</h2>
            <p>Спасибо за регистрацию на Florally - вашем персональном помощнике по уходу за растениями!</p>
            <p>Для подтверждения email и активации аккаунта нажмите на кнопку ниже:</p>
            <div style="text-align: center;">
              <a href="${confirmationLink}" class="button">Подтвердить email</a>
            </div>
            <p>Или скопируйте ссылку: <br> <small>${confirmationLink}</small></p>
            <p>Ссылка действительна в течение 10 часов.</p>
            <p>Если вы не регистрировались на Florally, просто проигнорируйте это письмо.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Florally. Все права защищены.</p>
            <p>С заботой о ваших растениях ❤️</p>
          </div>
        `,
      });
    } catch (error) {
      await this.userService.deleteUser(user.id);
      await this.redisService.del(confirmKey);
      throw new HttpException(
        'Ошибка при отправке письма подтверждения',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return {
      success: true,
      message: "Регистрация успешна. Проверьте email для подтверждения.",
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        is_enabled: user.is_enabled,
      },
    };
  }

  async confirmEmail(token: string) {
    const confirmKey = `${this.CONFIRM_PREFIX}${token}`;
    const tokenDataStr = await this.redisService.get(confirmKey);

    if (!tokenDataStr) {
      throw new HttpException(
        "Ссылка подтверждения недействительна или истек срок действия",
        HttpStatus.BAD_REQUEST,
      );
    }

    const tokenData = JSON.parse(tokenDataStr);
    const user = await this.userService.getById(tokenData.userId).catch(() => {
      throw new HttpException("Пользователь не найден", HttpStatus.BAD_REQUEST);
    });

    if (user.is_enabled) {
      await this.redisService.del(confirmKey);
      return {
        success: true,
        message: "Email уже был подтвержден ранее. Вы можете войти в систему.",
      };
    }

    const updated = await this.userService.activateUser(tokenData.userId);
    if (!updated) {
      throw new HttpException("Ошибка при активации пользователя", HttpStatus.INTERNAL_SERVER_ERROR);
    }

    await this.redisService.del(confirmKey);
    return {
      success: true,
      message: "Email успешно подтвержден. Теперь вы можете войти в систему.",
    };
  }

  async signIn(signInDto: SignInDto) {
    const user = await this.userService.getByEmail(signInDto.email);

    if (!user) {
      throw new HttpException("Такого пользователя не существует", HttpStatus.NOT_FOUND);
    }

    if (!user.is_enabled) {
      throw new HttpException("Email не подтвержден. Проверьте почту для подтверждения регистрации", HttpStatus.FORBIDDEN);
    }

    if (!(await checkPassword(signInDto.password, user.password))) {
      throw new HttpException("Неверные данные для входа", HttpStatus.BAD_REQUEST);
    }

    const payload = { sub: user.id, username: user.username, email: user.email };
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: { id: user.id, email: user.email, username: user.username },
    };
  }

  async sendVerificationEmail(email: string, username?: string) { 
    const user = await this.userService.getByEmail(email);
    if (!user) {
      throw new HttpException("Пользователь не найден", HttpStatus.NOT_FOUND);
    }

    const displayName = username || user.username || "Пользователь";
    const isActive = await this.userService.isUserActive(email);
    if (!isActive) {
      throw new HttpException("Пользователь не активирован или заблокирован", HttpStatus.FORBIDDEN);
    }

    const code = crypto.randomInt(100000, 999999).toString();
    const recoveryKey = `${this.RECOVERY_PREFIX}${email}`;
    
    await this.redisService.set(
      recoveryKey,
      { code, username: displayName, createdAt: new Date().toISOString() },
      this.RECOVERY_CODE_TTL
    );

    const verifiedKey = `${this.VERIFIED_PREFIX}${email}`;
    await this.redisService.del(verifiedKey);

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Восстановление пароля',
        text: `Здравствуйте, ${displayName}!\n\nВаш код для восстановления пароля: ${code}\n\nКод действителен в течение 5 минут.`,
        html: `
          <h1>Florally</h1>
          <div class="content">
            <h2>Здравствуйте, ${displayName}!</h2>
            <p>Вы запросили восстановление пароля на Florally.</p>
            <p>Ваш код для восстановления:</p>
            <div class="code">${code}</div>
            <p>Введите этот код в приложении для смены пароля.</p>
            <p>Код действителен в течение 5 минут.</p>
            <p>Если вы не запрашивали восстановление пароля, просто проигнорируйте это письмо. Ваш аккаунт в безопасности.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Florally. Все права защищены.</p>
            <p>С заботой о ваших растениях ❤️</p>
          </div>`
      });
    } catch (error) {
      await this.redisService.del(recoveryKey);
      throw new HttpException("Ошибка при отправке кода на email", HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return { success: true, message: "Код отправлен на email" };
  }

  async checkVerificationCode(email: string, code: string) {
    const recoveryKey = `${this.RECOVERY_PREFIX}${email}`;
    const recoveryDataStr = await this.redisService.get(recoveryKey);

    if (!recoveryDataStr) {
      throw new HttpException("Код не найден", HttpStatus.BAD_REQUEST);
    }

    const recoveryData = JSON.parse(recoveryDataStr);
    if (recoveryData.code !== code) {
      throw new HttpException("Неверный код", HttpStatus.BAD_REQUEST);
    }

    await this.redisService.del(recoveryKey);
    const verifiedKey = `${this.VERIFIED_PREFIX}${email}`;
    await this.redisService.set(
      verifiedKey,
      { email, verifiedAt: new Date().toISOString(), username: recoveryData.username },
      this.VERIFIED_TOKEN_TTL
    );

    return { success: true, message: "Код подтвержден", verified: true };
  }

  async recoverPassword(email: string, newPassword: string) {
    const verifiedKey = `${this.VERIFIED_PREFIX}${email}`;
    const verifiedDataStr = await this.redisService.get(verifiedKey);

    if (!verifiedDataStr) {
      throw new HttpException("Код не был подтвержден", HttpStatus.BAD_REQUEST);
    }

    const user = await this.userService.getByEmail(email);
    if (!user) {
      throw new HttpException("Пользователь не найден", HttpStatus.NOT_FOUND);
    }

    const hashedPassword = await encryptPassword(newPassword);
    await this.userService.updatePassword(user.id, hashedPassword);

    await this.redisService.del(verifiedKey);

    return { success: true, message: "Пароль успешно изменен" };
  }
}