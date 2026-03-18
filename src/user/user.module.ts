import { Module } from "@nestjs/common";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "./user.entity";
import { UserPlant } from '../users_plants/users_plants.entity';
import { JwtAuthGuard } from "src/guard/jwt-auth.guard";

@Module({
  imports: [TypeOrmModule.forFeature([User, UserPlant])],
  controllers: [UserController],
  providers: [UserService, JwtAuthGuard],
  exports: [UserService, TypeOrmModule],
})
export class UserModule {}
