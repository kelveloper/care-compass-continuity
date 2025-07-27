/**
 * Performance monitoring utilities for database query optimization
 * Tracks query performance and provides insights for further optimization
 */

import { supabase } from '@/integrations/supabase/client';

interface QueryMetrics {
  queryType: string;
  duration: number;
  resultCount: number;
  cacheHit: boolean;
  timestamp: Date;
  parameters?: Record<string, any>;
}

interface PerformanceReport {
  totalQueries: number;
  averageQueryTime: number;
  cacheHitRate: number;
  slowQueries: QueryMetrics[];
  queryTypeBreakdown: Record<string, {
    count: number;
    averageTime: number;
    cacheHitRate: number;
  }>;
  recommendations: string[];
}

class PerformanceMonitor {
  private metrics: QueryMetrics[] = [];
  private readonly maxMetrics = 1000; // Keep last 1000 queries
  private readonly slowQueryThreshold = 1000; // 1 second

  /**
   * Record a query execution
   */
  recordQuery(
    queryType: string,
    startTime: number,
    resultCount: number,
    cacheHit: boolean = false,
    parameters?: Record<string, any>
  ): void {
    const duration = Date.now() - startTime;
    
    const metric: QueryMetrics = {
      queryType,
      duration,
      resultCount,
      cacheHit,
      timestamp: new Date(),
      parameters
    };

    this.metrics.push(metric);

    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log slow queries
    if (duration > this.slowQueryThreshold) {
      console.warn(`Slow query detected: ${queryType} took ${duration}ms`, {
        resultCount,
        cacheHit,
        parameters
      });
    }

    // Log performance info
    console.log(`Query performance: ${queryType} - ${duration}ms (${resultCount} results, cache: ${cacheHit ? 'hit' : 'miss'})`);
  }

  /**
   * Generate a performance report
   */
  generateReport(): PerformanceReport {
    if (this.metrics.length === 0) {
      return {
        totalQueries: 0,
        averageQueryTime: 0,
        cacheHitRate: 0,
        slowQueries: [],
        queryTypeBreakdown: {},
        recommendations: ['No query data available yet. Run some queries to see performance metrics.']
      };
    }

    const totalQueries = this.metrics.length;
    const totalTime = this.metrics.reduce((sum, metric) => sum + metric.duration, 0);
    const averageQueryTime = totalTime / totalQueries;
    const cacheHits = this.metrics.filter(metric => metric.cacheHit).length;
    const cacheHitRate = (cacheHits / totalQueries) * 100;
    const slowQueries = this.metrics.filter(metric => metric.duration > this.slowQueryThreshold);

    // Query type breakdown
    const queryTypeBreakdown: Record<string, {
      count: number;
      averageTime: number;
      cacheHitRate: number;
    }> = {};

    this.metrics.forEach(metric => {
      if (!queryTypeBreakdown[metric.queryType]) {
        queryTypeBreakdown[metric.queryType] = {
          count: 0,
          averageTime: 0,
          cacheHitRate: 0
        };
      }

      const breakdown = queryTypeBreakdown[metric.queryType];
      breakdown.count++;
      breakdown.averageTime = (breakdown.averageTime * (breakdown.count - 1) + metric.duration) / breakdown.count;
      breakdown.cacheHitRate = (this.metrics.filter(m => 
        m.queryType === metric.queryType && m.cacheHit
      ).length / breakdown.count) * 100;
    });

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      averageQueryTime,
      cacheHitRate,
      slowQueries,
      queryTypeBreakdown
    );

