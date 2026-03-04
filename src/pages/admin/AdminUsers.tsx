import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Trash2, Upload, Users as UsersIcon, Loader2, Pencil, Search, ArrowUpDown, Download } from "lucide-react";
import BatchCards from "@/components/admin/BatchCards";
import AttendanceRegister from "@/components/admin/AttendanceRegister";
import ToppersLeaderboard from "@/components/admin/ToppersLeaderboard";

interface WhitelistEntry {
  id: string; email: string; phone_number: string | null; batch_number: number; created_at: string; password_reset_enabled: boolean; full_name: string | null; place: string | null; gender: string | null; age: number | null;
}
interface UserProfile {
  id: string; user_id: string; email: string; full_name: string; gender: string; place: string; whatsapp_number: string; batch_number: number; created_at: string; referred_by: string | null; signup_source: string | null;
}
interface CompletionData { user_id: string; day_number: number; completed_at: string; }
interface TopperData { user_id: string; full_name: string; total_score: number; max_possible: number; percentage: number; quizzes_taken: number; }

export default function AdminUsers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [whitelist, setWhitelist] = useState<WhitelistEntry[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [completions, setCompletions] = useState<CompletionData[]>([]);
  const [toppers, setToppers] = useState<TopperData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editBatch, setEditBatch] = useState("1");
  const [editFullName, setEditFullName] = useState("");
  const [editPlace, setEditPlace] = useState("");
  // Add single user fields
  const [newPhone, setNewPhone] = useState("");
  const [newBatch, setNewBatch] = useState("1");
  const [newName, setNewName] = useState("");
  const [newPlace, setNewPlace] = useState("");
  const [newGender, setNewGender] = useState("");
  const [newAge, setNewAge] = useState("");
  // Bulk import
  const [bulkBatch, setBulkBatch] = useState("1");
  const [adding, setAdding] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("batches");
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvFileName, setCsvFileName] = useState("");

  // Search and sort state
  const [whitelistSearch, setWhitelistSearch] = useState("");
  const [whitelistSort, setWhitelistSort] = useState<"batch" | "date" | "status">("batch");
  const [userSearch, setUserSearch] = useState("");
  const [userSort, setUserSort] = useState<"name" | "batch" | "date">("name");

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
      console.error(error);
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

      const existingMaterialIds = new Set(materialsData?.map(m => m.id) || []);
      const { data: quizSubmissions } = await supabase.from("quiz_submissions").select("user_id, score, max_score, material_id").in("user_id", userIds);

      const userScores = new Map<string, { total: number; max: number; count: number }>();
      quizSubmissions?.forEach(sub => {
        if (!existingMaterialIds.has(sub.material_id)) return;
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
      toppersList.sort((a, b) => b.total_score - a.total_score);
      setToppers(toppersList);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddPhone = async () => {
    if (!newPhone.trim()) return;
    setAdding(true);
    try {
      const cleanedPhone = newPhone.replace(/\s+/g, "").replace(/^\+/, "");
      const email = `${cleanedPhone}@qurba.app`;
      const { error } = await supabase.from("whitelist").insert({
        email,
        phone_number: cleanedPhone,
        batch_number: parseInt(newBatch),
        added_by: user?.id,
        full_name: newName.trim() || null,
        place: newPlace.trim() || null,
        gender: newGender || null,
        age: newAge ? parseInt(newAge) : null,
      });
      if (error) throw error;
      toast({ title: "User added to whitelist" });
      setNewPhone(""); setNewBatch("1"); setNewName(""); setNewPlace(""); setNewGender(""); setNewAge("");
      setShowAddDialog(false); fetchData();
    } catch (error: unknown) {
      toast({ title: "Failed to add", description: (error as { message?: string }).message, variant: "destructive" });
    } finally { setAdding(false); }
  };

  const downloadCsvTemplate = () => {
    const header = "user_id,batch,name,place,gender,age";
    const example1 = "91XXXXXXXXXX,1,John Doe,Mumbai,male,25";
    const example2 = "someone@gmail.com,1,Jane Doe,Delhi,female,22";
    const csv = [header, example1, example2].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "user_import_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) { toast({ title: "CSV file is empty or has no data rows", variant: "destructive" }); return; }
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
      const userIdIdx = headers.indexOf("user_id");
      const batchIdx = headers.indexOf("batch");
      const nameIdx = headers.indexOf("name");
      const placeIdx = headers.indexOf("place");
      const genderIdx = headers.indexOf("gender");
      const ageIdx = headers.indexOf("age");

      if (userIdIdx === -1) { toast({ title: "CSV must have a 'user_id' column", variant: "destructive" }); return; }

      const rows: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map(c => c.trim());
        const userId = cols[userIdIdx];
        if (!userId) continue;
        rows.push({
          user_id: userId,
          batch: batchIdx !== -1 ? cols[batchIdx] : "",
          name: nameIdx !== -1 ? cols[nameIdx] : "",
          place: placeIdx !== -1 ? cols[placeIdx] : "",
          gender: genderIdx !== -1 ? cols[genderIdx] : "",
          age: ageIdx !== -1 ? cols[ageIdx] : "",
        });
      }
      setCsvData(rows);
    };
    reader.readAsText(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleBulkCsvImport = async () => {
    if (csvData.length === 0) { toast({ title: "No data to import", variant: "destructive" }); return; }
    setAdding(true);
    try {
      const defaultBatch = parseInt(bulkBatch);
      const entries = csvData.map(row => {
        const userId = row.user_id.replace(/\s+/g, "").replace(/^\+/, "");
        const isEmail = userId.includes("@");
        const email = isEmail ? userId.toLowerCase() : `${userId}@qurba.app`;
        const phoneNumber = isEmail ? null : userId;
        const batch = row.batch ? parseInt(row.batch) : defaultBatch;
        return {
          email,
          phone_number: phoneNumber,
          batch_number: isNaN(batch) ? defaultBatch : batch,
          added_by: user?.id,
          full_name: row.name || null,
          place: row.place || null,
          gender: row.gender || null,
          age: row.age ? parseInt(row.age) : null,
        };
      });
      const { error } = await supabase.from("whitelist").insert(entries);
      if (error) throw error;
      toast({ title: `${entries.length} users imported successfully` });
      setCsvData([]); setCsvFileName(""); setBulkBatch("1"); setShowBulkDialog(false); fetchData();
    } catch (error: unknown) {
      toast({ title: "Failed to import", description: (error as { message?: string }).message, variant: "destructive" });
    } finally { setAdding(false); }
  };

  const handleRemoveFromWhitelist = async (id: string) => {
    try {
      const { error } = await supabase.from("whitelist").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Removed from whitelist" }); fetchData();
    } catch { toast({ title: "Failed to remove", variant: "destructive" }); }
  };

  const handleTogglePasswordReset = async (id: string, enabled: boolean) => {
    try {
      const { error } = await supabase.from("whitelist").update({ password_reset_enabled: enabled }).eq("id", id);
      if (error) throw error;
      toast({ title: enabled ? "Password reset enabled" : "Password reset disabled" }); fetchData();
    } catch { toast({ title: "Failed to update", variant: "destructive" }); }
  };

  const openEditUser = (userProfile: UserProfile) => {
    setEditingUser(userProfile); setEditBatch(userProfile.batch_number.toString()); setEditFullName(userProfile.full_name); setEditPlace(userProfile.place); setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    try {
      const { error } = await supabase.from("profiles").update({ batch_number: parseInt(editBatch), full_name: editFullName, place: editPlace }).eq("id", editingUser.id);
      if (error) throw error;
      toast({ title: "User updated" }); setShowEditDialog(false); setEditingUser(null); fetchData();
    } catch { toast({ title: "Failed to update", variant: "destructive" }); }
  };

  const whitelistEmails = new Set(whitelist.map(w => w.email));
  const activeUsers = users.filter(u => whitelistEmails.has(u.email));

  const batchInfo = activeUsers.reduce((acc, user) => {
    const batch = user.batch_number || 1;
    const existing = acc.find(b => b.batchNumber === batch);
    if (existing) existing.studentCount++;
    else acc.push({ batchNumber: batch, studentCount: 1 });
    return acc;
  }, [] as { batchNumber: number; studentCount: number }[]);
  batchInfo.sort((a, b) => a.batchNumber - b.batchNumber);

  const selectedBatchStudents = activeUsers.filter(u => u.batch_number === selectedBatch);

  const filteredWhitelist = useMemo(() => {
    let list = whitelist.filter(e => {
      const q = whitelistSearch.toLowerCase();
      if (!q) return true;
      return (e.phone_number || "").toLowerCase().includes(q) || e.email.toLowerCase().includes(q) || (e.full_name || "").toLowerCase().includes(q);
    });
    list.sort((a, b) => {
      if (whitelistSort === "batch") return a.batch_number - b.batch_number;
      if (whitelistSort === "date") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (whitelistSort === "status") {
        const aReg = users.some(u => u.email === a.email) ? 0 : 1;
        const bReg = users.some(u => u.email === b.email) ? 0 : 1;
        return aReg - bReg;
      }
      return 0;
    });
    return list;
  }, [whitelist, whitelistSearch, whitelistSort, users]);

  const filteredUsers = useMemo(() => {
    let list = users.filter(u => {
      const q = userSearch.toLowerCase();
      if (!q) return true;
      return u.full_name.toLowerCase().includes(q) || u.whatsapp_number.includes(q) || u.email.toLowerCase().includes(q);
    });
    list.sort((a, b) => {
      if (userSort === "name") return a.full_name.localeCompare(b.full_name);
      if (userSort === "batch") return a.batch_number - b.batch_number;
      if (userSort === "date") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return 0;
    });
    return list;
  }, [users, userSearch, userSort]);

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
              <Plus className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Add User</span>
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="batches">Batches</TabsTrigger>
            <TabsTrigger value="whitelist">Whitelist</TabsTrigger>
            <TabsTrigger value="users">All Users</TabsTrigger>
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
                <CardTitle className="flex items-center gap-2"><UsersIcon className="h-5 w-5" />User Whitelist</CardTitle>
                <CardDescription>Only whitelisted users can sign in. Toggle 🔑 to enable password reset.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search phone, email, or name..." value={whitelistSearch} onChange={e => setWhitelistSearch(e.target.value)} className="pl-9" />
                  </div>
                  <Select value={whitelistSort} onValueChange={(v: "batch" | "date" | "status") => setWhitelistSort(v)}>
                    <SelectTrigger className="w-[140px]"><ArrowUpDown className="h-4 w-4 mr-1" /><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="batch">By Batch</SelectItem>
                      <SelectItem value="date">By Date</SelectItem>
                      <SelectItem value="status">By Status</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="overflow-x-auto">
                  {loading ? (
                    <div className="text-center py-8">Loading...</div>
                  ) : filteredWhitelist.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No entries found</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Phone / Email</TableHead>
                          <TableHead className="hidden sm:table-cell">Name</TableHead>
                          <TableHead className="hidden sm:table-cell">Batch</TableHead>
                          <TableHead className="hidden sm:table-cell">Status</TableHead>
                          <TableHead className="text-center">🔑 Reset</TableHead>
                          <TableHead className="w-[60px]">Del</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredWhitelist.map((entry) => {
                          const isRegistered = users.some(u => u.email === entry.email);
                          return (
                            <TableRow key={entry.id}>
                              <TableCell className="font-medium text-sm">{entry.phone_number || entry.email}</TableCell>
                              <TableCell className="hidden sm:table-cell text-sm">{entry.full_name || "-"}</TableCell>
                              <TableCell className="hidden sm:table-cell"><Badge variant="outline">Batch {entry.batch_number}</Badge></TableCell>
                              <TableCell className="hidden sm:table-cell"><Badge variant={isRegistered ? "default" : "secondary"}>{isRegistered ? "Registered" : "Pending"}</Badge></TableCell>
                              <TableCell className="text-center">
                                <Switch checked={entry.password_reset_enabled} onCheckedChange={(checked) => handleTogglePasswordReset(entry.id, checked)} />
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="icon" onClick={() => handleRemoveFromWhitelist(entry.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>All Registered Users</CardTitle>
                <CardDescription>View and edit user details. Click name to see full profile.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search name, number, or email..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="pl-9" />
                  </div>
                  <Select value={userSort} onValueChange={(v: "name" | "batch" | "date") => setUserSort(v)}>
                    <SelectTrigger className="w-[140px]"><ArrowUpDown className="h-4 w-4 mr-1" /><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">By Name</SelectItem>
                      <SelectItem value="batch">By Batch</SelectItem>
                      <SelectItem value="date">By Date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="overflow-x-auto">
                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No users found</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>WhatsApp</TableHead>
                          <TableHead className="hidden sm:table-cell">Place</TableHead>
                          <TableHead>Batch</TableHead>
                          <TableHead className="hidden sm:table-cell">Source</TableHead>
                          <TableHead className="w-[60px]">Edit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((u) => (
                          <TableRow key={u.id}>
                            <TableCell className="font-medium cursor-pointer hover:text-primary" onClick={() => navigate(`/admin/student/${u.user_id}`)}>{u.full_name}</TableCell>
                            <TableCell className="text-sm">{u.whatsapp_number}</TableCell>
                            <TableCell className="hidden sm:table-cell text-sm">{u.place || "-"}</TableCell>
                            <TableCell><Badge variant="outline">Batch {u.batch_number}</Badge></TableCell>
                            <TableCell className="hidden sm:table-cell text-sm">{u.signup_source || "-"}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => openEditUser(u)}><Pencil className="h-4 w-4" /></Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add Single User Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add User to Whitelist</DialogTitle><DialogDescription>WhatsApp number will be used as User ID. Name, Place, Gender, Age are optional.</DialogDescription></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>WhatsApp Number *</Label><Input type="tel" placeholder="91XXXXXXXXXX" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} /></div>
              <div className="space-y-2">
                <Label>Batch Number *</Label>
                <Select value={newBatch} onValueChange={setNewBatch}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Array.from({ length: 20 }, (_, i) => <SelectItem key={i + 1} value={(i + 1).toString()}>Batch {i + 1}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-2"><Label>Name</Label><Input placeholder="Full name" value={newName} onChange={(e) => setNewName(e.target.value)} /></div>
              <div className="space-y-2"><Label>Place</Label><Input placeholder="City / Town" value={newPlace} onChange={(e) => setNewPlace(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select value={newGender} onValueChange={setNewGender}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Age</Label><Input type="number" placeholder="Age" value={newAge} onChange={(e) => setNewAge(e.target.value)} /></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button onClick={handleAddPhone} disabled={adding || !newPhone.trim()}>{adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Add User</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Import Dialog */}
        <Dialog open={showBulkDialog} onOpenChange={(open) => { setShowBulkDialog(open); if (!open) { setCsvData([]); setCsvFileName(""); } }}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Bulk Import Users</DialogTitle><DialogDescription>Download the CSV template, fill it in, and upload to import users in bulk.</DialogDescription></DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={downloadCsvTemplate}>
                  <Download className="h-4 w-4 mr-2" />Download Template
                </Button>
                <span className="text-xs text-muted-foreground">CSV with columns: user_id, batch, name, place, gender, age</span>
              </div>
              <div className="space-y-2">
                <Label>Default Batch (used if batch column is empty)</Label>
                <Select value={bulkBatch} onValueChange={setBulkBatch}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Array.from({ length: 20 }, (_, i) => <SelectItem key={i + 1} value={(i + 1).toString()}>Batch {i + 1}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-2">
                <Label>Upload CSV File</Label>
                <Input ref={fileInputRef} type="file" accept=".csv" onChange={handleCsvUpload} />
              </div>
              {csvData.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{csvFileName}: {csvData.length} users found</p>
                  <div className="max-h-40 overflow-auto border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">User ID</TableHead>
                          <TableHead className="text-xs">Batch</TableHead>
                          <TableHead className="text-xs">Name</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {csvData.slice(0, 10).map((row, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-xs py-1">{row.user_id}</TableCell>
                            <TableCell className="text-xs py-1">{row.batch || bulkBatch}</TableCell>
                            <TableCell className="text-xs py-1">{row.name || "-"}</TableCell>
                          </TableRow>
                        ))}
                        {csvData.length > 10 && <TableRow><TableCell colSpan={3} className="text-xs text-center text-muted-foreground py-1">...and {csvData.length - 10} more</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowBulkDialog(false); setCsvData([]); setCsvFileName(""); }}>Cancel</Button>
              <Button onClick={handleBulkCsvImport} disabled={adding || csvData.length === 0}>{adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Import {csvData.length} Users</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit User</DialogTitle><DialogDescription>Update user details</DialogDescription></DialogHeader>
            {editingUser && (
              <div className="space-y-4">
                <div className="space-y-2"><Label>Full Name</Label><Input value={editFullName} onChange={(e) => setEditFullName(e.target.value)} /></div>
                <div className="space-y-2"><Label>Place</Label><Input value={editPlace} onChange={(e) => setEditPlace(e.target.value)} /></div>
                <div className="space-y-2"><Label>WhatsApp Number</Label><Input value={editingUser.whatsapp_number} disabled className="opacity-60" /></div>
                <div className="space-y-2">
                  <Label>Batch Number</Label>
                  <Select value={editBatch} onValueChange={setEditBatch}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Array.from({ length: 20 }, (_, i) => <SelectItem key={i + 1} value={(i + 1).toString()}>Batch {i + 1}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div><span className="font-medium">Referred By:</span> {editingUser.referred_by || "None"}</div>
                  <div><span className="font-medium">Source:</span> {editingUser.signup_source || "None"}</div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
              <Button onClick={handleSaveEdit}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}