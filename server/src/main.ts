import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

const DEFAULT_PORT = 3000;
const DEFAULT_HOST = '0.0.0.0';
/** Allow both common Vite dev ports when CORS_ORIGIN is not set. */
const DEFAULT_CORS_ORIGINS = ['http://localhost:5173', 'http://localhost:5174'];

function parsePort(value: string | undefined): number {
  if (value === undefined || value === '') {
    return DEFAULT_PORT;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? DEFAULT_PORT : parsed;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const port = parsePort(config.get<string>('PORT'));
  const host = config.get<string>('HOST') ?? DEFAULT_HOST;
  const corsOriginEnv = config.get<string>('CORS_ORIGIN');
  const corsOrigin = corsOriginEnv
    ? corsOriginEnv
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : DEFAULT_CORS_ORIGINS;

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(port, host);
  console.log(`Server running on http://${host}:${port}`);
}

bootstrap();
