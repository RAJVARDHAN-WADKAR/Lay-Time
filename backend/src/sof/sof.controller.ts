import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SofService } from './sof.service';
import { CreateSofDto, UpdateSofDto } from './dto/create-sof.dto';
import { CreateActivityDto, UpdateActivityDto } from './dto/create-activity.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Statement of Facts (SoF)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class SofController {
  constructor(private sofService: SofService) {}

  @Get('claims/:claimId/sof')
  @ApiOperation({ summary: 'Get all Statements of Facts and event activities for a claim' })
  async findByClaim(@Param('claimId') claimId: string) {
    return this.sofService.findByClaim(claimId);
  }

  @Post('claims/:claimId/sof')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.CLAIM_PROCESSOR)
  @ApiOperation({ summary: 'Create a new Statement of Facts container for a claim' })
  async create(@Param('claimId') claimId: string, @Body() dto: CreateSofDto) {
    return this.sofService.create(claimId, dto);
  }

  @Patch('sof/:id')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.CLAIM_PROCESSOR)
  @ApiOperation({ summary: 'Update Statement of Facts metadata' })
  async update(@Param('id') id: string, @Body() dto: UpdateSofDto) {
    return this.sofService.update(id, dto);
  }

  @Post('sof/:id/verify')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.CLAIM_PROCESSOR)
  @ApiOperation({ summary: 'Mark Statement of Facts as verified' })
  async verify(@Param('id') id: string) {
    return this.sofService.verify(id);
  }

  @Post('sof/:id/activities')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.CLAIM_PROCESSOR)
  @ApiOperation({ summary: 'Add a new activity log entry to the Statement of Facts' })
  async addActivity(@Param('id') id: string, @Body() dto: CreateActivityDto) {
    return this.sofService.addActivity(id, dto);
  }

  @Patch('sof/activities/:id')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.CLAIM_PROCESSOR)
  @ApiOperation({ summary: 'Update an activity entry (flags as user-corrected)' })
  async updateActivity(@Param('id') id: string, @Body() dto: UpdateActivityDto) {
    return this.sofService.updateActivity(id, dto);
  }

  @Delete('sof/activities/:id')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.CLAIM_PROCESSOR)
  @ApiOperation({ summary: 'Delete an activity entry' })
  async deleteActivity(@Param('id') id: string) {
    return this.sofService.deleteActivity(id);
  }
}