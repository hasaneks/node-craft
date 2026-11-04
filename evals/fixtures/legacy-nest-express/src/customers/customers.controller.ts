import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard, type CurrentUser as User } from '../auth/firebase-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CustomersService } from './customers.service';
import { ListCustomersQuery } from './dto/list-customers.query';

@Controller('customers')
@UseGuards(FirebaseAuthGuard)
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  list(@CurrentUser() user: User, @Query() query: ListCustomersQuery) {
    return this.customers.list(user, query);
  }
}
