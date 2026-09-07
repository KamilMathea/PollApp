import { Service } from '@angular/core';
import { createClient } from '@supabase/supabase-js';

@Service()
export class SupabaseService {
  supabase = createClient(
    'https://hrpnpnlaazucwvewzkpx.supabase.co',
    'sb_publishable_8mUTsQtpXc6PudPyGj0y1w_rJZKV0f9'
  );
}