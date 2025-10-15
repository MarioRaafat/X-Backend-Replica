import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { ResponseInterceptor } from './interceptor/response.interceptor';
import { RabbitmqService } from './rabbitmq/rabbitmq.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
  app.use(cookieParser());

  // response interceptor

  app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));

  // for swagger
  const config = new DocumentBuilder()
    .setTitle('Backend API')
    .setDescription(
      'El-Sabe3 Documentation presented by backend team with lots of kisses for you 😘',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth', // This name here is important for matching up with @ApiBearerAuth() in the controller!
    )
    .build();
  
  const rabbit = app.get(RabbitmqService);
  await rabbit.onModuleInit();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
