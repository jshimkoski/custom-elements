# Changelog

All notable changes to this project will be documented in this file.
## [v2.0.0] - 2025-10-24

- BREAKING CHANGE: imports have been split to reduce bundle size. Read docs for details. (ad071aa)
- fix: fix router-link rendering issues (2cfb6ea)



## [v1.2.3] - 2025-10-17

- fix: fix router-link rendering issues (2cfb6ea)
- fix: Preserve class-like attributes for custom elements (compiler + vdom) and add regression test for JIT CSS (fix router-link) (7754f01)

## [v1.2.2] - 2025-10-17

- fix: Preserve class-like attributes for custom elements (compiler + vdom) and add regression test for JIT CSS (fix router-link) (7754f01)
- fix: improve error handling fix: allow for factory functions for when and match (32d1b2a)

## [v1.2.1] - 2025-10-15

- fix: improve error handling fix: allow for factory functions for when and match (32d1b2a)
- feat: add entity handling feat: add unsafeHTML function fix: semantic text sizes can now have their line height overridden (8479af9)

## [v1.2.0] - 2025-10-12

- feat: add entity handling feat: add unsafeHTML function fix: semantic text sizes can now have their line height overridden (8479af9)
- fix: add missing class and style props to TransitionGroup fix: add missing space-x-_ and space-y-_ utilities (a3751ee)

## [v1.1.2] - 2025-10-03

- fix: add missing class and style props to TransitionGroup fix: add missing space-x-_ and space-y-_ utilities (a3751ee)
- fix: add licenese fix: replace console logs with dev safe versions (771f12d)
- fix: update readme, functional api toc, and router docs (fe6b866)
- feat: add transition and transition group support (a3f5e8b)
- BREAKING CHANGE: remove destructure props in favor of useProps feat: fraction width/heights feat: when directive feat: additional gradient styles fix: performance improvements (d722237)

## [v1.1.1] - 2025-10-03

- fix: add licenese fix: replace console logs with dev safe versions (771f12d)
- fix: update readme, functional api toc, and router docs (fe6b866)
- feat: add transition and transition group support (a3f5e8b)
- BREAKING CHANGE: remove destructure props in favor of useProps feat: fraction width/heights feat: when directive feat: additional gradient styles fix: performance improvements (d722237)
- feat: add useProps functionality and integration tests (08820c3)

## [v1.1.0] - 2025-09-29

- feat: add useProps functionality and integration tests (08820c3)
- fix: fix gradient CSS generation and add corresponding tests for milestones component (c83b4fb)

## [v1.0.10] - 2025-09-27

- fix: fix gradient CSS generation and add corresponding tests for milestones component (c83b4fb)
- fix: Add classes to jit css such as bg-gradient, container querires, scale, rotate (596d4ed)

## [v1.0.9] - 2025-09-27

- fix: Add classes to jit css such as bg-gradient, container querires, scale, rotate (596d4ed)
- fix: Refactor component and props handling to improve readability and maintainability (3bca420)

## [v1.0.8] - 2025-09-27

- fix: Refactor component and props handling to improve readability and maintainability (3bca420)
- fix: update font family declarations to use CSS variables (9d02820)

## [v1.0.7] - 2025-09-27

- fix: update font family declarations to use CSS variables (9d02820)
- fix: expand border, rounded, and grid classes (b1dd1cb)

## [v1.0.6] - 2025-09-21

- fix: expand border, rounded, and grid classes (b1dd1cb)
- fix: add missing overflow classes (eb6620b)

## [v1.0.5] - 2025-09-21

- fix: add missing overflow classes (eb6620b)
- fix: add missing border and rounded classes fix: reference border with for border related arbitrary values (bf27851)

## [v1.0.4] - 2025-09-20

- fix: add missing border and rounded classes fix: reference border with for border related arbitrary values (bf27851)
- fix: add min-h-screen, min-w-screen (135f029)

## [v1.0.3] - 2025-09-19

- fix: add min-h-screen, min-w-screen (135f029)
- fix: add max-w-screen, max-h-screen (aaa1089)

## [v1.0.2] - 2025-09-19

- fix: add max-w-screen, max-h-screen (aaa1089)
- fix reactive state issue that prevented refs from working (5a8244c)

## [v1.0.1] - 2025-09-19

- fix reactive state issue that prevented refs from working (5a8244c)
- fix: improve caching, security, and inifinite loop protection docs: update documentation for secure expression evaluator and improve event manager metadata handling (d414d8c)
- fix: remove dangerous eval test: improve test coverage (0058f86)
- docs: fix best practices for styling (3f1ea14)
- docs: fix toc for github (cf7913f)
- docs: add table of contents to function api docs (8b38fc9)
- docs: clean up functional api new wording (794fb38)
- docs: clean up functional api docs (52d875b)
- docs: update bindings to reference refs instead of state (db7e8f9)
- docs: fix cross component communication faq (3cc1c5c)
- docs: fix troubleshooting (094a1f3)
- docs: update readme example (7efdd8a)
- BREAKING CHANGE: migrate to functional API (d62b2ba)

## [v1.0.0] - 2025-09-19

- fix: improve caching, security, and inifinite loop protection docs: update documentation for secure expression evaluator and improve event manager metadata handling (d414d8c)
- fix: remove dangerous eval test: improve test coverage (0058f86)
- docs: fix best practices for styling (3f1ea14)
- docs: fix toc for github (cf7913f)
- docs: add table of contents to function api docs (8b38fc9)
- docs: clean up functional api new wording (794fb38)
- docs: clean up functional api docs (52d875b)
- docs: update bindings to reference refs instead of state (db7e8f9)
- docs: fix cross component communication faq (3cc1c5c)
- docs: fix troubleshooting (094a1f3)
- docs: update readme example (7efdd8a)
- BREAKING CHANGE: migrate to functional API (d62b2ba)
- - fix: :model, :model:prop, :prop binding - fix: enhance test suite - fix: add enhanced directives - fix: improve dev logging (7d89209)

## [v0.3.1] - 2025-09-09

