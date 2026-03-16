import { Role } from '../enums/role.enum';

export interface JwtUser {
  id: string;
  username: string;
  role: Role;
}

export interface RequestWithUser extends Request {
  user: JwtUser;
}
