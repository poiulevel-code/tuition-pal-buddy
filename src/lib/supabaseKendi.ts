// Kendi Supabase projenize bağlanan istemci.
// Buradaki anahtar "anon public" anahtarıdır; tarayıcıya açılması normaldir.
// Veriyi koruyan şey veritabanındaki erişim kurallarıdır (RLS).
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const URL = "https://oqszcvjbgsihwdhvmpgy.supabase.co";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xc3pjdmpiZ3NpaHdkaHZtcGd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzMDMyNzQsImV4cCI6MjEwNDg3OTI3NH0.8fVOygUsYAE39KK8NUKdKRebGOC_Blk8n8uzgOgA6sc";

export const supabase = createClient<Database>(URL, ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
