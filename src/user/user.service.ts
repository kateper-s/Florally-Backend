import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "./user.entity";
import { Repository } from "typeorm";
import { CreateUserDto, UpdateUserDto } from "src/dtos/user.dto";

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(dto: CreateUserDto) {
    const newUserEmail = dto.email;
    const newUserPassword = dto.password;
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
      password: newUserPassword,
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
      user.password = dto.password;
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
}
