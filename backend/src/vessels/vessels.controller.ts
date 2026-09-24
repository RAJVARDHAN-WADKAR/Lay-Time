import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VesselsService } from './vessels.service';
import { CreateVesselDto } from './dto/create-vessel.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Vessels')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vessels')
export class VesselsController {
  constructor(private vesselsService: VesselsService) {}

  @Get()
  @ApiOperation({ summary: 'List all vessels in fleet registry' })
  async findAll() {
    return this.vesselsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get vessel by ID' })
  async findOne(@Param('id') id: string) {
    return this.vesselsService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.CLAIM_PROCESSOR)
  @ApiOperation({ summary: 'Register a new vessel' })
  async create(@Body() dto: CreateVesselDto) {
    return this.vesselsService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Update vessel details' })
  async update(@Param('id') id: string, @Body() dto: Partial<CreateVesselDto>) {
    return this.vesselsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete vessel record' })
  async delete(@Param('id') id: string) {
    return this.vesselsService.delete(id);
  }
}