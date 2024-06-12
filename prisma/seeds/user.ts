import { Random } from 'mockjs';
import { hash } from 'argon2';
import createSignalData from '../helper';

export default async () => {

  await createSignalData(1, async (prisma) => {
    await prisma.user.create({
      data: {
        username: 'admin',
        password: await hash('admin123'),
        role: 'admin',
        avatar: `avatar/avatar(${Math.round(Math.random() * 19) + 1}).png`,
        createTime: new Date().valueOf()
      }
    })
  })

  await createSignalData(10, async (prisma) => {
    await prisma.user.create({
      data: {
        username: Random.word(6, 16),
        password: await hash(Random.sentence(6, 16)),
        avatar: `avatar/avatar(${Math.round(Math.random() * 19) + 1}).png`,
        createTime: new Date().valueOf()
      },
    });
  });
};