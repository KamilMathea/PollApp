import { Component, ElementRef, ViewChild, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  @ViewChild('surveyModal') private surveyModal!: ElementRef<HTMLDialogElement>;

  protected readonly title = signal('PollApp');
  protected readonly isOpen = signal(false);
  protected readonly selectedCategory = signal('');

  // Signals für das Modal Dropdown
  protected readonly isDropdownOpen = signal(false);
  protected readonly selectedModalCategory = signal('');

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

  // Steuerung für das native Dialog Overlay
  protected openModal(): void {
    this.surveyModal.nativeElement.showModal();
  }

  protected closeModal(): void {
    this.surveyModal.nativeElement.close();
  }

  // Modal Category Dropdown Methoden
  protected toggleModalDropdown(): void {
    this.isDropdownOpen.update((v) => !v);
  }

  protected selectModalCategory(category: string): void {
    this.selectedModalCategory.set(category);
    this.isDropdownOpen.set(false);
  }
}