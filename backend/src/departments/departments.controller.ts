import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('departments')
@UseGuards(JwtAuthGuard)
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() createDepartmentDto: CreateDepartmentDto) {
    return this.departmentsService.create(user.id, createDepartmentDto);
  }

  @Get()
  findAll() {
    return this.departmentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.departmentsService.findOne(id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
  ) {
    return this.departmentsService.update(id, user.id, updateDepartmentDto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.departmentsService.remove(id, user.id);
  }
}

