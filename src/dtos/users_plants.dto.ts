import { IsString, IsOptional } from 'class-validator';

export class CreateUserPlantDto {
  @IsString()
  plantId: string;

  @IsString()
  @IsOptional()
  color?: string;
}

export class UpdateUserPlantDto {
  @IsString()
  @IsOptional()
  color?: string;
}