- - fix: :model, :model:prop, :prop binding - fix: enhance test suite - fix: add enhanced directives - fix: improve dev logging (7d89209)
- feat: enhance vdom handling for custom elements and attributes (9dc886a)

## [v0.3.0] - 2025-09-07

- feat: enhance vdom handling for custom elements and attributes (9dc886a)
- fix: enhance styling for baby component and add additional border-radius utilities (fdcf557)

## [v0.2.7] - 2025-09-06

- fix: enhance styling for baby component and add additional border-radius utilities (fdcf557)
- fix: clean up semantic color naming, add tests, update docs fix: update example components to use semantic colors fix: add missing utility classes fix: allow shadow coloring fix: stroke and fill definition (5ef1fb2)

## [v0.2.6] - 2025-09-06

- fix: clean up semantic color naming, add tests, update docs fix: update example components to use semantic colors fix: add missing utility classes fix: allow shadow coloring fix: stroke and fill definition (5ef1fb2)
- fix: Remove internal registry note from component documentation for clarity (f51e43b)

## [v0.2.5] - 2025-09-05

- fix: Remove internal registry note from component documentation for clarity (f51e43b)
- fix: Enhance bindings documentation and examples. Fix typo in success message. (06b0153)
- feat: Improve :model binding and introduce :model:prop binding. Refactor watchers. Improve typing. Export renderToString for SSR. (12a4759)

## [v0.2.4] - 2025-09-05

- fix: Enhance bindings documentation and examples. Fix typo in success message. (06b0153)
- feat: Improve :model binding and introduce :model:prop binding. Refactor watchers. Improve typing. Export renderToString for SSR. (12a4759)
- fix: remove ring utility, add transition utilities and arbitrary helpers, add transparent and currentColor (4cd9e23)

## [v0.2.3] - 2025-09-04

- fix: remove ring utility, add transition utilities and arbitrary helpers, add transparent and currentColor (4cd9e23)
- fix: enhance component typing and add reserved keys warning (d274d2d)

## [v0.2.2] - 2025-09-04

- fix: enhance component typing and add reserved keys warning (d274d2d)
- revert: remove event modifiers implementation and related tests (4e0fbae)

## [v0.2.1] - 2025-09-04

- revert: remove event modifiers implementation and related tests (4e0fbae)
- feat: add support for event modifiers in template syntax and enhance event listener handling (ef86059)

## [v0.2.0] - 2025-09-04

- feat: add support for event modifiers in template syntax and enhance event listener handling (ef86059)
- refactor: transition to DOM-first events API and remove host-level handler conventions (3b5f98c)

## [v0.1.25] - 2025-09-04

- refactor: transition to DOM-first events API and remove host-level handler conventions (3b5f98c)
- fix: Introduce host-level event handling with `onHost<Event>` convention (996be52)

## [v0.1.24] - 2025-09-03

- fix: Introduce host-level event handling with `onHost<Event>` convention (996be52)
- docs: update README and JIT CSS documentation for clarity and consistency (3fb4ad5)

## [v0.1.23] - 2025-09-01

- docs: update README and JIT CSS documentation for clarity and consistency (3fb4ad5)
- docs(jit-css): update utility documentation and add missing sections (936469a)

## [v0.1.22] - 2025-09-01

- docs(jit-css): update utility documentation and add missing sections (936469a)
- fix(router): remove unused import from router view tests (209c513)

## [v0.1.21] - 2025-09-01

- fix(router): remove unused import from router view tests (209c513)
- fix(router): enhance route component resolution and caching (9eaf2a5)

## [v0.1.20] - 2025-09-01

- fix(router): enhance route component resolution and caching (9eaf2a5)
- fix: enhance class handling for JIT CSS in initRouter function (ac111de)

## [v0.1.19] - 2025-09-01

- fix: enhance class handling for JIT CSS in initRouter function (ac111de)
- fix: improve handling multiple pseudos and arbitrary values in jitCSS (74b8abb)

## [v0.1.18] - 2025-09-01

- fix: improve handling multiple pseudos and arbitrary values in jitCSS (74b8abb)
- fix: enhance jitCSS tests for complex variants and dark mode support (4297752)

## [v0.1.17] - 2025-09-01

- fix: enhance jitCSS tests for complex variants and dark mode support (4297752)
- fix: enhance jitCSS for improved arbitrary variant support (a2f635e)

## [v0.1.16] - 2025-08-31

- fix: enhance jitCSS for improved arbitrary variant support (a2f635e)
- fix: refine TodoApp styles and fix border color for input field (a0de062)

## [v0.1.15] - 2025-08-31

- fix: refine TodoApp styles and fix border color for input field (a0de062)
- fix: add z-index and opacity utility classes; enhance CSS utility functionality (09653d3)

## [v0.1.14] - 2025-08-31

- fix: add z-index and opacity utility classes; enhance CSS utility functionality (09653d3)
- fix: update binding syntax from #model to :model across documentation and examples; enhance clarity and consistency (72bb626)

## [v0.1.13] - 2025-08-31

- fix: update binding syntax from #model to :model across documentation and examples; enhance clarity and consistency (72bb626)
- fix: enhance bindings documentation and add class binding examples; improve router functionality and tests; add component edge cases and props tests (0a3a1e3)

## [v0.1.12] - 2025-08-31

- fix: enhance bindings documentation and add class binding examples; improve router functionality and tests; add component edge cases and props tests (0a3a1e3)
- fix: add class binding to router link and button components (4e43813)

## [v0.1.11] - 2025-08-31

- fix: add class binding to router link and button components (4e43813)
- fix: void elements will no longer break template compilation (89b3da9)

## [v0.1.10] - 2025-08-31

- fix: void elements will no longer break template compilation (89b3da9)
- fix: enhance bindings and context handling in template compiler and examples (4f9582d)

## [v0.1.9] - 2025-08-31

- fix: enhance bindings and context handling in template compiler and examples (4f9582d)
- fix: move test files to test directory fix: remove unnecessary import from TodoApp.ts (b496a63)

## [v0.1.8] - 2025-08-30

