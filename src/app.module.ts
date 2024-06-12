import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { ChatModule } from './chat/chat.module';
import { FriendModule } from './friend/friend.module';
import { GroupModule } from './group/group.module';

@Module({
  imports: [AuthModule, PrismaModule, UserModule, ChatModule, FriendModule, GroupModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
