import { TestBed, ComponentFixture } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ModalComponent } from './modal.component';

describe('ModalComponent', () => {
  let component: ModalComponent;
  let fixture: ComponentFixture<ModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('inputs', () => {
    it('should have default isOpen as false', () => {
      expect(component.isOpen).toBe(false);
    });

    it('should accept isOpen input', () => {
      component.isOpen = true;
      expect(component.isOpen).toBe(true);
    });
  });

  describe('outputs', () => {
    it('should emit close event when onClose is called', () => {
      let emitted = false;
      component.close.subscribe(() => {
        emitted = true;
      });

      component.onClose();

      expect(emitted).toBe(true);
    });

    it('should emit close event only once per call', () => {
      let emitCount = 0;

      component.close.subscribe(() => {
        emitCount++;
      });

      component.onClose();

      expect(emitCount).toBe(1);
    });
  });

  describe('backdrop click', () => {
    it('should call onClose when backdrop is clicked', () => {
      const spy = vi.spyOn(component, 'onClose');
      const mockEvent = {
        target: document.createElement('div'),
        currentTarget: document.createElement('div')
      } as any;

      mockEvent.target = mockEvent.currentTarget;

      component.onBackdropClick(mockEvent);

      expect(spy).toHaveBeenCalled();
    });

    it('should not call onClose when clicking inside modal content', () => {
      const spy = vi.spyOn(component, 'onClose');
      const backdrop = document.createElement('div');
      const content = document.createElement('div');
      const mockEvent = {
        target: content,
        currentTarget: backdrop
      } as any;

      component.onBackdropClick(mockEvent);

      expect(spy).not.toHaveBeenCalled();
    });

    it('should emit close event when backdrop is clicked', () => {
      const mockEvent = {
        target: document.createElement('div'),
        currentTarget: document.createElement('div')
      } as any;
      mockEvent.target = mockEvent.currentTarget;

      let emitted = false;
      component.close.subscribe(() => {
        emitted = true;
      });

      component.onBackdropClick(mockEvent);

      expect(emitted).toBe(true);
    });

    it('should not emit close event when clicking modal content', () => {
      const backdrop = document.createElement('div');
      const content = document.createElement('div');
      const mockEvent = {
        target: content,
        currentTarget: backdrop
      } as any;

      let emitted = false;
      component.close.subscribe(() => {
        emitted = true;
      });

      component.onBackdropClick(mockEvent);

      expect(emitted).toBe(false);
    });
  });

  describe('visibility', () => {
    it('should show modal when isOpen is true', () => {
      component.isOpen = true;

      expect(component.isOpen).toBe(true);
    });

    it('should hide modal when isOpen is false', () => {
      component.isOpen = false;

      expect(component.isOpen).toBe(false);
    });

    it('should toggle visibility', () => {
      expect(component.isOpen).toBe(false);

      component.isOpen = true;
      expect(component.isOpen).toBe(true);

      component.isOpen = false;
      expect(component.isOpen).toBe(false);
    });
  });

  describe('close action', () => {
    it('should trigger close event', () => {
      let closed = false;

      component.close.subscribe(() => {
        closed = true;
      });

      component.onClose();

      expect(closed).toBe(true);
    });

    it('should handle multiple close calls', () => {
      let closeCount = 0;

      component.close.subscribe(() => {
        closeCount++;
      });

      component.onClose();
      component.onClose();
      component.onClose();

      expect(closeCount).toBe(3);
    });
  });
});