- fix: move test files to test directory fix: remove unnecessary import from TodoApp.ts (b496a63)
- fix: update utility classes and spacing handling in JIT CSS fix: improve template parsing to accommodate arbitrary variants (3ecfda7)
- fix: add arbitrary variant support. docs: update docs to mention arbitrary variants (2077166)

## [v0.1.7] - 2025-08-30

- fix: update utility classes and spacing handling in JIT CSS fix: improve template parsing to accommodate arbitrary variants (3ecfda7)
- fix: add arbitrary variant support. docs: update docs to mention arbitrary variants (2077166)
- fix: reference the prop ctx variables in router-link (b174807)

## [v0.1.6] - 2025-08-29

- fix: reference the prop ctx variables in router-link (b174807)
- fix: add tests for router-view dynamic rendering and improve component rendering logic (8ef94bd)

## [v0.1.5] - 2025-08-29

- fix: add tests for router-view dynamic rendering and improve component rendering logic (8ef94bd)
- fix: update assertion for div existence in minimal example test (81366e6)
- feat: enhance documentation and improve router functionality with navigation guards (fd39856)

## [v0.1.4] - 2025-08-29

- fix: update assertion for div existence in minimal example test (81366e6)
- feat: enhance documentation and improve router functionality with navigation guards (fd39856)
- refactor: refactored the lib directory and how the package is published. docs: added router documentation feat: added router to module export (87902f5)

## [v0.1.3] - 2025-08-28

- refactor: refactored the lib directory and how the package is published. docs: added router documentation feat: added router to module export (87902f5)
- docs: Updated error handling documentation to clarify default `onError` handler. (67adbc1)

## [v0.1.2] - 2025-08-28

- docs: Updated error handling documentation to clarify default `onError` handler. (67adbc1)
- docs: update Flex section to include missing flex-col and flex-row utilities (9a969b0)

## [v0.1.1] - 2025-08-27

- docs: update Flex section to include missing flex-col and flex-row utilities (9a969b0)
- feat: add ref binding support and update documentation docs: clean up docs (019eb7a)

## [v0.1.0] - 2025-08-27

- feat: add ref binding support and update documentation docs: clean up docs (019eb7a)
- docs: update component and troubleshooting guides to remove styleOptimizations references (6c1b90b)

## [v0.0.17] - 2025-08-26

- docs: update component and troubleshooting guides to remove styleOptimizations references (6c1b90b)
- fix: fix broken minimum example cypress test docs: fix docs for directives (6119047)
- fix: make base reset used across all component instances fix: move style related functions to style utils (0d12974)
- docs: update README and style documentation for clarity and consistency feat: enhance MinimalExample component styling and remove minifyCSS option style: add comprehensive base reset styles for improved consistency across elements (fb36db4)
- refactor: enhance MinimalExample component styling and update utilityMap with new flex and alignment utilities (c5e7add)

## [v0.0.16] - 2025-08-26

- fix: fix broken minimum example cypress test docs: fix docs for directives (6119047)
- fix: make base reset used across all component instances fix: move style related functions to style utils (0d12974)
- docs: update README and style documentation for clarity and consistency feat: enhance MinimalExample component styling and remove minifyCSS option style: add comprehensive base reset styles for improved consistency across elements (fb36db4)
- refactor: enhance MinimalExample component styling and update utilityMap with new flex and alignment utilities (c5e7add)
- fix: correct link to style-utils.ts in JIT CSS documentation (c6adcc7)

## [v0.0.15] - 2025-08-26

- fix: correct link to style-utils.ts in JIT CSS documentation (c6adcc7)
- fix: update link to style-utils.ts in JIT CSS documentation (77c34ef)

## [v0.0.14] - 2025-08-26

- fix: update link to style-utils.ts in JIT CSS documentation (77c34ef)
- docs: reorder and number steps in JIT CSS explanation for clarity (1a67bb6)

## [v0.0.13] - 2025-08-26

- docs: reorder and number steps in JIT CSS explanation for clarity (1a67bb6)
- docs: refine README for clarity and consistency in usage instructions (1a2f2f6)

## [v0.0.12] - 2025-08-26

- docs: refine README for clarity and consistency in usage instructions (1a2f2f6)
- chore: Bump version to 0.0.11-beta.0 and update documentation (89c6be6)

## [v0.0.11] - 2025-08-26

- chore: Bump version to 0.0.11-beta.0 and update documentation (89c6be6)

## [v0.0.10-beta.3] - 2025-08-26

- No changes since last release

## [v0.0.10-beta.2] - 2025-08-26

- refactor(tests): update runtime config tests to improve clarity and remove unsupported assertions (f078f59)

## [v0.0.10-beta.1] - 2025-08-26

