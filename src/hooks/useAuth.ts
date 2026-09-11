import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { UserStatus } from "@/lib/floword";

export type AuthState = {
  userId: string;
  email: string;
  fullName: string | null;
  status: UserStatus;
  isAdmin: boolean;
} | null;

export const authQueryKey = ["tapro-auth"];

export async function fetchAuthState(): Promise<AuthState> {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return null;

  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("full_name, status, email").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);

  return {
    userId: user.id,
    email: profile?.email ?? user.email ?? "",
    fullName: profile?.full_name ?? null,
    status: (profile?.status as UserStatus) ?? "pending",
    isAdmin: Boolean(roles?.some((r) => r.role === "super_admin")),
  };
}

export function useAuth() {
  return useQuery({ queryKey: authQueryKey, queryFn: fetchAuthState, staleTime: 30_000 });
}
