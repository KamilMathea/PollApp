import { Component, ElementRef, ViewChild, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import { Category, Poll, PollOption, Question, QuestionForm } from './interfaces/poll.interface';
import { SupabaseService } from './services/supabase';
import { formatRemainingTime, getLetterPrefix, hasExistingVotes, getQuestionTotalVotes, getOptionPercentage, buildPollPayload } from './utils/poll.utils';

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
  protected readonly selectedOptionIds = signal<number[]>([]);
  protected readonly formatRemainingTime = formatRemainingTime;
  protected readonly getQuestionTotalVotes = getQuestionTotalVotes;
  protected readonly getOptionPercentage = getOptionPercentage;
  protected readonly getLetterPrefix = getLetterPrefix;
  protected readonly showSuccessOverlay = signal<boolean>(false);
  protected readonly createdPollId = signal<number | null>(null);

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
   * Toggles the background scroll lock when a modal opens or closes.
   * @param lock - True to disable body scrolling, false to enable it.
   */
  private toggleScrollLock(lock: boolean): void {
    if (lock) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }
  }

  /**
   * Opens the create survey modal dialog.
   */
  protected openModal(): void {
    this.toggleScrollLock(true);
    this.surveyModal.nativeElement.showModal();
  }

  /**
   * Resets form inputs and closes the create survey modal dialog.
   */
  protected closeModal(): void {
    this.resetForm();
    this.surveyModal.nativeElement.close();
    this.toggleScrollLock(false);
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
    this.showSuccessOverlay.set(false);
    this.createdPollId.set(null);
  }

  /**
   * Handles survey creation form submission and updates database state for multiple questions.
   */
  protected async onSubmitPoll(): Promise<void> {
    const payload = buildPollPayload(
      this.surveyTitle(),
      this.description(),
      this.selectedModalCategory(),
      this.endDate()
    );
    const questionsPayload = this.questions().map((q) => ({
      question_text: q.questionText,
      allow_multiple: q.allowMultiple,
      options: q.answerOptions
    }));

    const createdId = await this.supabaseService.createPoll(payload, questionsPayload);

    if (createdId) {
      await this.loadPolls();
      this.createdPollId.set(createdId);
      this.showSuccessOverlay.set(true);
    }
  }

  /**
 * Closes the publication success overlay, resets the survey creation modal,
 * and opens the detail view for the newly created poll if available.
 */
  protected closeSuccessOverlay(): void {
    const pollId = this.createdPollId();
    this.showSuccessOverlay.set(false);
    this.closeModal();

    if (pollId) {
      const newlyCreatedPoll = this.polls().find((p) => p.id === pollId);
      if (newlyCreatedPoll) {
        this.openSurveyDetail(newlyCreatedPoll);
      }
    }
    this.createdPollId.set(null);
  }

  /**
   * Opens detail modal for a selected poll.
   * @param poll - Poll object clicked.
   */
  protected openSurveyDetail(poll: Poll): void {
    this.selectedOptionIds.set([]);
    this.selectedPoll.set(poll);
    this.hasVoted.set(hasExistingVotes(poll));
    this.toggleScrollLock(true);
    this.surveyDetailModal.nativeElement.showModal();
  }

  /**
   * Closes detail modal.
   */
  protected closeSurveyDetail(): void {
    this.surveyDetailModal.nativeElement.close();
    this.toggleScrollLock(false);
  }

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