import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ooxzbcxgvrsooxrdfhcw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veHpiY3hndnJzb294cmRmaGN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODM4Njc5OSwiZXhwIjoyMDkzOTYyNzk5fQ.dhrVgbFqypGe-r0dBanE8IeyDJym67A24C8nxMsCSgY';

export const supabase = createClient(supabaseUrl, supabaseKey);
