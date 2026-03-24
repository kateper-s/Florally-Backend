import { IsString, IsOptional, IsArray } from 'class-validator';

export class CreateUserRoomDto {
  @IsString()
  name: string;

  @IsArray()
  @IsOptional()
  userPlantIds?: string[];
}

export class UpdateUserRoomDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsArray()
  @IsOptional()
  userPlantIds?: string[];
}
