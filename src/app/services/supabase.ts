import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Category, Poll } from '../interfaces/poll.interface';

/**
 * Service responsible for database communication with Supabase.
 */
@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  /**
   * Internal Supabase client instance.
   */
  private supabase: SupabaseClient = createClient(
    'https://hrpnpnlaazucwvewzkpx.supabase.co',
    'sb_publishable_8mUTsQtpXc6PudPyGj0y1w_rJZKV0f9'
  );

  /**
   * Fetches all categories from the database ordered by ID.
   * @returns A promise resolving to an array of categories.
   */
  async getCategories(): Promise<Category[]> {
    const { data, error } = await this.supabase
      .from('categories')
      .select('*')
      .order('id', { ascending: true });

    if (error) console.error('Error fetching categories:', error);
    return (data as Category[]) || [];
  }

  /**
   * Fetches all polls including their linked category and options.
   * @returns A promise resolving to an array of polls.
   */
  async getPolls(): Promise<Poll[]> {
    const { data, error } = await this.supabase
      .from('polls')
      .select('*, category:categories(*), options:poll_options(*)')
      .order('created_at', { ascending: false });

    if (error) console.error('Error fetching polls:', error);
    return (data as Poll[]) || [];
  }
}