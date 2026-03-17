import { MailerOptions } from "@nestjs-modules/mailer";
import { EjsAdapter } from "@nestjs-modules/mailer/dist/adapters/ejs.adapter";
import { ConfigService } from "@nestjs/config";
import { join } from "path";

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
  template: {
    dir: join(__dirname, '..', 'templates'),
    adapter: new EjsAdapter(),
    options: {
      strict: true,
    },
  },
});