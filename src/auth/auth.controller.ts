import { Controller, Post, Body, Put } from "@nestjs/common";
import { AuthService } from "./auth.service";
import {
  CreateUserDto,
  SignInDto,
  SendVerificationDto,
  CheckVerificationDto,
  RecoverPasswordDto,
} from "src/dtos/user.dto";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("signup")
  @ApiOperation({ summary: "User registration" })
  async signUp(@Body() createUserDto: CreateUserDto) {
    return this.authService.signUp(createUserDto);
  }

  @Post("signin")
  @ApiOperation({ summary: "User login" })
  async signIn(@Body() signInDto: SignInDto) {
    return this.authService.signIn(signInDto);
  }

  @Post("verification")
  @ApiOperation({ summary: "Send verification email" })
  async sendVerification(@Body() dto: SendVerificationDto) {
    return this.authService.sendVerificationEmail(dto.email, dto.username);
  }

  @Post("verification/check")
  @ApiOperation({ summary: "Check verification" })
  async checkVerification(@Body() dto: CheckVerificationDto) {
    return this.authService.checkVerificationCode(dto.email, dto.code);
  }

  @Put("recoverPassword")
  @ApiOperation({ summary: "Recover password with new password" })
  async recoverPassword(@Body() dto: RecoverPasswordDto) {
    return this.authService.recoverPassword(dto.email, dto.newPassword);
  }
}
