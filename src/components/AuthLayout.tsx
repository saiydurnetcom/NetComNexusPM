import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  description: string;
  footerText: string;
  footerLink: string;
  footerLinkText: string;
}

export const AuthLayout = ({
  children,
  title,
  description,
  footerText,
  footerLink,
  footerLinkText,
}: AuthLayoutProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">{title}</CardTitle>
            <CardDescription className="text-center">{description}</CardDescription>
          </CardHeader>
          <CardContent>
            {children}
            <div className="mt-4 text-center text-sm">
              {footerText}{' '}
              <Button variant="link" className="p-0" asChild>
                <Link to={footerLink}>{footerLinkText}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};