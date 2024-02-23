import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AllExceptionsFilter } from './utils/logging/all-exceptions.filter';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(
    AppModule,
    process.env.ENV === 'prod'
      ? {
          httpsOptions: {
            key: fs.readFileSync('/etc/letsencrypt/live/api.omlist.io/privkey.pem'),
            cert: fs.readFileSync('/etc/letsencrypt/live/api.omlist.io/cert.pem'),
          },
        }
      : undefined,
  );
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.enableCors({ origin: '*' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // remove unknown properties from DTOs
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

  const config = new DocumentBuilder()
    .setTitle('Movie Swiper API')
    .setDescription("API for Kyle Cords's Movie Swiper App")
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token', // This is the name used to refer to the security scheme
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('spec', app, document);

  await app.listen(process.env.PORT || 3030);
}
bootstrap();
