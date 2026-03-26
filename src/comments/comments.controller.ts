// comment.controller.ts
import { Controller, Post, Body, Put, Delete, Param, Query, Get } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentsDto, UpdateCommentsDto } from '../dtos/comments.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('comments')
@Controller('comments')
export class CommentsController {
    constructor(private readonly commentService: CommentsService) {}

    @Post()
    @ApiOperation({ summary: 'Add a new comment' })
    async addComment(
        @Body() dto: CreateCommentsDto,
        @Query('userId') userId: string
    ) {
        return await this.commentService.createComment(dto, userId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a comment by ID' })
    async getCommentById(
        @Param('id') id: string,
        @Query('userId') userId: string
    ) {
        return await this.commentService.findOneComment(id, userId);
    }

    @Get('user-plant/:userPlantId')
    @ApiOperation({ summary: 'Get comments by user plant ID' })
    async getCommentsByUserPlantId(@Param('userPlantId') userPlantId: string) {
        return await this.commentService.findAllForUserPlant(userPlantId);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update a comment by ID' })
    async updateComment(
        @Param('id') id: string,
        @Query('userId') userId: string,
        @Body() dto: UpdateCommentsDto
    ) {
        return await this.commentService.updateComment(id, userId, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a comment by ID' })
    async deleteComment(
        @Param('id') id: string,
        @Query('userId') userId: string
    ) {
        return await this.commentService.removeComment(id, userId);
    }
}