import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { Group, User, User_Friend, User_Group } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { nameVarify } from 'src/common/tool/utils';
import { RCode } from 'src/common/constant/rcode';
import { createWriteStream } from 'fs';
import { join } from 'path';
import { strategies } from 'passport';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) { }

  // 创建群组
  async addGroup(data: { groupName: string, notice?: string }, client: Socket, server: Server) {
    const userId = client.handshake.query.userId as string

    const isUser = await this.prisma.user.findUnique({
      where: {
        userId: userId
      }
    })

    if (isUser) {
      const isHaveGroup = await this.prisma.group.findFirst({
        where: {
          groupName: data.groupName,
          userId: userId
        }
      })

      if (isHaveGroup) {
        server.to(userId).emit('addGroup', { msg: '群组已存在' })
        return
      }
      if (!nameVarify(data.groupName)) {
        server.to(userId).emit('addGroup', { msg: '群组名格式不正确' })
        return;
      }
      const newGroup = await this.prisma.group.create({
        data: {
          groupName: data.groupName,
          notice: data.notice ? data.notice : '群主很懒，没写公告',
          userId: userId,
          createTime: new Date().valueOf()
        }
      })

      client.join(newGroup.groupId)
      const user_Group = await this.prisma.user_Group.create({
        data: {
          groupId: newGroup.groupId,
          userId: userId
        }
      })
      server.to(newGroup.groupId).emit('addGroup', { code: RCode.OK, msg: `创建群组${newGroup.groupName}成功`, data: newGroup })
      this.getActiveGroupUser(server)
    } else { // 创建群组的userId错误
      server.to(userId).emit('addGroup', { code: RCode.FAIL, msg: '用户信息错误', data: userId })
      return
    }
  }

  // 加入群组
  async joinGroup(data: GroupDto, client: Socket, server: Server) {
    const userId = client.handshake.query.userId as string
    const isUser = await this.prisma.user.findUnique({
      where: {
        userId: userId
      }
    })

    if (isUser) {
      const group = await this.prisma.group.findUnique({
        where: {
          groupId: data.groupId
        }
      })
      if (!group) {
        return server.to(userId).emit('joinGroup', { code: RCode.FAIL, msg: '群组不存在', data: data.groupId })
      }
      const userGroup = await this.prisma.user_Group.findFirst({
        where: {
          groupId: data.groupId,
          userId: userId
        }
      })

      if (userGroup) {
        return server.to(userId).emit('joinGroup', { code: RCode.FAIL, msg: '已在群组中', data: data.groupId })
      } else {
        const newUserGroup = await this.prisma.user_Group.create({
          data: {
            groupId: data.groupId,
            userId: userId
          }
        })
        client.join(group.groupId)
        const res = { group, user: isUser }
        server.to(userId).emit('joinGroup', { code: RCode.OK, msg: `加入群组${group.groupName}成功`, state: 'group', data: res })
        server.to(group.groupId).emit('joinGroup', { code: RCode.OK, msg: `${isUser.username} 加入群组`, state: 'user', data: res })
        this.getActiveGroupUser(server)
      }
    } else {
      return server.to(userId).emit('joinGroup', { code: RCode.FAIL, msg: '用户信息错误', data: userId })
    }
  }

  async joinGroupSocket(data: { groupId: string }, client: Socket, server: Server) {
    const userId = client.handshake.query.userId as string

    const group = await this.prisma.group.findUnique({
      where: {
        groupId: data.groupId
      }
    })

    const user = await this.prisma.user.findUnique({
      where: {
        userId: userId
      }
    })

    if (group && user) {
      client.join(group.groupId)
      server.to(group.groupId).emit('joinGroupSocket', { code: RCode.OK, msg: `${user.username}加入群组${group.groupName}`, state: 'group', data: { group, user } })
    } else {
      server.to(userId).emit('joinGroupSocket', { code: RCode.FAIL, msg: '进入群聊失败', data: userId })
    }
  }

  async sendGroupMessage(data: GroupMessageDto, client: Socket, server: Server) {
    const userId = client.handshake.query.userId as string
    const isUser = await this.prisma.user.findUnique({
      where: {
        userId: userId
      }
    })
    if (isUser) {
      const userGroup = await this.prisma.user_Group.findFirst({
        where: {
          userId: userId,
          groupId: data.groupId
        }
      })

      if (!userGroup) {
        server.to(userId).emit('groupMessage', { code: RCode.FAIL, msg: '用户不在群组中', data: userId })
        return
      }
      if (data.messageType === 'image') {
        const randomName = `${Date.now()}${userId}${data.width}${data.height}`
        const stream = createWriteStream(join('public/static', randomName))
        stream.write(data.content)
        data.content = randomName
      }

      data.time = new Date().valueOf() // 使用服务端时间
      await this.prisma.group_Message.create({
        data: {
          userId: userId,
          groupId: data.groupId,
          messageType: data.messageType,
          content: data.content,
          time: data.time
        }
      })

      server.to(data.groupId).emit('groupMessage', { code: RCode.OK, msg: '群组消息发送成功', data: data })

    } else {
      server.to(userId).emit('groupMessage', { code: RCode.FAIL, msg: '用户信息错误', data: userId })
    }
  }

  async addFriend(data: { friendId: string }, client: Socket, server: Server) {
    const userId = client.handshake.query.userId as string
    const isUser = this.prisma.user.findUnique({
      where: {
        userId: userId
      }
    })

    if (isUser) {
      if (data.friendId && userId) {
        if (data.friendId === userId) {
          server.to(userId).emit('addFriend', { code: RCode.FAIL, msg: '不能添加自己为好友', data: userId })
          return
        }
        const relation1 = await this.prisma.user_Friend.findFirst({
          where: {
            userId: userId,
            friendId: data.friendId
          }
        })

        const relation2 = await this.prisma.user_Friend.findFirst({
          where: {
            userId: data.friendId,
            friendId: userId
          }
        })

        if (relation1 || relation2) {
          server.to(userId).emit('addFriend', { code: RCode.FAIL, msg: '已经是好友了', data: data })
          return
        }

        const friend = await this.prisma.user.findUnique({
          where: {
            userId: data.friendId
          }
        })
        const user = await this.prisma.user.findUnique({
          where: {
            userId: userId
          }
        })
        if (!friend) {
          server.to(userId).emit('addFriend', { code: RCode.FAIL, msg: '用户不存在', data: data })
          return
        }

        await this.prisma.user_Friend.create({
          data: {
            userId: userId,
            friendId: data.friendId
          }
        })
        await this.prisma.user_Friend.create({
          data: {
            userId: data.friendId,
            friendId: userId
          }
        })
        const roomId = userId > data.friendId ? userId + data.friendId : data.friendId + userId
        client.join(roomId)
        server.to(userId).emit('addFriend', { code: RCode.OK, msg: `添加好友${friend.username}成功`, data: friend })
        server.to(data.friendId).emit('addFriend', { code: RCode.OK, msg: `${user.username}添加你为好友`, data: user })
        this.friendMessage({ friendId: data.friendId, content: `已添加为新朋友`, messageType: 'system', time: new Date().valueOf() }, client, server)
      }
    } else {
      server.to(userId).emit('addFriend', { code: RCode.FAIL, msg: '用户信息错误', data: userId })
    }
  }


  // 加入私聊的socket连接
  async joinFriend(data: { friendId: string }, client: Socket, server: Server) {
    const userId = client.handshake.query.userId as string
    if (data.friendId && userId) {
      const relation = await this.prisma.user_Friend.findFirst({
        where: {
          userId: userId,
          friendId: data.friendId
        }
      })
      const roomId = userId > data.friendId ? userId + data.friendId : data.friendId + userId
      if (relation) {
        client.join(roomId)
        server.to(userId).emit('joinFriendSocket', { code: RCode.OK, msg: '加入私聊成功', data: relation })
      }
    }
  }

  async friendMessage(data: FriendMessageDto, client: Socket, server: Server) {
    const userId = client.handshake.query.userId as string
    const isUser = await this.prisma.user.findUnique({
      where: {
        userId: userId
      }
    })

    if (isUser) {
      if (userId && data.friendId) {

        const roomId = userId > data.friendId ? userId + data.friendId : data.friendId + userId
        if (data.messageType === 'image') {
          const randomName = `${Date.now()}${roomId}${data.width}${data.height}`
          const stream = createWriteStream(join('public/static', randomName))
          stream.write(data.content)
          data.content = randomName
        }

        data.time = new Date().valueOf() // 使用服务端时间
        const chatMsg = await this.prisma.friend_Message.create({
          data: {
            userId: userId,
            friendId: data.friendId,
            content: data.content,
            messageType: data.messageType,
            time: data.time
          }
        })
        server.to(roomId).emit('friendMessage', { code: RCode.OK, msg: '发送成功', data: chatMsg })
      }
    } else {
      server.to(userId).emit('friendMessage', { code: RCode.FAIL, msg: '用户信息错误', data: userId })
    }
  }

  async getAllData(client: Socket, server: Server) {
    const userId = client.handshake.query.userId as string
    const isUser = await this.prisma.user.findUnique({
      where: {
        userId: userId
      }
    })
    if (isUser) {
      let groupArr: GroupDto[] = []
      let friendArr: FriendDto[] = []
      const groupUserGather: { [key: string]: User } = {}
      let userArr: FriendDto[] = []

      const groupMap: User_Group[] = await this.prisma.user_Group.findMany({
        where: {
          userId: userId
        }
      })
      const friendMap: User_Friend[] = await this.prisma.user_Friend.findMany({
        where: {
          userId: userId
        }
      })

      const groupPromise = groupMap.map(async (item) => {
        return await this.prisma.group.findUnique({
          where: {
            groupId: item.groupId
          }
        })
      })

      const groupMessagePromise = groupMap.map(async (item) => {
        const groupMessage = await this.prisma.group_Message.findMany({
          where: {
            groupId: item.groupId
          },
          orderBy: {
            time: 'desc'
          },
          take: 30
        })
        for (const message of groupMessage) {
          if (!groupUserGather[message.userId]) {
            const userInfo = await this.prisma.user.findUnique({
              where: {
                userId: message.userId
              }
            })
            groupUserGather[message.userId] = userInfo
          }
        }
        return groupMessage
      })

      const friendPromise = friendMap.map(async (item) => {
        return await this.prisma.user.findUnique({
          where: {
            userId: item.friendId
          }
        })
      })

      const friendMessagePromise = friendMap.map(async (item) => {
        const friendMessage = await this.prisma.friend_Message.findMany({
          where: {
            OR: [
              {
                userId: userId,
                friendId: item.friendId
              },
              {
                userId: item.friendId,
                friendId: userId
              }
            ]
          },
          orderBy: {
            time: 'desc'
          },
          take: 30
        })
        return friendMessage
      })

      const groups: GroupDto[] = await Promise.all(groupPromise)
      const groupMessage: Array<GroupMessageDto[]> = await Promise.all(groupMessagePromise)

      groups.map((group, index) => {
        if (groupMessage[index] && groupMessage[index].length) {
          group.messages = groupMessage[index]
        }
      })
      groupArr = groups;

      const friends: FriendDto[] = await Promise.all(friendPromise)
      const friendMessage: Array<FriendMessageDto[]> = await Promise.all(friendMessagePromise)
      friends.map((friend, index) => {
        if (friendMessage[index] && friendMessage[index].length) {
          friend.messages = friendMessage[index]
        }
      })

      friendArr = friends

      userArr = [...Object.values(groupUserGather), ...friendArr]

      server.to(userId).emit('chatData', {
        code: RCode.OK, msg: '获取成功', data: {
          groupData: groupArr,
          friendData: friendArr,
          userData: userArr
        }
      })
    }
  }

  // 退出群组 ， 待完成 群主解散
  async exitGroup(data: { groupId: string }, client: Socket, server: Server) {
    const userId = client.handshake.query.userId as string
    const adminUser = await this.prisma.user.findUnique({
      where: {
        username: 'admin'
      }
    })
    const defaultGroup = await this.prisma.group.findFirst({
      where: {
        groupName: '公共聊天室',
        userId: adminUser.userId
      }
    })
    if (data.groupId === defaultGroup.groupId) {
      return server.to(userId).emit('exitGroup', { code: RCode.FAIL, msg: '不能退出公共聊天室', data: data.groupId })
    }

    const user = await this.prisma.user.findUnique({
      where: {
        userId: userId
      }
    })
    const group = await this.prisma.group.findUnique({
      where: {
        groupId: data.groupId
      }
    })
    const map = await this.prisma.user_Group.findFirst({
      where: {
        userId: userId,
        groupId: data.groupId
      }
    })
    if (user && group && map) {
      await this.prisma.user_Group.delete({
        where: map
      })
      if (group.userId === userId) {
        await this.prisma.group.delete({
          where: {
            groupId: data.groupId
          }
        })
        await this.prisma.group_Message.deleteMany({
          where: {
            groupId: group.groupId
          }
        })
      }
      server.to(userId).emit('exitGroup', { code: RCode.OK, msg: '退出群组成功', data: data.groupId })
      this.getActiveGroupUser(server)
      return
    }
    server.to(userId).emit('exitGroup', { code: RCode.FAIL, msg: '退出群组失败', data: data.groupId })
  }

  async exitFriend(data: { friendId: string }, client: Socket, server: Server) {
    const userId = client.handshake.query.userId as string

    const user = await this.prisma.user.findUnique({
      where: {
        userId: userId
      }
    })

    const friend = await this.prisma.user.findUnique({
      where: {
        userId: data.friendId
      }
    })

    const map1 = await this.prisma.user_Friend.findFirst({
      where: {
        userId: userId,
        friendId: data.friendId
      }
    })

    const map2 = await this.prisma.user_Friend.findFirst({
      where: {
        userId: data.friendId,
        friendId: userId
      }
    })

    if (user && friend && map1 && map2) {
      await this.prisma.user_Friend.delete({ where: map1 })
      await this.prisma.user_Friend.delete({ where: map2 })
      return server.to(userId).emit('exitFriend', { code: RCode.OK, msg: '删除好友成功', data: data.friendId })
    }
    server.to(userId).emit('exitFriend', { code: RCode.FAIL, msg: '删除好友失败', data: data.friendId })
  }

  async getActiveGroupUser(server: Server) {
    const defaultGroup = '公共聊天室'
    // @ts-ignore;
    let userIdArr = Object.values(server.engine.clients).map(item => {
      // @ts-ignore;
      return item.request._query.userId
    });
    userIdArr = Array.from(new Set(userIdArr))

    const activeGroupUserGather = {}

    for (const userId of userIdArr) {
      const userGroupArr = await this.prisma.user_Group.findMany({
        where: {
          userId: userId
        }
      })

      const user = await this.prisma.user.findUnique({
        where: {
          userId: userId
        }
      })

      if (user && userGroupArr.length) {
        userGroupArr.map(item => {
          if (!activeGroupUserGather[item.groupId]) {
            activeGroupUserGather[item.groupId] = {}
          }
          activeGroupUserGather[item.groupId][userId] = user
        })
      }
    }
    server.to(defaultGroup).emit('activeGroupUser', { code: RCode.OK, msg: '获取活跃群组用户成功', data: activeGroupUserGather })
  }
}
