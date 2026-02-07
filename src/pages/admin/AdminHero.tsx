import DashboardLayout from "@/components/layout/DashboardLayout";
import HeroManager from "@/components/admin/HeroManager";

export default function AdminHero() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Homepage Hero</h1>
          <p className="text-muted-foreground mt-1">
            Manage the hero carousel on the public homepage
          </p>
        </div>

        <HeroManager />
      </div>
    </DashboardLayout>
  );
}
