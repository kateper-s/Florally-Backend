import { IsString, IsOptional } from 'class-validator';

export class CreateUserPlantDto {
  @IsString()
  plantId: string;

  @IsString()
  @IsOptional()
  color?: string;
}
