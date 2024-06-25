import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import ValidatePipe from './common/validate.pipe';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {

  // Object.defineProperty(BigInt.prototype, 'toJSON', function () { return this.toString() }
  // );

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useStaticAssets('public', { prefix: '/static' });

  app.setGlobalPrefix('api');
  // app.enableCors()
  app.useGlobalPipes(new ValidatePipe());
  await app.listen(3000);
}
bootstrap();
