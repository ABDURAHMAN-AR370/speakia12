import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, FileText, TrendingUp } from "lucide-react";

interface Stats {
  totalUsers: number;
  whitelistedEmails: number;
  totalMaterials: number;
  totalForms: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    whitelistedEmails: 0,
    totalMaterials: 0,
    totalForms: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [usersResult, whitelistResult, materialsResult, formsResult] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("whitelist").select("id", { count: "exact", head: true }),
        supabase.from("course_materials").select("id", { count: "exact", head: true }),
        supabase.from("custom_forms").select("id", { count: "exact", head: true }),
      ]);

      setStats({
        totalUsers: usersResult.count || 0,
        whitelistedEmails: whitelistResult.count || 0,
        totalMaterials: materialsResult.count || 0,
        totalForms: formsResult.count || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Registered Users",
      value: stats.totalUsers,
      description: "Active course participants",
      icon: Users,
      color: "text-primary",
    },
    {
      title: "Whitelisted Emails",
      value: stats.whitelistedEmails,
      description: "Approved for registration",
      icon: TrendingUp,
      color: "text-success",
    },
    {
      title: "Course Materials",
      value: stats.totalMaterials,
      description: "Across all 30 days",
      icon: Calendar,
      color: "text-warning",
    },
    {
      title: "Custom Forms",
      value: stats.totalForms,
      description: "For material completion",
      icon: FileText,
      color: "text-primary",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage your SPEAKAI course platform
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{loading ? "..." : stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <a
                href="/admin/users"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
              >
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Manage Users</p>
                  <p className="text-sm text-muted-foreground">Add emails to whitelist, view progress</p>
                </div>
              </a>
              <a
                href="/admin/days"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
              >
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Manage Days & Materials</p>
                  <p className="text-sm text-muted-foreground">Add or edit course content</p>
                </div>
              </a>
              <a
                href="/admin/forms"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
              >
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Form Builder</p>
                  <p className="text-sm text-muted-foreground">Create custom forms for materials</p>
                </div>
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Course Overview</CardTitle>
              <CardDescription>30-day course status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Days with content</span>
                  <span className="font-medium">
                    {loading ? "..." : `${Math.min(stats.totalMaterials, 30)}/30`}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{
                      width: `${(Math.min(stats.totalMaterials, 30) / 30) * 100}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Add materials to each day to complete the course setup
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
