import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Share2, Users, TrendingUp } from "lucide-react";

interface ReferralData {
  referral_code: string;
  referrer_name: string;
  referred_count: number;
}

interface SourceData {
  source: string;
  count: number;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function AdminReferrals() {
  const [referrals, setReferrals] = useState<ReferralData[]>([]);
  const [sources, setSources] = useState<SourceData[]>([]);
  const [totalReferred, setTotalReferred] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const { data: profiles } = await supabase.from("profiles").select("full_name, referral_code, referred_by, signup_source");
      if (!profiles) return;

      // Referral tracking
      const refMap = new Map<string, { name: string; count: number }>();
      let refCount = 0;
      profiles.forEach(p => {
        if (p.referred_by) {
          refCount++;
          const referrer = profiles.find(pr => pr.referral_code === p.referred_by);
          const key = p.referred_by;
          if (!refMap.has(key)) refMap.set(key, { name: referrer?.full_name || key, count: 0 });
          refMap.get(key)!.count++;
        }
      });
      const refList: ReferralData[] = [];
      refMap.forEach((v, k) => refList.push({ referral_code: k, referrer_name: v.name, referred_count: v.count }));
      refList.sort((a, b) => b.referred_count - a.referred_count);
      setReferrals(refList);
      setTotalReferred(refCount);

      // Source tracking
      const srcMap = new Map<string, number>();
      profiles.forEach(p => {
        const src = p.signup_source || "Unknown";
        srcMap.set(src, (srcMap.get(src) || 0) + 1);
      });
      const srcList: SourceData[] = [];
      srcMap.forEach((count, source) => srcList.push({ source, count }));
      srcList.sort((a, b) => b.count - a.count);
      setSources(srcList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <DashboardLayout><div className="text-center py-12">Loading...</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Referrals & Analytics</h1>
          <p className="text-muted-foreground mt-1">Track how users discover your platform</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card><CardContent className="pt-6 flex items-center gap-4"><Share2 className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{referrals.length}</p><p className="text-sm text-muted-foreground">Active Referrers</p></div></CardContent></Card>
          <Card><CardContent className="pt-6 flex items-center gap-4"><Users className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{totalReferred}</p><p className="text-sm text-muted-foreground">Users Referred</p></div></CardContent></Card>
          <Card><CardContent className="pt-6 flex items-center gap-4"><TrendingUp className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{sources.length}</p><p className="text-sm text-muted-foreground">Signup Sources</p></div></CardContent></Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Signup Sources</CardTitle>
              <CardDescription>How users heard about the platform</CardDescription>
            </CardHeader>
            <CardContent>
              {sources.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={sources} dataKey="count" nameKey="source" cx="50%" cy="50%" outerRadius={100} label={({ source, percent }) => `${source} ${(percent * 100).toFixed(0)}%`}>
                      {sources.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Referrers</CardTitle>
              <CardDescription>Users who referred the most people</CardDescription>
            </CardHeader>
            <CardContent>
              {referrals.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No referrals yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={referrals.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="referrer_name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="referred_count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Referrals Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Referrers</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {referrals.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No referral data</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Referrer</TableHead>
                    <TableHead>Referral Code</TableHead>
                    <TableHead>People Referred</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.map((r, i) => (
                    <TableRow key={r.referral_code}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-medium">{r.referrer_name}</TableCell>
                      <TableCell><Badge variant="outline">{r.referral_code}</Badge></TableCell>
                      <TableCell><Badge>{r.referred_count}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
