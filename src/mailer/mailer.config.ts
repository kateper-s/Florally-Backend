import { MailerOptions } from "@nestjs-modules/mailer";
import { ConfigService } from "@nestjs/config";

export const getMailConfig = async (
  configService: ConfigService,
): Promise<MailerOptions> => ({
  transport: {
    host: configService.get<string>("SMTP_HOST"),
    port: configService.get<number>("SMTP_PORT"),
    secure: true,
    auth: {
      user: configService.get<string>("SMTP_USER"),
      pass: configService.get<string>("SMTP_PASSWORD"),
    },
  },
  defaults: {
    from: `"Florallyhelp" <${configService.get<string>("SMTP_FROM")}>`
  },
});