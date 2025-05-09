
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Users, Film, Tv } from 'lucide-react';

export default function AdminDashboardTab() {
  // In a real app, you'd fetch these stats
  const stats = {
    totalAnime: 120,
    totalUsers: 580,
    movies: 40,
    tvShows: 80,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dashboard Overview</CardTitle>
        <CardDescription>Welcome to the Qentai Admin Panel. Here's a quick look at your platform.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<BarChart className="w-6 h-6 text-primary" />} title="Total Content" value={stats.totalAnime.toString()} />
          <StatCard icon={<Users className="w-6 h-6 text-primary" />} title="Registered Users" value={stats.totalUsers.toString()} />
          <StatCard icon={<Film className="w-6 h-6 text-primary" />} title="Movies" value={stats.movies.toString()} />
          <StatCard icon={<Tv className="w-6 h-6 text-primary" />} title="TV Shows" value={stats.tvShows.toString()} />
        </div>
        <div>
          <h3 className="text-xl font-semibold mb-3 text-foreground">Quick Actions</h3>
          <p className="text-muted-foreground">
            Use the tabs above to manage content, import from TMDB, edit episodes, or add new series/movies manually. User management features will be available soon.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
}

function StatCard({ icon, title, value }: StatCardProps) {
  return (
    <Card className="bg-card/50">
      <CardContent className="p-4 flex items-center space-x-4">
        <div className="p-3 rounded-full bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
