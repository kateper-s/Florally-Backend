import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UserService } from "../user/user.service";
import { CreateUserDto, SignInDto } from "src/dtos/user.dto";
import { checkPassword, encryptPassword } from "src/utils/auth.utils";

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
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

  async sendVerificationEmail(email: string, username: string) {}

  async checkVerificationCode(email: string, code: string) {}

  async recoverPassword(email: string, newPassword: string) {}
}
