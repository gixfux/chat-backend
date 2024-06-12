import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { Role } from '../constant/role.enum';
import { AuthGuard } from '@nestjs/passport';
import { RoleGuard } from '../guard/roles.guard';

export const ROLES_KEY = 'roles';

export function Roles(...roles: Role[]) {
  return applyDecorators(SetMetadata(ROLES_KEY, roles), UseGuards(RoleGuard))
}
