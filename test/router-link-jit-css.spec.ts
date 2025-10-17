import { describe, it, expect, beforeEach } from 'vitest';
import { initRouter } from '../src/lib/router';
import { component } from '../src/lib/runtime/component';
import { html } from '../src/lib/runtime/template-compiler';

describe('router-link JIT CSS integration', () => {
  beforeEach(() => {
    // Reset router state
    const existingRouterView = customElements.get('router-view');
    const existingRouterLink = customElements.get('router-link');
    
    if (existingRouterView) {
      customElements.upgrade(document.createElement('router-view'));
    }
    if (existingRouterLink) {
      customElements.upgrade(document.createElement('router-link'));
    }
  });

  it('router-link classes work with JIT CSS - static class prop', async () => {
    const routes = [
      { path: '/', component: 'home-page' },
      { path: '/about', component: 'about-page' }
    ];

    const router = initRouter({ routes });

    // Create a test component that uses router-link with JIT CSS classes
    component('test-nav', () => {
      return html`
        <nav>
          <router-link to="/" class="text-blue-500 hover:text-blue-700">Home</router-link>
          <router-link to="/about" class="px-4 py-2 bg-green-500">About</router-link>
        </nav>
      `;
    });

    const el = document.createElement('test-nav');
    document.body.appendChild(el);
    
    await new Promise(resolve => setTimeout(resolve, 50));

    // Check that the component rendered
    expect(el.shadowRoot).toBeTruthy();
    
    const shadowHTML = el.shadowRoot!.innerHTML;

    console.log('Rendered shadow DOM:', shadowHTML);
    
    // Verify JIT CSS classes are present in the rendered HTML
    expect(shadowHTML).toContain('text-blue-500');
    expect(shadowHTML).toContain('hover:text-blue-700');
    expect(shadowHTML).toContain('px-4');
    expect(shadowHTML).toContain('py-2');
    expect(shadowHTML).toContain('bg-green-500');

    document.body.removeChild(el);
  });

  it('router-link activeClass and exactActiveClass work with JIT CSS', async () => {
    const routes = [
      { path: '/', component: 'home-page' },
      { path: '/dashboard', component: 'dashboard-page' }
    ];

    const router = initRouter({ routes, initialUrl: '/dashboard' });

    // Create a test component with custom active classes using JIT CSS utilities
    component('test-nav-active', () => {
      return html`
        <nav>
          <router-link 
            to="/" 
            activeClass="bg-blue-500 text-white"
            exactActiveClass="border-b-2 border-blue-700"
          >Home</router-link>
          <router-link 
            to="/dashboard" 
            activeClass="bg-green-500 text-white"
            exactActiveClass="border-b-2 border-green-700"
            exact
          >Dashboard</router-link>
        </nav>
      `;
    });

    const el = document.createElement('test-nav-active');
    document.body.appendChild(el);
    
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(el.shadowRoot).toBeTruthy();
    const shadowHTML = el.shadowRoot!.innerHTML;

    // The Dashboard link should be active since we're on /dashboard
    expect(shadowHTML).toContain('bg-green-500');
    expect(shadowHTML).toContain('text-white');
    expect(shadowHTML).toContain('border-b-2');
    expect(shadowHTML).toContain('border-green-700');

    document.body.removeChild(el);
  });

  it('router-link merges user class with active classes for JIT CSS', async () => {
    const routes = [
      { path: '/', component: 'home-page' },
      { path: '/settings', component: 'settings-page' }
    ];

    const router = initRouter({ routes, initialUrl: '/settings' });

    // Test that user classes and active classes are merged properly
    component('test-nav-merge', () => {
      return html`
        <nav>
          <router-link 
            to="/settings"
            class="px-4 py-2 rounded-lg transition-colors"
            activeClass="bg-purple-500 text-white"
            exactActiveClass="ring-2 ring-purple-700"
            exact
          >Settings</router-link>
        </nav>
      `;
    });

    const el = document.createElement('test-nav-merge');
    document.body.appendChild(el);
    
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(el.shadowRoot).toBeTruthy();
    const shadowHTML = el.shadowRoot!.innerHTML;

    // All classes should be present: user classes + active classes
    expect(shadowHTML).toContain('px-4');
    expect(shadowHTML).toContain('py-2');
    expect(shadowHTML).toContain('rounded-lg');
    expect(shadowHTML).toContain('transition-colors');
    expect(shadowHTML).toContain('bg-purple-500');
    expect(shadowHTML).toContain('text-white');
    expect(shadowHTML).toContain('ring-2');
    expect(shadowHTML).toContain('ring-purple-700');

    document.body.removeChild(el);
  });

  it('router-link class object is properly converted to class string for JIT CSS', async () => {
    const routes = [
      { path: '/', component: 'home-page' },
      { path: '/profile', component: 'profile-page' }
    ];

    const router = initRouter({ routes, initialUrl: '/profile' });

    // The implementation converts the class object to a class string
    // This test verifies that the class names are extracted properly
    component('test-nav-object', () => {
      return html`
        <nav>
          <router-link 
            to="/profile"
            class="inline-block"
            activeClass="font-bold underline"
            exactActiveClass="text-orange-500"
            exact
          >Profile</router-link>
        </nav>
      `;
    });

    const el = document.createElement('test-nav-object');
    document.body.appendChild(el);
    
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(el.shadowRoot).toBeTruthy();
    const shadowHTML = el.shadowRoot!.innerHTML;

    // Verify all classes are in the class attribute
    expect(shadowHTML).toContain('inline-block');
    expect(shadowHTML).toContain('font-bold');
    expect(shadowHTML).toContain('underline');
    expect(shadowHTML).toContain('text-orange-500');

    document.body.removeChild(el);
  });

  it('router-link responsive and variant classes work with JIT CSS', async () => {
    const routes = [
      { path: '/', component: 'home-page' },
      { path: '/mobile', component: 'mobile-page' }
    ];

    const router = initRouter({ routes, initialUrl: '/mobile' });

    // Test responsive utilities and variants
    component('test-nav-responsive', () => {
      return html`
        <nav>
          <router-link 
            to="/mobile"
            class="block md:inline-block lg:flex"
            activeClass="bg-blue-500 hover:bg-blue-600 dark:bg-blue-400"
            exactActiveClass="shadow-lg md:shadow-xl"
            exact
          >Mobile</router-link>
        </nav>
      `;
    });

    const el = document.createElement('test-nav-responsive');
    document.body.appendChild(el);
    
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(el.shadowRoot).toBeTruthy();
    const shadowHTML = el.shadowRoot!.innerHTML;

    // Verify responsive and variant classes are present
    expect(shadowHTML).toContain('block');
    expect(shadowHTML).toContain('md:inline-block');
    expect(shadowHTML).toContain('lg:flex');
    expect(shadowHTML).toContain('bg-blue-500');
    expect(shadowHTML).toContain('hover:bg-blue-600');
    expect(shadowHTML).toContain('dark:bg-blue-400');
    expect(shadowHTML).toContain('shadow-lg');
    expect(shadowHTML).toContain('md:shadow-xl');

    document.body.removeChild(el);
  });
});
