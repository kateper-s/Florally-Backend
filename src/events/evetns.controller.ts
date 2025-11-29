import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Req,
  Param,
  UseGuards,
} from "@nestjs/common";
import { EventService } from "./events.service";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { CreateEventsDto, UpdateEventsDto } from "../dtos/events.dto";
import { JwtAuthGuard } from "../guard/jwt-auth.guard";

@ApiTags("events")
@Controller("events")
@UseGuards(JwtAuthGuard)
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  @ApiOperation({ summary: "Create new event" })
  async createEvent(@Req() req: any, @Body() dto: CreateEventsDto) {
    const userId = req.user.id;
    return await this.eventService.createEvent(userId, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete event" })
  async deleteEvent(@Req() req: any, @Param("id") eventId: string) {
    const userId = req.user.id;
    return await this.eventService.deleteEvent(userId, eventId);
  }

  @Get()
  @ApiOperation({ summary: "Get events" })
  async getEvents(@Req() req: any) {
    const userId = req.user.id;
    return await this.eventService.getEvents(userId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get event by id" })
  async getEventById(@Req() req: any, @Param("id") eventId: string) {
    const userId = req.user.id;
    return await this.eventService.getEventById(userId, eventId);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update event by id" })
  async updateEvent(
    @Req() req: any,
    @Param("id") eventId: string,
    @Body() dto: UpdateEventsDto,
  ) {
    const userId = req.user.id;
    return await this.eventService.updateEvent(userId, eventId, dto);
  }
}
