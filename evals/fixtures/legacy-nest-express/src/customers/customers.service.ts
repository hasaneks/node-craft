import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import type { CurrentUser } from '../auth/firebase-auth.guard';
import type { ListCustomersQuery } from './dto/list-customers.query';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: CurrentUser, query: ListCustomersQuery) {
    const rows = await this.prisma.customer.findMany({
      where: { ownerId: user.id, companyId: user.companyId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit,
      skip: query.offset,
      select: { id: true, name: true, createdAt: true },
    });
    return { items: rows, limit: query.limit, offset: query.offset };
  }
}
