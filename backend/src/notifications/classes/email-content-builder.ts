import { TriggerNotificationDto } from "../dto/trigger-notification.dto";

export class EmailContentBuilder {
  private recipientName?: string;
  private metadata?: Record<string, any>;
  private safeRecipient: string | null = null;

  constructor(
    private readonly dto: TriggerNotificationDto,
  ) { }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>'"]/g, char => {
      switch (char) {
        case '&':
          return '&amp;';
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        case '"':
          return '&quot;';
        case "'":
          return '&#39;';
        default:
          return char;
      }
    });
  }

  private escapeAttribute(value: string): string {
    return this.escapeHtml(value);
  }

  withRecipientName(name?: string): this {
    this.recipientName = name;
    this.safeRecipient = name ? this.escapeHtml(name) : null;
    return this;
  }

  withMetadata(metadata?: Record<string, any>): this {
    this.metadata = metadata;
    return this;
  }

  build(): EmailContent {
    const dto = this.dto;
    const metadata = this.metadata || {};
    const safeTitle = this.escapeHtml(dto.title);
    const safeMessage = this.escapeHtml(dto.message).replace(/\n/g, '<br />');
    const projectName = this.pickAndEscape(metadata, 'projectName');
    const taskTitle = this.pickAndEscape(metadata, 'taskTitle');
    const commenterName = this.pickAndEscape(metadata, 'commenterName');
    const actionUrlRaw = metadata.actionUrl ?? metadata.action_url;
    const actionUrl = typeof actionUrlRaw === 'string' && actionUrlRaw ? actionUrlRaw : null;

    const details: string[] = [];
    this.appendDetail(details, 'Project', projectName);
    this.appendDetail(details, 'Task', taskTitle);
    this.appendDetail(details, 'From', commenterName);
    if (dto.relatedTaskId) {
      details.push(`<p><strong>Task ID:</strong> ${this.escapeHtml(dto.relatedTaskId)}</p>`);
    }
    if (dto.relatedProjectId) {
      details.push(`<p><strong>Project ID:</strong> ${this.escapeHtml(dto.relatedProjectId)}</p>`);
    }

    const actionBlock = actionUrl
      ? `<p style="margin: 24px 0 0 0;"><a href="${this.escapeAttribute(actionUrl)}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">Open in NexusPM</a></p>`
      : '';

    const greeting = this.safeRecipient ? `<p>Hi ${this.safeRecipient},</p>` : '<p>Hello,</p>';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; border: 1px solid #e5e7eb; padding: 24px; border-radius: 8px;">
        <h2 style="color: #1e293b; margin-top: 0;">${safeTitle}</h2>
        ${greeting}
        <p>${safeMessage}</p>
        ${details.join('\n')}
        ${actionBlock}
        <p style="margin-top: 32px; color: #6b7280;">- The NexusPM Team</p>
      </div>
    `;

    const textLines: string[] = [];
    if (this.recipientName) {
      textLines.push(`Hi ${this.recipientName},`);
    } else {
      textLines.push('Hello,');
    }
    textLines.push(dto.message);
    if (metadata.projectName) {
      textLines.push(`Project: ${metadata.projectName}`);
    }
    if (metadata.taskTitle) {
      textLines.push(`Task: ${metadata.taskTitle}`);
    }
    if (metadata.commenterName) {
      textLines.push(`From: ${metadata.commenterName}`);
    }
    if (dto.relatedTaskId) {
      textLines.push(`Task ID: ${dto.relatedTaskId}`);
    }
    if (dto.relatedProjectId) {
      textLines.push(`Project ID: ${dto.relatedProjectId}`);
    }
    if (actionUrl) {
      textLines.push(`Open in NexusPM: ${actionUrl}`);
    }
    textLines.push('— The NexusPM Team');

    return {
      subject: dto.title,
      html: html.replace(/\s+\n/g, '\n').trim(),
      text: textLines.join('\n\n'),
    };
  }

  private appendDetail(details: string[], label: string, value: string | null): void {
    if (value) {
      details.push(`<p><strong>${label}:</strong> ${value}</p>`);
    }
  }

  private pickAndEscape(metadata: Record<string, any>, key: string): string | null {
    const value = metadata[key];
    if (value === undefined || value === null) {
      return null;
    }
    return this.escapeHtml(String(value));
  }
}