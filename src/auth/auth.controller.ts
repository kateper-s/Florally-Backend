import { Controller } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "src/guard/jwt-auth.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}
}
