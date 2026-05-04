import { Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "src/guard/jwt-auth.guard";
import { UserService } from "src/user/user.service";
import { TelegramLinkService } from "./telegram-link.service";

@ApiTags("telegram")
@Controller("telegram")
@UseGuards(JwtAuthGuard)
export class TelegramController {
  constructor(
    private readonly telegramLinkService: TelegramLinkService,
    private readonly userService: UserService,
  ) {}

  @Post("link-code")
  @ApiOperation({ summary: "Generate temporary telegram link code" })
  async createLinkCode(@Req() req: any) {
    const userId = req.user.id;
    return await this.telegramLinkService.generateLinkCode(userId);
  }

  @Get("status")
  @ApiOperation({ summary: "Get telegram binding status for user" })
  async getLinkStatus(@Req() req: any) {
    const userId = req.user.id;
    const user = await this.userService.getById(userId);

    return {
      linked: Boolean(user.telegramChatId),
      telegramChatId: user.telegramChatId ?? null,
    };
  }
}