- refactor(tests): update runtime config tests to improve clarity and remove unsupported assertions (f078f59)
- refactor: update navigate function signature to enhance type safety (2088325)
- docs: standardize framework integration section formatting (38633db)
- refactor: update onAttributeChanged hook signature to improve context handling (e213058)
- Refactor component context usage across documentation and examples (dae5482)
- refactor: remove deprecated test files and enhance component context typing (8c30872)
- refactor: remove documentation components and related files (abd7952)
- docs: Add note on event binding limitations for DOM events section (1138296)
- feat(docs): Add Cross-Component Communication guide with event bus, props, store, and DOM events usage (4ac1bb9)
- feat(docs): Add documentation index and links for core concepts, reactivity patterns, styling, performance, error handling, and utilities (bd0bf00)
- feat(docs): Add comprehensive guides for hooks, method injection, props, rendering, slots, SSR, state management, store usage, style utilities, and virtual DOM. Enhance troubleshooting and template usage documentation for improved developer experience. (87933c6)
- refactor: update README to enhance clarity and remove async templates section (55f5458)
- Add comprehensive tests for event bus, runtime configuration, store, style utilities, template compiler, and virtual DOM (ce7f31b)
- refactor(tests): remove obsolete tests and consolidate test configurations (5727d7c)
- refactor: simplify documentation for anchorBlock and processDirectives functions (016d7fb)
- Remove obsolete HTML and JavaScript files related to directive testing and validation; streamline project structure by deleting unused components and validation scripts. (a4ef2ac)
- refactor: simplify component definitions and remove unused API parameters for clarity (180b549)
- refactor: enhance watch callback to include state and api, and update child-component to utilize eventBus for message changes (237edc6)
- refactor: enhance attribute handling in parseProps and patchProps for improved consistency (6636d84)
- refactor: remove router module to streamline routing logic (a97195a)
- refactor: replace vIf, vFor, and vIfBuilder with when, each, and match for improved directive consistency (27b7be9)
- refactor: update directive syntax from v- to # for consistency (5172b38)
- Refactor binding logic and improve template compiler (aedfcbe)
- Add async templates documentation, examples, and tests (4535704)
- Add performance tests and demo for style caching optimizations (ff0da94)
- Add watch functionality showcase and tests (785abb1)
- Add comprehensive tests and validation for directive helpers (47193ea)
- Add directive and v-model test components with comprehensive functionality (2bbd969)
- feat: enhance v-model directive for improved two-way data binding (7986fbb)
- feat: format input element for better readability in my-greeting component (7df4dfe)
- feat: implement HTML escaping in renderToString for improved SSR safety (4cfcf51)
- feat: enhance component registration with hot module replacement and improve element class factory (eaea0bc)
- feat: improve fragment handling in html implementation and enhance test coverage (dc804e6)
- feat: add comprehensive tests for fragment support in vFor and html() rendering (ae0e7a2)
- feat: implement v-model bindings for various input types with support for modifiers and nested properties (3fe2f40)
- feat: enhance state management with reactive proxies for improved reactivity and function binding (d820a9b)
- feat: enhance two-way data binding and input handling in component registration (71c441e)
- Refactor template compiler and VDOM for improved anchor block handling (ddfc17e)
- feat: enhance key assignment logic in anchorBlock and vFor functions for improved uniqueness (b5f96f5)
- feat: Introduce a lightweight, strongly typed functional custom element runtime (9b9e70d)

## [v0.0.10-beta.0] - 2025-08-25

- refactor: update navigate function signature to enhance type safety (2088325)
- docs: standardize framework integration section formatting (38633db)
- refactor: update onAttributeChanged hook signature to improve context handling (e213058)
- Refactor component context usage across documentation and examples (dae5482)
- refactor: remove deprecated test files and enhance component context typing (8c30872)
- refactor: remove documentation components and related files (abd7952)
- docs: Add note on event binding limitations for DOM events section (1138296)
- feat(docs): Add Cross-Component Communication guide with event bus, props, store, and DOM events usage (4ac1bb9)
- feat(docs): Add documentation index and links for core concepts, reactivity patterns, styling, performance, error handling, and utilities (bd0bf00)
- feat(docs): Add comprehensive guides for hooks, method injection, props, rendering, slots, SSR, state management, store usage, style utilities, and virtual DOM. Enhance troubleshooting and template usage documentation for improved developer experience. (87933c6)
- refactor: update README to enhance clarity and remove async templates section (55f5458)
- Add comprehensive tests for event bus, runtime configuration, store, style utilities, template compiler, and virtual DOM (ce7f31b)
- refactor(tests): remove obsolete tests and consolidate test configurations (5727d7c)
- refactor: simplify documentation for anchorBlock and processDirectives functions (016d7fb)
- Remove obsolete HTML and JavaScript files related to directive testing and validation; streamline project structure by deleting unused components and validation scripts. (a4ef2ac)
- refactor: simplify component definitions and remove unused API parameters for clarity (180b549)
- refactor: enhance watch callback to include state and api, and update child-component to utilize eventBus for message changes (237edc6)
- refactor: enhance attribute handling in parseProps and patchProps for improved consistency (6636d84)
- refactor: remove router module to streamline routing logic (a97195a)
- refactor: replace vIf, vFor, and vIfBuilder with when, each, and match for improved directive consistency (27b7be9)
- refactor: update directive syntax from v- to # for consistency (5172b38)
- Refactor binding logic and improve template compiler (aedfcbe)
- Add async templates documentation, examples, and tests (4535704)
- Add performance tests and demo for style caching optimizations (ff0da94)
- Add watch functionality showcase and tests (785abb1)
- Add comprehensive tests and validation for directive helpers (47193ea)
- Add directive and v-model test components with comprehensive functionality (2bbd969)
- feat: enhance v-model directive for improved two-way data binding (7986fbb)
- feat: format input element for better readability in my-greeting component (7df4dfe)
- feat: implement HTML escaping in renderToString for improved SSR safety (4cfcf51)
- feat: enhance component registration with hot module replacement and improve element class factory (eaea0bc)
- feat: improve fragment handling in html implementation and enhance test coverage (dc804e6)
- feat: add comprehensive tests for fragment support in vFor and html() rendering (ae0e7a2)
- feat: implement v-model bindings for various input types with support for modifiers and nested properties (3fe2f40)
- feat: enhance state management with reactive proxies for improved reactivity and function binding (d820a9b)
- feat: enhance two-way data binding and input handling in component registration (71c441e)
- Refactor template compiler and VDOM for improved anchor block handling (ddfc17e)
- feat: enhance key assignment logic in anchorBlock and vFor functions for improved uniqueness (b5f96f5)
- feat: Introduce a lightweight, strongly typed functional custom element runtime (9b9e70d)
- feat: enhance template helpers with CSS sanitization and update README for usage guidelines (bafc46b)

## [v0.0.10] - 2025-08-17

- feat: enhance template helpers with CSS sanitization and update README for usage guidelines (bafc46b)
- fix: enhance SSR compatibility with a fallback for ComponentElement (6c9d8fa)

## [v0.0.9] - 2025-08-17

- fix: enhance SSR compatibility with a fallback for ComponentElement (6c9d8fa)

## [v0.0.9-beta.5] - 2025-08-17

- fix: enhance SSR compatibility with a fallback for ComponentElement (6c9d8fa)
- fix: improve custom elements checks for development mode docs: fix routing header and other minor cleanup (8debd16)

## [v0.0.9-beta.4] - 2025-08-17

- fix: improve custom elements checks for development mode docs: fix routing header and other minor cleanup (8debd16)
- fix: update event handler binding to include state and API parameters (3f81095)

## [v0.0.9-beta.3] - 2025-08-17

