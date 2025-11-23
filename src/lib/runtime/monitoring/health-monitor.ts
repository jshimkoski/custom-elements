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

export class HealthMonitor {
  private metrics = new Map<string, HealthMetric>();
  private readonly maxHistorySize = 100;
  private readonly checkInterval = 30000; // 30 seconds
  private intervalId: number | null = null;
  private listeners = new Set<(report: HealthReport) => void>();

  constructor() {
    this.initializeMetrics();
    this.startMonitoring();
  }

  /**
   * Initialize default health metrics
   */
  private initializeMetrics(): void {
    // Component metrics
    this.addMetric('activeComponents', 0, 1000, []);
    this.addMetric('componentCreateRate', 0, 50, []); // Components per second
    this.addMetric('componentErrorRate', 0, 0.1, []); // Error rate percentage

    // Memory metrics
    this.addMetric('memoryUsage', 0, 50 * 1024 * 1024, []); // 50MB threshold
    this.addMetric('memoryGrowthRate', 0, 1024 * 1024, []); // 1MB/check threshold

    // Performance metrics
    this.addMetric('averageRenderTime', 0, 16, []); // 16ms for 60fps
    this.addMetric('slowRenderCount', 0, 10, []); // Renders >16ms per check
    this.addMetric('jitCacheHitRate', 100, 80, []); // Cache hit rate percentage

    // Reactive system metrics
    this.addMetric('activeReactiveStates', 0, 5000, []);
    this.addMetric('dependencyUpdates', 0, 100, []); // Updates per check
    this.addMetric('memoryLeakIndicator', 0, 0.1, []); // Growth without cleanup
  }

  /**
   * Add a new health metric
   */
  private addMetric(
    name: string,
    value: number,
    threshold: number,
    history: number[],
  ): void {
    this.metrics.set(name, {
      name,
      value,
      threshold,
      status: 'healthy',
      lastUpdated: Date.now(),
      history: [...history],
    });
  }

  /**
   * Update a specific health metric
   */
  updateMetric(name: string, value: number): void {
    const metric = this.metrics.get(name);
    if (!metric) return;

    metric.value = value;
    metric.lastUpdated = Date.now();

    // Update history
    metric.history.push(value);
    if (metric.history.length > this.maxHistorySize) {
      metric.history.shift();
    }

    // Update status based on threshold
    metric.status = this.calculateStatus(value, metric.threshold, name);
  }

  /**
   * Calculate health status based on value and threshold
   */
  private calculateStatus(
    value: number,
    threshold: number,
    metricName: string,
  ): 'healthy' | 'warning' | 'critical' {
    // Special handling for different metric types
    if (metricName === 'jitCacheHitRate') {
      // Lower is worse for cache hit rate
      if (value < threshold * 0.5) return 'critical';
      if (value < threshold) return 'warning';
      return 'healthy';
    }

    // Default: higher is worse
    if (value > threshold * 2) return 'critical';
    if (value > threshold) return 'warning';
    return 'healthy';
  }

  /**
   * Get current health report
   */
  getHealthReport(): HealthReport {
    const metrics: Record<string, HealthMetric> = {};
    let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Collect all metrics
    for (const [name, metric] of this.metrics) {
      metrics[name] = { ...metric };

      // Determine overall status (worst metric wins)
      if (metric.status === 'critical') {
        overallStatus = 'critical';
      } else if (metric.status === 'warning' && overallStatus === 'healthy') {
        overallStatus = 'warning';
      }
    }

    const recommendations = this.generateRecommendations(metrics);

    return {
      overall: overallStatus,
      metrics,
      timestamp: Date.now(),
      recommendations,
    };
  }

