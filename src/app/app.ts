import { Component, ElementRef, ViewChild, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import { Category, Poll, PollOption, Question, QuestionForm } from './interfaces/poll.interface';
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

  protected readonly questions = signal<QuestionForm[]>([
    { questionText: '', allowMultiple: false, answerOptions: ['', ''] }
  ]);

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
 * Adds a new question form object to the questions array if the maximum limit of 6 is not reached.
 */
  protected addQuestion(): void {
    if (this.questions().length >= 6) return;
    this.questions.update((q) => [
      ...q,
      { questionText: '', allowMultiple: false, answerOptions: ['', ''] }
    ]);
  }

  /**
   * Removes a question form entry at a specified index if more than one question exists.
   * @param index - Index of the question to remove.
   */
  protected removeQuestion(index: number): void {
    if (this.questions().length <= 1) return;
    this.questions.update((q) => q.filter((_, i) => i !== index));
  }

  /**
 * Updates the text string of a question at a specific index.
 * @param index - Index of the targeted question.
 * @param val - New question text value.
 */
  protected updateQuestionText(index: number, val: string): void {
    this.questions.update((q) => {
      const updated = [...q];
      updated[index] = { ...updated[index], questionText: val };
      return updated;
    });
  }

  /**
   * Toggles the allowMultiple property of a question at a specific index.
   * @param index - Index of the targeted question.
   * @param val - Boolean checkbox state.
   */
  protected updateAllowMultiple(index: number, val: boolean): void {
    this.questions.update((q) => {
      const updated = [...q];
      updated[index] = { ...updated[index], allowMultiple: val };
      return updated;
    });
  }

  /**
   * Updates a specific answer option text for a question at given indices.
   * @param qIndex - Index of the question.
   * @param oIndex - Index of the answer option.
   * @param val - New option text string.
   */
  protected updateAnswerOption(qIndex: number, oIndex: number, val: string): void {
    this.questions.update((q) => {
      const updated = [...q];
      const options = [...updated[qIndex].answerOptions];
      options[oIndex] = val;
      updated[qIndex] = { ...updated[qIndex], answerOptions: options };
      return updated;
    });
  }

  /**
   * Converts a zero-based index into an uppercase alphabetical prefix (e.g. 0 -> 'A.', 1 -> 'B.').
   *
   * @param index - Zero-based index of the option.
   * @returns Formatted letter prefix string.
   */
  protected getLetterPrefix(index: number): string {
    return String.fromCharCode(65 + index) + '.';
  }

  protected readonly showMaxAnswersHint = signal<boolean>(false);

  /**
 * Appends a new blank answer option to a specific question (max 6 options per question).
 * @param qIndex - Index of the question.
 */
  protected addAnswerOption(qIndex: number): void {
    this.showMaxAnswersHint.set(true);
    this.questions.update((q) => {
      if (q[qIndex].answerOptions.length >= 6) return q;
      const updated = [...q];
      const options = [...updated[qIndex].answerOptions, ''];
      updated[qIndex] = { ...updated[qIndex], answerOptions: options };
      return updated;
    });
  }

  /**
   * Removes an answer option from a specific question if at least two options remain.
   * @param qIndex - Index of the question.
   * @param oIndex - Index of the answer option to delete.
   */
  protected removeAnswerOption(qIndex: number, oIndex: number): void {
    this.questions.update((q) => {
      if (q[qIndex].answerOptions.length <= 2) return q;
      const updated = [...q];
      const options = updated[qIndex].answerOptions.filter((_, i) => i !== oIndex);
      updated[qIndex] = { ...updated[qIndex], answerOptions: options };
      return updated;
    });
  }

  /**
 * Resets all modal form signals to default empty states.
 */
  private resetForm(): void {
    this.surveyTitle.set('');
    this.endDate.set('');
    this.description.set('');
    this.selectedModalCategory.set(null);
    this.questions.set([
      { questionText: '', allowMultiple: false, answerOptions: ['', ''] }
    ]);
    this.showMaxAnswersHint.set(false);
  }

  /**
   * Handles survey creation form submission and updates database state for multiple questions.
   */
  protected async onSubmitPoll(): Promise<void> {
    const payload = this.buildPollPayload();
    const questionsPayload = this.questions().map((q) => ({
      question_text: q.questionText,
      allow_multiple: q.allowMultiple,
      options: q.answerOptions
    }));

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
    this.selectedOptionIds.set([]);
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

  protected readonly selectedOptionIds = signal<number[]>([]);

  /**
   * Toggles the selection state of an option ID for single or multiple choice.
   * @param optionId - ID of the option toggled.
   * @param allowMultiple - Whether multiple choices are allowed in the question.
   * @param questionOptions - All options belonging to the question (used for single choice reset).
   */
  protected toggleOptionSelection(optionId: number, allowMultiple: boolean, questionOptions: PollOption[]): void {
    const current = this.selectedOptionIds();
    if (allowMultiple) {
      const updated = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      this.selectedOptionIds.set(updated);
    } else {
      const otherQuestionOptionIds = questionOptions.map((o) => o.id!).filter(Boolean);
      const cleaned = current.filter((id) => !otherQuestionOptionIds.includes(id));
      const updated = current.includes(optionId) ? cleaned : [...cleaned, optionId];
      this.selectedOptionIds.set(updated);
    }
  }

  /**
 * Calculates total votes count for a specific question (including live preview selection).
 * @param question - Question object.
 * @returns Total number of votes cast across all options of this question.
 */
  protected getQuestionTotalVotes(question: Question): number {
    if (!question.poll_options) return 0;

    if (!this.hasVoted()) {
      return question.poll_options.filter((opt) => opt.id && this.selectedOptionIds().includes(opt.id)).length;
    }

    return question.poll_options.reduce((sum, opt) => sum + (opt.votes?.length || 0), 0);
  }

  /**
   * Calculates percentage of votes for a single option relative to its question.
   * Supports live dynamic preview before voting.
   * @param option - PollOption object.
   * @param question - Parent Question object.
   * @returns Formatted percentage string (e.g. "45%").
   */
  protected getOptionPercentage(option: PollOption, question: Question): string {
    const total = this.getQuestionTotalVotes(question);
    if (!total) return '0%';

    let count = 0;
    if (!this.hasVoted()) {
      count = option.id && this.selectedOptionIds().includes(option.id) ? 1 : 0;
    } else {
      count = option.votes?.length || 0;
    }

    const percent = Math.round((count / total) * 100);
    return `${percent}%`;
  }

  /**
   * Handles user vote submission, updates poll state, and closes the detail modal.
   */
  protected async submitVote(): Promise<void> {
    const selected = this.selectedOptionIds();
    if (selected.length > 0) {
      const success = await this.supabaseService.submitVotes(selected);
      if (success) {
        await this.loadPolls();
        this.updateSelectedPollState();
      }
    }
    this.hasVoted.set(true);
    this.closeSurveyDetail();
  }

  /**
   * Re-links the active selectedPoll signal reference after fresh loadPolls().
   */
  private updateSelectedPollState(): void {
    const currentId = this.selectedPoll()?.id;
    if (currentId) {
      const updated = this.polls().find((p) => p.id === currentId) || null;
      this.selectedPoll.set(updated);
    }
  }
}