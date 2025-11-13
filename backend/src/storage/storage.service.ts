import { Injectable } from '@nestjs/common';
import { S3Service } from './s3.service';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  constructor(
    private s3Service: S3Service,
    private prisma: PrismaService,
  ) {}

  async uploadTaskAttachment(
    taskId: string,
    userId: string,
    file: Express.Multer.File,
  ) {
    // Verify task exists and user has access
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    // Generate unique file key
    const fileExtension = file.originalname.split('.').pop();
    const fileKey = `tasks/${taskId}/${uuidv4()}.${fileExtension}`;

    // Upload to S3
    await this.s3Service.uploadFile(fileKey, file.buffer, file.mimetype);

    // Get signed URL (valid for 1 hour)
    const fileUrl = await this.s3Service.getSignedUrl(fileKey, 3600);

    // Save to database
    const attachment = await this.prisma.taskAttachment.create({
      data: {
        taskId,
        fileName: file.originalname,
        fileUrl: fileKey, // Store the key, not the signed URL
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedBy: userId,
      },
    });

    return {
      ...attachment,
      fileUrl, // Return signed URL for immediate use
    };
  }

  async getAttachmentUrl(attachmentId: string): Promise<string> {
    const attachment = await this.prisma.taskAttachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      throw new Error('Attachment not found');
    }

    // Generate signed URL
    return this.s3Service.getSignedUrl(attachment.fileUrl, 3600);
  }

  async deleteAttachment(attachmentId: string, userId: string): Promise<void> {
    const attachment = await this.prisma.taskAttachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      throw new Error('Attachment not found');
    }

    if (attachment.uploadedBy !== userId) {
      throw new Error('You can only delete your own attachments');
    }

    // Delete from S3
    await this.s3Service.deleteFile(attachment.fileUrl);

    // Delete from database
    await this.prisma.taskAttachment.delete({
      where: { id: attachmentId },
    });
  }
}

