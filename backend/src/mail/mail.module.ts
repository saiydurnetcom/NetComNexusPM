import { SettingsModule } from "@/settings/settings.module";
import { Module } from "@nestjs/common";
import { MailService } from "./mail.service";

@Module({
    imports: [SettingsModule],
    providers: [MailService],
    exports: [MailService],
})
export class MailModule { }