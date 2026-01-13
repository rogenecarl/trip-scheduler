"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAssignmentStats } from "@/hooks/use-assignments";
import { Package, CheckCircle, Clock } from "lucide-react";

export function AssignmentStats() {
  const { data: stats, isLoading } = useAssignmentStats();

  if (isLoading) {
    return <AssignmentStatsSkeleton />;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard
        label="Total Trips"
        value={stats?.total ?? 0}
        icon={Package}
        iconClassName="text-blue-600 bg-blue-100"
      />
      <StatCard
        label="Assigned"
        value={stats?.assigned ?? 0}
        icon={CheckCircle}
        iconClassName="text-green-600 bg-green-100"
      />
      <StatCard
        label="Pending"
        value={stats?.pending ?? 0}
        icon={Clock}
        iconClassName="text-amber-600 bg-amber-100"
      />
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
}

function StatCard({ label, value, icon: Icon, iconClassName }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg p-2 ${iconClassName}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AssignmentStatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-7 w-10" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
