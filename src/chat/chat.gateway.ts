import { WebSocketGateway, SubscribeMessage, MessageBody, WebSocketServer, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

@WebSocketGateway()
export class ChatGateway {
  constructor(private readonly chatService: ChatService) {
    this.defaultGroup = '公共聊天室'
  }

  @WebSocketServer()
  server: Server

  defaultGroup: string

  async handleConnection(client: Socket) {
    console.log(client.handshake.query.userId);

    const userRoom = client.handshake.query.userId
    client.join(this.defaultGroup)
    if (userRoom) {
      client.join(userRoom)
    }
    this.chatService.getActiveGroupUser(this.server)
    return '连接成功'

  }

  async handleDisconnect(client: Socket) {
    this.chatService.getActiveGroupUser(this.server)
  }

  // 创建群组
  @SubscribeMessage('addGroup')
  async addGroup(@MessageBody() data: { groupName: string, notice?: string }, @ConnectedSocket() client: Socket) {
    this.chatService.addGroup(data, client, this.server)
    return '加入群聊'
  }

  // 加入群组
  @SubscribeMessage('joinGroup')
  joinGroup(@MessageBody() data: GroupInfo, @ConnectedSocket() client: Socket) {
    this.chatService.joinGroup(data, client, this.server)
    return '加入群聊'
  }

  // 加入群组socket连接
  @SubscribeMessage('joinGroupSocket')
  joinGroupSocket(@MessageBody() data: { groupId: string }, @ConnectedSocket() client: Socket) {
    return this.chatService.joinGroupSocket(data, client, this.server);
  }

  // 发送群消息
  @SubscribeMessage('groupMessage')
  sendGroupMessage(@MessageBody() data: GroupMessageDto, @ConnectedSocket() client: Socket) {
    return this.chatService.sendGroupMessage(data, client, this.server);
  }

  @SubscribeMessage('addFriend')
  addFriend(@MessageBody() data: { friendId: string }, @ConnectedSocket() client: Socket) {
    return this.chatService.addFriend(data, client, this.server);
  }

  // 加入私聊的socket连接
  @SubscribeMessage('joinFriendSocket')
  joinFriend(@MessageBody() data: { friendId: string }, @ConnectedSocket() client: Socket) {
    return this.chatService.joinFriend(data, client, this.server);
  }

  @SubscribeMessage('friendMessage')
  friendMessage(@MessageBody() data: FriendMessageDto, @ConnectedSocket() client: Socket) {
    console.log(data);

    return this.chatService.friendMessage(data, client, this.server);
  }

  // 获取所用群和好友数据
  @SubscribeMessage('chatData')
  getAllData(@ConnectedSocket() client: Socket) {
    return this.chatService.getAllData(client, this.server);
  }

  // 退群
  @SubscribeMessage('exitGroup')
  exitGroup(@MessageBody() data: { groupId: string }, @ConnectedSocket() client: Socket) {
    return this.chatService.exitGroup(data, client, this.server);
  }

  // 删好友
  @SubscribeMessage('exitFriend')
  exitFriend(@MessageBody() data: { friendId: string }, @ConnectedSocket() client: Socket) {
    return this.chatService.exitFriend(data, client, this.server);
  }
}
