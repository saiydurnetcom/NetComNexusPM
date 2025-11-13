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
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('tags')
@UseGuards(JwtAuthGuard)
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() createTagDto: CreateTagDto) {
    return this.tagsService.create(user.id, createTagDto);
  }

  @Get()
  findAll() {
    return this.tagsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tagsService.findOne(id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateTagDto: UpdateTagDto,
  ) {
    return this.tagsService.update(id, user.id, updateTagDto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.tagsService.remove(id, user.id);
  }
}

