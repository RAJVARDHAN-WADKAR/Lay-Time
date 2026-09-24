import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto, CreateRevisionDto } from './dto/create-document.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Document Management & Completeness')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  @Get('claims/:claimId/documents')
  @ApiOperation({ summary: 'List all repository documents attached to a claim' })
  async findByClaim(@Param('claimId') claimId: string) {
    return this.documentsService.findByClaim(claimId);
  }

  @Get('claims/:claimId/missing-docs')
  @ApiOperation({ summary: 'Check required document completeness (SOF, CP, NOR, Timesheet)' })
  async checkMissing(@Param('claimId') claimId: string) {
    return this.documentsService.checkMissing(claimId);
  }

  @Post('claims/:claimId/documents')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.CLAIM_PROCESSOR)
  @ApiOperation({ summary: 'Upload / attach document to claim repository' })
  async create(
    @Param('claimId') claimId: string,
    @Body() dto: CreateDocumentDto,
    @CurrentUser() user: any,
  ) {
    return this.documentsService.create(claimId, dto, user?.name);
  }

  @Get('documents/:id')
  @ApiOperation({ summary: 'Get document metadata by ID' })
  async findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  @Post('documents/:id/revision')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.CLAIM_PROCESSOR)
  @ApiOperation({ summary: 'Create new revision for an existing document' })
  async createRevision(
    @Param('id') id: string,
    @Body() dto: CreateRevisionDto,
    @CurrentUser() user: any,
  ) {
    return this.documentsService.createRevision(id, dto, user?.name);
  }

  @Delete('documents/:id')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Delete document' })
  async delete(@Param('id') id: string) {
    return this.documentsService.delete(id);
  }
}