    return {
      totalQueries,
      averageQueryTime: Math.round(averageQueryTime),
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      slowQueries: slowQueries.slice(-10), // Last 10 slow queries
      queryTypeBreakdown,
      recommendations
    };
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(
    averageQueryTime: number,
    cacheHitRate: number,
    slowQueries: QueryMetrics[],
    queryTypeBreakdown: Record<string, any>
  ): string[] {
    const recommendations: string[] = [];

    // Average query time recommendations
    if (averageQueryTime > 500) {
      recommendations.push('Average query time is high (>500ms). Consider optimizing slow queries or adding more indexes.');
    } else if (averageQueryTime < 100) {
      recommendations.push('Excellent query performance! Average response time is under 100ms.');
    }

    // Cache hit rate recommendations
    if (cacheHitRate < 50) {
      recommendations.push('Low cache hit rate (<50%). Consider refreshing materialized views or adjusting cache strategies.');
    } else if (cacheHitRate > 80) {
      recommendations.push('Excellent cache performance! High cache hit rate is improving query speed.');
    }

    // Slow query recommendations
    if (slowQueries.length > 0) {
      const slowQueryTypes = [...new Set(slowQueries.map(q => q.queryType))];
      recommendations.push(`Slow queries detected in: ${slowQueryTypes.join(', ')}. Consider adding indexes or optimizing these query types.`);
    }

    // Query type specific recommendations
    Object.entries(queryTypeBreakdown).forEach(([queryType, stats]) => {
      if (stats.averageTime > 1000) {
        recommendations.push(`${queryType} queries are consistently slow (avg: ${Math.round(stats.averageTime)}ms). Consider optimization.`);
      }
      
      if (stats.cacheHitRate < 30 && stats.count > 10) {
        recommendations.push(`${queryType} has low cache hit rate (${Math.round(stats.cacheHitRate)}%). Consider caching strategy improvements.`);
      }
    });

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('Query performance looks good! Continue monitoring for any degradation.');
    }

