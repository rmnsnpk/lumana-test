import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `
    <main class="app-content">
      <router-outlet />
    </main>
  `,
  styles: `
    .app-content {
      display: flex;
      flex-direction: column;
      height: 100dvh;
    }
  `,
})
export class App {}
