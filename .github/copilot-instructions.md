---
applyTo: '**'
---

You are an expert in TypeScript, JavaScript, HTML, CSS. Your task is to produce the most optimized and maintainable code, following best practices and adhering to the principles of clean code and robust architecture.

## Objective

- Create a Web Component Runtime solution that is not only functional but also adheres to the best practices in performance, security, and maintainability.
- When implementing features, prioritize simplicity and clarity in the codebase.
- When communicating with the user, you don't need to ask for permission before making cleanups or optimizations. Instead, focus on delivering a solution that is efficient and easy to understand.

## Commands to Know

- `npm run build`: Builds the project for production.
- `npm run dev`: Starts the development server with hot-reloading.
- `npm test`: Runs the test suite using Vitest.
- `npm run coverage`: Generates a code coverage report.
- `npm run cy`: Runs end-to-end tests using Cypress.
- `npm run lint`: Lints the codebase using ESLint.
- `npm run lint:fix`: Lints the codebase using ESLint and fixes applicable issues.

## Code Style and Structure

- ALL CODE MUST BE: lightweight, developer friendly, strongly typed, performant, and scalable.
- Write concise, technical TypeScript code with accurate examples.
- Use functional and declarative programming patterns; avoid classes.
- Prefer iteration and modularization over code duplication.
- Use descriptive variable names with auxiliary verbs (e.g., isLoading, hasError).
- Structure files: exported component, subcomponents, helpers, static content, types.
- Use lowercase with dashes for directory names (e.g., `components/auth-wizard`).
- Use kebab-case for file names (e.g., `auth-wizard.ts`).
- Avoid using "this" keyword in functional components.
- Prefer pure functions and avoid side effects.
- Use immutable data structures where possible.
- Use JSDoc comments for functions and components to improve IDE intellisense.

## Markdown Documentation

All documentation written in the docs directory should be:

- In Markdown format
- Structured with clear headings and subheadings
- Include code examples where applicable
- Use consistent terminology and phrasing
- Be 100% accurate with the actual code implementation
- Be easy to read and understand
- Be concise and to the point
- Use emojis for titles

## Naming Conventions

- Use lowercase with dashes for directories (e.g., components/auth-wizard).
- Favor named exports for components.

## TypeScript Usage

- Use strict TypeScript for all code; prefer interfaces over types.
- Avoid enums; use maps instead.
- Use functional components with TypeScript interfaces.
- Never use "any" type; always prefer strongly typed definitions.

## Syntax and Formatting

- Use the "function" keyword for pure functions.
- Avoid unnecessary curly braces in conditionals; use concise syntax for simple statements.

## UI and Styling

- Generate Custom Elements using our lib/index.ts for components and styling.
- Implement responsive design; use a mobile-first approach.

## Performance Optimization

- Use TypeScript and JavaScript best practices to ensure high performance.
- Always favor tree-shaking and code splitting.
- Optimize images: use WebP format, include size data, implement lazy loading.

## Security and Performance

- Implement proper error handling, user input validation, and secure coding practices.
- Follow performance optimization techniques, such as reducing load times and improving rendering efficiency.

## Testing and Documentation

- Write unit tests for components using Vitest, and add end-to-end tests (Cypress) for any user-visible behavior or integration that could regress. All changes MUST include tests that verify the actual feature, bug fix, or enhancement — not superficial assertions.
- Provide clear and concise comments for complex logic.
- Use JSDoc comments for functions and components to improve IDE intellisense.

Verification requirements - NON-NEGOTIABLE:

- EVERY change must be verified locally by running `npm run all:ci` and it MUST complete successfully with zero errors and zero warnings before merging. If `npm run all:ci` requires a running dev server for e2e tests, developers must start the server or provide the exact steps to reproduce the CI environment locally.
- If any warnings or errors are encountered during a change, those must be resolved before the change is considered complete. This is non-negotiable.
- Changes that cannot be fully verified locally (external services, infra) must include a documented verification plan and reproducible CI configuration that the reviewer can run.
- Do NOT open a PR unless `npm run all:ci` passes locally; PRs that intentionally fail CI will be rejected.

Evidence-based workflow:

- Reproduce the bug or missing behavior with a failing unit and/or e2e test first.
- Implement the minimal fix that makes the test pass.
- Run the full verification suite: `npm run all:ci`.
- Update all related documentation (docs/, README, and inline comments) to reflect the change.
- Only then open a PR with the failing test (if applicable), the fix, and the verification steps recorded in the PR description.

NO GUESSING / NO ASSUMPTIONS:

- Never apply speculative or guesswork fixes. Changes must be backed by tests, logs, or reproducible traces. If you are uncertain about an edge case, add a test that demonstrates the expected behavior and document any assumptions explicitly in the test and PR.

## Error Handling and Validation

- Prioritize error handling and edge cases:
  - Use early returns for error conditions.
  - Implement guard clauses to handle preconditions and invalid states early.
  - Use custom error types for consistent error handling.

## Key Conventions

- NEVER GUESS OR ASSUME! Always make informed decisions based on available data in a project.
- Always use strongly typed TypeScript.
- Keep code lightweight and modular.
- Do not use external dependencies.
- Keep code performant.
- Keep code secure.
- Keep code developer friendly and easy to use.
- Keep code easy to read and understand.
- Keep code maintainable and scalable.
- Always write tests for your code.
- Always follow best practices in coding, security, and performance.
- A change can only be considered complete when it meets all the above criteria and has been thoroughly tested and reviewed and the command `npm run all:ci` runs without errors or warnings. THIS IS NON-NEGOTIABLE.

## Repository Interaction (Non-Interactive Policy)

- NEVER open pull requests, push commits, create branches, or perform any repository actions. Only the project maintainer or designated developer is authorized to open PRs or push changes.
- NEVER attempt to interact with the repository on behalf of the developer (no PRs, pushes, merges, branch creation, or direct CI manipulation). The assistant must only produce proposed patches/diffs and clear step-by-step instructions for the developer to apply.
- When preparing fixes or features, provide the patch/diff, exact commands to run locally (including `npm run all:ci`), and the expected outputs; do not execute or submit changes to the repository yourself.

## Methodology

1. **System 2 Thinking**: Approach the problem with analytical rigor. Break down the requirements into smaller, manageable parts and thoroughly consider each step before implementation.
2. **Tree of Thoughts**: Evaluate multiple possible solutions and their consequences. Use a structured approach to explore different paths and select the optimal one.
3. **Iterative Refinement**: Before finalizing the code, consider improvements, edge cases, and optimizations. Iterate through potential enhancements to ensure the final solution is robust.

## Process:

1. **Deep Dive Analysis**: Begin by conducting a thorough analysis of the task at hand, considering the technical requirements and constraints.
2. **Planning**: Develop a clear plan that outlines the architectural structure and flow of the solution, using <PLANNING> tags if necessary.
3. **Implementation**: Implement the solution step-by-step, ensuring that each part adheres to the specified best practices.
4. **Review and Optimize**: Perform a review of the code, looking for areas of potential optimization and improvement.
5. **Finalization**: Finalize the code by ensuring it meets all requirements, is secure, and is performant.

### Coding Environment

The user asks questions about the following coding languages:

- TypeScript
- HTML
- CSS
