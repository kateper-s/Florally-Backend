import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "./user.entity";
import { Repository } from "typeorm";
import { CreateUserInternalDto, UpdateUserDto, ChangePasswordDto } from "src/dtos/user.dto";
import { checkPassword, encryptPassword } from "src/utils/auth.utils";
import { UserPlant } from "src/users_plants/users_plants.entity";
import { UserRoom } from "src/user_rooms/user_rooms.entity";

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserPlant)
    private readonly userPlantRepository: Repository<UserPlant>,
    @InjectRepository(UserRoom)
    private readonly userRoomRepository: Repository<UserRoom>,
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
      is_enabled: dto.is_enabled ?? true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return await this.userRepository.save(newUser);
  }

  async update(id: string, dto: UpdateUserDto) {
    let user;
    if (dto.password) {
      user = await this.getByIdWithPassword(id);
    } else {
      user = await this.getById(id);
    }

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
    const user = await this.userRepository.findOne({
      where: { id },
      select: ['id', 'email', 'username', 'is_enabled', 'created_at', 'updated_at']
    });
    
    if (!user) {
      throw new HttpException("Пользователь не найден", HttpStatus.NOT_FOUND);
    }
    
    return user;
  }

  async getByIdWithPassword(id: string) {
  const user = await this.userRepository.findOne({
    where: { id },
    select: ['id', 'email', 'username', 'password', 'is_enabled', 'created_at', 'updated_at']
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

  async updatePassword(userId: string, hashedPassword: string) {
    const user = await this.getByIdWithPassword(userId);
    user.password = hashedPassword;
    await this.userRepository.save(user);
    return true;
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.getByIdWithPassword(userId);

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
  
  async deleteUser(userId: string) {
    const user = await this.getById(userId);
    if (!user) {
      throw new HttpException('Пользователь не найден', HttpStatus.NOT_FOUND);
    }
    
    await this.userPlantRepository.delete({ user: { id: userId } });
    await this.userRoomRepository.delete({ user_id: userId });
    await this.userRepository.remove(user);

    return { message: 'Пользователь успешно удален' };
  }

  async activateUser(userId: string) {
    const user = await this.getById(userId);
    if (!user) {
      throw new HttpException('Пользователь не найден', HttpStatus.NOT_FOUND);
    }
    
    user.is_enabled = true;
    await this.userRepository.save(user);
    return true;
  }
}
