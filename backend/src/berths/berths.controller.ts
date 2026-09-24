import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BerthsService } from './berths.service';
import { CreateBerthDto, UpdateBerthDto } from './dto/create-berth.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Ports & Berths')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class BerthsController {
  constructor(private berthsService: BerthsService) {}

  @Get('ports/:portId/berths')
  @ApiOperation({ summary: 'List all berths for a port' })
  async findByPort(@Param('portId') portId: string) {
    return this.berthsService.findByPort(portId);
  }

  @Post('ports/:portId/berths')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.CLAIM_PROCESSOR)
  @ApiOperation({ summary: 'Add a berth to a port with prorata share' })
  async create(@Param('portId') portId: string, @Body() dto: CreateBerthDto) {
    return this.berthsService.create(portId, dto);
  }

  @Patch('berths/:id')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.CLAIM_PROCESSOR)
  @ApiOperation({ summary: 'Update berth details or prorata allocation' })
  async update(@Param('id') id: string, @Body() dto: UpdateBerthDto) {
    return this.berthsService.update(id, dto);
  }

  @Delete('berths/:id')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.CLAIM_PROCESSOR)
  @ApiOperation({ summary: 'Delete berth' })
  async delete(@Param('id') id: string) {
    return this.berthsService.delete(id);
  }
}