import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { RCode } from 'src/common/constant/rcode';
import { JwtService } from '@nestjs/jwt';
import { createWriteStream } from 'fs';
import { join } from 'path';
import { nameVarify, passwordVarify } from 'src/common/tool/utils';
import { hash, verify } from 'argon2';
import { User, User_Friend, User_Group } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) { }
  async getUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        userId
      }
    })

    if (!user) {
      return { code: RCode.ERROR, msg: '获取用户失败', data: userId };
    } else {
      return {
        msg: '获取用户成功',
        data: {
          user
        }
      };
    }
  }

  async postUsers(userIds: string) {
    try {
      if (userIds) {
        const userIdArr = userIds.split(',')
        const userArr = []
        for (const userId of userIdArr) {
          const user = await this.prisma.user.findUnique({
            where: {
              userId
            }
          })
          if (user) {
            const { password, ...userInfo } = user
            userArr.push(userInfo)
          }
        }

        if (userArr.length !== 0) {
          return {
            msg: '获取用户信息成功',
            data: {
              userArr
            }
          }
        }
      }
      return { code: RCode.FAIL, msg: '获取用户信息失败', data: userIds };
    } catch (error) {
      return { code: RCode.ERROR, msg: '获取用户信息失败', data: error };
    }
  }

  async updateUserName(user, body) {
    try {
      const oldUser = await this.prisma.user.findUnique({
        where: {
          userId: user.userId
        }
      })

      if (oldUser && nameVarify(body.newname)) {  // 存在此用户并且名字验证通过
        const isHaveName = await this.prisma.user.findUnique({
          where: {
            username: body.newname
          }
        })

        if (isHaveName) { // 名字重复
          return { code: RCode.FAIL, msg: '用户名重复', data: body }
        }
        // 更新用户名
        const newUser = await this.prisma.user.update({
          where: {
            userId: user.userId
          },
          data: {
            username: body.newname
          }
        })

        const { password, ...userInfo } = newUser
        return {
          msg: '修改用户名成功',
          data: {
            user: userInfo
          }
        }
      }
      return { code: RCode.FAIL, msg: '修改用户名失败', data: body }
    } catch (error) {
      return { code: RCode.ERROR, msg: '修改用户名失败', data: error }
    }
  }

  async updatePassword(user, { oldpassword: oldPwd, newpassword: newPwd }) {
    try {
      const psMatch = await verify(user.password, oldPwd);
      if (!psMatch) {
        return {
          code: RCode.FAIL, msg: '输入密码错误', data: {
            password: oldPwd
          }
        };
      }
      if (passwordVarify(newPwd)) {
        const newUser = await this.prisma.user.update({
          where: {
            userId: user.userId
          },
          data: {
            password: await hash(newPwd)
          }
        })

        const { password, ...userInfo } = newUser
        return {
          msg: '修改密码成功',
          data: {
            user: userInfo
          }
        }
      }
      return { code: RCode.FAIL, msg: '更新失败', data: '' };
    } catch (error) {
      return { code: RCode.ERROR, msg: '更新用户密码失败', data: error };
    }
  }

  async deleteUser(userId: string) {
    try {
      const user = await this.prisma.user.delete({
        where: {
          userId
        }
      })
      if (user) {
        return {
          msg: '删除用户成功',
          data: {
            user
          }
        }
      } else {
        return { code: RCode.FAIL, msg: '删除用户失败', data: userId };
      }
    } catch (error) {
      return { code: RCode.ERROR, msg: '删除用户失败', data: error };
    }
  }

  async getUserByName(username: string) {
    try {
      if (username) {
        const users = await this.prisma.user.findMany({
          where: {
            username: {
              contains: username
            }
          }
        })
        return { code: RCode.OK, msg: '获取用户成功', data: users }
      }
      return { code: RCode.FAIL, msg: '获取用户失败', data: username }
    } catch (error) {
      return { code: RCode.ERROR, msg: '获取用户失败', data: error }
    }
  }

  async setUserAvatar(user, file) {
    const newUser = await this.prisma.user.findUnique({
      where: {
        userId: user.userId
      }
    })

    if (newUser) {
      const random = Date.now() + '&'
      console.log(file);

      const stream = createWriteStream(join('public/avatar', random + file.originalname))
      stream.write(file.buffer)
      newUser.avatar = 'avatar' + random + file.originalname
      await this.prisma.user.update({
        where: {
          userId: user.userId
        },
        data: {
          avatar: newUser.avatar
        }
      })
      return { msg: '上传头像成功', data: newUser }
    } else {
      return { code: RCode.FAIL, msg: '上传头像失败', data: user }
    }
  }

  async getAllData(user) {


    const userId = user.userId
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

      return {
        code: RCode.OK, msg: '获取成功', data: {
          groupData: groupArr,
          friendData: friendArr,
          userData: userArr
        }
      }
    }


  }
}
