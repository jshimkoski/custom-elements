/**
 * Runtime Health Monitoring System
 * Tracks framework health metrics and provides early warning for potential issues
 */

import { devWarn, devError } from '../logger';

interface HealthMetric {
  name: string;
  value: number;
  threshold: number;
  status: 'healthy' | 'warning' | 'critical';
  lastUpdated: number;
  history: number[];
}

interface HealthReport {
  overall: 'healthy' | 'warning' | 'critical';
  metrics: Record<string, HealthMetric>;
  timestamp: number;
  recommendations: string[];
}
export type { HealthReport };

/**
 * Public interface for a health monitor instance.
 * All state is managed internally via closures — no class syntax.
 */
export interface HealthMonitorInstance {
  /** Update a specific health metric value */
  updateMetric(name: string, value: number): void;
  /** Get the current health report */
  getHealthReport(): HealthReport;
  /** Add a listener to be notified when a health check runs */
  addListener(listener: (report: HealthReport) => void): void;
  /** Remove a previously registered listener */
  removeListener(listener: (report: HealthReport) => void): void;
  /** Stop the periodic health monitoring timer */
  stop(): void;
  /** Get historical values for a specific metric */
  getMetricHistory(name: string): number[];
  /** Clear all metric history */
  clearHistory(): void;
}

const MAX_HISTORY_SIZE = 100;
const CHECK_INTERVAL = 30_000; // 30 seconds

function calcStatus(
  value: number,
  threshold: number,
  metricName: string,
): 'healthy' | 'warning' | 'critical' {
  if (metricName === 'jitCacheHitRate') {
    if (value < threshold * 0.5) return 'critical';
    if (value < threshold) return 'warning';
    return 'healthy';
  }
  if (value > threshold * 2) return 'critical';
  if (value > threshold) return 'warning';
  return 'healthy';
}

function buildRecommendations(metrics: Record<string, HealthMetric>): string[] {
  const out: string[] = [];
  if (metrics.memoryUsage?.status !== 'healthy')
    out.push(
      'Consider reducing component complexity or implementing better memory cleanup',
    );
  if (metrics.averageRenderTime?.status !== 'healthy')
    out.push(
      'Optimize component render functions - consider lazy loading or virtualization',
    );
  if (metrics.jitCacheHitRate?.status !== 'healthy')
    out.push(
      'JIT CSS cache performance is poor - review CSS patterns for optimization',
    );
  if (metrics.componentErrorRate?.status !== 'healthy')
    out.push(
      'High component error rate detected - review error handling and component logic',
    );
  if (metrics.activeReactiveStates?.status !== 'healthy')
    out.push(
      'High number of reactive states - consider state consolidation or cleanup',
    );
  if (metrics.memoryLeakIndicator?.status !== 'healthy')
    out.push(
      'Potential memory leak detected - review component cleanup and event listener management',
    );
  return out;
}

/**
 * Create a new health monitor instance.
 * All mutable state lives in closures — no `class` or `this`.
 */
export function createHealthMonitor(): HealthMonitorInstance {
  const metricsMap = new Map<string, HealthMetric>();
  const listeners = new Set<(report: HealthReport) => void>();
  let intervalId: ReturnType<typeof setInterval> | null = null;

  function addMetric(name: string, value: number, threshold: number): void {
    metricsMap.set(name, {
      name,
      value,
      threshold,
      status: 'healthy',
      lastUpdated: Date.now(),
      history: [],
    });
  }

  function initializeMetrics(): void {
    addMetric('activeComponents', 0, 1000);
    addMetric('componentCreateRate', 0, 50);
    addMetric('componentErrorRate', 0, 0.1);
    addMetric('memoryUsage', 0, 50 * 1024 * 1024);
    addMetric('memoryGrowthRate', 0, 1024 * 1024);
    addMetric('averageRenderTime', 0, 16);
    addMetric('slowRenderCount', 0, 10);
    addMetric('jitCacheHitRate', 100, 80);
    addMetric('activeReactiveStates', 0, 5000);
    addMetric('dependencyUpdates', 0, 100);
    addMetric('memoryLeakIndicator', 0, 0.1);
  }

  function updateMetric(name: string, value: number): void {
    const metric = metricsMap.get(name);
    if (!metric) return;
    metric.value = value;
    metric.lastUpdated = Date.now();
    metric.history.push(value);
    if (metric.history.length > MAX_HISTORY_SIZE) metric.history.shift();
    metric.status = calcStatus(value, metric.threshold, name);
  }

  function getHealthReport(): HealthReport {
    const snapshot: Record<string, HealthMetric> = {};
    let overall: 'healthy' | 'warning' | 'critical' = 'healthy';
    for (const [name, metric] of metricsMap) {
      snapshot[name] = { ...metric };
      if (metric.status === 'critical') overall = 'critical';
      else if (metric.status === 'warning' && overall === 'healthy')
        overall = 'warning';
    }
    return {
      overall,
      metrics: snapshot,
      timestamp: Date.now(),
      recommendations: buildRecommendations(snapshot),
    };
  }

  function updateMemoryMetrics(): void {
    if (
      'memory' in performance &&
      (performance as Record<string, unknown>).memory
    ) {
      const mem = (performance as Record<string, unknown>).memory as {
        usedJSHeapSize: number;
      };
      updateMetric('memoryUsage', mem.usedJSHeapSize);
      const m = metricsMap.get('memoryUsage');
      if (m && m.history.length > 1) {
        const prev = m.history[m.history.length - 2];
        const curr = m.history[m.history.length - 1];
        updateMetric('memoryGrowthRate', Math.max(0, curr - prev));
      }
    }
  }

  function notifyListeners(report: HealthReport): void {
    for (const listener of listeners) {
      try {
        listener(report);
      } catch (e) {
        devError('Error in health monitor listener:', e);
      }
    }
  }

  function performHealthCheck(): void {
    updateMemoryMetrics();
    const report = getHealthReport();
    notifyListeners(report);
    if (report.overall === 'critical')
      devError(
        '🚨 Runtime Health: Critical issues detected',
        report.recommendations,
      );
    else if (report.overall === 'warning')
      devWarn(
        '⚠️ Runtime Health: Performance warnings',
        report.recommendations,
      );
  }

  function startMonitoring(): void {
    if (typeof window === 'undefined') return;
    intervalId = setInterval(performHealthCheck, CHECK_INTERVAL);
  }

  function stop(): void {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function addListener(listener: (report: HealthReport) => void): void {
    listeners.add(listener);
  }
  function removeListener(listener: (report: HealthReport) => void): void {
    listeners.delete(listener);
  }
  function getMetricHistory(name: string): number[] {
    const m = metricsMap.get(name);
    return m ? [...m.history] : [];
  }
  function clearHistory(): void {
    for (const m of metricsMap.values()) m.history = [];
  }

  initializeMetrics();
  startMonitoring();

  return {
    updateMetric,
    getHealthReport,
    addListener,
    removeListener,
    stop,
    getMetricHistory,
    clearHistory,
  };
}

// Global singleton
let _monitor: HealthMonitorInstance | null = null;

/**
 * Get the global health monitor singleton instance.
 */
export function getHealthMonitor(): HealthMonitorInstance {
  if (!_monitor) _monitor = createHealthMonitor();
  return _monitor;
}

/**
 * Update a health metric from anywhere in the framework.
 */
export function updateHealthMetric(name: string, value: number): void {
  getHealthMonitor().updateMetric(name, value);
}

/**
 * Get the current health status report.
 */
export function getHealthStatus(): HealthReport {
  return getHealthMonitor().getHealthReport();
}