- fix: update event handler binding to include state and API parameters (3f81095)
- feat: add <router-link> component for declarative navigation and update routing documentation (1443b81)

## [v0.0.9-beta.2] - 2025-08-16

- feat: add <router-link> component for declarative navigation and update routing documentation (1443b81)
- fix: update router initialization to support async component loading (14cddc9)

## [v0.0.9-beta.1] - 2025-08-16

- fix: update router initialization to support async component loading (14cddc9)
- test: increase wait time for text input binding in DataModelDemo component (5937797)
- refactor: remove singleton router instance and integrate into router-view component (80d23be)

## [v0.0.9-beta.0] - 2025-08-16

- test: increase wait time for text input binding in DataModelDemo component (5937797)
- refactor: remove singleton router instance and integrate into router-view component (80d23be)

## [v0.0.8] - 2025-08-16

- feat: add resolveRouteComponent to Router API exports (2b6bb5a)

## [v0.0.8-beta.0] - 2025-08-16

- feat: add resolveRouteComponent to Router API exports (2b6bb5a)

## [v0.0.7] - 2025-08-16

- fix: increase wait time for text input binding test (c87190e)
- feat: add support for asynchronous component loading in router (905276f)

## [v0.0.7-beta.0] - 2025-08-16

- fix: increase wait time for text input binding test (c87190e)
- feat: add support for asynchronous component loading in router (905276f)

## [v0.0.6] - 2025-08-16

- Enhance documentation for Custom Elements Runtime (a21d0d0)

## [v0.0.6-beta.0] - 2025-08-16

- Enhance documentation for Custom Elements Runtime (a21d0d0)

## [v0.0.5] - 2025-08-16

- docs: update documentation for clarity and consistency, including SSR hydration changes and code examples (0025a74)

## [v0.0.5-beta.0] - 2025-08-16

- docs: update documentation for clarity and consistency, including SSR hydration changes and code examples (0025a74)

## [v0.0.4] - 2025-08-16

- feat(router): implement lightweight router with SSR support and `<router-view>` component (fae925b)

## [v0.0.4-beta.0] - 2025-08-16

- feat(router): implement lightweight router with SSR support and `<router-view>` component (fae925b)

## [v0.0.3] - 2025-08-15

- fix: make state optional for stateless components docs: add examples and documentation for stateless components (fc13ab8)

## [v0.0.3-beta.0] - 2025-08-15

- fix: make state optional for stateless components docs: add examples and documentation for stateless components (fc13ab8)

## [v0.0.2] - 2025-08-15

- No changes since last release

## [v0.0.2-beta.0] - 2025-08-15

- test: add wait for text input binding in DataModelDemo component (73462f0)
- docs: update README and documentation for dynamic styling and refs usage feat: enhance SimpleTest component with dynamic styling based on state refactor: remove unused ref and on functions from template helpers test: clean up template-helpers tests by removing unnecessary cases (0ff1d4f)

## [v0.0.1-beta.6] - 2025-08-15

- test: add wait for text input binding in DataModelDemo component (73462f0)
- docs: update README and documentation for dynamic styling and refs usage feat: enhance SimpleTest component with dynamic styling based on state refactor: remove unused ref and on functions from template helpers test: clean up template-helpers tests by removing unnecessary cases (0ff1d4f)

## [v0.0.1] - 2025-08-15

- refactor: remove unnecessary global declaration for ImportMeta interface (c4f3464)
- fix: improve HMR handling in component function and update tsconfig types (f5328c4)

## [v0.0.1-beta.5] - 2025-08-15

- refactor: remove unnecessary global declaration for ImportMeta interface (c4f3464)
- fix: improve HMR handling in component function and update tsconfig types (f5328c4)
- feat: add dev server setup and Cypress testing to publish workflow (b2c910d)

## [v0.0.1-beta.4] - 2025-08-15

- feat: add dev server setup and Cypress testing to publish workflow (b2c910d)
- fix: remove unused variable (5722fdd)
- fix: prevent ssr issue when creating web components docs: add ssr example to framework integration (df77623)

## [v0.0.1-beta.3] - 2025-08-15

- fix: remove unused variable (5722fdd)
- fix: prevent ssr issue when creating web components docs: add ssr example to framework integration (df77623)
- feat: add export for runtime.d.ts in package.json (16c39d9)

## [v0.0.1-beta.2] - 2025-08-15

- feat: add export for runtime.d.ts in package.json (16c39d9)
- feat: add types export to package.json for improved TypeScript support (4c91499)

## [v0.0.1-beta.1] - 2025-08-15

