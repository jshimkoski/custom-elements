import { describe, it, expect, beforeEach } from "vitest";
import { initRouter } from "../src/lib/router";
import { component } from "../src/lib/runtime/component";
import { html } from "../src/lib/runtime/template-compiler";

describe("router-link JIT CSS integration", () => {
  beforeEach(() => {
    // Reset router state
    const existingRouterView = customElements.get("router-view");
    const existingRouterLink = customElements.get("router-link");

    if (existingRouterView) {
      customElements.upgrade(document.createElement("router-view"));
    }
    if (existingRouterLink) {
      customElements.upgrade(document.createElement("router-link"));
    }
  });

  // Helper: test for a class name either on the router-link host or inside
  // the router-link's shadow DOM (makes the assertion robust to whether
  // the runtime applies classes to the host or the internal anchor).
  function hasClassOnHostOrShadow(host: HTMLElement, className: string) {
    const hostClass = host.getAttribute("class") || "";
    if (hostClass.includes(className)) return true;
    const sr = host.shadowRoot;
    if (!sr) return false;
    return sr.innerHTML.includes(className);
  }

  it("router-link classes work with JIT CSS - static class prop", async () => {
    const routes = [
      { path: "/", component: "home-page" },
      { path: "/about", component: "about-page" },
    ];

    const router = initRouter({ routes });

    // Create a test component that uses router-link with JIT CSS classes
    component("test-nav", () => {
      return html`
        <nav>
          <router-link to="/" link-class="text-blue-500 hover:text-blue-700"
            >Home</router-link
          >
          <router-link to="/about" link-class="px-4 py-2 bg-green-500"
            >About</router-link
          >
        </nav>
      `;
    });

    const el = document.createElement("test-nav");
    document.body.appendChild(el);

    await new Promise((resolve) => setTimeout(resolve, 50));

    // Check that the component rendered
    expect(el.shadowRoot).toBeTruthy();

    // Helper: test for a class name either on the router-link host or inside
    // the router-link's shadow DOM (makes the assertion robust to whether
    // the runtime applies classes to the host or the internal anchor).
    function hasClassOnHostOrShadow(host: HTMLElement, className: string) {
      const hostClass = host.getAttribute("class") || "";
      if (hostClass.includes(className)) return true;
      const sr = host.shadowRoot;
      if (!sr) return false;
      return sr.innerHTML.includes(className);
    }

    // Find each router-link in the rendered nav and assert on its own shadowRoot
    const links = el.shadowRoot!.querySelectorAll("router-link");
    expect(links.length).toBe(2);

    const homeLink = links[0] as HTMLElement;
    const aboutLink = links[1] as HTMLElement;

    const homeShadow = homeLink.shadowRoot;
    const aboutShadow = aboutLink.shadowRoot;

    expect(homeShadow).toBeTruthy();
    expect(aboutShadow).toBeTruthy();

    const homeHTML = homeShadow!.innerHTML;
    const aboutHTML = aboutShadow!.innerHTML;

    // Verify JIT CSS classes are present either on the host or inside the
    // router-link's shadow DOM.
    expect(hasClassOnHostOrShadow(homeLink, "text-blue-500")).toBe(true);
    expect(hasClassOnHostOrShadow(homeLink, "hover:text-blue-700")).toBe(true);

    expect(hasClassOnHostOrShadow(aboutLink, "px-4")).toBe(true);
    expect(hasClassOnHostOrShadow(aboutLink, "py-2")).toBe(true);
    expect(hasClassOnHostOrShadow(aboutLink, "bg-green-500")).toBe(true);

    document.body.removeChild(el);
  });

  it("router-link activeClass and exactActiveClass work with JIT CSS", async () => {
    const routes = [
      { path: "/", component: "home-page" },
      { path: "/dashboard", component: "dashboard-page" },
    ];

    const router = initRouter({ routes, initialUrl: "/dashboard" });

    // Create a test component with custom active classes using JIT CSS utilities
    component("test-nav-active", () => {
      return html`
        <nav>
          <router-link
            to="/"
            active-class="bg-blue-500 text-white"
            exact-active-class="border-b-2 border-blue-700"
            >Home</router-link
          >
          <router-link
            to="/dashboard"
            active-class="bg-green-500 text-white"
            exact-active-class="border-b-2 border-green-700"
            exact
            >Dashboard</router-link
          >
        </nav>
      `;
    });

    const el = document.createElement("test-nav-active");
    document.body.appendChild(el);

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(el.shadowRoot).toBeTruthy();

    const links = el.shadowRoot!.querySelectorAll("router-link");
    expect(links.length).toBe(2);

    const dashboardLink = links[1] as HTMLElement;
    const dashboardShadow = dashboardLink.shadowRoot;
    expect(dashboardShadow).toBeTruthy();

    // The Dashboard link should be active since we're on /dashboard
    expect(hasClassOnHostOrShadow(dashboardLink, "bg-green-500")).toBe(true);
    expect(hasClassOnHostOrShadow(dashboardLink, "text-white")).toBe(true);
    expect(hasClassOnHostOrShadow(dashboardLink, "border-b-2")).toBe(true);
    expect(hasClassOnHostOrShadow(dashboardLink, "border-green-700")).toBe(
      true
    );

    document.body.removeChild(el);
  });

  it("router-link merges user class with active classes for JIT CSS", async () => {
    const routes = [
      { path: "/", component: "home-page" },
      { path: "/settings", component: "settings-page" },
    ];

    const router = initRouter({ routes, initialUrl: "/settings" });

    // Test that user classes and active classes are merged properly
    component("test-nav-merge", () => {
      return html`
        <nav>
          <router-link
            to="/settings"
            link-class="px-4 py-2 rounded-lg transition-colors"
            active-class="bg-purple-500 text-white"
            exact-active-class="ring-2 ring-purple-700"
            exact
            >Settings</router-link
          >
        </nav>
      `;
    });

    const el = document.createElement("test-nav-merge");
    document.body.appendChild(el);

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(el.shadowRoot).toBeTruthy();

    const links = el.shadowRoot!.querySelectorAll("router-link");
    expect(links.length).toBe(1);

    const settingsLink = links[0] as HTMLElement;
    const settingsShadow = settingsLink.shadowRoot;
    expect(settingsShadow).toBeTruthy();

    // All classes should be present: user classes + active classes
    expect(hasClassOnHostOrShadow(settingsLink, "px-4")).toBe(true);
    expect(hasClassOnHostOrShadow(settingsLink, "py-2")).toBe(true);
    expect(hasClassOnHostOrShadow(settingsLink, "rounded-lg")).toBe(true);
    expect(hasClassOnHostOrShadow(settingsLink, "transition-colors")).toBe(
      true
    );
    expect(hasClassOnHostOrShadow(settingsLink, "bg-purple-500")).toBe(true);
    expect(hasClassOnHostOrShadow(settingsLink, "text-white")).toBe(true);
    expect(hasClassOnHostOrShadow(settingsLink, "ring-2")).toBe(true);
    expect(hasClassOnHostOrShadow(settingsLink, "ring-purple-700")).toBe(true);

    document.body.removeChild(el);
  });

  it("router-link class object is properly converted to class string for JIT CSS", async () => {
    const routes = [
      { path: "/", component: "home-page" },
      { path: "/profile", component: "profile-page" },
    ];

    const router = initRouter({ routes, initialUrl: "/profile" });

    // The implementation converts the class object to a class string
    // This test verifies that the class names are extracted properly
    component("test-nav-object", () => {
      return html`
        <nav>
          <router-link
            to="/profile"
            link-class="inline-block"
            active-class="font-bold underline"
            exact-active-class="text-orange-500"
            exact
            >Profile</router-link
          >
        </nav>
      `;
    });

    const el = document.createElement("test-nav-object");
    document.body.appendChild(el);

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(el.shadowRoot).toBeTruthy();

    const links = el.shadowRoot!.querySelectorAll("router-link");
    expect(links.length).toBe(1);

    const profileLink = links[0] as HTMLElement;
    const profileShadow = profileLink.shadowRoot;
    expect(profileShadow).toBeTruthy();

    // Verify all classes are present in host or shadow
    expect(hasClassOnHostOrShadow(profileLink, "inline-block")).toBe(true);
    expect(hasClassOnHostOrShadow(profileLink, "font-bold")).toBe(true);
    expect(hasClassOnHostOrShadow(profileLink, "underline")).toBe(true);
    expect(hasClassOnHostOrShadow(profileLink, "text-orange-500")).toBe(true);

    document.body.removeChild(el);
  });

  it("router-link responsive and variant classes work with JIT CSS", async () => {
    const routes = [
      { path: "/", component: "home-page" },
      { path: "/mobile", component: "mobile-page" },
    ];

    const router = initRouter({ routes, initialUrl: "/mobile" });

    // Test responsive utilities and variants
    component("test-nav-responsive", () => {
      return html`
        <nav>
          <router-link
            to="/mobile"
            link-class="block md:inline-block lg:flex"
            active-class="bg-blue-500 hover:bg-blue-600 dark:bg-blue-400"
            exact-active-class="shadow-lg md:shadow-xl"
            exact
            >Mobile</router-link
          >
        </nav>
      `;
    });

    const el = document.createElement("test-nav-responsive");
    document.body.appendChild(el);

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(el.shadowRoot).toBeTruthy();

    const links = el.shadowRoot!.querySelectorAll("router-link");
    expect(links.length).toBe(1);

    const mobileLink = links[0] as HTMLElement;
    const mobileShadow = mobileLink.shadowRoot;
    expect(mobileShadow).toBeTruthy();

    // Verify responsive and variant classes are present (host or shadow)
    expect(hasClassOnHostOrShadow(mobileLink, "block")).toBe(true);
    expect(hasClassOnHostOrShadow(mobileLink, "md:inline-block")).toBe(true);
    expect(hasClassOnHostOrShadow(mobileLink, "lg:flex")).toBe(true);
    expect(hasClassOnHostOrShadow(mobileLink, "bg-blue-500")).toBe(true);
    expect(hasClassOnHostOrShadow(mobileLink, "hover:bg-blue-600")).toBe(true);
    expect(hasClassOnHostOrShadow(mobileLink, "dark:bg-blue-400")).toBe(true);
    expect(hasClassOnHostOrShadow(mobileLink, "shadow-lg")).toBe(true);
    expect(hasClassOnHostOrShadow(mobileLink, "md:shadow-xl")).toBe(true);

    document.body.removeChild(el);
  });
});
