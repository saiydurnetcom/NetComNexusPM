interface EmailContent {
    subject: string;
    html: string;
    text: string;
}

interface RuntimeNotificationSettings {
    emailEnabled: boolean;
    emailApiUrl?: string | null;
    emailApiKey?: string | null;
    emailFrom?: string | null;
    emailProvider?: string | null;
    pushEnabled: boolean;
    pushVapidPublicKey?: string | null;
}



interface EmailRecipient {
    email: string;
    name?: string;
}