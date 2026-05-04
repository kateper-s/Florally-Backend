import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Event } from "src/events/events.entity";
import { JwtAuthGuard } from "src/guard/jwt-auth.guard";
import { UserModule } from "src/user/user.module";
import { User } from "src/user/user.entity";
import { TelegramController } from "./telegram.controller";
import { TelegramLinkService } from "./telegram-link.service";
import { TelegramReminderService } from "./telegram-reminder.service";
import { TelegramService } from "./telegram.service";

@Module({
  imports: [UserModule, TypeOrmModule.forFeature([Event, User])],
  controllers: [TelegramController],
  providers: [TelegramService, TelegramLinkService, TelegramReminderService, JwtAuthGuard],
  exports: [TelegramService, TelegramLinkService],
})
export class TelegramModule {}
