import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UserService } from "../user/user.service";
import { CreateUserDto, SignInDto } from "src/dtos/user.dto";
import { checkPassword, encryptPassword } from "src/utils/auth.utils";
import { RedisService } from "../redis/redis.service";
import * as crypto from "crypto";

@Injectable()
export class AuthService {
  private readonly RECOVERY_PREFIX = "recovery:";
  private readonly VERIFIED_PREFIX = "verified:";

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {}

  async signUp(createUserDto: CreateUserDto) {
    if (createUserDto.password.length < 6) {
      throw new HttpException(
        "Пароль должен содержать минимум 6 символов",
        HttpStatus.BAD_REQUEST,
      );
    }

    console.log("Original password:", createUserDto.password);
    const hashedPassword = await encryptPassword(createUserDto.password);
    console.log("Hashed password:", hashedPassword);

    const user = await this.userService.create({
      ...createUserDto,
      password: hashedPassword,
    });

    console.log("User created with hashed password");

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

  async signIn(signInDto: SignInDto) {
    const user = await this.userService.getByEmail(signInDto.email);
    if (!user) {
      throw new HttpException(
        "Такого пользователя не существует",
        HttpStatus.NOT_FOUND,
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
    );

    const verifiedKey = `${this.VERIFIED_PREFIX}${email}`;
    await this.redisService.del(verifiedKey);

    console.log(`Код восстановления для ${email}: ${code}`);

    return {
      success: true,
      message: "Код отправлен на email",
      code: code, // Только для разработки, в проде убрать
    };
  }

  async checkVerificationCode(email: string, code: string) {
    const recoveryKey = `${this.RECOVERY_PREFIX}${email}`;
    const recoveryDataStr = await this.redisService.get(recoveryKey);

    if (!recoveryDataStr) {
      throw new HttpException("Код не найден", HttpStatus.BAD_REQUEST);
    }

    // Парсим строку JSON
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

    // Парсим строку JSON
    let verifiedData;
    try {
      verifiedData = JSON.parse(verifiedDataStr);
    } catch (error) {
      throw new HttpException(
        "Ошибка данных верификации",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    if (!newPassword || newPassword.trim().length === 0) {
      throw new HttpException(
        "Пароль не может быть пустым",
        HttpStatus.BAD_REQUEST,
      );
    }

    if (newPassword.length < 6) {
      throw new HttpException(
        "Пароль должен содержать минимум 6 символов",
        HttpStatus.BAD_REQUEST,
      );
    }

    const passwordUpdated = await this.userService.updatePassword(
      email,
      newPassword,
    );

    if (!passwordUpdated) {
      throw new HttpException(
        "Ошибка при обновлении пароля",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const recoveryKey = `${this.RECOVERY_PREFIX}${email}`;
    await this.redisService.del(recoveryKey);
    await this.redisService.del(verifiedKey);

    console.log(`Пароль успешно изменен для ${email}`);

    return {
      success: true,
      message: "Пароль успешно изменен",
    };
  }
}
