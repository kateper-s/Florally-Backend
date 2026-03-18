import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UserService } from "../user/user.service";
import { CreateUserDto, SignInDto } from "src/dtos/user.dto";
import { checkPassword, encryptPassword } from "src/utils/auth.utils";
import { RedisService } from "../redis/redis.service";
import { MailerService } from "@nestjs-modules/mailer";
import { Interval } from "@nestjs/schedule";
import { API_URL } from "src/config/url.config";
import * as crypto from "crypto";

@Injectable()
export class AuthService {
  private readonly RECOVERY_PREFIX = "recovery:";
  private readonly VERIFIED_PREFIX = "verified:";
  private readonly CONFIRM_PREFIX = "confirm:";
  private readonly CONFIRM_TTL = 36000;
  private readonly CLEANUP_INTERVAL = 24 * 60 * 60 * 1000;
  private isCleanupRunning = false;

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly mailerService: MailerService,
  ) {}

  /*
   * Очистка неподтвержденных пользователей
   * Запускается каждые 24 часа
   */
  @Interval(24 * 60 * 60 * 1000)
  async cleanupUnconfirmedUsers() {
    if (this.isCleanupRunning) {
      console.log('Очистка уже выполняется');
      return;
    }

    this.isCleanupRunning = true;
    console.log('Запуск плановой очистки неподтвержденных пользователей...');
    const startTime = Date.now();

    try {
      const confirmKeys = await this.redisService.keys(`${this.CONFIRM_PREFIX}*`);
      console.log(`Найдено ключей подтверждения: ${confirmKeys.length}`);
      
      const now = Date.now();
      let deletedCount = 0;
      let errorCount = 0;

      for (const key of confirmKeys) {
        try {
          const tokenDataStr = await this.redisService.get(key);
          if (!tokenDataStr) {
            continue;
          }

          const tokenData = JSON.parse(tokenDataStr);
          
          if (!tokenData.userId || !tokenData.createdAt) {
            console.warn(`Невалидные данные для ключа ${key}`);
            await this.redisService.del(key);
            continue;
          }
          const createdAt = new Date(tokenData.createdAt).getTime();
          const ageInHours = (now - createdAt) / (1000 * 60 * 60);
          
          if (ageInHours > 10) {
            try {
              const user = await this.userService.getById(tokenData.userId).catch(() => null);
              
              if (user && !user.is_enabled) {
                await this.userService.deleteUser(tokenData.userId);
                console.log(`Удален неподтвержденный пользователь: ${user.email} (ID: ${user.id})`);
                deletedCount++;
              } else if (user && user.is_enabled) {
                console.log(`Пользователь ${user.email} уже подтвержден, удаляем ключ`);
              }

              await this.redisService.del(key);
                  
            } catch (error) {
              console.error(`Ошибка при обработке пользователя ${tokenData.userId}:`, error.message);
              errorCount++;

              if (error.status === 404) {
                await this.redisService.del(key);
              }
            }
          }
        } catch (error) {
          console.error(`Ошибка при обработке ключа ${key}:`, error.message);
          errorCount++;
        }
      }

      const duration = (Date.now() - startTime) / 1000;
      console.log(`Очистка завершена за ${duration.toFixed(2)}с. Удалено: ${deletedCount}, ошибок: ${errorCount}`);
            
    } catch (error) {
      console.error('Критическая ошибка при очистке:', error);
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

    console.log("Original password:", createUserDto.password);
    const hashedPassword = await encryptPassword(createUserDto.password);
    console.log("Hashed password:", hashedPassword);

    const user = await this.userService.create({
      ...createUserDto,
      password: hashedPassword,
      is_enabled: false,
    });

    const confirmationToken = crypto.randomBytes(14).toString('hex');

    const confirmKey = `${this.CONFIRM_PREFIX}${confirmationToken}`;
    await this.redisService.set(
      confirmKey,
      JSON.stringify({
        userId: user.id,
        email: user.email,
        createdAt: new Date().toISOString(),
      }),
      this.CONFIRM_TTL
    );

    const confirmationLink = `${API_URL}/auth/signup/confirmation/${confirmationToken}`;

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
      console.error('Ошибка отправки email подтверждения:', error);
      await this.userService.deleteUser(user.id);
      await this.redisService.del(confirmKey);
      throw new HttpException(
        'Ошибка при отправке письма подтверждения',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    
    console.log("User created with hashed password");

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

    let tokenData;
    try {
      tokenData = JSON.parse(tokenDataStr);
    } catch (error) {
      throw new HttpException(
        "Ошибка данных подтверждения",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const user = await this.userService.getById(tokenData.userId).catch(() => null);
    if (!user) {
      await this.redisService.del(confirmKey);
      throw new HttpException(
        "Пользователь не найден",
        HttpStatus.BAD_REQUEST,
      );
    }

    const updated = await this.userService.activateUser(tokenData.userId);
    
    if (!updated) {
      throw new HttpException(
        "Ошибка при активации пользователя",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
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
      throw new HttpException(
        "Такого пользователя не существует",
        HttpStatus.NOT_FOUND,
      );
    }

    if (!user.is_enabled) {
      throw new HttpException(
        "Email не подтвержден. Проверьте почту для подтверждения регистрации",
        HttpStatus.FORBIDDEN,
      );
    }

    if (!(await checkPassword(signInDto.password, user.password))) {
      throw new HttpException(
        "Неверные данные для входа",
        HttpStatus.BAD_REQUEST,
      );
    }

    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    };
  }

  async sendVerificationEmail(email: string, username: string) {
    const user = await this.userService.getByEmail(email);

    if (!user) {
      throw new HttpException("Пользователь не найден", HttpStatus.NOT_FOUND);
    }

    const isActive = await this.userService.isUserActive(email);
    if (!isActive) {
      throw new HttpException(
        "Пользователь не активирован или заблокирован",
        HttpStatus.FORBIDDEN,
      );
    }

    if (user.username !== username) {
      throw new HttpException(
        "Неверное имя пользователя",
        HttpStatus.BAD_REQUEST,
      );
    }

    const code = crypto.randomInt(100000, 999999).toString();

    const recoveryKey = `${this.RECOVERY_PREFIX}${email}`;
    await this.redisService.set(
      recoveryKey,
      JSON.stringify({
        code,
        username,
        createdAt: new Date().toISOString(),
      }),
      600
    );

    const verifiedKey = `${this.VERIFIED_PREFIX}${email}`;
    await this.redisService.del(verifiedKey);

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Восстановление пароля',
        text: `Здравствуйте, ${username}!\n\nВаш код для восстановления пароля: ${code}\n\nКод действителен в течение 5 минут.`,
        html: `
        <h1>Florally</h1>
        </div>
        <div class="content">
          <h2>Здравствуйте, ${username}!</h2>
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
      console.error('Ошибка отправки email:', error);
      await this.redisService.del(recoveryKey);
      throw new HttpException(
        'Ошибка при отправке кода на email',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    console.log(`Код восстановления для ${email}: ${code}`);

    return {
      success: true,
      message: "Код отправлен на email",
    };
  }

  async checkVerificationCode(email: string, code: string) {
    const recoveryKey = `${this.RECOVERY_PREFIX}${email}`;
    const recoveryDataStr = await this.redisService.get(recoveryKey);

    if (!recoveryDataStr) {
      throw new HttpException("Код не найден", HttpStatus.BAD_REQUEST);
    }

    let recoveryData;
    try {
      recoveryData = JSON.parse(recoveryDataStr);
    } catch (error) {
      throw new HttpException(
        "Ошибка данных восстановления",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    if (recoveryData.code !== code) {
      throw new HttpException("Неверный код", HttpStatus.BAD_REQUEST);
    }

    const verifiedKey = `${this.VERIFIED_PREFIX}${email}`;
    await this.redisService.set(
      verifiedKey,
      JSON.stringify({
        email,
        verifiedAt: new Date().toISOString(),
        username: recoveryData.username,
      }),
      300
    );

    return {
      success: true,
      message: "Код подтвержден",
      verified: true,
    };
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

  const recoveryKey = `${this.RECOVERY_PREFIX}${email}`;
  await this.redisService.del(recoveryKey);
  await this.redisService.del(verifiedKey);

  return {
    success: true,
    message: "Пароль успешно изменен",
  };
}
}
