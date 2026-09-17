import { createBrowserClient } from "@supabase/ssr";
import { supabaseUrl, supabaseAnonKey } from "@/lib/env";

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);