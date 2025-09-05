export function toKebab(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

export function escapeHTML(str: string | number | boolean): string | number | boolean {
  if (typeof str === "string") {
    return str.replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c]!,
    );
  }
  return str;
}

/**
 * Get nested property value from object using dot notation
 */
export function getNestedValue(obj: any, path: string): any {
  if (typeof path === "string") {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }
  return path;
}

/**
 * Set nested property value in object using dot notation
 */
export function setNestedValue(obj: any, path: string, value: any): void {
  const keys = String(path).split(".");
  const lastKey = keys.pop();
  if (!lastKey) return;
  const target = keys.reduce((current: any, key: string) => {
    if (current[key] == null) current[key] = {};
    return current[key];
  }, obj);
  target[lastKey] = value;
}
