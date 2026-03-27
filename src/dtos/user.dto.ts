import { IsString, IsEmail, IsOptional, MinLength } from "class-validator";
import { Transform } from "class-transformer";
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

export class CreateUserInternalDto extends CreateUserDto {
  is_enabled?: boolean;
}

export class SignInDto {
  @IsEmail()
  @ApiProperty({ example: "123@ya.ru", description: "User's email" })
  email: string;

  @IsString()
  @ApiProperty({ example: "123", description: "User's password" })
  @Transform(({ value }) => value?.trim())
  password: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @ApiProperty({ example: "NameNew", description: "User's new name", required: false })
  username?: string;

  @IsOptional()
  @IsEmail()
  @ApiProperty({ example: "newemail@ya.ru", description: "User's new email", required: false })
  email?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: "oldpassword123", description: "Current password for verification", required: false })
  oldPassword?: string;

  @IsOptional()
  @IsString()
  @MinLength(6, { message: "Password must be at least 6 characters long" })
  @ApiProperty({
    example: "newpassword123",
    description: "User's new password (min 6 chars)",
    required: false
  })
  password?: string;
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

export class ChangePasswordDto {
  @IsString()
  @ApiProperty()
  oldPassword: string;

  @IsString()
  @MinLength(6, { message: "Password must be at least 6 characters long" })
  @ApiProperty({
    example: "newpassword123",
    description: "New password (min 6 chars)",
  })
  newPassword: string;
}