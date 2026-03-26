import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './comments.entity';
import { UserPlant } from '../users_plants/users_plants.entity';
import { CreateCommentsDto, UpdateCommentsDto } from '../dtos/comments.dto';

@Injectable()
export class CommentsService {
    constructor(
        @InjectRepository(Comment)
        private readonly commentRepository: Repository<Comment>,
        @InjectRepository(UserPlant)
        private readonly userPlantRepository: Repository<UserPlant>,
    ) {}

    async createComment(dto: CreateCommentsDto, userId: string): Promise<Comment> {
        const userPlant = await this.userPlantRepository.findOne({
            where: { id: dto.user_plant_id, user: { id: userId } },
        });
        if (!userPlant) {
            throw new NotFoundException('UserPlant not found or not owned by you');
        }

        const newComment = this.commentRepository.create({
            userPlant: { id: dto.user_plant_id },
            text: dto.text,
        });

        return this.commentRepository.save(newComment);
    }

    async findAllForUserPlant(userPlantId: string, userId: string): Promise<Comment[]> {
        const userPlant = await this.userPlantRepository.findOne({
            where: { id: userPlantId, user: { id: userId } },
        });
        if (!userPlant) {
            throw new NotFoundException('UserPlant not found or not owned by you');
        }

        return this.commentRepository.find({
            where: { userPlant: { id: userPlantId } },
        });
    }

    async findOneComment(id: string, userId: string): Promise<Comment> {
        const comment = await this.commentRepository.findOne({
            where: {
                id: id,
                userPlant: { user: { id: userId } },
            },
            relations: ['userPlant', 'userPlant.plant'],
        });

        if (!comment) {
            throw new NotFoundException(`Comment with ID ${id} not found`);
        }

        return comment;
    }

    async findOneCommentForUpdate(id: string, userId: string): Promise<Comment> {
        const comment = await this.commentRepository.findOne({
            where: {
                id: id,
                userPlant: { user: { id: userId } },
            },
        });

        if (!comment) {
            throw new NotFoundException(`Comment with ID ${id} not found`);
        }

        return comment;
    }

    async updateComment(id: string, userId: string, dto: UpdateCommentsDto): Promise<Comment> {
        const comment = await this.findOneCommentForUpdate(id, userId);

        if (dto.text) {
            comment.text = dto.text;
        }

        return this.commentRepository.save(comment);
    }

    async removeComment(id: string, userId: string): Promise<void> {
        const comment = await this.findOneCommentForUpdate(id, userId);
        await this.commentRepository.remove(comment);
    }
}