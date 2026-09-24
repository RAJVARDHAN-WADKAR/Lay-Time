import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const port = configService.get<number>('port') || 4000;
  const corsOrigins = configService.get<string[]>('corsOrigin') || ['http://localhost:3000', 'http://127.0.0.1:3000'];

  // Global Prefix
  app.setGlobalPrefix('api');

  // CORS
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  });

  // Global Validation & Serialization Pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global Error Filter (Section 44 standard format)
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global Transform Interceptor (Section 45 standard format)
  app.useGlobalInterceptors(new TransformInterceptor());

  // Section 51: Swagger OpenAPI Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('DemurrageOps Laytime & Demurrage Claim Management API')
    .setDescription(
      'Enterprise REST API powering maritime chartering operations, multi-berth prorata laytime calculations, Statement of Facts OCR extraction, RAC root-cause reviews, and contractual time-bar tracking.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Authentication', 'JWT login, token refresh, and user authentication context')
    .addTag('Claims Management', '32-column commercial claims ledger and lifecycle workflow')
    .addTag('Laytime & Demurrage Calculation Engine', 'Deterministic laytime, demurrage, and despatch engine')
    .addTag('Statement of Facts (SoF)', 'Port time sheets, operational logs, and activity events')
    .addTag('Ports & Berths', 'Multi-port configurations and prorata share distributions')
    .addTag('RAC (Root Cause Analysis & Claim Review)', 'Pre-submission audit findings and owner comparison')
    .addTag('Time-Bar Monitoring & Deadlines', 'Contractual deadlines, countdown clocks, and automated alerts')
    .addTag('Document Management & Completeness', 'Repository files, revisions, and missing document checks')
    .addTag('Payments & Financial Reconciliation', 'Settlement receivables, payments received, and final sign-offs')
    .addTag('Dashboard', 'Real-time financial exposure and operational KPI endpoints')
    .addTag('Analytics & Business Intelligence', 'Aggregated portfolio charts and trend metrics')
    .addTag('Reports', 'PDF Statement exports and commercial summaries')
    .addTag('OCR Ingestion & Discrepancy Parsing', 'Scanned PDF text parsing and confidence ratings')
    .addTag('User Management', 'Admin RBAC user administration')
    .addTag('Clients', 'Commercial charterer, owner, and trader directory')
    .addTag('Vessels', 'Commercial fleet registry')
    .addTag('Deductions', 'Standard and bespoke deduction categories')
    .addTag('Notifications', 'In-app reminders, time-bar alerts, and follow-ups')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(port);
  logger.log(`================================================================`);
  logger.log(` DemurrageOps Backend API running on: http://localhost:${port}/api`);
  logger.log(` Swagger OpenAPI Documentation at:   http://localhost:${port}/api/docs`);
  logger.log(`================================================================`);
}

bootstrap();