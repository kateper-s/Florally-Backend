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
    const hashedPassword = await encryptPassword(createUserDto.password);

    const user = await this.userService.create({
      ...createUserDto,
      password: hashedPassword,
    });

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

    if (!(await checkPassword(signInDto, user.password))) {
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
}
