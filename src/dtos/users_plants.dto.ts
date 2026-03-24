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
