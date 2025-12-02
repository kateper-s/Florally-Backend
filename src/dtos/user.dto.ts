import { IsString, IsEmail, IsOptional } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateUserDto {
  @IsString()
  @ApiProperty({ example: "Name", description: "User's name" })
  username: string;

  @IsEmail()
  @ApiProperty({ example: "123@ya.ru", description: "User's email" })
  email: string;

  @IsString()
  @ApiProperty({ example: "123", description: "User's password" })
  password: string;
}

export class SignInDto {
  @IsEmail()
  @ApiProperty({ example: "123@ya.ru", description: "User's email" })
  email: string;

  @IsString()
  @ApiProperty({ example: "123", description: "User's password" })
  password: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @ApiProperty({ example: "NameNew", description: "User's new name" })
  username: string;

  @IsOptional()
  @IsEmail()
  @ApiProperty({ example: "newemail@ya.ru", description: "User's new email" })
  email: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: "newpassword123",
    description: "User's new password",
  })
  password: string;
}
