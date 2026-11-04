import { Module } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

// Invoices are created by the billing job today; there is no HTTP surface yet.
@Module({
  providers: [PrismaService],
})
export class InvoicesModule {}
