import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PortsService } from './ports.service';
import { CreatePortDto, UpdatePortDto } from './dto/create-port.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Ports & Berths')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class PortsController {
  constructor(private portsService: PortsService) {}

  @Get('claims/:claimId/ports')
  @ApiOperation({ summary: 'Get all ports configured for a claim' })
  async findByClaim(@Param('claimId') claimId: string) {
    return this.portsService.findByClaim(claimId);
  }

  @Post('claims/:claimId/ports')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.CLAIM_PROCESSOR)
  @ApiOperation({ summary: 'Add a port to a claim' })
  async create(@Param('claimId') claimId: string, @Body() dto: CreatePortDto) {
    return this.portsService.create(claimId, dto);
  }

  @Patch('ports/:id')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.CLAIM_PROCESSOR)
  @ApiOperation({ summary: 'Update port details' })
  async update(@Param('id') id: string, @Body() dto: UpdatePortDto) {
    return this.portsService.update(id, dto);
  }

  @Delete('ports/:id')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.CLAIM_PROCESSOR)
  @ApiOperation({ summary: 'Delete port and associated berths' })
  async delete(@Param('id') id: string) {
    return this.portsService.delete(id);
  }
}