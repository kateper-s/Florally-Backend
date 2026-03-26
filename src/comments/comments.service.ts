import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './comments.entity';
import {  CreateCommentsDto, UpdateCommentsDto } from '../dtos/comments.dto';

@Injectable()
export class CommentsService {
    constructor(
        @InjectRepository(Comment)
        private readonly commentRepository: Repository<Comment>,
    ) {}
    
    async createComment(dto: CreateCommentsDto, userId: string): Promise<Comment> {
        const newComment = this.commentRepository.create({
            userPlant: {id: dto.user_plant_id},
            text: dto.text
        })

        return this.commentRepository.save(newComment);
    }

    async findAllForUserPlant(userPlantId: string): Promise<Comment[]> {
        return this.commentRepository.find({
        where: { userPlant: { id: userPlantId } },
        });
    }
    
    async findOneComment(id: string, userId: string): Promise<Comment> {
        const comment = await this.commentRepository.findOne({
        where: { 
            id: id, 
            userPlant: { user: { id: userId } }
        },
        relations: ['userPlant', 'userPlant.plant']
        });

        if (!comment) {
        throw new NotFoundException(`Comment with ID ${id} not found`);
        }
        
        return comment;
    }

    async updateComment(
        id: string, 
        userId: string, 
        dto: UpdateCommentsDto
    ): Promise<Comment> {
        const comment = await this.findOneComment(id, userId);
        
        if (dto.text) {
        comment.text = dto.text; // обновляем дату изменения
        }
        
        return this.commentRepository.save(comment);
    }

    async removeComment(id: string, userId: string): Promise<void> {
        const comment = await this.commentRepository.findOne({ 
        where: { 
            id: id, 
            userPlant: { user: { id: userId } }
        }
        });

        if (!comment) {
        throw new NotFoundException(`Comment with ID ${id} not found`);
        }
        
        await this.commentRepository.remove(comment);
    }
}