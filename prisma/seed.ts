import UserSeed from './seeds/user'

async function run() {
  await UserSeed()
}

run()