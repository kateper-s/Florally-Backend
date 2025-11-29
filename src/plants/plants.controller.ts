import { Controller, Get, Post, Body, Param, Delete, ParseIntPipe, Query} from '@nestjs/common';
import { PlantsService } from './plants.service';
import { CreatePlantDto } from '../dtos/plants.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('plants')
@Controller('plants')
export class PlantsController {
    constructor (private readonly plantsService: PlantsService) {}

    @Get()
    @ApiOperation({ summary: 'Get all plants' })
    async getAllPlants() {
        return await this.plantsService.getAllPlants();
    }

    @Get('season/:season')
    @ApiOperation({summary: 'Get plants by season' })
    async getPlantsBySeason(@Param('season') season: string) {
        return this.plantsService.getPlantsBySeason(season);
    }

    @Get(':id')
    @ApiOperation({summary: 'Get a plant by ID'})
    async getPlantById(@Param('id') id: string) {
        return this.plantsService.getPlantById(id);
    }
}