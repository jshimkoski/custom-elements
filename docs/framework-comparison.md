# 🎯 Framework Comparison

| Feature                | Custom Elements Runtime       | React     | Vue       | Angular  | Svelte   | Lit       |
|------------------------|------------------------------|-----------|-----------|----------|----------|-----------|
| **SSR**                | Built-in, universal           | Yes       | Yes       | Yes      | Yes      | Yes       |
| **TypeScript**         | Strict, enforced              | Optional  | Optional  | Strict   | Optional | Strict    |
| **State Mgmt**         | Direct assign, Store, Event Bus | Redux   | Pinia     | RxJS     | Store    | Manual    |
| **Routing**            | Built-in, declarative, SSR/static compatible | React Router | Vue Router | Angular Router | SvelteKit | Manual    |
| **HMR**                | Vite/ESM only                | Yes       | Yes       | Yes      | Yes      | Yes       |
| **Error Boundaries**   | Built-in                    | Yes       | Yes       | Yes      | Yes      | Manual    |
| **Event Binding**      | Declarative, type-safe attrs | JSX       | v-on      | (ng)     | on:      | @event    |
| **Reactivity**         | Proxy, computed, VDOM        | setState  | Proxy     | Zone.js  | Compiler | LitElement|
| **Dependencies**       | None                        | Many      | Some      | Many     | None     | None      |
| **SSR Hydration**      | Opt-in, template match       | Yes       | Yes       | Yes      | Yes      | Yes       |
| **Tree-shaking**       | Full                        | Partial   | Partial   | Partial  | Yes      | Yes       |
| **Custom Elements**    | Native, true web standard    | No        | No        | No       | No       | Yes       |
| **DevTools**           | Basic                       | Advanced  | Advanced  | Advanced | Basic    | Basic     |
| **Plugin System**      | Built-in, strictly typed     | Libraries | Libraries | Libraries| Libraries| Manual    |
| **Global Store/Event Bus** | Built-in                 | Libraries | Libraries | Libraries| Built-in | Manual    |
| **Template Helpers**   | html, compile, css, classes, styles | JSX       | SFC       | Templates| Svelte   | Lit-html  |
| **Build Tools**        | Vite/Webpack/Rollup          | Yes       | Yes       | Yes      | Yes      | Yes       |

---

## 🌟 Strengths

- Minimal bundle (~13.4KB gzipped), zero dependencies  
- Strict TypeScript, functional API, modular exports  
- Built-in SSR, selective hydration, error boundaries, plugin system  
- Declarative, SSR/static-friendly router with `<router-view>`  
- Strong plugin system with lifecycle, render & error hooks  
- Global store & event bus for cross-component state & communication  
- Computed props, refs, lifecycle hooks, fine-grained VDOM  
- Declarative, type-safe, attribute-based event binding with auto cleanup  
- Native custom elements with full lifecycle & controlled input sync  
- Fully tree-shakable and regression-tested  
- Deep object sanitization for security  

---

## ⚖️ Tradeoffs

- Smaller ecosystem, fewer integrations  
- Functional state mgmt only, no class-based API  
- Minimal devtools  
- SSR excludes refs/events/lifecycle hooks  
- Functional, modular API — no classes or boilerplate  

---

## 🔥 What’s Unique

- **Native custom elements by default:** true web standard, interoperable anywhere (shared only with Lit)  
- **Declarative event binding via attributes:** uses `data-on-*` for type-safe, auto-cleaned event binding  
- **SSR/static site generation:** route matching + pre-rendering built-in  
- **Plugin hooks:** lifecycle, render, and error boundaries  
- **Attribute reflection & controlled input sync on custom elements**  
- **Zero dependencies with full features:** SSR, hydration, plugins, error boundaries, global store/event bus, computed, refs, lifecycle, VDOM, edge cases  
- **Functional, modular, strictly typed API:** no classes, no boilerplate, fully regression-tested  

This unique combo of native custom elements, attribute-based event binding, zero deps, and strict modular API sets Custom Elements Runtime apart.

---

## 📝 Summary

Custom Elements Runtime is perfect for lightweight, modern, standards-based web components and micro-frontends. Major frameworks excel in large-scale, feature-rich apps.
