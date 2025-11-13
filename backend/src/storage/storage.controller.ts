import {
  Controller,
  Post,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Get,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('storage')
@UseGuards(JwtAuthGuard)
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('tasks/:taskId/attachments')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttachment(
    @CurrentUser() user: any,
    @Param('taskId') taskId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.storageService.uploadTaskAttachment(taskId, user.id, file);
  }

  @Get('attachments/:id/url')
  async getAttachmentUrl(@Param('id') id: string) {
    const url = await this.storageService.getAttachmentUrl(id);
    return { url };
  }

  @Delete('attachments/:id')
  async deleteAttachment(@CurrentUser() user: any, @Param('id') id: string) {
    await this.storageService.deleteAttachment(id, user.id);
    return { message: 'Attachment deleted successfully' };
  }
}

