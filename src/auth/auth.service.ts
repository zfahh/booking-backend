import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/entities/user.entity';
import { Role } from '../common/enums/role.enum';
import { RegisterDto } from '../auth/dto/register.dto';
import { LoginDto } from '../auth/dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.userRepo.findOneBy({ username: dto.username });
    if (exists) throw new ConflictException('Username already taken');

    const password_hash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      username: dto.username,
      password_hash,
      role: Role.ADMIN, // default role
    });
    await this.userRepo.save(user);
    return { message: 'Registered successfully' };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOneBy({ username: dto.username });
    if (!user) throw new UnauthorizedException('Username not found.');

    const valid = await bcrypt.compare(dto.password, user.password_hash);
    if (!valid)
      throw new UnauthorizedException('Invalid username or password.');

    return {
      token: this.issueToken(user),
      user: {
        role: user.role,
        name: user.username,
      },
    };
  }

  async switchRole(userId: string, currentRole: Role) {
    const newRole = currentRole === Role.ADMIN ? Role.USER : Role.ADMIN;
    await this.userRepo.update(userId, { role: newRole });

    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new UnauthorizedException('User not found');
    return {
      token: this.issueToken(user),
      user: {
        role: user.role,
        name: user.username,
      },
    };
  }

  private issueToken(user: User) {
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };
    return this.jwtService.sign(payload);
  }
}