    return recommendations;
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    console.log('Performance metrics cleared');
  }

  /**
   * Get recent metrics
   */
  getRecentMetrics(count: number = 50): QueryMetrics[] {
    return this.metrics.slice(-count);
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): string {
    return JSON.stringify(this.metrics, null, 2);
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Decorator function to automatically track query performance
 */
export function trackQueryPerformance(queryType: string) {
  return function <T extends (...args: any[]) => Promise<any>>(
    target: any,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const method = descriptor.value!;

    descriptor.value = (async function (this: any, ...args: any[]) {
      const startTime = Date.now();
      let resultCount = 0;
      let cacheHit = false;

      try {
        const result = await method.apply(this, args);
        
        // Try to determine result count and cache status
        if (Array.isArray(result)) {
          resultCount = result.length;
        } else if (result && typeof result === 'object') {
          if ('data' in result && Array.isArray(result.data)) {
            resultCount = result.data.length;
          }
          if ('fromCache' in result) {
            cacheHit = result.fromCache;
          }
        }

        performanceMonitor.recordQuery(
          queryType,
          startTime,
          resultCount,
          cacheHit,
          { args: args.length > 0 ? args[0] : undefined }
        );

        return result;
      } catch (error) {
        performanceMonitor.recordQuery(
          queryType,
          startTime,
          0,
          false,
          { args: args.length > 0 ? args[0] : undefined, error: error instanceof Error ? error.message : 'Unknown error' }
        );
        throw error;
      }
    }) as T;

    return descriptor;
  };
}

/**
 * Manual query tracking function
 */
export async function trackQuery<T>(
  queryType: string,
  queryFunction: () => Promise<T>,
  parameters?: Record<string, any>
): Promise<T> {
  const startTime = Date.now();
  let resultCount = 0;
  let cacheHit = false;

  try {
    const result = await queryFunction();
    
    // Try to determine result count and cache status
    if (Array.isArray(result)) {
      resultCount = result.length;
    } else if (result && typeof result === 'object') {
      if ('data' in result && Array.isArray((result as any).data)) {
        resultCount = (result as any).data.length;
      }
      if ('fromCache' in result) {
        cacheHit = (result as any).fromCache;
      }
    }

    performanceMonitor.recordQuery(
      queryType,
      startTime,
      resultCount,
      cacheHit,
      parameters
    );

    return result;
  } catch (error) {
    performanceMonitor.recordQuery(
      queryType,
      startTime,
      0,
      false,
      { ...parameters, error: error instanceof Error ? error.message : 'Unknown error' }
    );
    throw error;
  }
}

/**
 * Database health check function
 */
export async function performDatabaseHealthCheck(): Promise<{
  status: 'healthy' | 'warning' | 'critical';
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
    duration?: number;
  }>;
  recommendations: string[];
}> {
  const checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
    duration?: number;
  }> = [];

  // Check 1: Basic connectivity
  try {
    const startTime = Date.now();
    const { data, error } = await supabase.from('patients').select('id').limit(1);
    const duration = Date.now() - startTime;

    if (error) {
      checks.push({
        name: 'Database Connectivity',
        status: 'fail',
        message: `Connection failed: ${error.message}`,
        duration
      });
    } else {
      checks.push({
        name: 'Database Connectivity',
        status: duration > 1000 ? 'warning' : 'pass',
        message: duration > 1000 ? `Connection slow (${duration}ms)` : `Connection healthy (${duration}ms)`,
        duration
      });
    }
  } catch (error) {
    checks.push({
      name: 'Database Connectivity',
      status: 'fail',
      message: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }

  // Check 2: Materialized view status
  try {
    const startTime = Date.now();
    const { data, error } = await supabase.from('provider_match_cache').select('id').limit(1);
    const duration = Date.now() - startTime;

    if (error) {
      checks.push({
        name: 'Materialized View Cache',
        status: 'warning',
        message: 'Provider cache not available - performance may be reduced',
        duration
      });
    } else {
      checks.push({
        name: 'Materialized View Cache',
        status: 'pass',
        message: `Cache available and responsive (${duration}ms)`,
        duration
      });
    }
  } catch (error) {
    checks.push({
      name: 'Materialized View Cache',
      status: 'warning',
      message: 'Cache status unknown'
    });
  }

  // Check 3: Query performance
  const report = performanceMonitor.generateReport();
  if (report.totalQueries > 0) {
    if (report.averageQueryTime > 1000) {
      checks.push({
        name: 'Query Performance',
        status: 'warning',
        message: `Average query time is high (${report.averageQueryTime}ms)`
      });
    } else {
      checks.push({
        name: 'Query Performance',
        status: 'pass',
        message: `Query performance is good (avg: ${report.averageQueryTime}ms)`
      });
    }
  } else {
    checks.push({
      name: 'Query Performance',
      status: 'warning',
      message: 'No query metrics available yet'
    });
  }

  // Determine overall status
  const failedChecks = checks.filter(check => check.status === 'fail').length;
  const warningChecks = checks.filter(check => check.status === 'warning').length;

  let status: 'healthy' | 'warning' | 'critical';
  if (failedChecks > 0) {
    status = 'critical';
  } else if (warningChecks > 0) {
    status = 'warning';
  } else {
    status = 'healthy';
  }

  // Generate recommendations
  const recommendations: string[] = [];
  
  if (failedChecks > 0) {
    recommendations.push('Critical issues detected. Check database connectivity and configuration.');
  }
  
  if (warningChecks > 0) {
    recommendations.push('Performance warnings detected. Consider running maintenance or optimizing queries.');
  }
  
  if (report.totalQueries > 0 && report.cacheHitRate < 50) {
    recommendations.push('Low cache hit rate. Consider refreshing materialized views.');
  }

  if (status === 'healthy') {
    recommendations.push('Database health is good. Continue monitoring.');
  }

  return {
    status,
    checks,
    recommendations
  };
}

/**
 * React hook for performance monitoring
 */
export function usePerformanceMonitor() {
  const getReport = () => performanceMonitor.generateReport();
  const clearMetrics = () => performanceMonitor.clearMetrics();
  const getRecentMetrics = (count?: number) => performanceMonitor.getRecentMetrics(count);
  
  return {
    getReport,
    clearMetrics,
    getRecentMetrics,
    performHealthCheck: performDatabaseHealthCheck
  };
}