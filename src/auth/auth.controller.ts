import { Controller } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}
}
