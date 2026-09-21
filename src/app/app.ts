import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import { SupabaseService } from './services/supabase';

@Component({
  imports: [RouterOutlet, FormsModule],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  private supabaseService: SupabaseService = inject(SupabaseService);

  @ViewChild('surveyModal') private surveyModal!: ElementRef<HTMLDialogElement>;

  protected readonly title = signal('PollApp');
  protected readonly isOpen = signal(false);
  protected readonly selectedCategory = signal('');
  protected readonly isDropdownOpen = signal(false);
  protected readonly selectedModalCategory = signal('');
  protected readonly surveyTitle = signal('');
  protected readonly endDate = signal('');
  protected readonly description = signal('');

  protected readonly categories = [
    'All Surveys',
    'Team Activities',
    'Health & Wellness',
    'Gaming & Entertainment',
    'Education & Learning',
    'Lifestyle & Preferences',
    'Technology & Innovation',
  ];

  protected toggleDropdown(): void {
    this.isOpen.update((value) => !value);
  }

  protected selectCategory(category: string, event: Event): void {
    event.stopPropagation();
    this.selectedCategory.set(category);
    this.isOpen.set(false);
  }

  protected openModal(): void {
    this.surveyModal.nativeElement.showModal();
  }

  protected closeModal(): void {
    this.resetForm();
    this.surveyModal.nativeElement.close();
  }

  protected toggleModalDropdown(): void {
    this.isDropdownOpen.update((v) => !v);
  }

  protected selectModalCategory(category: string): void {
    this.selectedModalCategory.set(category);
    this.isDropdownOpen.set(false);
  }

  protected updateTitle(val: string): void {
    this.surveyTitle.set(val);
  }

  protected updateEndDate(val: string): void {
    this.endDate.set(val);
  }

  protected updateDescription(val: string): void {
    this.description.set(val);
  }

  private resetForm(): void {
    this.surveyTitle.set('');
    this.endDate.set('');
    this.description.set('');
    this.selectedModalCategory.set('');
  }

  protected async onSubmitPoll(): Promise<void> {
    const payload = this.buildPollPayload();
    const result = await this.supabaseService.createPoll(payload);

    if (result) {
      this.closeModal();
    }
  }

  private buildPollPayload() {
    const categoryIndex = this.categories.indexOf(this.selectedModalCategory());
    const categoryId = categoryIndex > -1 ? categoryIndex + 1 : null;

    return {
      title: this.surveyTitle(),
      description: this.description() || null,
      category_id: categoryId,
      expires_at: this.endDate() ? new Date(this.endDate()).toISOString() : null,
    };
  }
}