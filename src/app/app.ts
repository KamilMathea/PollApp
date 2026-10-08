import { Component, computed, inject, OnInit, signal, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Category, Poll } from './interfaces/poll.interface';
import { SupabaseService } from './services/supabase';
import { formatRemainingTime } from './utils/poll.utils';
import { CreateSurveyModal } from './components/create-survey-modal';
import { DetailSurveyModal } from './components/detail-survey-modal';

/**
 * Root component managing survey overview lists, filters, and coordinating modals.
 */
@Component({
  imports: [RouterOutlet, CreateSurveyModal, DetailSurveyModal],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App implements OnInit {
  private readonly supabaseService: SupabaseService = inject(SupabaseService);

  @ViewChild('createModal') private createModal!: CreateSurveyModal;
  @ViewChild('detailModal') private detailModal!: DetailSurveyModal;

  protected readonly title = signal<string>('PollApp');
  protected readonly isOpen = signal<boolean>(false);
  protected readonly selectedCategory = signal<string>('All Surveys');
  protected readonly activeTab = signal<'active' | 'past'>('active');
  protected readonly polls = signal<Poll[]>([]);
  protected readonly dbCategories = signal<Category[]>([]);

  protected readonly formatRemainingTime = formatRemainingTime;

  /**
   * Angular lifecycle hook initializing categories and poll list.
   */
  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.loadCategories(),
      this.loadPolls()
    ]);
  }

  /**
   * Fetches category data from Supabase.
   */
  protected async loadCategories(): Promise<void> {
    const data = await this.supabaseService.getCategories();
    this.dbCategories.set(data);
  }

  /**
   * Fetches poll data from Supabase.
   */
  protected async loadPolls(): Promise<void> {
    const data = await this.supabaseService.getPolls();
    this.polls.set(data);
  }

  /**
   * Computed signal filtering up to 3 active polls ending soonest.
   */
  protected readonly endingSoonPolls = computed(() => {
    const now = new Date().getTime();
    return this.polls()
      .filter((p) => p.expires_at && new Date(p.expires_at).getTime() > now)
      .sort((a, b) => new Date(a.expires_at!).getTime() - new Date(b.expires_at!).getTime())
      .slice(0, 3);
  });

  /**
   * Computed signal filtering polls based on active tab and category selection.
   */
  protected readonly filteredPolls = computed(() => {
    const now = new Date().getTime();
    const tab = this.activeTab();
    const cat = this.selectedCategory();
    return this.polls().filter((p) => {
      const isExpired = p.expires_at ? new Date(p.expires_at).getTime() < now : false;
      const matchesTab = tab === 'active' ? !isExpired : isExpired;
      const matchesCat = cat === 'All Surveys' || cat === '' || p.category?.name === cat;
      return matchesTab && matchesCat;
    });
  });

  /**
   * Sets the active tab filter.
   * @param tab - Selected tab identifier ('active' or 'past').
   */
  protected setTab(tab: 'active' | 'past'): void {
    this.activeTab.set(tab);
  }

  /**
   * Toggles the main category filter dropdown.
   */
  protected toggleDropdown(): void {
    this.isOpen.update((v) => !v);
  }

  /**
   * Selects a category filter and closes the dropdown.
   * @param categoryName - Name of the selected category.
   * @param event - DOM event triggered by selection.
   */
  protected selectCategory(categoryName: string, event: Event): void {
    event.stopPropagation();
    this.selectedCategory.set(categoryName);
    this.isOpen.set(false);
  }

  /**
   * Opens the survey creation modal dialog via ViewChild reference.
   */
  protected openModal(): void {
    this.createModal.openModal(this.dbCategories());
  }

  /**
   * Opens detail modal for a selected poll via ViewChild reference.
   * @param poll - Targeted poll object.
   */
  protected openSurveyDetail(poll: Poll): void {
    this.detailModal.openSurveyDetail(poll);
  }

  /**
   * Reloads polls after new creation and opens detail modal for created poll.
   * @param pollId - ID of created poll.
   */
  protected async onPollCreated(pollId: number): Promise<void> {
    await this.loadPolls();
    const newlyCreatedPoll = this.polls().find((p) => p.id === pollId);
    if (newlyCreatedPoll) {
      this.openSurveyDetail(newlyCreatedPoll);
    }
  }

  /**
   * Handles re-fetching polls after vote submission.
   */
  protected async onVoteSubmitted(): Promise<void> {
    await this.loadPolls();
  }
}