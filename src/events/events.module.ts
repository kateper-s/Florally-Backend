import { Module } from "@nestjs/common";
import { EventController } from "./evetns.controller";
import { EventService } from "./events.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Event } from "./events.entity";
import { JwtAuthGuard } from "src/guard/jwt-auth.guard";

@Module({
  imports: [TypeOrmModule.forFeature([Event])],
  controllers: [EventController],
  providers: [EventService, JwtAuthGuard],
  exports: [EventService, TypeOrmModule],
})
export class EventModule {}
