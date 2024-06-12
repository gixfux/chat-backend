import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Req } from '@nestjs/common';
import { FriendService } from './friend.service';
import { CreateFriendDto } from './dto/create-friend.dto';
import { UpdateFriendDto } from './dto/update-friend.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('friend')
@UseGuards(AuthGuard('jwt'))
export class FriendController {
  constructor(private readonly friendService: FriendService) { }

  @Get()
  getFriends(@Req() req) {
    console.log(req.user);

    return this.friendService.getFriends(req.user);
  }

  @Get('/friendMessages')
  getFriendMessages(@Query() query, @Req() req) {
    return this.friendService.getFriendMessages(query.friendId, +query.current, +query.pageSize, req.user);
  }
}
