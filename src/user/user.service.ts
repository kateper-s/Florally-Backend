import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "./user.entity";
import { Repository } from "typeorm";
import { CreateUserDto, UpdateUserDto, ChangePasswordDto } from "src/dtos/user.dto";
import { checkPassword, encryptPassword } from "src/utils/auth.utils";

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(dto: CreateUserDto) {
    const newUserEmail = dto.email;
    const newUsername = dto.username;

    if (await this.getByEmail(newUserEmail)) {
      throw new HttpException(
        "Пользователь с такой почтой уже существует!",
        HttpStatus.BAD_REQUEST,
      );
    }

    if (await this.getByUsername(newUsername)) {
      throw new HttpException(
        "Имя пользователя уже занято",
        HttpStatus.BAD_REQUEST,
      );
    }

    const hashedPassword = await encryptPassword(dto.password);

    const newUser = this.userRepository.create({
      email: newUserEmail,
      username: newUsername,
      password: hashedPassword,
      is_enabled: true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return await this.userRepository.save(newUser);
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.getById(id);

    if (dto.username) {
      if (!(await this.getByUsername(dto.username))) {
        user.username = dto.username;
      } else {
        throw new HttpException(
          "Имя пользователя уже занято",
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    if (dto.email) {
      if (!(await this.getByEmail(dto.email))) {
        user.email = dto.email;
      } else {
        throw new HttpException(
          "Email уже используется",
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    if (dto.password) {
      user.password = await encryptPassword(dto.password);
    }

    user.updated_at = new Date();
    return await this.userRepository.save(user);
  }

  async getById(id: string) {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new HttpException("Пользователь не найден", HttpStatus.NOT_FOUND);
    }
    delete user.password;
    return user;
  }

  async getByEmail(email: string) {
    return await this.userRepository.findOneBy({ email });
  }

  async getByUsername(username: string) {
    return await this.userRepository.findOneBy({ username });
  }

  async updatePassword(userId: string, hashedPassword: string) {
    const user = await this.getById(userId);
    user.password = hashedPassword;
    await this.userRepository.save(user);
    return true;
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.getById(userId);

    const isOldPasswordValid = await checkPassword(dto.oldPassword, user.password);
    if (!isOldPasswordValid) {
      throw new HttpException('Неверный старый пароль', HttpStatus.BAD_REQUEST);
    }

    const isSamePassword = await checkPassword(dto.newPassword, user.password);
    if (isSamePassword) {
      throw new HttpException('Новый пароль должен отличаться от старого', HttpStatus.BAD_REQUEST);
    }

    user.password = await encryptPassword(dto.newPassword);
    await this.userRepository.save(user);
    return { message: 'Пароль успешно изменён' };
  }

  async isUserActive(email: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { email },
      select: ["is_enabled"],
    });

    return !!user?.is_enabled;
  }
  
}
