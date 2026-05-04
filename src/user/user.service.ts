import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "./user.entity";
import { Repository } from "typeorm";
import { CreateUserInternalDto, UpdateUserDto } from "src/dtos/user.dto";
import { checkPassword, encryptPassword } from "src/utils/auth.utils";

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(dto: CreateUserInternalDto) {
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

    const newUser = this.userRepository.create({
      email: newUserEmail,
      username: newUsername,
      password: dto.password,
      is_enabled: false,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return await this.userRepository.save(newUser);
  }

  async update(id: string, dto: UpdateUserDto) {
      const user = await this.getByIdWithPassword(id);
      
      if (!user) {
          throw new HttpException("Пользователь не найден", HttpStatus.NOT_FOUND);
      }

      if (dto.password) {
          if (!dto.oldPassword) {
              throw new HttpException("Необходимо указать старый пароль для смены", HttpStatus.BAD_REQUEST);
          }

          const isOldPasswordValid = await checkPassword(dto.oldPassword, user.password);
          if (!isOldPasswordValid) {
              throw new HttpException("Неверный старый пароль", HttpStatus.BAD_REQUEST);
          }

          const isSamePassword = await checkPassword(dto.password, user.password);
          if (isSamePassword) {
              throw new HttpException("Новый пароль должен отличаться от старого", HttpStatus.BAD_REQUEST);
          }
          
          user.password = await encryptPassword(dto.password);
      }

      if (dto.username && dto.username !== user.username) {
          const existing = await this.userRepository.findOne({
              where: { username: dto.username }
          });
          if (existing && existing.id !== id) {
              throw new HttpException("Имя пользователя уже занято", HttpStatus.BAD_REQUEST);
          }
          user.username = dto.username;
      }

      if (dto.email && dto.email !== user.email) {
          const existing = await this.userRepository.findOne({
              where: { email: dto.email }
          });
          if (existing && existing.id !== id) {
              throw new HttpException("Email уже используется", HttpStatus.BAD_REQUEST);
          }
          user.email = dto.email;
      }

      user.updated_at = new Date();
      
      const savedUser = await this.userRepository.save(user);
      console.log("Saved user ID:", savedUser.id);

      const { password, ...result } = savedUser;
      return result;
  }

  async getById(id: string) {
    if (!id) {
      throw new HttpException("ID пользователя не определен", HttpStatus.BAD_REQUEST);
    }
    const user = await this.userRepository.findOne({
      where: { id: id },
      select: ["id", "email", "username", "is_enabled", "created_at", "updated_at", "telegramChatId"]
    });
    
    if (!user) {
      throw new HttpException("Пользователь не найден", HttpStatus.NOT_FOUND);
    }
    
    return user;
  }

  async getByIdWithPassword(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      select: ["id", "email", "username", "password", "is_enabled", "created_at", "updated_at", "telegramChatId"]
    });
    
    if (!user) {
      throw new HttpException("Пользователь не найден", HttpStatus.NOT_FOUND);
    }
    
    return user;
  }

  async getByEmail(email: string) {
    return await this.userRepository.findOneBy({ email });
  }

  async getByUsername(username: string) {
    return await this.userRepository.findOneBy({ username });
  }

  async getByTelegramChatId(chatId: string) {
    return await this.userRepository.findOne({
      where: { telegramChatId: chatId },
    });
  }

  async setTelegramChatId(userId: string, chatId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new HttpException("Пользователь не найден", HttpStatus.NOT_FOUND);
    }

    user.telegramChatId = chatId;
    user.updated_at = new Date();
    return await this.userRepository.save(user);
  }

  async updatePassword(userId: string, hashedPassword: string) {
    const user = await this.getByIdWithPassword(userId);
    user.password = hashedPassword;
    await this.userRepository.save(user);
    return true;
  }

  async isUserActive(email: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { email },
      select: ["is_enabled"],
    });

    return !!user?.is_enabled;
  }
  
  async deleteUser(userId: string) {
    const user = await this.getById(userId);
    if (user) {
      await this.userRepository.remove(user);
      return true;
    }
    return false;
  }

  async activateUser(userId: string) {
    const user = await this.getById(userId);
    user.is_enabled = true;
    await this.userRepository.save(user);
    return true;
  }
}