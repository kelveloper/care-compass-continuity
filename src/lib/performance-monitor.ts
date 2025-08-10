/**
 * Performance monitoring utilities for tracking load times and user interactions
 * Helps ensure sub-3-second load times for all major interactions
 */

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

interface LoadTimeMetrics {
  initialLoad: number;
  dashboardLoad: number;
  patientDetailLoad: number;
  providerMatchLoad: number;
  searchResponse: number;
  filterResponse: number;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private loadTimeTargets: LoadTimeMetrics = {
    initialLoad: 2000,      // 2 seconds for initial app load
    dashboardLoad: 1500,    // 1.5 seconds for dashboard data load
    patientDetailLoad: 1000, // 1 second for patient detail load
    providerMatchLoad: 2000, // 2 seconds for provider matching
    searchResponse: 500,     // 500ms for search response
    filterResponse: 300,     // 300ms for filter response
  };

  /**
   * Start timing a performance metric
   */
  startTiming(name: string, metadata?: Record<string, any>): void {
    const startTime = performance.now();
    this.metrics.set(name, {
      name,
      startTime,
      metadata,
    });
    
    console.log(`⏱️ Performance: Started timing "${name}"`, metadata);
  }

  /**
   * End timing a performance metric and log results
   */
  endTiming(name: string, metadata?: Record<string, any>): number {
    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`⚠️ Performance: No start time found for "${name}"`);
      return 0;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;
    
    // Update the metric
    metric.endTime = endTime;
    metric.duration = duration;
    if (metadata) {
      metric.metadata = { ...metric.metadata, ...metadata };
    }

    // Check against targets
    const target = this.getTargetForMetric(name);
    const isWithinTarget = target ? duration <= target : true;
    const status = isWithinTarget ? '✅' : '⚠️';
    
    console.log(
      `${status} Performance: "${name}" completed in ${duration.toFixed(2)}ms`,
      target ? `(target: ${target}ms)` : '',
      metric.metadata
    );

    // Log warning if exceeding target
    if (!isWithinTarget && target) {
      console.warn(
        `🐌 Performance Warning: "${name}" took ${duration.toFixed(2)}ms, exceeding target of ${target}ms by ${(duration - target).toFixed(2)}ms`
      );
    }

