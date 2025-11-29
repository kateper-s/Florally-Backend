import { Controller, UseGuards, Get, Patch, Body, Req } from "@nestjs/common";
import { UserService } from "./user.service";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { UpdateUserDto } from "src/dtos/user.dto";
import { JwtAuthGuard } from "src/guard/jwt-auth.guard";

@ApiTags("user")
@Controller("user")
//@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get("profile")
  @ApiOperation({ summary: "Returns all information about user." })
  async getUser(@Req() req: any) {
    const id = req["user"]["sub"];
    const user = await this.userService.getById(id);
    return user;
  }

  @Patch()
  @ApiOperation({ summary: "Update user profile" })
  async updateUser(@Req() req: any, @Body() dto: UpdateUserDto) {
    const id = req["user"]["sub"];
    return await this.userService.update(id, dto);
  }
}
