import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Category, Poll, Question, PollOption } from '../interfaces/poll.interface';

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
   * Fetches all polls including their linked category, nested questions, and options.
   * @returns A promise resolving to an array of polls.
   */
  async getPolls(): Promise<Poll[]> {
    const { data, error } = await this.supabase
      .from('polls')
      .select('*, category:categories(*), questions:questions(*, poll_options(*))')
      .order('created_at', { ascending: false });

    if (error) console.error('Error fetching polls:', error);
    return (data as Poll[]) || [];
  }

  /**
   * Creates a new poll in Supabase and triggers the save sequence for its questions.
   *
   * @param pollData - Main metadata for the poll (title, description, category, expiration).
   * @param questionsData - Array of questions with their configuration and options.
   * @returns Resolves to `true` if the entire poll creation succeeded, otherwise `false`.
   */
  async createPoll(
    pollData: { title: string; description: string | null; category_id: number | null; expires_at: string | null },
    questionsData: { question_text: string; allow_multiple: boolean; options: string[] }[]
  ): Promise<boolean> {
    const { data: poll, error } = await this.supabase.from('polls').insert([pollData]).select().single();
    if (error || !poll) return false;
    return await this.saveQuestions(poll.id, questionsData);
  }

  /**
   * Iterates over all valid questions and saves them along with their options.
   *
   * @param pollId - The ID of the parent poll.
   * @param questions - List of questions containing texts, flags, and option strings.
   * @returns Resolves to `true` if all questions and options were inserted successfully.
   */
  private async saveQuestions(
    pollId: number,
    questions: { question_text: string; allow_multiple: boolean; options: string[] }[]
  ): Promise<boolean> {
    for (const q of questions) {
      if (!q.question_text.trim()) continue;
      const qId = await this.insertQuestion(pollId, q.question_text, q.allow_multiple);
      if (!qId || !(await this.saveOptions(qId, q.options))) return false;
    }
    return true;
  }

  /**
   * Inserts a single question record into the database.
   *
   * @param pollId - The ID of the associated poll.
   * @param text - The text prompt of the question.
   * @param allowMultiple - Whether multiple choices are permitted.
   * @returns The generated question ID, or `null` if the insert failed.
   */
  private async insertQuestion(pollId: number, text: string, allowMultiple: boolean): Promise<number | null> {
    const { data, error } = await this.supabase
      .from('questions')
      .insert([{ poll_id: pollId, question_text: text, allow_multiple: allowMultiple }])
      .select().single();
    return error ? null : data.id;
  }

  /**
   * Filters non-empty options and bulk-inserts them for a specific question.
   *
   * @param questionId - The ID of the parent question.
   * @param options - List of option text strings.
   * @returns Resolves to `true` if options were saved successfully (or if list was empty).
   */
  private async saveOptions(questionId: number, options: string[]): Promise<boolean> {
    const items = options.filter(o => o.trim()).map(o => ({ question_id: questionId, option_text: o }));
    if (!items.length) return true;
    const { error } = await this.supabase.from('poll_options').insert(items);
    return !error;
  }
}