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
import { Plus, Trash2, Upload, Users as UsersIcon, Loader2, ShieldBan, ShieldCheck, ArrowUpDown } from "lucide-react";
import BatchCards from "@/components/admin/BatchCards";
import AttendanceRegister from "@/components/admin/AttendanceRegister";
import ToppersLeaderboard from "@/components/admin/ToppersLeaderboard";

interface WhitelistEntry {
  id: string;
  email: string;
  phone_number: string | null;
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
  is_blocked: boolean;
}

interface CompletionData { user_id: string; day_number: number; completed_at: string; }
interface TopperData { user_id: string; full_name: string; total_score: number; max_possible: number; percentage: number; quizzes_taken: number; }

type SortField = "name" | "batch" | "status";

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
  const [newPhone, setNewPhone] = useState("");
  const [newBatch, setNewBatch] = useState("1");
  const [bulkPhones, setBulkPhones] = useState("");
  const [bulkBatch, setBulkBatch] = useState("1");
  const [adding, setAdding] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("batches");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"all" | "registered" | "pending" | "blocked">("all");
  const [filterBatch, setFilterBatch] = useState<string>("all");

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { if (selectedBatch) fetchBatchData(selectedBatch); }, [selectedBatch]);

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

  const handleAddPhone = async () => {
    if (!newPhone.trim()) return;
    setAdding(true);
    const cleaned = newPhone.replace(/\s+/g, "").replace(/^\+/, "");
    const dummyEmail = `${cleaned}@whatsapp.com`;
    try {
      const { error } = await supabase.from("whitelist").insert({
        email: dummyEmail,
        phone_number: cleaned,
        batch_number: parseInt(newBatch),
        added_by: user?.id,
      });
      if (error) throw error;
      toast({ title: "Phone number added to whitelist" });
      setNewPhone(""); setNewBatch("1"); setShowAddDialog(false); fetchData();
    } catch (error: unknown) {
      toast({ title: "Failed to add phone", description: (error as { message?: string }).message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const handleBulkAdd = async () => {
    const phones = bulkPhones.split(/[\n,;]/).map(p => p.replace(/\s+/g, "").replace(/^\+/, "")).filter(p => p.length > 5);
    if (phones.length === 0) { toast({ title: "No valid phone numbers found", variant: "destructive" }); return; }
    setAdding(true);
    try {
      const { error } = await supabase.from("whitelist").insert(
        phones.map(phone => ({
          email: `${phone}@whatsapp.com`,
          phone_number: phone,
          batch_number: parseInt(bulkBatch),
          added_by: user?.id,
        }))
      );
      if (error) throw error;
      toast({ title: `${phones.length} phone numbers added to whitelist` });
      setBulkPhones(""); setBulkBatch("1"); setShowBulkDialog(false); fetchData();
    } catch (error: unknown) {
      toast({ title: "Failed to add phones", description: (error as { message?: string }).message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveFromWhitelist = async (id: string) => {
    try {
      const { error } = await supabase.from("whitelist").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Removed from whitelist" }); fetchData();
    } catch {
      toast({ title: "Failed to remove", variant: "destructive" });
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

  const handleToggleBlock = async (userId: string, currentBlocked: boolean) => {
    try {
      const { error } = await supabase.from("profiles").update({ is_blocked: !currentBlocked }).eq("user_id", userId);
      if (error) throw error;
      toast({ title: currentBlocked ? "User unblocked" : "User blocked" });
      fetchData();
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  };

  const sortedUsers = [...users].filter(u => {
    const isRegistered = !u.is_blocked;
    if (filterStatus === "blocked") return u.is_blocked;
    if (filterStatus === "registered") return !u.is_blocked;
    if (filterBatch !== "all") return u.batch_number === parseInt(filterBatch);
    return true;
  }).sort((a, b) => {
    let cmp = 0;
    if (sortField === "name") cmp = a.full_name.localeCompare(b.full_name);
    if (sortField === "batch") cmp = a.batch_number - b.batch_number;
    if (sortField === "status") cmp = Number(a.is_blocked) - Number(b.is_blocked);
    return sortAsc ? cmp : -cmp;
  });

  const batchInfo = users.reduce((acc, user) => {
    const batch = user.batch_number || 1;
    const existing = acc.find(b => b.batchNumber === batch);
    if (existing) existing.studentCount++;
    else acc.push({ batchNumber: batch, studentCount: 1 });
    return acc;
  }, [] as { batchNumber: number; studentCount: number }[]);
  batchInfo.sort((a, b) => a.batchNumber - b.batchNumber);

  const selectedBatchStudents = users.filter(u => u.batch_number === selectedBatch);
  const uniqueBatches = [...new Set(users.map(u => u.batch_number))].sort();

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">User Management</h1>
            <p className="text-muted-foreground mt-1">Manage whitelist, batches, and user access</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={() => setShowBulkDialog(true)} className="flex-1 sm:flex-none">
              <Upload className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Bulk Import</span>
            </Button>
            <Button size="sm" onClick={() => setShowAddDialog(true)} className="flex-1 sm:flex-none">
              <Plus className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Add Phone</span>
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="batches">Batches</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
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

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2"><UsersIcon className="h-5 w-5" />Registered Users</CardTitle>
                    <CardDescription>{sortedUsers.length} users</CardDescription>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Select value={filterBatch} onValueChange={setFilterBatch}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Batch" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Batches</SelectItem>
                        {uniqueBatches.map(b => (
                          <SelectItem key={b} value={b.toString()}>Batch {b}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="registered">Active</SelectItem>
                        <SelectItem value="blocked">Blocked</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {loading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : sortedUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No users found</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <Button variant="ghost" size="sm" onClick={() => handleSort("name")} className="gap-1 -ml-2">
                            Name <ArrowUpDown className="h-3 w-3" />
                          </Button>
                        </TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>
                          <Button variant="ghost" size="sm" onClick={() => handleSort("batch")} className="gap-1 -ml-2">
                            Batch <ArrowUpDown className="h-3 w-3" />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button variant="ghost" size="sm" onClick={() => handleSort("status")} className="gap-1 -ml-2">
                            Status <ArrowUpDown className="h-3 w-3" />
                          </Button>
                        </TableHead>
                        <TableHead className="text-center">Block</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedUsers.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.full_name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{u.whatsapp_number}</TableCell>
                          <TableCell>
                            <Badge variant="outline">Batch {u.batch_number}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={u.is_blocked ? "destructive" : "default"}>
                              {u.is_blocked ? "Blocked" : "Active"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleBlock(u.user_id, u.is_blocked)}
                              title={u.is_blocked ? "Unblock user" : "Block user"}
                            >
                              {u.is_blocked
                                ? <ShieldCheck className="h-4 w-4 text-green-600" />
                                : <ShieldBan className="h-4 w-4 text-destructive" />}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="whitelist">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><UsersIcon className="h-5 w-5" />Phone Whitelist</CardTitle>
                <CardDescription>Only whitelisted phone numbers can register. Toggle 🔑 to enable password reset.</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {loading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : whitelist.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No phone numbers in whitelist yet</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Phone / Email</TableHead>
                        <TableHead className="hidden sm:table-cell">Batch</TableHead>
                        <TableHead className="hidden sm:table-cell">Status</TableHead>
                        <TableHead className="text-center">🔑 Reset</TableHead>
                        <TableHead className="w-[60px]">Del</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {whitelist.map((entry) => {
                        const isRegistered = users.some(u => u.email === entry.email || u.whatsapp_number === entry.phone_number);
                        const displayId = entry.phone_number || entry.email;
                        return (
                          <TableRow key={entry.id}>
                            <TableCell className="font-medium text-sm">{displayId}</TableCell>
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

        {/* Add Single Phone Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Add Phone to Whitelist</DialogTitle>
              <DialogDescription>This phone number will be able to register for the course</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">WhatsApp Number</Label>
                <Input id="phone" type="tel" placeholder="91XXXXXXXXXX" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
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
              <Button onClick={handleAddPhone} disabled={adding}>
                {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Add Phone
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Import Dialog */}
        <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Bulk Import Phone Numbers</DialogTitle>
              <DialogDescription>Paste multiple numbers (one per line or separated by commas)</DialogDescription>
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
                <Label htmlFor="bulkPhones">Phone Numbers</Label>
                <Textarea id="bulkPhones" placeholder={"917594000000\n916000000000"} value={bulkPhones} onChange={(e) => setBulkPhones(e.target.value)} rows={6} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBulkDialog(false)}>Cancel</Button>
              <Button onClick={handleBulkAdd} disabled={adding}>
                {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Import
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
