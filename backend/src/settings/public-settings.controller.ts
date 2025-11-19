import { Controller, Get } from '@nestjs/common';
import { SettingsService } from './settings.service';

@Controller('settings')
export class PublicSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // Public endpoint exposing only safe settings
  @Get('public')
  getPublicSettings() {
    return this.settingsService.getPublicSettings();
  }
}


