import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { NestExpressApplication } from '@nestjs/platform-express';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import helmet from 'helmet';
import compression from 'compression';

const BASE_ALLOWED = [
  /(?:^|\.)granc\.pages\.dev$/,
  /(?:^|\.)dronvirtual\.pages\.dev$/,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  // 'https://localhost:5173', // opcional
  // 'https://127.0.0.1:5173', // opcional
];

const EXTRAS = (process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const ALLOWED: (string | RegExp)[] = [...BASE_ALLOWED, ...EXTRAS];

function isAllowedOrigin(origin?: string): boolean {
  if (!origin) return true; // health/curl sin Origin
  try {
    const { host } = new URL(origin);
    return ALLOWED.some(p => p instanceof RegExp ? p.test(host) : origin === p);
  } catch {
    return false;
  }
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { cors: false });

  app.setGlobalPrefix('api');
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.use(compression());

  const corsOptions: CorsOptions = {
    origin: (requestOrigin, cb) => {
      const allow = isAllowedOrigin(requestOrigin || undefined);
      if (allow) cb(null, requestOrigin || true);
      else cb(new Error('CORS not allowed'), false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-User-Id',
      'Idempotency-Key',
      'idempotency-key',
    ],
    credentials: false,       
    maxAge: 600,
    optionsSuccessStatus: 204,
  };
  app.enableCors(corsOptions);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  const prisma = app.get(PrismaService);
  await prisma.$connect();
  app.enableShutdownHooks();

  const PORT = Number(process.env.PORT) || 3000;
  await app.listen(PORT, '0.0.0.0');
  console.log(`🚀 Backend escuchando en :${PORT}`);
}

bootstrap();
