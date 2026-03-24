import { Controller, UseGuards, Get, Post, Patch, Delete, Body, Param, Req } from "@nestjs/common";
import { UserRoomsService } from "./user_rooms.service";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { CreateUserRoomDto, UpdateUserRoomDto } from "src/dtos/user_rooms.dto";
import { JwtAuthGuard } from "src/guard/jwt-auth.guard";

@ApiBearerAuth()
@ApiTags("user rooms")
@Controller("user_rooms")
@UseGuards(JwtAuthGuard)
export class UserRoomController {
  constructor(private readonly userRoomsService: UserRoomsService) {}

  @Post()
  @ApiOperation({ summary: "Create a new room" })
  async createRoom(@Req() req: any, @Body() dto: CreateUserRoomDto) {
    const userId = req["user"]["sub"];
    return await this.userRoomsService.createRoom(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: "Get all user rooms" })
  async getUserRooms(@Req() req: any) {
    const userId = req["user"]["sub"];
    return await this.userRoomsService.getUserRooms(userId);
  }

  @Get(":roomId")
  @ApiOperation({ summary: "Get room by id" })
  async getRoomById(@Req() req: any, @Param("roomId") roomId: string) {
    const userId = req["user"]["sub"];
    return await this.userRoomsService.getRoomById(userId, roomId);
  }

  @Patch(":roomId")
  @ApiOperation({ summary: "Update room name and plants" })
  async updateRoom( @Req() req: any, @Param("roomId") roomId: string, @Body() dto: UpdateUserRoomDto) {
    const userId = req["user"]["sub"];
    return await this.userRoomsService.updateRoom(userId, roomId, dto);
  }

  @Delete(":roomId")
  @ApiOperation({ summary: "Delete room" })
  async deleteRoom(@Req() req: any, @Param("roomId") roomId: string) {
    const userId = req["user"]["sub"];
    return await this.userRoomsService.deleteRoom(userId, roomId);
  }

  @Post(":roomId/plants/:userPlantId")
  @ApiOperation({ summary: "Add plant to room" })
  async addPlantToRoom(
    @Req() req: any,
    @Param("roomId") roomId: string,
    @Param("userPlantId") userPlantId: string
  ) {
    const userId = req["user"]["sub"];
    return await this.userRoomsService.addPlantToRoom(userId, roomId, userPlantId);
  }

  @Delete(":roomId/plants/:userPlantId")
  @ApiOperation({ summary: "Remove plant from room" })
  async removePlantFromRoom(
    @Req() req: any,
    @Param("roomId") roomId: string,
    @Param("userPlantId") userPlantId: string
  ) {
    const userId = req["user"]["sub"];
    return await this.userRoomsService.removePlantFromRoom(userId, roomId, userPlantId);
  }
}