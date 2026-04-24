import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { ToastService, Toast, ToastType } from './toast.service';
import { firstValueFrom } from 'rxjs';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ToastService]
    });

    service = TestBed.inject(ToastService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('show', () => {
    it('should add toast to the list', async () => {
      service.show('success', 'Test message', 0);

      const toasts = await firstValueFrom(service.toasts$);
      expect(toasts.length).toBe(1);
      expect(toasts[0].type).toBe('success');
      expect(toasts[0].message).toBe('Test message');
    });

    it('should generate unique IDs for toasts', async () => {
      service.show('success', 'Message 1', 0);
      service.show('error', 'Message 2', 0);

      const toasts = await firstValueFrom(service.toasts$);
      expect(toasts.length).toBe(2);
      expect(toasts[0].id).not.toBe(toasts[1].id);
      expect(toasts[0].id).toContain('toast-');
      expect(toasts[1].id).toContain('toast-');
    });

    it('should use default duration of 5000ms', async () => {
      service.show('info', 'Test message');

      const toasts = await firstValueFrom(service.toasts$);
      expect(toasts[0].duration).toBe(5000);
    });

    it('should accept custom duration', async () => {
      service.show('warning', 'Test message', 3000);

      const toasts = await firstValueFrom(service.toasts$);
      expect(toasts[0].duration).toBe(3000);
    });
  });

  describe('success', () => {
    it('should create success toast', async () => {
      service.success('Success message', 0);

      const toasts = await firstValueFrom(service.toasts$);
      expect(toasts[0].type).toBe('success');
      expect(toasts[0].message).toBe('Success message');
    });

    it('should accept custom duration', async () => {
      service.success('Success message', 2000);

      const toasts = await firstValueFrom(service.toasts$);
      expect(toasts[0].duration).toBe(2000);
    });
  });

  describe('error', () => {
    it('should create error toast', async () => {
      service.error('Error message', 0);

      const toasts = await firstValueFrom(service.toasts$);
      expect(toasts[0].type).toBe('error');
      expect(toasts[0].message).toBe('Error message');
    });

    it('should accept custom duration', async () => {
      service.error('Error message', 3000);

      const toasts = await firstValueFrom(service.toasts$);
      expect(toasts[0].duration).toBe(3000);
    });
  });

  describe('info', () => {
    it('should create info toast', async () => {
      service.info('Info message', 0);

      const toasts = await firstValueFrom(service.toasts$);
      expect(toasts[0].type).toBe('info');
      expect(toasts[0].message).toBe('Info message');
    });

    it('should accept custom duration', async () => {
      service.info('Info message', 4000);

      const toasts = await firstValueFrom(service.toasts$);
      expect(toasts[0].duration).toBe(4000);
    });
  });

  describe('warning', () => {
    it('should create warning toast', async () => {
      service.warning('Warning message', 0);

      const toasts = await firstValueFrom(service.toasts$);
      expect(toasts[0].type).toBe('warning');
      expect(toasts[0].message).toBe('Warning message');
    });

    it('should accept custom duration', async () => {
      service.warning('Warning message', 6000);

      const toasts = await firstValueFrom(service.toasts$);
      expect(toasts[0].duration).toBe(6000);
    });
  });

  describe('remove', () => {
    it('should remove specific toast by ID', async () => {
      service.show('success', 'Message 1', 0);
      service.show('error', 'Message 2', 0);

      let toasts = await firstValueFrom(service.toasts$);
      const toastId = toasts[0].id;
      service.remove(toastId);

      toasts = await firstValueFrom(service.toasts$);
      expect(toasts.length).toBe(1);
      expect(toasts[0].message).toBe('Message 2');
    });

    it('should not affect other toasts when removing one', async () => {
      service.show('success', 'Message 1', 0);
      service.show('error', 'Message 2', 0);
      service.show('info', 'Message 3', 0);

      let toasts = await firstValueFrom(service.toasts$);
      const toastId = toasts[1].id;
      service.remove(toastId);

      toasts = await firstValueFrom(service.toasts$);
      expect(toasts.length).toBe(2);
      expect(toasts[0].message).toBe('Message 1');
      expect(toasts[1].message).toBe('Message 3');
    });

    it('should handle removing non-existent toast', async () => {
      service.show('success', 'Message', 0);

      service.remove('non-existent-id');

      const toasts = await firstValueFrom(service.toasts$);
      expect(toasts.length).toBe(1);
    });
  });

  describe('clear', () => {
    it('should remove all toasts', async () => {
      service.show('success', 'Message 1', 0);
      service.show('error', 'Message 2', 0);
      service.show('info', 'Message 3', 0);

      service.clear();

      const toasts = await firstValueFrom(service.toasts$);
      expect(toasts.length).toBe(0);
    });

    it('should handle clearing when no toasts exist', async () => {
      service.clear();

      const toasts = await firstValueFrom(service.toasts$);
      expect(toasts.length).toBe(0);
    });
  });

  describe('multiple toasts', () => {
    it('should handle multiple toasts of different types', async () => {
      service.success('Success', 0);
      service.error('Error', 0);
      service.info('Info', 0);
      service.warning('Warning', 0);

      const toasts = await firstValueFrom(service.toasts$);
      expect(toasts.length).toBe(4);
      expect(toasts[0].type).toBe('success');
      expect(toasts[1].type).toBe('error');
      expect(toasts[2].type).toBe('info');
      expect(toasts[3].type).toBe('warning');
    });

    it('should maintain order of toasts', async () => {
      service.show('success', 'First', 0);
      service.show('error', 'Second', 0);
      service.show('info', 'Third', 0);

      const toasts = await firstValueFrom(service.toasts$);
      expect(toasts.length).toBe(3);
      expect(toasts[0].message).toBe('First');
      expect(toasts[1].message).toBe('Second');
      expect(toasts[2].message).toBe('Third');
    });
  });
});
