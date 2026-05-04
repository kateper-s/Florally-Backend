import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserModule } from "./user/user.module";
import { User } from "./user/user.entity";
import { ConfigModule } from "@nestjs/config";
import { Plant } from "./plants/plants.entity";
import { Event } from "./events/events.entity";
import { UserPlant } from "./users_plants/users_plants.entity";
import { PlantsModule } from "./plants/plants.module";
import { EventModule } from "./events/events.module";
import { UserPlantsModule } from "./users_plants/users_plants.module"
import { RedisModule } from "./redis/redis.module";
import { MailerModule } from "./mailer/mailer.module";
import { UserRoom } from "./user_rooms/user_rooms.entity";
import { UserRoomsModule } from "./user_rooms/user_rooms.module";
import { CommentModule } from "./comments/comments.module";
import { Comment } from "./comments/comments.entity";
import { TelegramModule } from "./telegram/telegram.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: "postgres",
      host: process.env.PG_HOST,
      port: Number(process.env.PG_PORT),
      username: process.env.PG_USERNAME,
      password: process.env.PG_PASSWORD,
      database: process.env.PG_DATABASE,
      entities: [User, Plant, Event, UserPlant, UserRoom,Comment],
      synchronize: true,
      // autoLoadEntities: true
    }),
    AuthModule,
    UserModule,
    PlantsModule,
    EventModule,
    RedisModule,
    MailerModule,
    UserPlantsModule,
    UserRoomsModule,
    CommentModule,
    TelegramModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
