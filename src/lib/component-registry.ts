// Component Registry for better component management and discoverability
import type { ReactiveComponentOptions } from './runtime.js';
import { createReactiveComponent } from './runtime.js';

export interface ComponentDefinition<TState extends object = any> {
  tag: string;
  name?: string;
  description?: string;
  version?: string;
  dependencies?: string[];
  // Include all the options from ReactiveComponentOptions
  template: ReactiveComponentOptions<TState>['template'];
  style?: ReactiveComponentOptions<TState>['style'];
  state: ReactiveComponentOptions<TState>['state'];
  attrs?: ReactiveComponentOptions<TState>['attrs'];
  events?: ReactiveComponentOptions<TState>['events'];
  refs?: ReactiveComponentOptions<TState>['refs'];
  hooks?: ReactiveComponentOptions<TState>['hooks'];
  disposables?: ReactiveComponentOptions<TState>['disposables'];
  watch?: ReactiveComponentOptions<TState>['watch'];
  computed?: ReactiveComponentOptions<TState>['computed'];
  reflectAttributes?: ReactiveComponentOptions<TState>['reflectAttributes'];
  debug?: ReactiveComponentOptions<TState>['debug'];
}

export class ComponentRegistry {
  private static components = new Map<string, ComponentDefinition>();
  private static instances = new WeakMap<HTMLElement, ComponentDefinition>();

  /**
   * Register a component with the registry
   */
  static register<TState extends object>(definition: ComponentDefinition<TState>) {
    const { tag, name = tag, description, version, dependencies, ...options } = definition;
    
    if (this.components.has(tag)) {
      console.warn(`Component "${tag}" is already registered. Overwriting...`);
    }

    const componentDef = { tag, name, description, version, dependencies, ...options };
    this.components.set(tag, componentDef);

    // Create and define the custom element
    const ComponentClass = createReactiveComponent({ tag, ...options });
    
    // Track instances for debugging
    const originalConstructor = ComponentClass;
    const TrackedComponentClass = class extends originalConstructor {
      constructor() {
        super();
        ComponentRegistry.instances.set(this, componentDef);
      }
    };

    return TrackedComponentClass;
  }

  /**
   * Get component definition by tag
   */
  static get(tag: string): ComponentDefinition | undefined {
    return this.components.get(tag);
  }

  /**
   * List all registered components
   */
  static list(): Array<{ tag: string; name: string; description?: string }> {
    return Array.from(this.components.entries()).map(([tag, def]) => ({
      tag,
      name: def.name || tag,
      description: def.description
    }));
  }

  /**
   * Check if a component is registered
   */
  static has(tag: string): boolean {
    return this.components.has(tag);
  }

  /**
   * Unregister a component (useful for hot reloading)
   */
  static unregister(tag: string): boolean {
    return this.components.delete(tag);
  }

  /**
   * Get component info from an element instance
   */
  static getComponentInfo(element: HTMLElement): ComponentDefinition | undefined {
    return this.instances.get(element);
  }

  /**
   * Create a component instance programmatically
   */
  static create<T extends HTMLElement = HTMLElement>(
    tag: string, 
    attributes?: Record<string, any>
  ): T | null {
    const element = document.createElement(tag) as T;
    
    if (attributes) {
      Object.entries(attributes).forEach(([key, value]) => {
        if (typeof value === 'string') {
          element.setAttribute(key, value);
        } else {
          (element as any)[key] = value;
        }
      });
    }

    return element;
  }

  /**
   * Export component definitions (useful for documentation)
   */
  static export(): Record<string, ComponentDefinition> {
    return Object.fromEntries(this.components);
  }

  /**
   * Import component definitions
   */
  static import(definitions: Record<string, ComponentDefinition>): void {
    Object.entries(definitions).forEach(([tag, definition]) => {
      this.register({ ...definition, tag });
    });
  }

  /**
   * Development helper: get all component instances in the DOM
   */
  static findInstances(tag?: string): HTMLElement[] {
    const selector = tag || Array.from(this.components.keys()).join(',');
    return Array.from(document.querySelectorAll(selector));
  }

  /**
   * Development helper: validate all components in the DOM
   */
  static validate(): Array<{ element: HTMLElement; issues: string[] }> {
    const issues: Array<{ element: HTMLElement; issues: string[] }> = [];
    
    this.findInstances().forEach(element => {
      const elementIssues: string[] = [];
      const tagName = element.tagName.toLowerCase();
      const definition = this.get(tagName);
      
      if (!definition) {
        elementIssues.push(`Component "${tagName}" is not registered`);
        return;
      }

      // Check required attributes
      if (definition.attrs) {
        Object.entries(definition.attrs).forEach(([attr, schema]) => {
          if (schema.type && !element.hasAttribute(attr)) {
            // Check if it has a default value in state
            const hasDefault = definition.state && 
              Object.prototype.hasOwnProperty.call(definition.state, attr);
            
            if (!hasDefault) {
              elementIssues.push(`Missing required attribute: ${attr}`);
            }
          }
        });
      }

      if (elementIssues.length > 0) {
        issues.push({ element, issues: elementIssues });
      }
    });

    return issues;
  }

  /**
   * Clear all registrations (useful for testing)
   */
  static clear(): void {
    this.components.clear();
  }
}

// Export convenience function
export const register = ComponentRegistry.register.bind(ComponentRegistry);
export const create = ComponentRegistry.create.bind(ComponentRegistry);
export const list = ComponentRegistry.list.bind(ComponentRegistry);
