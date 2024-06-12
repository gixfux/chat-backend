import { Controller, Get, Post, Body, Patch, Param, Delete, Req, Query, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/common/decorator/roles.decorator';
import { Role } from 'src/common/constant/role.enum';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('user')
@UseGuards(AuthGuard('jwt'))
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Get()
  getUser(@Query('userId') userId: string) {
    return this.userService.getUser(userId);
  }

  @Post()
  postUsers(@Body('userIds') userIds: string) {
    return this.userService.postUsers(userIds);
  }

  @Patch('username')
  updateUserName(@Req() req, @Body() body) {
    return this.userService.updateUserName(req.user, body);
  }

  @Patch('password')
  updatePassword(@Req() req, @Body() body) {
    return this.userService.updatePassword(req.user, body);
  }

  @Delete()
  @Roles(Role.Admin)
  deleteUser(@Query('userId') userId: string) {
    return this.userService.deleteUser(userId)
  }

  @Get('/findByName')
  getUserByName(@Query('username') username: string) {
    return this.userService.getUserByName(username)
  }

  @Post('/avatar')
  @UseInterceptors(FileInterceptor('file'))
  setUserAvatar(@Req() req, @UploadedFile() file: Express.Multer.File) {
    return this.userService.setUserAvatar(req.user, file)
  }

  @Get('/allData')
  getAllData(@Req() req) {
    return this.userService.getAllData(req.user)
  }
}
