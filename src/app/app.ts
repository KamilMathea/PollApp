import { Component, ElementRef, ViewChild, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import { Category, Poll } from './interfaces/poll.interface';
import { SupabaseService } from './services/supabase';

/**
 * Root component managing survey lists, creation modal, and survey details.
 */
@Component({
  imports: [RouterOutlet, FormsModule, DatePipe],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App implements OnInit {
  private readonly supabaseService: SupabaseService = inject(SupabaseService);

  @ViewChild('surveyModal') private surveyModal!: ElementRef<HTMLDialogElement>;
  @ViewChild('surveyDetailModal') private surveyDetailModal!: ElementRef<HTMLDialogElement>;

  protected readonly title = signal<string>('PollApp');
  protected readonly isOpen = signal<boolean>(false);
  protected readonly selectedCategory = signal<string>('All Surveys');
  protected readonly activeTab = signal<'active' | 'past'>('active');
  protected readonly polls = signal<Poll[]>([]);
  protected readonly dbCategories = signal<Category[]>([]);
  protected readonly isDropdownOpen = signal<boolean>(false);
  protected readonly selectedModalCategory = signal<Category | null>(null);

  protected readonly surveyTitle = signal<string>('');
  protected readonly endDate = signal<string>('');
  protected readonly description = signal<string>('');

  protected readonly questionText = signal<string>('');
  protected readonly allowMultiple = signal<boolean>(false);
  protected readonly answerOptions = signal<string[]>(['', '']);

  protected readonly selectedPoll = signal<Poll | null>(null);
  protected readonly hasVoted = signal<boolean>(false);

  /**
   * Angular lifecycle hook invoked after data-bound properties are initialized.
   */
  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.loadCategories(),
      this.loadPolls()
    ]);
  }

  /**
   * Fetches category data from Supabase and sets the dbCategories signal.
   */
  protected async loadCategories(): Promise<void> {
    const data = await this.supabaseService.getCategories();
    this.dbCategories.set(data);
  }

  /**
   * Fetches poll data from Supabase and sets the polls signal.
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
   * Opens the create survey modal dialog.
   */
  protected openModal(): void {
    this.surveyModal.nativeElement.showModal();
  }

  /**
   * Resets form inputs and closes the create survey modal dialog.
   */
  protected closeModal(): void {
    this.resetForm();
    this.surveyModal.nativeElement.close();
  }

  /**
   * Toggles the category dropdown inside the modal.
   */
  protected toggleModalDropdown(): void {
    this.isDropdownOpen.update((v) => !v);
  }

  /**
   * Selects a category inside the modal dropdown.
   * @param category - Category object selected.
   */
  protected selectModalCategory(category: Category): void {
    this.selectedModalCategory.set(category);
    this.isDropdownOpen.set(false);
  }

  /**
   * Updates survey title signal.
   * @param val - New survey title string.
   */
  protected updateTitle(val: string): void {
    this.surveyTitle.set(val);
  }

  /**
   * Updates expiration date signal.
   * @param val - New end date string.
   */
  protected updateEndDate(val: string): void {
    this.endDate.set(val);
  }

  /**
   * Updates description text signal.
   * @param val - New description string.
   */
  protected updateDescription(val: string): void {
    this.description.set(val);
  }

  /**
   * Updates question text signal.
   * @param val - New question text string.
   */
  protected updateQuestionText(val: string): void {
    this.questionText.set(val);
  }

  /**
   * Toggles allow multiple answers state.
   * @param val - Boolean checkbox state.
   */
  protected updateAllowMultiple(val: boolean): void {
    this.allowMultiple.set(val);
  }

  /**
   * Updates specific answer option at index.
   * @param index - Index in options array.
   * @param val - New answer string.
   */
  protected updateAnswerOption(index: number, val: string): void {
    this.answerOptions.update((options) => {
      const updated = [...options];
      updated[index] = val;
      return updated;
    });
  }

  /**
   * Appends a new blank answer option.
   */
  protected addAnswerOption(): void {
    this.answerOptions.update((options) => [...options, '']);
  }

  /**
   * Removes an answer option at given index.
   * @param index - Index of option to delete.
   */
  protected removeAnswerOption(index: number): void {
    if (this.answerOptions().length <= 2) return;
    this.answerOptions.update((options) => options.filter((_, i) => i !== index));
  }

  /**
   * Resets all modal form signals to default empty states.
   */
  private resetForm(): void {
    this.surveyTitle.set('');
    this.endDate.set('');
    this.description.set('');
    this.selectedModalCategory.set(null);
    this.questionText.set('');
    this.allowMultiple.set(false);
    this.answerOptions.set(['', '']);
  }

  /**
   * Handles survey creation form submission and updates database state.
   */
  protected async onSubmitPoll(): Promise<void> {
    const payload = this.buildPollPayload();
    const questionsPayload = [{
      question_text: this.questionText(),
      allow_multiple: this.allowMultiple(),
      options: this.answerOptions()
    }];

    const success = await this.supabaseService.createPoll(payload, questionsPayload);

    if (success) {
      await this.loadPolls();
      this.closeModal();
    }
  }

  /**
   * Builds payload object for poll table insertion.
   * @returns Formatted poll data object.
   */
  private buildPollPayload() {
    const selectedCat = this.selectedModalCategory();

    return {
      title: this.surveyTitle(),
      description: this.description() || null,
      category_id: selectedCat ? selectedCat.id : null,
      expires_at: this.endDate() ? new Date(this.endDate()).toISOString() : null,
    };
  }

  /**
   * Formats remaining duration until poll expiration into readable text.
   * @param expiresAt - Expiration ISO timestamp string.
   * @returns Human readable remaining time string.
   */
  protected formatRemainingTime(expiresAt?: string): string {
    if (!expiresAt) return 'No deadline';
    const diff = new Date(expiresAt).getTime() - new Date().getTime();
    if (diff <= 0) return 'Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days > 0) return `Ends in ${days} day${days > 1 ? 's' : ''}`;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    return `Ends in ${hours} hour${hours > 1 ? 's' : ''}`;
  }

  /**
   * Opens detail modal for a selected poll.
   * @param poll - Poll object clicked.
   */
  protected openSurveyDetail(poll: Poll): void {
    this.selectedPoll.set(poll);
    this.hasVoted.set(false);
    this.surveyDetailModal.nativeElement.showModal();
  }

  /**
   * Closes detail modal.
   */
  protected closeSurveyDetail(): void {
    this.surveyDetailModal.nativeElement.close();
  }

  /**
   * Handles user vote completion.
   */
  protected submitVote(): void {
    this.closeSurveyDetail();
  }
}