import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { getAuth } from 'firebase-admin/auth';
import { PrismaService } from '../common/prisma.service';

export interface CurrentUser {
  id: string;
  companyId: string;
}

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const header: string | undefined = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException();
    const decoded = await getAuth().verifyIdToken(header.slice(7)).catch(() => {
      throw new UnauthorizedException();
    });
    const user = await this.prisma.user.findUnique({ where: { firebaseUid: decoded.uid } });
    if (!user) throw new UnauthorizedException();
    req.user = { id: user.id, companyId: user.companyId } satisfies CurrentUser;
    return true;
  }
}
