import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Trash2, Upload, Users as UsersIcon, Loader2 } from "lucide-react";

interface WhitelistEntry {
  id: string;
  email: string;
  created_at: string;
}

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  gender: string;
  place: string;
  whatsapp_number: string;
  created_at: string;
}

interface UserProgress {
  user_id: string;
  completed_count: number;
  current_day: number;
}

export default function AdminUsers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [whitelist, setWhitelist] = useState<WhitelistEntry[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userProgress, setUserProgress] = useState<Map<string, UserProgress>>(new Map());
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [bulkEmails, setBulkEmails] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [whitelistResult, usersResult, progressResult, materialsResult] = await Promise.all([
        supabase.from("whitelist").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_progress").select("user_id, material_id"),
        supabase.from("course_materials").select("id, day_number"),
      ]);

      setWhitelist(whitelistResult.data || []);
      setUsers(usersResult.data || []);

      // Calculate progress for each user
      const materials = materialsResult.data || [];
      const progress = progressResult.data || [];
      
      const progressMap = new Map<string, UserProgress>();
      const materialDays = new Map(materials.map(m => [m.id, m.day_number]));

      // Group progress by user
      const userProgressMap = new Map<string, Set<string>>();
      progress.forEach(p => {
        if (!userProgressMap.has(p.user_id)) {
          userProgressMap.set(p.user_id, new Set());
        }
        userProgressMap.get(p.user_id)!.add(p.material_id);
      });

      // Calculate current day for each user
      usersResult.data?.forEach(user => {
        const completedMaterials = userProgressMap.get(user.user_id) || new Set();
        const completedDays = new Set<number>();
        
        completedMaterials.forEach(materialId => {
          const day = materialDays.get(materialId);
          if (day) completedDays.add(day);
        });

        let currentDay = 1;
        for (let i = 1; i <= 30; i++) {
          const dayMaterials = materials.filter(m => m.day_number === i);
          const allCompleted = dayMaterials.every(m => completedMaterials.has(m.id));
          if (allCompleted && dayMaterials.length > 0) {
            currentDay = i + 1;
          } else {
            break;
          }
        }

        progressMap.set(user.user_id, {
          user_id: user.user_id,
          completed_count: completedMaterials.size,
          current_day: Math.min(currentDay, 30),
        });
      });

      setUserProgress(progressMap);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmail = async () => {
    if (!newEmail.trim()) return;
    setAdding(true);

    try {
      const { error } = await supabase.from("whitelist").insert({
        email: newEmail.toLowerCase().trim(),
        added_by: user?.id,
      });

      if (error) throw error;

      toast({ title: "Email added to whitelist" });
      setNewEmail("");
      setShowAddDialog(false);
      fetchData();
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast({
        title: "Failed to add email",
        description: err.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  const handleBulkAdd = async () => {
    const emails = bulkEmails
      .split(/[\n,;]/)
      .map(e => e.toLowerCase().trim())
      .filter(e => e && e.includes("@"));

    if (emails.length === 0) {
      toast({
        title: "No valid emails found",
        description: "Please enter valid email addresses",
        variant: "destructive",
      });
      return;
    }

    setAdding(true);

    try {
      const { error } = await supabase.from("whitelist").insert(
        emails.map(email => ({ email, added_by: user?.id }))
      );

      if (error) throw error;

      toast({ title: `${emails.length} emails added to whitelist` });
      setBulkEmails("");
      setShowBulkDialog(false);
      fetchData();
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast({
        title: "Failed to add emails",
        description: err.message || "Some emails may already exist",
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveFromWhitelist = async (id: string) => {
    try {
      const { error } = await supabase.from("whitelist").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Email removed from whitelist" });
      fetchData();
    } catch (error) {
      toast({
        title: "Failed to remove email",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">User Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage whitelist and view user progress
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowBulkDialog(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Bulk Import
            </Button>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Email
            </Button>
          </div>
        </div>

        {/* Whitelist Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5" />
              Email Whitelist
            </CardTitle>
            <CardDescription>
              Only whitelisted emails can register for the course
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : whitelist.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No emails in whitelist yet
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {whitelist.map((entry) => {
                    const isRegistered = users.some(u => u.email === entry.email);
                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">{entry.email}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(entry.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={isRegistered ? "default" : "secondary"}>
                            {isRegistered ? "Registered" : "Pending"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveFromWhitelist(entry.id)}
                          >
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

        {/* Registered Users Section */}
        <Card>
          <CardHeader>
            <CardTitle>Registered Users</CardTitle>
            <CardDescription>
              View user details and course progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No registered users yet
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Current Day</TableHead>
                    <TableHead>Materials Completed</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const progress = userProgress.get(user.user_id);
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.whatsapp_number}</TableCell>
                        <TableCell>
                          <Badge variant="outline">Day {progress?.current_day || 1}</Badge>
                        </TableCell>
                        <TableCell>{progress?.completed_count || 0}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Add Single Email Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Email to Whitelist</DialogTitle>
              <DialogDescription>
                This email will be able to register for the course
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddEmail} disabled={adding}>
                {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Add Email
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Import Dialog */}
        <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bulk Import Emails</DialogTitle>
              <DialogDescription>
                Paste multiple emails (separated by commas, semicolons, or new lines)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bulkEmails">Email Addresses</Label>
                <Textarea
                  id="bulkEmails"
                  placeholder="user1@example.com&#10;user2@example.com&#10;user3@example.com"
                  value={bulkEmails}
                  onChange={(e) => setBulkEmails(e.target.value)}
                  rows={6}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleBulkAdd} disabled={adding}>
                {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Import Emails
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
