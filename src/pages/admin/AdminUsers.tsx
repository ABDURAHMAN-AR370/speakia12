import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Trash2, Upload, Users as UsersIcon, Loader2, KeyRound } from "lucide-react";
import BatchCards from "@/components/admin/BatchCards";
import AttendanceRegister from "@/components/admin/AttendanceRegister";
import ToppersLeaderboard from "@/components/admin/ToppersLeaderboard";

interface WhitelistEntry {
  id: string;
  email: string;
  batch_number: number;
  created_at: string;
  password_reset_enabled: boolean;
}

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  gender: string;
  place: string;
  whatsapp_number: string;
  batch_number: number;
  created_at: string;
  referred_by: string | null;
  signup_source: string | null;
}

interface CompletionData { user_id: string; day_number: number; completed_at: string; }
interface TopperData { user_id: string; full_name: string; total_score: number; max_possible: number; percentage: number; quizzes_taken: number; }

export default function AdminUsers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [whitelist, setWhitelist] = useState<WhitelistEntry[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [completions, setCompletions] = useState<CompletionData[]>([]);
  const [toppers, setToppers] = useState<TopperData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newBatch, setNewBatch] = useState("1");
  const [bulkEmails, setBulkEmails] = useState("");
  const [bulkBatch, setBulkBatch] = useState("1");
  const [adding, setAdding] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("batches");

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (selectedBatch) fetchBatchData(selectedBatch);
  }, [selectedBatch]);

  const fetchData = async () => {
    try {
      const [whitelistResult, usersResult] = await Promise.all([
        supabase.from("whitelist").select("*").order("batch_number").order("created_at", { ascending: false }),
        supabase.from("profiles").select("*").order("batch_number").order("created_at", { ascending: false }),
      ]);
      setWhitelist(whitelistResult.data || []);
      setUsers(usersResult.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBatchData = async (batchNumber: number) => {
    try {
      const batchUsers = users.filter(u => u.batch_number === batchNumber);
      const userIds = batchUsers.map(u => u.user_id);
      if (userIds.length === 0) { setCompletions([]); setToppers([]); return; }

      const { data: progressData } = await supabase.from("user_progress").select("user_id, material_id, completed_at").in("user_id", userIds);
      const { data: materialsData } = await supabase.from("course_materials").select("id, day_number");

      const materialDays = new Map(materialsData?.map(m => [m.id, m.day_number]) || []);
      const dayCompletions: CompletionData[] = [];
      const userDayProgress = new Map<string, Map<number, { count: number; date: string }>>();

      progressData?.forEach(p => {
        const dayNum = materialDays.get(p.material_id);
        if (!dayNum) return;
        if (!userDayProgress.has(p.user_id)) userDayProgress.set(p.user_id, new Map());
        const userMap = userDayProgress.get(p.user_id)!;
        if (!userMap.has(dayNum)) userMap.set(dayNum, { count: 0, date: p.completed_at });
        const dayData = userMap.get(dayNum)!;
        dayData.count++;
        if (p.completed_at > dayData.date) dayData.date = p.completed_at;
      });

      const materialsPerDay = new Map<number, number>();
      materialsData?.forEach(m => { materialsPerDay.set(m.day_number, (materialsPerDay.get(m.day_number) || 0) + 1); });

      userDayProgress.forEach((dayMap, userId) => {
        dayMap.forEach((data, dayNum) => {
          const totalInDay = materialsPerDay.get(dayNum) || 0;
          if (data.count >= totalInDay && totalInDay > 0) {
            dayCompletions.push({ user_id: userId, day_number: dayNum, completed_at: data.date });
          }
        });
      });
      setCompletions(dayCompletions);

      const { data: quizSubmissions } = await supabase.from("quiz_submissions").select("user_id, score, max_score").in("user_id", userIds);
      const userScores = new Map<string, { total: number; max: number; count: number }>();
      quizSubmissions?.forEach(sub => {
        if (!userScores.has(sub.user_id)) userScores.set(sub.user_id, { total: 0, max: 0, count: 0 });
        const scores = userScores.get(sub.user_id)!;
        scores.total += sub.score; scores.max += sub.max_score; scores.count++;
      });

      const toppersList: TopperData[] = [];
      userScores.forEach((scores, userId) => {
        const userProfile = batchUsers.find(u => u.user_id === userId);
        if (userProfile && scores.max > 0) {
          toppersList.push({ user_id: userId, full_name: userProfile.full_name, total_score: scores.total, max_possible: scores.max, percentage: (scores.total / scores.max) * 100, quizzes_taken: scores.count });
        }
      });
      toppersList.sort((a, b) => b.percentage - a.percentage);
      setToppers(toppersList.slice(0, 10));
    } catch (error) {
      console.error("Error fetching batch data:", error);
    }
  };

  const handleAddEmail = async () => {
    if (!newEmail.trim()) return;
    setAdding(true);
    try {
      const { error } = await supabase.from("whitelist").insert({ email: newEmail.toLowerCase().trim(), batch_number: parseInt(newBatch), added_by: user?.id });
      if (error) throw error;
      toast({ title: "Email added to whitelist" });
      setNewEmail(""); setNewBatch("1"); setShowAddDialog(false); fetchData();
    } catch (error: unknown) {
      toast({ title: "Failed to add email", description: (error as { message?: string }).message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const handleBulkAdd = async () => {
    const emails = bulkEmails.split(/[\n,;]/).map(e => e.toLowerCase().trim()).filter(e => e && e.includes("@"));
    if (emails.length === 0) { toast({ title: "No valid emails found", variant: "destructive" }); return; }
    setAdding(true);
    try {
      const { error } = await supabase.from("whitelist").insert(emails.map(email => ({ email, batch_number: parseInt(bulkBatch), added_by: user?.id })));
      if (error) throw error;
      toast({ title: `${emails.length} emails added to whitelist` });
      setBulkEmails(""); setBulkBatch("1"); setShowBulkDialog(false); fetchData();
    } catch (error: unknown) {
      toast({ title: "Failed to add emails", description: (error as { message?: string }).message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveFromWhitelist = async (id: string) => {
    try {
      const { error } = await supabase.from("whitelist").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Email removed from whitelist" }); fetchData();
    } catch {
      toast({ title: "Failed to remove email", variant: "destructive" });
    }
  };

  const handleTogglePasswordReset = async (id: string, enabled: boolean) => {
    try {
      const { error } = await supabase.from("whitelist").update({ password_reset_enabled: enabled }).eq("id", id);
      if (error) throw error;
      toast({ title: enabled ? "Password reset enabled" : "Password reset disabled" });
      fetchData();
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  const batchInfo = users.reduce((acc, user) => {
    const batch = user.batch_number || 1;
    const existing = acc.find(b => b.batchNumber === batch);
    if (existing) existing.studentCount++;
    else acc.push({ batchNumber: batch, studentCount: 1 });
    return acc;
  }, [] as { batchNumber: number; studentCount: number }[]);
  batchInfo.sort((a, b) => a.batchNumber - b.batchNumber);

  const selectedBatchStudents = users.filter(u => u.batch_number === selectedBatch);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">User Management</h1>
            <p className="text-muted-foreground mt-1">Manage whitelist, batches, and view user progress</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={() => setShowBulkDialog(true)} className="flex-1 sm:flex-none">
              <Upload className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Bulk Import</span>
            </Button>
            <Button size="sm" onClick={() => setShowAddDialog(true)} className="flex-1 sm:flex-none">
              <Plus className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Add Email</span>
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="batches">Batches</TabsTrigger>
            <TabsTrigger value="whitelist">Whitelist</TabsTrigger>
          </TabsList>

          <TabsContent value="batches" className="space-y-6">
            {selectedBatch ? (
              <div className="space-y-6">
                <AttendanceRegister batchNumber={selectedBatch} students={selectedBatchStudents} completions={completions} onBack={() => setSelectedBatch(null)} />
                <ToppersLeaderboard batchNumber={selectedBatch} toppers={toppers} />
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><UsersIcon className="h-5 w-5" />Student Batches</CardTitle>
                  <CardDescription>Click a batch to view attendance and toppers</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? <div className="text-center py-8">Loading...</div> : <BatchCards batches={batchInfo} onSelectBatch={setSelectedBatch} />}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="whitelist">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><UsersIcon className="h-5 w-5" />Email Whitelist</CardTitle>
                <CardDescription>Only whitelisted emails can register. Toggle 🔑 to enable password reset.</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {loading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : whitelist.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No emails in whitelist yet</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead className="hidden sm:table-cell">Batch</TableHead>
                        <TableHead className="hidden sm:table-cell">Status</TableHead>
                        <TableHead className="text-center">🔑 Reset</TableHead>
                        <TableHead className="w-[60px]">Del</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {whitelist.map((entry) => {
                        const isRegistered = users.some(u => u.email === entry.email);
                        return (
                          <TableRow key={entry.id}>
                            <TableCell className="font-medium text-sm">{entry.email}</TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <Badge variant="outline">Batch {entry.batch_number || 1}</Badge>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <Badge variant={isRegistered ? "default" : "secondary"}>
                                {isRegistered ? "Registered" : "Pending"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Switch
                                checked={entry.password_reset_enabled}
                                onCheckedChange={(checked) => handleTogglePasswordReset(entry.id, checked)}
                              />
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => handleRemoveFromWhitelist(entry.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add Single Email Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Email to Whitelist</DialogTitle>
              <DialogDescription>This email will be able to register for the course</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" placeholder="user@example.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="batch">Batch Number</Label>
                <Select value={newBatch} onValueChange={setNewBatch}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 20 }, (_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>Batch {i + 1}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button onClick={handleAddEmail} disabled={adding}>
                {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Add Email
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Import Dialog */}
        <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bulk Import Emails</DialogTitle>
              <DialogDescription>Paste multiple emails (separated by commas, semicolons, or new lines)</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bulkBatch">Batch Number</Label>
                <Select value={bulkBatch} onValueChange={setBulkBatch}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 20 }, (_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>Batch {i + 1}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bulkEmails">Email Addresses</Label>
                <Textarea id="bulkEmails" placeholder={"user1@example.com\nuser2@example.com"} value={bulkEmails} onChange={(e) => setBulkEmails(e.target.value)} rows={6} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBulkDialog(false)}>Cancel</Button>
              <Button onClick={handleBulkAdd} disabled={adding}>
                {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Import Emails
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