- feat: add types export to package.json for improved TypeScript support (4c91499)
- feat: update author information and add repository details in package.json; create publish workflow for npm (a3ea021)
- feat: rename package to @jasonshimmy/custom-elements-runtime and update version to 0.0.0 (a4f8794)
- fix: Remove redundant newline in README.md for improved formatting (96c9525)
- fix: Correct bundle size and gzipped size for Custom Elements in framework comparison (a2c5d44)
- docs: Update documentation for core concepts, advanced use cases, and API reference; enhance clarity and detail on features and usage (94b0395)
- feat: Export deepSanitizeObject and isPromise functions; add comprehensive tests for runtime functionality (b4f9cc0)
- test: Add comprehensive tests for useDataModel functionality across various input types (db11846)
- feat: Add unit tests for v-dom functions to improve coverage and handle edge cases (3a84bd1)
- feat: Implement VDOM structure and patching mechanism (f2db2d4)
- Add comprehensive tests for template helpers, attribute reflection, computed properties, and runtime features (a001c5a)
- feat: add coverage command to test scripts and update devDependencies (d997dd0)
- test: add regression tests for checkbox state updates in VDOM (207ba89)
- feat: enhance checkbox data binding and event handling in list component (6731d37)
- feat: implement deep sanitization to prevent prototype pollution and deep object injection (dbec40c)
- feat: implement safe deep clone for lastState to handle circular references (3857b02)
- feat: add support for reflecting state properties as attributes in ComponentConfig (2ddbb7f)
- feat: enhance error handling in ComponentElement with improved error boundaries and fallback UI (0880551)
- feat: add error handling for ref handler execution in ComponentElement (cc4ea89)
- feat: rename updateTemplate to setTemplate for clarity in runtime updates (3c58157)
- feat: add setState method to ComponentElement for state updates and re-rendering (bbd7ff5)
- feat: add runtime template update functionality in ComponentElement (0f5f50c)
- feat: implement auto-wired event handler removal on unmount in ComponentElement (acf4d75)
- feat: add error handling for SSR hydration process in component element (1c1205f)
- feat: enhance lifecycle handling with promise support and error management (b245e6a)
- refactor: simplify template logic and improve state handling in docs-content component test: add form state synchronization tests for form-state-demo component (535569f)
- feat: update template dynamically using runtime API in tests (e496bf3)
- add additional tests (17ec7c2)
- Refactor tests and improve structure (7fb026b)
- feat: improve onMounted lifecycle handling with error management and state reset (f9900b2)
- feat: enhance component lifecycle management with error handling and state synchronization (43abc16)
- feat: enhance testing setup and add comprehensive tests for runtime functionality (fa146b7)
- feat: Enhance component API and configuration interfaces with detailed JSDoc comments, improve type safety, and add hydration support (712f610)
- refactor: Move and optimize safeReplaceChild function, enhance VNode structure, and reorganize code for better readability (ea2cf89)
- feat: Enhance documentation and examples for attribute-state reactivity, add new components for navigation and content display (d35d24d)
- Remove outdated SSR and template compilation examples, including server example and test files. Clean up documentation and ensure all components are ready for production deployment. (01b5f8d)
- feat: Add debug mode support for components and enhance logging capabilities (3e401b4)
- feat: Add MinimalExample component with state management and template rendering (9745293)
- feat: Revise documentation for clarity and consistency across README, API reference, core concepts, advanced use cases, and examples (fb8359f)
- Add comprehensive documentation for advanced use cases, API reference, core concepts, examples, framework comparison, and server-side rendering (80443ca)
- feat: Add support for single checkbox with custom true/false values and update documentation for form input bindings (c80abb7)
- feat: Implement safeReplaceChild function to enhance child node replacement logic and improve error handling (7672d42)
- feat: Enhance DataModelDemo component to support multi-checkbox and improve state management (cc504c7)
- feat: Add DataModelDemo component with various input types and state management (72accd1)
- remove debug log. Add textarea to todo app just to check it works. update readme (3d7da9e)
- feat: Refactor example imports and update data binding in SimpleTest and ShoppingCart components (ecfc821)
- feat: Remove redundant \_eventListenerMap from ComponentElement to streamline event binding (815f326)
- feat: Update TodoAppCompiled to display newTodo state and enhance event handler binding in runtime (cb0cf04)
- feat: Enhance patchVNode with improved diagnostics and robust reconciliation for VNodes (2ed9610)
- feat: Add handling for clearing DOM children when new children are empty in patchVNode (1c72821)
- feat: Improve patchVNode for enhanced reconciliation of keyed and unkeyed children (106dad2)
- feat: Enhance patchVNode for improved text node handling and robust reconciliation (fac1b96)
- feat: Refactor TodoApp and runtime for improved structure and type safety (09e9149)
- diagnosing race condition with inputs and state (1cb3620)
- IT IS ALMOST THERE (05c80de)
- feat: Add useDataModel helper for two-way data binding in custom elements (75763ec)
- feat: Enhance VNode parsing to support multiple root nodes and improve child reconciliation in patchVNode (9d17519)
- feat: Enhance VNode handling to preserve stylesheet nodes and improve shadow DOM structure (cbfd776)
- feat: Refactor SimpleTest component and enhance reactive state management with computed properties (1130c06)
- trial vdom implementation (d5a986c)
- feat: Improve useDataModel with batched updates and automatic key assignment for data-model elements (fef6772)
- feat: Enhance useDataModel to support modifiers and improve input handling in TodoApp (725e52b)
- feat: Implement useDataModel for two-way data binding in custom elements (3e04e64)
- feat: Update TemplateCompilationDemo to improve state management and template handling (b74195e)
- feat: Enhance ShoppingCart and SimpleTest components with improved state management and event handling (01459b5)
- refactor: Simplify todo addition logic in TodoApp and TodoAppCompiled (7dc5e76)
- refactor: Update advanced patterns section in README for clarity and organization (cdb03fa)
- feat: Implement optimized DOM morphing and SSR rendering (b6bbfbe)
- refactor: Simplify event handler methods in TodoApp and TodoAppCompiled to directly modify state refactor: Update reactive function in computed-state to use Proxy for computed properties and state mutation refactor: Enhance ComponentConfig interface to support Promise return type in template function (d0c636f)
- feat: Add security measures for escaping user-generated content in templates to prevent XSS vulnerabilities (7f7a613)
- feat: Enhance template parsing and rendering to support controlled inputs and escape HTML entities for user-generated content (8bdb658)
- feat: Enhance DOM differ to preserve focus and selection state for input and textarea elements during updates (6eee354)
- feat: Enhance template rendering with support for asynchronous values in html and template compiler (c9da8e5)
- fix: Update README to improve clarity and consistency in feature descriptions (c11cd00)
- feat: Enhance ComponentAPI and ComponentConfig interfaces with new methods and properties for improved state management and event handling (a7b0a5a)
- feat: Update framework comparison in README with detailed feature highlights and strengths of Custom Elements Runtime (613b903)
- feat: Implement automatic event binding for declarative event handling in components (ff46b7b)
- fix: Remove optional chaining from ComponentAPI interface methods for consistency (9ba4c68)
- fix: Correct formatting of optional methods in ComponentAPI interface (4ea7f32)
- feat: Enhance README with detailed comparison and pros/cons of Custom Elements Runtime (3302b0f)
- feat: Update component definitions for improved state management and add error handling support (d797a8e)
- add hot-module replacement support (41078a8)
- feat: Enhance GlobalEventBus with improved handler management and documentation (e550b95)
- re add todo compiled for testing (075af18)
- prevent multiple event attachments (58c6fb5)
- feat: Enhance TodoApp with global event handling and prevent duplicate event subscriptions (144e354)
- BOTH TODOS working (regular and compiled). Logs removed from runtime. (82eca18)
- feat: Rename component to 'todo-app-compiled' and update import in main.ts (d0ba608)
- feat: Update TodoApp and compiled template for improved state handling and debugging (acb6d73)
- feat: Refactor TodoApp and computed state for improved reactivity and performance (b7d334e)
- feat: Enhance TodoApp with computed properties for improved state management and performance (dab91b4)
- add computed and watch to computed-state, copilot instructions update (3644db7)
- feat: Refactor TodoApp state management for improved clarity and performance (d9b2ec8)
- feat: Add front matter to copilot instructions for better metadata handling (b2cdffc)
- feat: Revise README for clarity and conciseness, enhancing getting started and examples sections (fad8068)
- feat: Update documentation to clarify code style guidelines and enhance readability (a2ddb25)
- feat: Refactor components to use cleaner state management and improve reactivity (88dbea0)
- feat: Enhance template compilation with automatic development mode detection and performance metrics tracking (42db721)
- feat: Implement template compilation system for enhanced performance (4a40e86)
- feat: Implement comprehensive Server-Side Rendering (SSR) support (60cbdbb)
- feat: Add Reactive Form component and integrate it into the main application (e2d74f7)
- refactor: Replace Live Typing Demo with Test Live Typing component and update runtime to support HTMLTextAreaElement (c5ae534)
- feat: Add Shopping Cart and Todo App components with state management and UI (1e6cba7)
- remove counter, update main.ts (5a6e366)
- update readme (42c3353)
- refactor: Update component imports and enhance API with auto tag generation and improved event handling (b257666)
- feat: Add initial implementation of Custom Elements Runtime with demo and documentation links (0264232)
- Remove test utilities and add comprehensive documentation and demo for Custom Elements Runtime (07c3823)
- feat: Implement enhanced template features with string interpolation and inline event handlers (8b7c154)
- feat: Enhance runtime with auto tag generation, lifecycle hook shortcuts, and attribute auto-inference (4350636)
- feat: Introduce simplified component creation and smart defaults (33ec495)
- Add support for dark mode in FancyCounter component (f368e43)
- Implement dynamic styling support and add demo components for state-based styling (8d6b1d7)

