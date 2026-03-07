# 🩺 Health Monitor

> Track runtime performance metrics and receive periodic health reports for your custom elements application.

## 📖 Overview

The health monitor provides a lightweight, observable system for tracking key runtime metrics — render times, memory usage, component counts, update queue depth, and JIT CSS cache performance. It runs entirely in-process with no external dependencies and can be used for:

- **Performance dashboards** — surface live metrics in a dev overlay or admin panel
- **Alerting** — trigger warnings when render times spike above thresholds
- **Production observability** — capture periodic snapshots to send to your metrics backend

## 🚀 Importing

```ts
import {
  createHealthMonitor,
  getHealthMonitor,
  updateHealthMetric,
  getHealthStatus,
} from '@jasonshimmy/custom-elements-runtime';

// Types (TypeScript only)
import type {
  HealthMonitorInstance,
  HealthReport,
} from '@jasonshimmy/custom-elements-runtime';
```

## 🔧 Quick Start

```ts
import {
  createHealthMonitor,
  updateHealthMetric,
} from '@jasonshimmy/custom-elements-runtime';

// Create a monitor instance
const monitor = createHealthMonitor();

// Listen for periodic health reports (runs every 30 seconds)
monitor.addListener((report) => {
  console.log('Health status:', report.overall);
  for (const [name, metric] of Object.entries(report.metrics)) {
    if (metric.status !== 'healthy') {
      console.warn(`⚠️ ${name}: ${metric.value} (${metric.status})`);
    }
  }
});

// Push your own metrics into the monitor
updateHealthMetric('averageRenderTime', 12); // ms

// Get the current report on demand
const report = monitor.getHealthReport();
console.log(report.overall); // 'healthy' | 'warning' | 'critical'

// Stop the periodic timer when done (e.g., on app teardown)
monitor.stop();
```

## 📐 API Reference

### `createHealthMonitor(): HealthMonitorInstance`

Creates a new health monitor instance with its own independent state and timer chain. The monitor starts automatically and fires its listeners every 30 seconds.

```ts
const monitor = createHealthMonitor();
```

---

### `getHealthMonitor(): HealthMonitorInstance`

Returns the lazily-instantiated **global singleton** monitor. All calls after the first return the same instance. Use this in production code to share one monitor across the application.

```ts
const monitor = getHealthMonitor();
```

---

### `updateHealthMetric(name: string, value: number): void`

Convenience function that updates a named metric on the global singleton monitor. Equivalent to `getHealthMonitor().updateMetric(name, value)`.

```ts
// Typically called from your render cycle
updateHealthMetric('averageRenderTime', renderDurationMs);
updateHealthMetric('activeComponents', registeredComponentCount);
```

---

### `getHealthStatus(): HealthReport`

Convenience function that returns the current health report from the global singleton monitor. Equivalent to `getHealthMonitor().getHealthReport()`.

```ts
const report = getHealthStatus();
if (report.overall !== 'healthy') {
  alert('Performance degraded!');
}
```

---

## 🩺 `HealthMonitorInstance` Interface

| Method             | Signature                                            | Description                                                     |
| ------------------ | ---------------------------------------------------- | --------------------------------------------------------------- |
| `updateMetric`     | `(name: string, value: number) => void`              | Set the current value for a named metric                        |
| `getHealthReport`  | `() => HealthReport`                                 | Return the current health report                                |
| `addListener`      | `(listener: (report: HealthReport) => void) => void` | Subscribe to periodic health reports                            |
| `removeListener`   | `(listener: (report: HealthReport) => void) => void` | Unsubscribe a previously registered listener                    |
| `stop`             | `() => void`                                         | Halt the periodic timer (idempotent)                            |
| `getMetricHistory` | `(name: string) => number[]`                         | Retrieve historical values for a metric (capped at 100 entries) |
| `clearHistory`     | `() => void`                                         | Reset all metric history                                        |

---

## 📋 `HealthReport` Type

```ts
interface HealthReport {
  overall: 'healthy' | 'warning' | 'critical';
  metrics: Record<string, HealthMetric>;
  recommendations: string[];
  timestamp: number;
}

interface HealthMetric {
  name: string;
  value: number;
  threshold: number;
  status: 'healthy' | 'warning' | 'critical';
  lastUpdated: number;
  history: number[];
}
```

---

## 📊 Built-in Metrics

The monitor evaluates the following metrics against thresholds to determine status:

| Metric name            | Threshold      | Status logic                                 |
| ---------------------- | -------------- | -------------------------------------------- |
| `activeComponents`     | 1000           | > 1000 = warning, > 2000 = critical          |
| `componentCreateRate`  | 50 / sec       | > 50 = warning, > 100 = critical             |
| `componentErrorRate`   | 0.1 (10%)      | > 10% = warning, > 25% = critical            |
| `memoryUsage`          | 50 MB (bytes)  | > 50 MB = warning, > 100 MB = critical       |
| `memoryGrowthRate`     | 1 MB / sample  | > 1 MB = warning, > 2 MB = critical          |
| `averageRenderTime`    | 16 ms          | > 16ms = warning, > 32ms = critical          |
| `slowRenderCount`      | 10             | > 10 = warning, > 20 = critical              |
| `jitCacheHitRate`      | 80 (0–100 int) | < 80 = warning, < 40 = critical _(inverted)_ |
| `activeReactiveStates` | 5000           | > 5000 = warning, > 10000 = critical         |
| `dependencyUpdates`    | 100            | > 100 = warning, > 200 = critical            |
| `memoryLeakIndicator`  | 0.1            | > 0.1 = warning, > 0.5 = critical            |

> **Inverted threshold:** `jitCacheHitRate` uses a _lower-is-worse_ scale (integer 0–100). All other metrics use a _higher-is-worse_ scale.

---

## 💡 Patterns

### Dev-Mode Performance Overlay

```ts
component('perf-hud', () => {
  const report = ref<HealthReport | null>(null);

  useOnConnected(() => {
    const monitor = getHealthMonitor();
    const onReport = (r: HealthReport) => {
      report.value = r;
    };
    monitor.addListener(onReport);
    useOnDisconnected(() => monitor.removeListener(onReport));
  });

  return html`
    ${when(
      report.value !== null,
      () => html`
        <div
          class="fixed bottom-4 right-4 bg-neutral-900 text-white rounded-lg p-4 text-sm font-mono"
        >
          <p class="font-bold mb-1">Runtime Health: ${report.value!.overall}</p>
          <p>
            Render:
            ${report.value!.metrics.averageRenderTime?.value?.toFixed(1) ?? '—'}
            ms
          </p>
          <p>
            Components: ${report.value!.metrics.activeComponents?.value ?? '—'}
          </p>
        </div>
      `,
    )}
  `;
});
```

### Sending Metrics to a Backend

```ts
import { getHealthMonitor } from '@jasonshimmy/custom-elements-runtime';

const monitor = getHealthMonitor();

monitor.addListener(async (report) => {
  await fetch('/api/metrics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ts: report.timestamp,
      overall: report.overall,
      metrics: report.metrics,
    }),
  });
});
```

### Tracking Render Time

```ts
component('expensive-list', () => {
  const items = ref<string[]>([]);

  watch(
    () => items.value,
    () => {
      const t0 = performance.now();
      // ... rendering happens synchronously then...
      await nextTick();
      updateHealthMetric('averageRenderTime', performance.now() - t0);
    },
  );

  return html`...`;
});
```
