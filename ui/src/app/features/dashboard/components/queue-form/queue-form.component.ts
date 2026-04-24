import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Queue, CreateQueueRequest, UpdateQueueRequest } from '../../../queue/models/queue.model';

@Component({
  selector: 'app-queue-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './queue-form.component.html'
})
export class QueueFormComponent implements OnInit {
  private fb = inject(FormBuilder);

  @Input() queue?: Queue;
  @Input() isLoading = false;
  @Output() save = new EventEmitter<CreateQueueRequest | UpdateQueueRequest>();
  @Output() cancel = new EventEmitter<void>();

  queueForm!: FormGroup;
  isEditMode = false;

  ngOnInit(): void {
    this.isEditMode = !!this.queue;
    this.initForm();
  }

  private initForm(): void {
    this.queueForm = this.fb.group({
      name: [this.queue?.name || '', [Validators.required, Validators.maxLength(200)]],
      description: [this.queue?.description || '', [Validators.maxLength(1000)]]
    });
  }

  onSubmit(): void {
    if (this.queueForm.invalid) {
      this.queueForm.markAllAsTouched();
      return;
    }

    const formValue = this.queueForm.value;
    const request: CreateQueueRequest | UpdateQueueRequest = {
      name: formValue.name,
      description: formValue.description || undefined
    };

    this.save.emit(request);
  }

  onCancel(): void {
    this.cancel.emit();
  }

  get name() {
    return this.queueForm.get('name');
  }

  get description() {
    return this.queueForm.get('description');
  }
}
