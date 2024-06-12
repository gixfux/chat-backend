import { ForbiddenException, Injectable } from '@nestjs/common';
import { LoginAuthDto } from './dto/login-auth.dto';
import { RegisterAuthDto } from './dto/register-auth.dto';
import { PrismaClient } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from 'argon2';
import { PrismaService } from 'src/prisma/prisma.service';
import { mergeScan } from 'rxjs';

interface users {
  username: string;
  password: string;
  userId: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) { }

  async login({ username: name, password: pwd }: LoginAuthDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        username: name,
      }
    })
    if (!user) {
      throw new ForbiddenException('用户不存在')
    } else {
      const psMatch = await verify(user.password, pwd);

      if (!psMatch) throw new ForbiddenException('密码输入错误')

      const { password, ...userInfo } = user;

      return {
        msg: '登录成功',
        data: {
          user: userInfo,
          token: await this.token(user),
        }
      }
    }

  }

  async register({ username, password: pwd }: RegisterAuthDto) {
    // 用户名重复
    const existNameUser = await this.prisma.user.findUnique({
      where: {
        username: username
      }
    })

    if (existNameUser) {
      throw new ForbiddenException('用户名重复')
    } else {

      const adminUser = await this.prisma.user.findUnique({
        where: { username: 'admin' }
      })

      const user = await this.prisma.user.create({
        data: {
          username: username,
          password: await hash(pwd),
          avatar: `avatar/avatar(${Math.round(Math.random() * 19) + 1}).png`,
          createTime: new Date().valueOf()
        }
      })

      const defaultGroup = await this.prisma.group.findFirst({
        where: {
          groupName: '公共聊天室'
        }
      })

      await this.prisma.user_Group.create({
        data: {
          userId: user.userId,
          groupId: defaultGroup.groupId
        }
      })

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

      const { password, ...userInfo } = user;

      return {
        msg: '注册成功',
        data: {
          user: userInfo,
          token: await this.token(user),
        }
      }
    }
  }

  //获取token
  async token(user: users) {
    return await this.jwt.signAsync({
      username: user.username,
      sub: user.userId,
    })
  }
}

