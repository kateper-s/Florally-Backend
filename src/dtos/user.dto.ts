import { IsString, IsEmail, IsOptional, MinLength } from "class-validator";
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

export class SendVerificationDto {
  @IsEmail()
  @ApiProperty({ example: "user@example.com", description: "User's email" })
  email: string;

  @IsString()
  @ApiProperty({ example: "username", description: "User's username" })
  username: string;
}

export class CheckVerificationDto {
  @IsEmail()
  @ApiProperty({ example: "user@example.com", description: "User's email" })
  email: string;

  @IsString()
  @ApiProperty({ example: "123456", description: "Verification code" })
  code: string;
}

export class RecoverPasswordDto {
  @IsEmail()
  @ApiProperty({ example: "user@example.com", description: "User's email" })
  email: string;

  @IsString()
  @MinLength(6, { message: "Password must be at least 6 characters long" })
  @ApiProperty({
    example: "newpassword123",
    description: "New password (min 6 chars)",
  })
  newPassword: string;
}
