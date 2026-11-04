import { Module } from '@nestjs/common';
import { PrismaService } from './common/prisma.service';
import { CustomersModule } from './customers/customers.module';
import { InvoicesModule } from './invoices/invoices.module';

@Module({
  imports: [CustomersModule, InvoicesModule],
  providers: [PrismaService],
})
export class AppModule {}
