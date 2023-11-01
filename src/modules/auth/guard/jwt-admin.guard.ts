import { AuthGuard } from '@nestjs/passport';

export class JwtAdminGuard extends AuthGuard('jwt-admin') {
  constructor() {
    super();
  }
}
