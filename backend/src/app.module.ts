import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ClientsModule } from './clients/clients.module';
import { VesselsModule } from './vessels/vessels.module';
import { ClaimsModule } from './claims/claims.module';
import { PortsModule } from './ports/ports.module';
import { BerthsModule } from './berths/berths.module';
import { SofModule } from './sof/sof.module';
import { CalculationsModule } from './calculations/calculations.module';
import { DeductionsModule } from './deductions/deductions.module';
import { RacModule } from './rac/rac.module';
import { TimebarModule } from './timebar/timebar.module';
import { DocumentsModule } from './documents/documents.module';
import { PaymentsModule } from './payments/payments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ReportsModule } from './reports/reports.module';
import { EmailModule } from './email/email.module';
import { OcrModule } from './ocr/ocr.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    DatabaseModule,
    EmailModule,
    AuthModule,
    UsersModule,
    ClientsModule,
    VesselsModule,
    ClaimsModule,
    PortsModule,
    BerthsModule,
    SofModule,
    CalculationsModule,
    DeductionsModule,
    RacModule,
    TimebarModule,
    DocumentsModule,
    PaymentsModule,
    NotificationsModule,
    DashboardModule,
    AnalyticsModule,
    ReportsModule,
    OcrModule,
  ],
})
export class AppModule {}