  /**
   * Generate actionable recommendations based on metrics
   */
  private generateRecommendations(
    metrics: Record<string, HealthMetric>,
  ): string[] {
    const recommendations: string[] = [];

    if (metrics.memoryUsage?.status !== 'healthy') {
      recommendations.push(
        'Consider reducing component complexity or implementing better memory cleanup',
      );
    }

    if (metrics.averageRenderTime?.status !== 'healthy') {
      recommendations.push(
        'Optimize component render functions - consider lazy loading or virtualization',
      );
    }

    if (metrics.jitCacheHitRate?.status !== 'healthy') {
      recommendations.push(
        'JIT CSS cache performance is poor - review CSS patterns for optimization',
      );
    }

    if (metrics.componentErrorRate?.status !== 'healthy') {
      recommendations.push(
        'High component error rate detected - review error handling and component logic',
      );
    }

    if (metrics.activeReactiveStates?.status !== 'healthy') {
      recommendations.push(
        'High number of reactive states - consider state consolidation or cleanup',
      );
    }

    if (metrics.memoryLeakIndicator?.status !== 'healthy') {
      recommendations.push(
        'Potential memory leak detected - review component cleanup and event listener management',
      );
    }

    return recommendations;
  }

  /**
   * Start periodic health monitoring
   */
  private startMonitoring(): void {
    if (typeof window === 'undefined') return; // Skip in SSR

    this.intervalId = window.setInterval(() => {
      this.performHealthCheck();
    }, this.checkInterval);
  }

  /**
   * Perform comprehensive health check
   */
  private performHealthCheck(): void {
    // Update memory metrics
    this.updateMemoryMetrics();

    // Generate and emit health report
    const report = this.getHealthReport();
    this.notifyListeners(report);

    // Log critical issues
    if (report.overall === 'critical') {
      devError(
        '🚨 Runtime Health: Critical issues detected',
        report.recommendations,
      );
    } else if (report.overall === 'warning') {
      devWarn(
        '⚠️ Runtime Health: Performance warnings',
        report.recommendations,
      );
    }
  }

  /**
   * Update memory-related metrics
   */
  private updateMemoryMetrics(): void {
    if (
      'memory' in performance &&
      (performance as Record<string, unknown>).memory
    ) {
      const memory = (performance as Record<string, unknown>).memory as {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
      };
      this.updateMetric('memoryUsage', memory.usedJSHeapSize);

      // Calculate memory growth rate
      const memoryMetric = this.metrics.get('memoryUsage');
      if (memoryMetric && memoryMetric.history.length > 1) {
        const previous = memoryMetric.history[memoryMetric.history.length - 2];
        const current = memoryMetric.history[memoryMetric.history.length - 1];
        const growthRate = current - previous;
        this.updateMetric('memoryGrowthRate', Math.max(0, growthRate));
      }
    }
  }

  /**
   * Add health report listener
   */
  addListener(listener: (report: HealthReport) => void): void {
    this.listeners.add(listener);
  }

  /**
   * Remove health report listener
   */
  removeListener(listener: (report: HealthReport) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of health report
   */
  private notifyListeners(report: HealthReport): void {
    for (const listener of this.listeners) {
      try {
        listener(report);
      } catch (error) {
        devError('Error in health monitor listener:', error);
      }
    }
  }

  /**
   * Stop health monitoring
   */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Get specific metric history for analysis
   */
  getMetricHistory(name: string): number[] {
    const metric = this.metrics.get(name);
    return metric ? [...metric.history] : [];
  }

  /**
   * Clear all metrics history
   */
  clearHistory(): void {
    for (const metric of this.metrics.values()) {
      metric.history = [];
    }
  }
}

// Global health monitor instance
let healthMonitor: HealthMonitor | null = null;

/**
 * Get the global health monitor instance
 */
export function getHealthMonitor(): HealthMonitor {
  if (!healthMonitor) {
    healthMonitor = new HealthMonitor();
  }
  return healthMonitor;
}

/**
 * Update a health metric from anywhere in the framework
 */
export function updateHealthMetric(name: string, value: number): void {
  getHealthMonitor().updateMetric(name, value);
}

/**
 * Get current health status
 */
export function getHealthStatus(): HealthReport {
  return getHealthMonitor().getHealthReport();
}