## [v0.0.1-beta.0] - 2025-08-15

- feat: update author information and add repository details in package.json; create publish workflow for npm (a3ea021)
- feat: rename package to @jasonshimmy/custom-elements-runtime and update version to 0.0.0 (a4f8794)
- fix: Remove redundant newline in README.md for improved formatting (96c9525)
- fix: Correct bundle size and gzipped size for Custom Elements in framework comparison (a2c5d44)
- docs: Update documentation for core concepts, advanced use cases, and API reference; enhance clarity and detail on features and usage (94b0395)
- feat: Export deepSanitizeObject and isPromise functions; add comprehensive tests for runtime functionality (b4f9cc0)
- test: Add comprehensive tests for useDataModel functionality across various input types (db11846)
- feat: Add unit tests for v-dom functions to improve coverage and handle edge cases (3a84bd1)
- feat: Implement VDOM structure and patching mechanism (f2db2d4)
- Add comprehensive tests for template helpers, attribute reflection, computed properties, and runtime features (a001c5a)
- feat: add coverage command to test scripts and update devDependencies (d997dd0)
- test: add regression tests for checkbox state updates in VDOM (207ba89)
- feat: enhance checkbox data binding and event handling in list component (6731d37)
- feat: implement deep sanitization to prevent prototype pollution and deep object injection (dbec40c)
- feat: implement safe deep clone for lastState to handle circular references (3857b02)
- feat: add support for reflecting state properties as attributes in ComponentConfig (2ddbb7f)
- feat: enhance error handling in ComponentElement with improved error boundaries and fallback UI (0880551)
- feat: add error handling for ref handler execution in ComponentElement (cc4ea89)
- feat: rename updateTemplate to setTemplate for clarity in runtime updates (3c58157)
- feat: add setState method to ComponentElement for state updates and re-rendering (bbd7ff5)
- feat: add runtime template update functionality in ComponentElement (0f5f50c)
- feat: implement auto-wired event handler removal on unmount in ComponentElement (acf4d75)
- feat: add error handling for SSR hydration process in component element (1c1205f)
- feat: enhance lifecycle handling with promise support and error management (b245e6a)
- refactor: simplify template logic and improve state handling in docs-content component test: add form state synchronization tests for form-state-demo component (535569f)
- feat: update template dynamically using runtime API in tests (e496bf3)
- add additional tests (17ec7c2)
- Refactor tests and improve structure (7fb026b)
- feat: improve onMounted lifecycle handling with error management and state reset (f9900b2)
- feat: enhance component lifecycle management with error handling and state synchronization (43abc16)
- feat: enhance testing setup and add comprehensive tests for runtime functionality (fa146b7)
- feat: Enhance component API and configuration interfaces with detailed JSDoc comments, improve type safety, and add hydration support (712f610)
- refactor: Move and optimize safeReplaceChild function, enhance VNode structure, and reorganize code for better readability (ea2cf89)
- feat: Enhance documentation and examples for attribute-state reactivity, add new components for navigation and content display (d35d24d)
- Remove outdated SSR and template compilation examples, including server example and test files. Clean up documentation and ensure all components are ready for production deployment. (01b5f8d)
- feat: Add debug mode support for components and enhance logging capabilities (3e401b4)
- feat: Add MinimalExample component with state management and template rendering (9745293)
- feat: Revise documentation for clarity and consistency across README, API reference, core concepts, advanced use cases, and examples (fb8359f)
- Add comprehensive documentation for advanced use cases, API reference, core concepts, examples, framework comparison, and server-side rendering (80443ca)
- feat: Add support for single checkbox with custom true/false values and update documentation for form input bindings (c80abb7)
- feat: Implement safeReplaceChild function to enhance child node replacement logic and improve error handling (7672d42)
- feat: Enhance DataModelDemo component to support multi-checkbox and improve state management (cc504c7)
- feat: Add DataModelDemo component with various input types and state management (72accd1)
- remove debug log. Add textarea to todo app just to check it works. update readme (3d7da9e)
- feat: Refactor example imports and update data binding in SimpleTest and ShoppingCart components (ecfc821)
- feat: Remove redundant \_eventListenerMap from ComponentElement to streamline event binding (815f326)
- feat: Update TodoAppCompiled to display newTodo state and enhance event handler binding in runtime (cb0cf04)
- feat: Enhance patchVNode with improved diagnostics and robust reconciliation for VNodes (2ed9610)
- feat: Add handling for clearing DOM children when new children are empty in patchVNode (1c72821)
- feat: Improve patchVNode for enhanced reconciliation of keyed and unkeyed children (106dad2)
- feat: Enhance patchVNode for improved text node handling and robust reconciliation (fac1b96)
- feat: Refactor TodoApp and runtime for improved structure and type safety (09e9149)
- diagnosing race condition with inputs and state (1cb3620)
- IT IS ALMOST THERE (05c80de)
- feat: Add useDataModel helper for two-way data binding in custom elements (75763ec)
- feat: Enhance VNode parsing to support multiple root nodes and improve child reconciliation in patchVNode (9d17519)
- feat: Enhance VNode handling to preserve stylesheet nodes and improve shadow DOM structure (cbfd776)
- feat: Refactor SimpleTest component and enhance reactive state management with computed properties (1130c06)
- trial vdom implementation (d5a986c)
- feat: Improve useDataModel with batched updates and automatic key assignment for data-model elements (fef6772)
- feat: Enhance useDataModel to support modifiers and improve input handling in TodoApp (725e52b)
- feat: Implement useDataModel for two-way data binding in custom elements (3e04e64)
- feat: Update TemplateCompilationDemo to improve state management and template handling (b74195e)
- feat: Enhance ShoppingCart and SimpleTest components with improved state management and event handling (01459b5)
- refactor: Simplify todo addition logic in TodoApp and TodoAppCompiled (7dc5e76)
- refactor: Update advanced patterns section in README for clarity and organization (cdb03fa)
- feat: Implement optimized DOM morphing and SSR rendering (b6bbfbe)
- refactor: Simplify event handler methods in TodoApp and TodoAppCompiled to directly modify state refactor: Update reactive function in computed-state to use Proxy for computed properties and state mutation refactor: Enhance ComponentConfig interface to support Promise return type in template function (d0c636f)
- feat: Add security measures for escaping user-generated content in templates to prevent XSS vulnerabilities (7f7a613)
- feat: Enhance template parsing and rendering to support controlled inputs and escape HTML entities for user-generated content (8bdb658)
- feat: Enhance DOM differ to preserve focus and selection state for input and textarea elements during updates (6eee354)
- feat: Enhance template rendering with support for asynchronous values in html and template compiler (c9da8e5)
- fix: Update README to improve clarity and consistency in feature descriptions (c11cd00)
- feat: Enhance ComponentAPI and ComponentConfig interfaces with new methods and properties for improved state management and event handling (a7b0a5a)
- feat: Update framework comparison in README with detailed feature highlights and strengths of Custom Elements Runtime (613b903)
- feat: Implement automatic event binding for declarative event handling in components (ff46b7b)
- fix: Remove optional chaining from ComponentAPI interface methods for consistency (9ba4c68)
- fix: Correct formatting of optional methods in ComponentAPI interface (4ea7f32)
- feat: Enhance README with detailed comparison and pros/cons of Custom Elements Runtime (3302b0f)
- feat: Update component definitions for improved state management and add error handling support (d797a8e)
- add hot-module replacement support (41078a8)
- feat: Enhance GlobalEventBus with improved handler management and documentation (e550b95)
- re add todo compiled for testing (075af18)
- prevent multiple event attachments (58c6fb5)
- feat: Enhance TodoApp with global event handling and prevent duplicate event subscriptions (144e354)
- BOTH TODOS working (regular and compiled). Logs removed from runtime. (82eca18)
- feat: Rename component to 'todo-app-compiled' and update import in main.ts (d0ba608)
- feat: Update TodoApp and compiled template for improved state handling and debugging (acb6d73)
- feat: Refactor TodoApp and computed state for improved reactivity and performance (b7d334e)
- feat: Enhance TodoApp with computed properties for improved state management and performance (dab91b4)
- add computed and watch to computed-state, copilot instructions update (3644db7)
- feat: Refactor TodoApp state management for improved clarity and performance (d9b2ec8)
- feat: Add front matter to copilot instructions for better metadata handling (b2cdffc)
- feat: Revise README for clarity and conciseness, enhancing getting started and examples sections (fad8068)
- feat: Update documentation to clarify code style guidelines and enhance readability (a2ddb25)
- feat: Refactor components to use cleaner state management and improve reactivity (88dbea0)
- feat: Enhance template compilation with automatic development mode detection and performance metrics tracking (42db721)
- feat: Implement template compilation system for enhanced performance (4a40e86)
- feat: Implement comprehensive Server-Side Rendering (SSR) support (60cbdbb)
- feat: Add Reactive Form component and integrate it into the main application (e2d74f7)
- refactor: Replace Live Typing Demo with Test Live Typing component and update runtime to support HTMLTextAreaElement (c5ae534)
- feat: Add Shopping Cart and Todo App components with state management and UI (1e6cba7)
- remove counter, update main.ts (5a6e366)
- update readme (42c3353)
- refactor: Update component imports and enhance API with auto tag generation and improved event handling (b257666)
- feat: Add initial implementation of Custom Elements Runtime with demo and documentation links (0264232)
- Remove test utilities and add comprehensive documentation and demo for Custom Elements Runtime (07c3823)
- feat: Implement enhanced template features with string interpolation and inline event handlers (8b7c154)
- feat: Enhance runtime with auto tag generation, lifecycle hook shortcuts, and attribute auto-inference (4350636)
- feat: Introduce simplified component creation and smart defaults (33ec495)
- Add support for dark mode in FancyCounter component (f368e43)
- Implement dynamic styling support and add demo components for state-based styling (8d6b1d7)
