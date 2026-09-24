import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ClaimsService } from './claims.service';
import { CreateClaimDto, UpdateClaimDto, ClaimQueryDto, SettleClaimDto, AssignClaimDto } from './dto/create-claim.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Claims Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('claims')
export class ClaimsController {
  constructor(private claimsService: ClaimsService) {}

  @Get()
  @ApiOperation({ summary: 'List all claims (Processors restricted to assigned claims)' })
  async findAll(@Query() query: ClaimQueryDto, @CurrentUser() user: any) {
    return this.claimsService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get detailed claim file including ports, SoF, calculations, and RAC' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.claimsService.findOne(id, user);
  }

  @Get(':id/summary')
  @ApiOperation({ summary: 'Get concise commercial claim summary' })
  async getSummary(@Param('id') id: string, @CurrentUser() user: any) {
    return this.claimsService.getSummary(id, user);
  }

  @Post()
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.CLAIM_PROCESSOR)
  @ApiOperation({ summary: 'Create a new claim with ports, berths, and draft SoF' })
  async create(@Body() dto: CreateClaimDto, @CurrentUser() user: any) {
    return this.claimsService.create(dto, user);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.CLAIM_PROCESSOR)
  @ApiOperation({ summary: 'Update claim metadata and financial parameters' })
  async update(@Param('id') id: string, @Body() dto: UpdateClaimDto, @CurrentUser() user: any) {
    return this.claimsService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Delete a claim' })
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.claimsService.delete(id, user);
  }

  @Post(':id/submit')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.CLAIM_PROCESSOR)
  @ApiOperation({ summary: 'Submit claim from INCOMPLETE to SUBMITTED status' })
  async submit(@Param('id') id: string, @CurrentUser() user: any) {
    return this.claimsService.submit(id, user);
  }

  @Post(':id/review')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Advance claim from SUBMITTED to REVIEW status' })
  async review(@Param('id') id: string, @CurrentUser() user: any) {
    return this.claimsService.review(id, user);
  }

  @Post(':id/settle')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Settle claim and record agreed financial amount' })
  async settle(@Param('id') id: string, @Body() dto: SettleClaimDto, @CurrentUser() user: any) {
    return this.claimsService.settle(id, dto, user);
  }

  @Post(':id/assign')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Assign claim to a specific claim processor' })
  async assign(@Param('id') id: string, @Body() dto: AssignClaimDto) {
    return this.claimsService.assign(id, dto);
  }
}