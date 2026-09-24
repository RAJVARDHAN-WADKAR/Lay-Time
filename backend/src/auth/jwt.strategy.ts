import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret') || 'super_secret_jwt_key_for_laytime_dev_change_in_production',
    });
  }

  async validate(payload: any) {
    // If DB is available, check user exists and is active
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });
      if (!user || user.status === 'INACTIVE') {
        throw new UnauthorizedException('User is inactive or not found');
      }
      return { id: user.id, email: user.email, name: user.name, role: user.role };
    } catch (e) {
      // Offline fallback: allow token payload
      return { id: payload.sub, email: payload.email, name: payload.name || 'User', role: payload.role || 'CLAIM_PROCESSOR' };
    }
  }
}