    return duration;
  }

  /**
   * Get target time for a specific metric
   */
  private getTargetForMetric(name: string): number | null {
    // Map metric names to targets
    if (name.includes('initial') || name.includes('app-load')) return this.loadTimeTargets.initialLoad;
    if (name.includes('dashboard')) return this.loadTimeTargets.dashboardLoad;
    if (name.includes('patient-detail')) return this.loadTimeTargets.patientDetailLoad;
    if (name.includes('provider-match')) return this.loadTimeTargets.providerMatchLoad;
    if (name.includes('search')) return this.loadTimeTargets.searchResponse;
    if (name.includes('filter')) return this.loadTimeTargets.filterResponse;
    
    return null;
  }

  /**
   * Measure a function execution time
   */
  async measureAsync<T>(
    name: string, 
    fn: () => Promise<T>, 
    metadata?: Record<string, any>
  ): Promise<T> {
    this.startTiming(name, metadata);
    try {
      const result = await fn();
      this.endTiming(name, { success: true });
      return result;
    } catch (error) {
      this.endTiming(name, { success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Measure a synchronous function execution time
   */
  measure<T>(
    name: string, 
    fn: () => T, 
    metadata?: Record<string, any>
  ): T {
    this.startTiming(name, metadata);
    try {
      const result = fn();
      this.endTiming(name, { success: true });
      return result;
    } catch (error) {
      this.endTiming(name, { success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get metrics that exceeded their targets
   */
  getSlowMetrics(): PerformanceMetric[] {
    return this.getMetrics().filter(metric => {
      if (!metric.duration) return false;
      const target = this.getTargetForMetric(metric.name);
      return target && metric.duration > target;
    });
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
  }

  /**
   * Log a performance summary
   */
  logSummary(): void {
    const metrics = this.getMetrics();
    const slowMetrics = this.getSlowMetrics();
    
    console.group('📊 Performance Summary');
    console.log(`Total metrics recorded: ${metrics.length}`);
    console.log(`Metrics exceeding targets: ${slowMetrics.length}`);
    
    if (slowMetrics.length > 0) {
      console.group('🐌 Slow Operations');
      slowMetrics.forEach(metric => {
        const target = this.getTargetForMetric(metric.name);
        console.log(
          `"${metric.name}": ${metric.duration?.toFixed(2)}ms (target: ${target}ms, over by: ${((metric.duration || 0) - (target || 0)).toFixed(2)}ms)`
        );
      });
      console.groupEnd();
    }
    
    console.groupEnd();
  }

  /**
   * Monitor Core Web Vitals
   */
  monitorWebVitals(): void {
    // Monitor Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          const lcp = lastEntry.startTime;
          
          console.log(`🎯 LCP: ${lcp.toFixed(2)}ms ${lcp <= 2500 ? '✅' : '⚠️'}`);
          
          if (lcp > 2500) {
            console.warn('🐌 LCP Warning: Largest Contentful Paint is slower than recommended (2.5s)');
          }
        });
        
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (error) {
        console.warn('Could not observe LCP:', error);
      }

      // Monitor First Input Delay (FID)
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            const fid = entry.processingStart - entry.startTime;
            console.log(`⚡ FID: ${fid.toFixed(2)}ms ${fid <= 100 ? '✅' : '⚠️'}`);
            
            if (fid > 100) {
              console.warn('🐌 FID Warning: First Input Delay is slower than recommended (100ms)');
            }
          });
        });
        
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (error) {
        console.warn('Could not observe FID:', error);
      }

      // Monitor Cumulative Layout Shift (CLS)
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          
          console.log(`📐 CLS: ${clsValue.toFixed(4)} ${clsValue <= 0.1 ? '✅' : '⚠️'}`);
          
          if (clsValue > 0.1) {
            console.warn('🐌 CLS Warning: Cumulative Layout Shift is higher than recommended (0.1)');
          }
        });
        
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        console.warn('Could not observe CLS:', error);
      }
    }
  }

  /**
   * Monitor navigation timing
   */
  monitorNavigationTiming(): void {
    if ('performance' in window && 'getEntriesByType' in performance) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          
          if (navigation) {
            const metrics = {
              'DNS Lookup': navigation.domainLookupEnd - navigation.domainLookupStart,
              'TCP Connection': navigation.connectEnd - navigation.connectStart,
              'TLS Handshake': navigation.secureConnectionStart > 0 ? navigation.connectEnd - navigation.secureConnectionStart : 0,
              'Request': navigation.responseStart - navigation.requestStart,
              'Response': navigation.responseEnd - navigation.responseStart,
              'DOM Processing': navigation.domContentLoadedEventStart - navigation.responseEnd,
              'Resource Loading': navigation.loadEventStart - navigation.domContentLoadedEventStart,
              'Total Load Time': navigation.loadEventEnd - (navigation.fetchStart || 0),
            };
            
            console.group('🌐 Navigation Timing');
            Object.entries(metrics).forEach(([name, time]) => {
              if (time > 0) {
                console.log(`${name}: ${time.toFixed(2)}ms`);
              }
            });
            console.groupEnd();
            
            // Check total load time against target
            const totalLoadTime = metrics['Total Load Time'];
            if (totalLoadTime > this.loadTimeTargets.initialLoad) {
              console.warn(
                `🐌 Initial Load Warning: Total load time ${totalLoadTime.toFixed(2)}ms exceeds target of ${this.loadTimeTargets.initialLoad}ms`
              );
            }
          }
        }, 0);
      });
    }
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Auto-start monitoring when module loads
if (typeof window !== 'undefined') {
  performanceMonitor.monitorWebVitals();
  performanceMonitor.monitorNavigationTiming();
}

// Export utility functions for easy use
export const startTiming = (name: string, metadata?: Record<string, any>) => 
  performanceMonitor.startTiming(name, metadata);

export const endTiming = (name: string, metadata?: Record<string, any>) => 
  performanceMonitor.endTiming(name, metadata);

export const measureAsync = <T>(name: string, fn: () => Promise<T>, metadata?: Record<string, any>) => 
  performanceMonitor.measureAsync(name, fn, metadata);

export const measure = <T>(name: string, fn: () => T, metadata?: Record<string, any>) => 
  performanceMonitor.measure(name, fn, metadata);

// Alias for database query tracking
export const trackQuery = measureAsync;