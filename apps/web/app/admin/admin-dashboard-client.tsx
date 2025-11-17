'use client';

import { useQuery } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/components/shadcn/card';
import { Users, Package, Calendar, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@repo/ui/components/shadcn/button';
import { Skeleton } from '@repo/ui/components/shadcn/skeleton';

export function AdminDashboardClient() {
  // Fetch user count
  const { data: userCountData, isLoading: isLoadingUserCount, error: userCountError, status: userCountStatus } = useQuery(
    orpc.user.count.queryOptions({
      input: {},
      staleTime: 1000 * 60, // 1 minute
    })
  );

  // Fetch total capsules count (using list with limit 0 to get total only)
  const { data: capsulesData, isLoading: isLoadingCapsules, error: capsulesError } = useQuery(
    orpc.capsule.list.queryOptions({
      input: {
        pagination: { limit: 1, offset: 0 },
        sort: { field: 'createdAt', direction: 'desc' },
      },
      staleTime: 1000 * 60,
    })
  );

  // Fetch recent capsules for quick stats
  const { data: recentCapsules, isLoading: isLoadingRecent, error: recentError } = useQuery(
    orpc.capsule.getRecent.queryOptions({
      input: {},
      staleTime: 1000 * 60,
    })
  );

  // Debug logging
  console.log('Dashboard Data:', {
    userCountData,
    userCountError,
    userCountStatus,
    isLoadingUserCount,
    capsulesData,
    capsulesError,
    recentCapsules,
    recentError,
  });

  const userCount = userCountData?.count ?? 0;
  const totalCapsules = capsulesData?.meta?.pagination?.total ?? 0;
  const recentCapsulesCount = recentCapsules?.capsules?.length ?? 0;
  const unlockedCapsules = recentCapsules?.capsules?.filter(c => !c.isLocked).length ?? 0;

  const isLoading = isLoadingUserCount || isLoadingCapsules || isLoadingRecent;

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Overview of your application statistics and quick actions
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{userCount}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Registered accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Capsules</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{totalCapsules}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Created time capsules
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Capsules</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{recentCapsulesCount}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              From the past week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unlocked Capsules</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{unlockedCapsules}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Available to open
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>
              View and manage all registered users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/admin/users">
                <Users className="mr-2 h-4 w-4" />
                Manage Users
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Capsule Management</CardTitle>
            <CardDescription>
              Browse and manage time capsules
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/admin/capsules">
                <Package className="mr-2 h-4 w-4" />
                Manage Capsules
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Presentation Settings</CardTitle>
            <CardDescription>
              Configure the presentation page content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/admin/presentation">
                <Calendar className="mr-2 h-4 w-4" />
                Edit Presentation
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Capsules Activity</CardTitle>
          <CardDescription>
            Latest time capsules created or updated
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : recentCapsules && recentCapsules.capsules.length > 0 ? (
            <div className="space-y-4">
              {recentCapsules.capsules.slice(0, 5).map((capsule) => (
                <div
                  key={capsule.id}
                  className="flex items-center justify-between border-b pb-3 last:border-b-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {capsule.title || 'Untitled Capsule'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Opens on {new Date(capsule.openingDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {capsule.isUnlocked && (
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                        Unlocked
                      </span>
                    )}
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/capsules/${capsule.id}`}>View</Link>
                    </Button>
                  </div>
                </div>
              ))}
              {recentCapsules.capsules.length > 5 && (
                <div className="pt-2">
                  <Button asChild variant="link" className="w-full">
                    <Link href="/admin/capsules">
                      View all capsules →
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No recent capsules found
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
