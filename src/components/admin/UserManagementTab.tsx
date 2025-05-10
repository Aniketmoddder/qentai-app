
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Construction, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/button';
import Link from 'next/link';

export default function UserManagementTab() {
  return (
    <Card className="shadow-lg border-border/40">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold text-primary flex items-center">
            <ShieldCheck className="w-6 h-6 mr-2" /> User Management
        </CardTitle>
        <CardDescription>Manage user accounts, roles, permissions, and view activity logs.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center text-center py-16 bg-card/50 rounded-b-lg">
        <Construction className="w-20 h-20 text-primary/80 mb-6" />
        <h3 className="text-2xl font-semibold text-foreground mb-2">Feature Under Construction</h3>
        <p className="text-muted-foreground max-w-md mx-auto mb-6">
          We&apos;re currently developing advanced user management capabilities. Soon, you&apos;ll be able to:
        </p>
        <ul className="list-disc list-inside text-muted-foreground text-left space-y-1 mb-8 max-w-sm mx-auto">
            <li>View and filter all registered users.</li>
            <li>Assign or modify user roles (e.g., Member, Moderator, Admin).</li>
            <li>Temporarily suspend or permanently ban users.</li>
            <li>Reset user passwords or manage their account details.</li>
            <li>View user activity logs for moderation purposes.</li>
        </ul>
        <p className="text-sm text-muted-foreground">
          Thank you for your patience as we build these powerful tools for Qentai!
        </p>
        <Button variant="outline" className="mt-8" asChild>
            <Link href="/admin?tab=dashboard">Back to Dashboard</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
