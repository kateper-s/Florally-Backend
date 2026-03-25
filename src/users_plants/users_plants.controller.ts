import { Controller, Post, Get, Patch, Delete, Body, Param, Request, UseGuards, ParseIntPipe } from '@nestjs/common';
import { UserPlantsService } from './users_plants.service';
import { CreateUserPlantDto, UpdateUserPlantDto} from '../dtos/users_plants.dto'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guard/jwt-auth.guard'

@ApiBearerAuth()
@ApiTags('user plants')
@UseGuards(JwtAuthGuard)
@Controller('users_plants')
export class UserPlantsController {
    constructor(private readonly userPlantsService: UserPlantsService){}

    @Post()
    @ApiOperation({ summary: "Add plant to user's collection" })
    add(@Body() dto: CreateUserPlantDto, @Request() req) {
        const userId = req.user.id;
        return this.userPlantsService.addPlantToUser(dto, userId);
    }
    
    @Get()
    @ApiOperation({ summary: "Returns all plants for current user" })
    findAll(@Request() req) {
        const userId = req.user.id;
        return this.userPlantsService.findAllForUser(userId);
    }

    @Get(':id')
    @ApiOperation({ summary: "Returns specific user plant by id" })
    findOne(@Param('id') id: string, @Request() req) {
        const userId = req.user.id;
        return this.userPlantsService.findOneUserPlant(id, userId);
    }

    @Patch(':id')
    @ApiOperation({ summary: "Update user plant" })
    update(@Param('id') id: string, @Body() dto: UpdateUserPlantDto, @Request() req) {
        const userId = req.user.id;
        return this.userPlantsService.updateUserPlant(id, userId, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: "Remove plant from user's collection" })
    remove(@Param('id') id: string, @Request() req) {
        const userId = req.user.id;
        return this.userPlantsService.removeUserPlant(id, userId);
    }
}