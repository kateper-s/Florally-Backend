import {IsString, IsOptional} from 'class-validator';

export class CreateCommentsDto {
    @IsString()
    user_plant_id:string;

    @IsString()
    @IsOptional()
    text: string;
}

export class UpdateCommentsDto {
  @IsString()
  @IsOptional()
  text?: string;
}