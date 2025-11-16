import { HttpException, Injectable } from "@nestjs/common";
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Repository } from 'typeorm';
import { CreateUserDto } from 'src/dtos/create-user.dto';
import { Role } from "./user.types";


@Injectable()
export class UserService {
    constructor(@InjectRepository(User)
    private readonly userRepository: Repository<User>) { }

    async create(dto: CreateUserDto) {
        const newUserEmail = dto.email;
        const newUserPassword = dto.password;
        if (await this.getByEmail(newUserEmail))
          throw new HttpException(
            "Пользователь с такой почтой уже существует!",
            HttpStatus.BAD_REQUEST,
          );

        const newUser = this.userRepository.create({
          email: newUserEmail,
          password: await encryptPassword(newUserPassword),
          regDate: new Date(),
          role: Role.BasicUser,
        });
        return await this.userRepository.save(newUser);
      }

     async getById(id: string)
     {
       try
       {
         const user = await this.userRepository.findOneBy({ id: id });
         delete user.password;
         return user;
       }
        catch
       {
         throw new HttpException("Пользователь не найден", HttpStatus.NOT_FOUND);
       }
     }

    async getByEmail(email: string) {
        return await this.userRepository.findOneBy({ email: email });
    }

}
