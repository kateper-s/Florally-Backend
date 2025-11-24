import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { PlantsService } from './plants.service';
import { CreatePlantDto } from '../dtos/plants.dto';

@Controller('plants')
export class PlantsController {
    constructor (private readonly plantsService: PlantsService) {}

}