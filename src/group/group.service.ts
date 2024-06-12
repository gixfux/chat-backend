import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RCode } from 'src/common/constant/rcode';
import { User } from '@prisma/client';

@Injectable()
export class GroupService {
  constructor(private readonly prisma: PrismaService) { }
  async postGroups(groupIds: string) {
    try {
      if (groupIds) {
        const groupIdArr = groupIds.split(',');
        const groupArr = []
        for (const groupId of groupIdArr) {
          const group = await this.prisma.group.findUnique({
            where: {
              groupId: groupId
            }
          })
          groupArr.push(group)
        }
        return { msg: '获取群组成功', data: groupArr }
      }
      return { code: RCode.FAIL, msg: '获取群组失败', data: groupIds }
    } catch (error) {
      return { code: RCode.ERROR, msg: '获取群组失败', data: error }
    }
  }

  async getUserGroups(userId: string) {
    try {
      let groups;
      if (userId) {
        groups = await this.prisma.user_Group.findMany({
          where: {
            userId: userId
          }
        })
        return { msg: '获取用户群组成功', data: groups }
      }
      groups = await this.prisma.user_Group.findMany()
      return { msg: '获取系统所有群成功', data: groups }
    } catch (error) {
      return { code: RCode.ERROR, msg: '获取用户群组失败', data: error }
    }
  }

  async getGroupUsers(groupId: string) {
    try {
      let users;
      if (groupId) {
        users = await this.prisma.user_Group.findMany({
          where: {
            groupId: groupId
          }
        })
        return { msg: '获取群组用户成功', data: users }
      }
    } catch (error) {
      return { code: RCode.ERROR, msg: '获取群组用户失败', data: error }
    }
  }

  async getGroupMessages(groupId: string, current: number, pageSize: number) {
    let groupMessage = await this.prisma.group_Message.findMany({
      where: {
        groupId: groupId
      },
      orderBy: {
        time: 'desc'
      },
      skip: current,
      take: pageSize
    })
    groupMessage = groupMessage.reverse()

    const userGather: { [key: string]: User } = {}
    let userArr = []
    for (const item of groupMessage) {
      if (!userGather[item.userId]) {
        const user = await this.prisma.user.findUnique({
          where: {
            userId: item.userId
          }
        })
        userGather[item.userId] = user
      }
    }
    userArr = Object.values(userGather)
    return { msg: '获取群组消息列表成功', data: { messageArr: groupMessage, userArr: userArr } }
  }

  async getGroupsByName(groupName: string) {
    try {
      if (groupName) {
        const groups = await this.prisma.group.findMany({
          where: {
            groupName: {
              contains: groupName
            }
          }
        })
        return { msg: '搜索群组成功', data: groups }
      }
      return { code: RCode.FAIL, msg: '搜索群组失败', data: groupName }
    } catch (error) {
      return { code: RCode.ERROR, msg: '搜索群组失败', data: error }
    }
  }
}
