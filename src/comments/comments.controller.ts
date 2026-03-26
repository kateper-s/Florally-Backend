import { Controller, Post, Body, Put, Delete, Param, Get, UseGuards, Req } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentsDto, UpdateCommentsDto } from '../dtos/comments.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';

@ApiTags('comments')
@Controller('comments')
export class CommentsController {
    constructor(private readonly commentService: CommentsService) {}

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Add a new comment' })
    async addComment(@Body() dto: CreateCommentsDto, @Req() req) {
        const userId = req.user.id;
        return await this.commentService.createComment(dto, userId);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Get a comment by ID' })
    async getCommentById(@Param('id') id: string, @Req() req) {
        const userId = req.user.id;
        return await this.commentService.findOneComment(id, userId);
    }

    @Get('user-plant/:userPlantId')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Get comments by user plant ID' })
    async getCommentsByUserPlantId(@Param('userPlantId') userPlantId: string, @Req() req) {
        const userId = req.user.id;
        return await this.commentService.findAllForUserPlant(userPlantId, userId);
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Update a comment by ID' })
    async updateComment(
        @Param('id') id: string,
        @Body() dto: UpdateCommentsDto,
        @Req() req,
    ) {
        const userId = req.user.id;
        return await this.commentService.updateComment(id, userId, dto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Delete a comment by ID' })
    async deleteComment(@Param('id') id: string, @Req() req) {
        const userId = req.user.id;
        return await this.commentService.removeComment(id, userId);
    }
}