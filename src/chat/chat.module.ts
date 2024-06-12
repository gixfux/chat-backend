import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  providers: [ChatGateway, ChatService],
})
export class ChatModule {
  constructor(private readonly prisma: PrismaService) { }

  async onModuleInit() {
    const adminUser = await this.prisma.user.findUnique({
      where: { username: 'admin' }
    })

    let defaultGroup = await this.prisma.group.findFirst({
      where: { groupName: '公共聊天室' }
    })

    if (!defaultGroup) {
      defaultGroup = await this.prisma.group.create({
        data: {
          groupName: '公共聊天室',
          notice: '群主很懒，没写公告',
          userId: adminUser.userId,
          createTime: new Date().valueOf()
        }
      })

      const allUsers = await this.prisma.user.findMany();

      for (const user of allUsers) {
        await this.prisma.user_Group.create({
          data: {
            userId: user.userId,
            groupId: defaultGroup.groupId
          }
        })

        if (user.userId !== adminUser.userId) {
          await this.prisma.user_Friend.create({
            data: {
              userId: user.userId,
              friendId: adminUser.userId
            }
          })

          await this.prisma.user_Friend.create({
            data: {
              userId: adminUser.userId,
              friendId: user.userId
            }
          })
        }
      }
    }
  }
}
