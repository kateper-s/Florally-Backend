import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Event } from "./events.entity";
import { Repository } from "typeorm";
import { CreateEventsDto, UpdateEventsDto } from "src/dtos/events.dto";
import { identity } from "rxjs";

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
  ) {}

  async createEvent(userId: string, dto: CreateEventsDto) {
    const newEvent = this.eventRepository.create({
      name: dto.name,
      completed: dto.completed,
      created_at: new Date(),
      updated_at: new Date(),
      data: dto.date,
      user_id: userId,
      user_plants_id: dto.user_plant_id,
      color: dto.color ?? "#000000",
      description: dto.description ?? "",
    });

    return await this.eventRepository.save(newEvent);
  }

  async deleteEvent(userId: string, eventId: string) {
    const event = await this.eventRepository.findOne({
      where: { id: eventId, user_id: userId },
    });

    if (!event) {
      throw new HttpException("EVENT NOT FOUND", HttpStatus.NOT_FOUND);
    }

    await this.eventRepository.remove(event);
    return { message: "EVENT " + eventId + " DELETED" };
  }

  async getEvents(userId: string) {
    return await this.eventRepository.find({
      where: { user_id: userId },
      order: { created_at: "DESC" },
    });
  }

  async updateEvent(userId: string, eventId: string, dto: UpdateEventsDto) {
    const event = await this.eventRepository.findOne({
      where: { id: eventId, user_id: userId },
    });

    if (!event) {
      throw new HttpException("EVENT NOT FOUND", HttpStatus.NOT_FOUND);
    }

    event.name = dto.name ?? event.name;
    event.completed = dto.completed ?? event.completed;
    event.updated_at = new Date();
    event.data = dto.date ?? event.data;
    event.color = dto.color ?? event.color;
    event.description = dto.description ?? event.description;

    return await this.eventRepository.save(event);
  }

  async getEventById(userId: string, eventId: string) {
    const event = await this.eventRepository.findOne({
      where: { user_id: userId, id: eventId },
    });

    if (!event) {
      throw new HttpException("EVENT NOT FOUND", HttpStatus.NOT_FOUND);
    }

    return event;
  }
}
