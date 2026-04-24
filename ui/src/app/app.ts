import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { HeaderComponent } from './shared/components/header/header.component';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent, ToastContainerComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);

  showHeader = false;

  ngOnInit(): void {
    this.updateHeaderVisibility();

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateHeaderVisibility();
      });

    if (this.authService.isAuthenticated()) {
      this.authService.getCurrentUser().subscribe();
    }
  }

  private updateHeaderVisibility(): void {
    const currentUrl = this.router.url;
    this.showHeader = !currentUrl.includes('/login') && this.authService.isAuthenticated();
  }
}
