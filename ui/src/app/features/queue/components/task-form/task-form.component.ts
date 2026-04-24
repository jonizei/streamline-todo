import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Task, CreateTaskRequest, UpdateTaskRequest } from '../../models/task.model';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './task-form.component.html'
})
export class TaskFormComponent implements OnInit, OnChanges {
  private fb = inject(FormBuilder);

  @Input() task?: Task;
  @Input() isLoading = false;
  @Output() save = new EventEmitter<CreateTaskRequest | UpdateTaskRequest>();
  @Output() cancel = new EventEmitter<void>();

  taskForm!: FormGroup;
  isEditMode = false;

  ngOnInit(): void {
    this.isEditMode = !!this.task;
    this.initForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Reset form when task input changes
    if (changes['task'] && !changes['task'].firstChange) {
      this.isEditMode = !!this.task;
      if (this.taskForm) {
        this.initForm();
      }
    }
  }

  private initForm(): void {
    const isEditing = !!this.task;
    let urgencyValue: number | string | null = null;
    let deadlineValue = '';

    if (isEditing) {
      if (this.task?.custom_deadline && this.task?.deadline) {
        urgencyValue = 'custom';
        deadlineValue = this.toLocalDatetime(this.task.deadline);
        console.log('Task has custom deadline:', this.task.custom_deadline, 'deadline:', this.task.deadline, 'converted:', deadlineValue);
      } else {
        urgencyValue = this.task?.urgency || null;
        console.log('Task editing mode - custom_deadline:', this.task?.custom_deadline, 'urgency:', this.task?.urgency);
      }
    }

    this.taskForm = this.fb.group({
      title: [this.task?.title || '', [Validators.required, Validators.maxLength(200)]],
      description: [this.task?.description || '', [Validators.maxLength(2000)]],
      urgencyOption: [urgencyValue, [Validators.required]],
      accomplishmentOption: [isEditing ? this.getAccomplishmentOption(this.task) : null, [Validators.required]],
      effortOption: [this.task?.effort || null, [Validators.required]],
      customDeadline: [deadlineValue]
    });
  }

  private toLocalDatetime(isoString: string): string {
    // Convert ISO 8601 to date format (YYYY-MM-DD)
    // Use UTC methods to avoid timezone issues
    const date = new Date(isoString);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getAccomplishmentOption(task?: Task): string | null {
    if (!task) return null;
    if (task.impact >= 5 && task.relevance >= 5) return 'career';
    if (task.impact >= 5 && task.relevance >= 4) return 'shipping';
    if (task.impact >= 4 && task.relevance >= 5) return 'blocker';
    if (task.impact >= 3 && task.relevance >= 3) return 'optimize';
    if (task.impact >= 2 && task.relevance >= 2) return 'routine';
    return 'other';
  }

  private calculateUrgencyFromDeadline(deadlineDate: string): number {
    const deadline = new Date(deadlineDate + 'T00:00:00.000Z');
    const now = new Date();
    const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil <= 3) return 5;
    if (daysUntil <= 7) return 4;
    if (daysUntil <= 21) return 3;
    if (daysUntil <= 42) return 2;
    return 1;
  }

  onSubmit(): void {
    if (this.taskForm.invalid) {
      this.taskForm.markAllAsTouched();
      return;
    }

    const formValue = this.taskForm.value;
    console.log('Form submission - urgencyOption:', formValue.urgencyOption);
    console.log('Form submission - customDeadline:', formValue.customDeadline);

    // Map accomplishment option back to impact and relevance
    let impact = 1;
    let relevance = 1;

    switch (formValue.accomplishmentOption) {
      case 'career': impact = 5; relevance = 5; break;
      case 'shipping': impact = 5; relevance = 4; break;
      case 'blocker': impact = 4; relevance = 5; break;
      case 'optimize': impact = 3; relevance = 3; break;
      case 'routine': impact = 2; relevance = 2; break;
      case 'other': impact = 1; relevance = 1; break;
    }

    let urgency: number;
    let deadline: string | undefined;

    if (formValue.urgencyOption === 'custom') {
      // Custom deadline selected
      if (!formValue.customDeadline) {
        // Show error if custom selected but no date provided
        this.customDeadline?.setErrors({ required: true });
        this.customDeadline?.markAsTouched();
        return;
      }
      const date = new Date(formValue.customDeadline + 'T00:00:00.000Z');
      deadline = date.toISOString();
      urgency = this.calculateUrgencyFromDeadline(formValue.customDeadline);
      console.log('Custom deadline selected:', deadline, 'calculated urgency:', urgency);
    } else {
      // Standard urgency selected
      urgency = Number(formValue.urgencyOption);
      console.log('Standard urgency selected:', urgency);
    }

    const request: CreateTaskRequest | UpdateTaskRequest = {
      title: formValue.title,
      description: formValue.description || undefined,
      impact,
      urgency,
      relevance,
      effort: Number(formValue.effortOption)
    };

    if (deadline) {
      request.deadline = deadline;
    }

    console.log('Final request object:', request);
    this.save.emit(request);
  }

  onCancel(): void {
    this.cancel.emit();
  }

  get title() {
    return this.taskForm.get('title');
  }

  get description() {
    return this.taskForm.get('description');
  }

  get urgencyOption() {
    return this.taskForm.get('urgencyOption');
  }

  get accomplishmentOption() {
    return this.taskForm.get('accomplishmentOption');
  }

  get effortOption() {
    return this.taskForm.get('effortOption');
  }

  get customDeadline() {
    return this.taskForm.get('customDeadline');
  }
}
