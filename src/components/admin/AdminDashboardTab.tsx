
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Users, Film, Tv } from 'lucide-react';

export default function AdminDashboardTab() {
  // In a real app, you'd fetch these stats from your database
  const stats = {
    totalAnime: 0, // Placeholder, fetch from DB
    totalUsers: 0, // Placeholder, fetch from DB
    movies: 0,     // Placeholder, fetch from DB
    tvShows: 0,    // Placeholder, fetch from DB
  };

  // useEffect to fetch stats would go here

  return (
    <Card className="shadow-xl border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl font-semibold text-primary">Dashboard Overview</CardTitle>
        <CardDescription className="text-base">
          Welcome to the Qentai Admin Panel. Here&apos;s a quick look at your platform.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <StatCard icon={<BarChart className="w-7 h-7" />} title="Total Content" value={stats.totalAnime.toString()} bgColor="bg-blue-500/10" iconColor="text-blue-500" />
          <StatCard icon={<Users className="w-7 h-7" />} title="Registered Users" value={stats.totalUsers.toString()} bgColor="bg-green-500/10" iconColor="text-green-500" />
          <StatCard icon={<Film className="w-7 h-7" />} title="Movies" value={stats.movies.toString()} bgColor="bg-purple-500/10" iconColor="text-purple-500" />
          <StatCard icon={<Tv className="w-7 h-7" />} title="TV Shows" value={stats.tvShows.toString()} bgColor="bg-orange-500/10" iconColor="text-orange-500" />
        </div>
        <div className="p-6 bg-card rounded-lg shadow-inner">
          <h3 className="text-xl font-semibold mb-3 text-foreground">Quick Actions & Notes</h3>
          <p className="text-muted-foreground leading-relaxed">
            Navigate using the tabs above to manage your anime library. You can import new titles using the TMDB tool,
            manage existing content details, edit or add episode information, and manually create new entries.
            User management features are planned for future updates.
          </p>
          <p className="mt-3 text-sm text-primary/80">
            Tip: Regularly check for new TMDB entries to keep your library fresh!
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
  bgColor?: string;
  iconColor?: string;
}

function StatCard({ icon, title, value, bgColor = 'bg-primary/10', iconColor = 'text-primary' }: StatCardProps) {
  return (
    <Card className="bg-card/80 hover:shadow-lg transition-all duration-300 ease-in-out transform hover:-translate-y-1 border-border/30">
      <CardContent className="p-5 flex items-center space-x-4">
        <div className={`p-4 rounded-full ${bgColor} ${iconColor}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
