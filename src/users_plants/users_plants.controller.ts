import { Controller, Post, Get, Patch, Delete, Body, Param, Request, UseGuards, ParseIntPipe } from '@nestjs/common';
import { UserPlantsService } from './users_plants.service';

@Controller('users_plants')
export class UserPlantsController {
    constructor(private readonly userPlantsService: UserPlantsService){}

    
}