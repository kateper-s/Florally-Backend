import { IsString, IsOptional } from 'class-validator';

export class CreateUserPlantDto {
  @IsString()
  plantId: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  roomId?: string;
}

export class UpdateUserPlantDto {
  @IsString()
  @IsOptional()
  plantId?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  roomId?: string;
}

export class CreateCustomUserPlantDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  season?: string;

  @IsString()
  @IsOptional()
  photo?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  roomId?: string;
}
