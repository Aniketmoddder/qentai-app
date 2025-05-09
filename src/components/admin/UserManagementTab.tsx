
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Construction } from 'lucide-react';

export default function UserManagementTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center"><Users className="mr-2"/> User Management</CardTitle>
        <CardDescription>Manage user accounts, roles, and permissions.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center text-center py-12">
        <Construction className="w-16 h-16 text-primary mb-4" />
        <h3 className="text-xl font-semibold text-foreground">Coming Soon!</h3>
        <p className="text-muted-foreground">
          User management features, including viewing user lists, editing roles, and managing access, are currently under development.
        </p>
      </CardContent>
    </Card>
  );
}
