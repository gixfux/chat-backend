import { Injectable } from '@nestjs/common';
import { CreateFriendDto } from './dto/create-friend.dto';
import { UpdateFriendDto } from './dto/update-friend.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { mergeScan } from 'rxjs';
import { RCode } from 'src/common/constant/rcode';

@Injectable()
export class FriendService {
  constructor(private readonly prisma: PrismaService) { }

  async getFriends(user) {
    try {
      if (user) {
        return { msg: '获取好友列表成功', data: await this.prisma.user_Friend.findMany({ where: { userId: user.userId } }) }
      } else {
        return { code: RCode.FAIL, msg: '获取好友列表失败', data: user }
      }
    } catch (error) {
      return { code: RCode.ERROR, msg: '获取好友列表失败', data: error }
    }
  }

  async getFriendMessages(friendId: string, current: number, pageSize: number, user) {
    console.log(user.userId, friendId);

    const messages = await this.prisma.friend_Message.findMany({
      where: {
        OR: [
          {
            userId: user.userId,
            friendId: friendId
          },
          {
            userId: friendId,
            friendId: user.userId
          }
        ]
      },
      orderBy: {
        time: 'desc'
      },
      skip: current,
      take: pageSize
    })

    return { msg: '获取好友消息列表成功', data: { messageArr: messages.reverse() } }
  }
}