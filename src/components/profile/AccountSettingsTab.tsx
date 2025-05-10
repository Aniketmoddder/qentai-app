'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import ProfileDetailsForm from './ProfileDetailsForm';
import PasswordChangeForm from './PasswordChangeForm';
import { UserCircle, KeyRound } from 'lucide-react';

export default function AccountSettingsTab() {
  return (
    <div className="space-y-8">
      <Card className="shadow-lg border-border/40">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-primary flex items-center">
            <UserCircle className="w-6 h-6 mr-2" /> Profile Details
          </CardTitle>
          <CardDescription>Update your personal information.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileDetailsForm />
        </CardContent>
      </Card>

      <Card className="shadow-lg border-border/40">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-primary flex items-center">
            <KeyRound className="w-6 h-6 mr-2" /> Change Password
          </CardTitle>
          <CardDescription>Update your account password. Choose a strong and unique password.</CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordChangeForm />
        </CardContent>
      </Card>
    </div>
  );
}
