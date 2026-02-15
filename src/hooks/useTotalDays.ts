import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useTotalDays() {
  const [totalDays, setTotalDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTotalDays();
  }, []);

  const fetchTotalDays = async () => {
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "total_days")
        .maybeSingle();

      if (!error && data) {
        setTotalDays(parseInt(data.value) || 30);
      }
    } catch (e) {
      console.error("Error fetching total days:", e);
    } finally {
      setLoading(false);
    }
  };

  const updateTotalDays = async (newCount: number) => {
    try {
      const { error } = await supabase
        .from("settings")
        .update({ value: newCount.toString(), updated_at: new Date().toISOString() })
        .eq("key", "total_days");

      if (error) throw error;
      setTotalDays(newCount);
      return true;
    } catch (e) {
      console.error("Error updating total days:", e);
      return false;
    }
  };

  return { totalDays, loading, updateTotalDays };
}
