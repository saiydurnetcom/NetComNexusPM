import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';
import { S3Service } from './s3.service';

@Module({
  controllers: [StorageController],
  providers: [StorageService, S3Service],
  exports: [StorageService],
})
export class StorageModule {}

