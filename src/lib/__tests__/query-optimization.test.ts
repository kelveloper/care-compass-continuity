/**
 * Tests for database query optimization utilities
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { 
  searchProvidersOptimized, 
  searchPatientsOptimized, 
  batchProviderLookup,
  findProvidersWithinDistance,
  getHighRiskPatients,
  maintainQueryPerformance,
  getQueryStats,
  performFullTextSearch
} from '../query-utils';

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      contains: jest.fn(() => ({
        or: jest.fn(() => ({
          gte: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => ({
                data: [],
                error: null
              }))
            }))
          }))
        }))
      })),
      or: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => ({
              data: [],
              error: null
            }))
          }))
        }))
      })),
      eq: jest.fn(() => ({
        order: jest.fn(() => ({
          limit: jest.fn(() => ({
            data: [],
            error: null
          }))
        }))
      })),
      gte: jest.fn(() => ({
        lte: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => ({
              data: [],
              error: null
            }))
          }))
        }))
      })),
      lte: jest.fn(() => ({
        order: jest.fn(() => ({
          limit: jest.fn(() => ({
            data: [],
            error: null
          }))
        }))
      })),
      order: jest.fn(() => ({
        limit: jest.fn(() => ({
          data: [],
          error: null
        })),
        range: jest.fn(() => ({
          data: [],
          error: null
        }))
      })),
      in: jest.fn(() => ({
        data: [],
        error: null
      })),
      limit: jest.fn(() => ({
        data: [],
        error: null
      })),
      range: jest.fn(() => ({
        data: [],
        error: null
      }))
    }))
  })),
  rpc: jest.fn(() => ({
    data: null,
    error: null
  }))
};

// Mock the supabase client
jest.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase
}));

// Mock provider matching utilities
jest.mock('../provider-matching', () => ({
  calculateDistance: jest.fn((lat1, lng1, lat2, lng2) => {
    // Simple distance calculation for testing
    return Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lng2 - lng1, 2)) * 69;
  })
}));

// Mock risk calculator
jest.mock('../risk-calculator', () => ({
  enhancePatientDataSync: jest.fn((patient) => ({
    ...patient,
    age: 45,
    daysSinceDischarge: 7
  }))
}));

// Mock performance monitor
jest.mock('../performance-monitor', () => ({
  trackQuery: jest.fn((queryType, queryFn, params) => queryFn()),
  performanceMonitor: {
    recordQuery: jest.fn()
  }
}));

describe('Query Optimization Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchProvidersOptimized', () => {
    it('should use materialized view for optimized search', async () => {
      const mockProviders = [
        {
          id: '1',
          name: 'Dr. Smith',
          type: 'Physical Therapy',
          specialties: ['Physical Therapy'],
          accepted_insurance: ['Blue Cross'],
          in_network_plans: ['Blue Cross'],
          rating: 4.5,
          latitude: 42.3601,
          longitude: -71.0589,
          availability_next: 'This week',
          availability_score: 80,
          rating_score: 90
        }
      ];

      // Mock successful materialized view query
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          contains: jest.fn(() => ({
            or: jest.fn(() => ({
              gte: jest.fn(() => ({
                order: jest.fn(() => ({
                  limit: jest.fn(() => ({
                    data: mockProviders,
                    error: null
                  }))
                }))
              }))
            }))
          }))
        }))
      });

      const result = await searchProvidersOptimized({
        specialty: 'Physical Therapy',
        insurance: 'Blue Cross',
        minRating: 4.0,
        limit: 5
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('provider_match_cache');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Dr. Smith');
      expect((result[0] as any)._cached_availability_score).toBe(80);
      expect((result[0] as any)._cached_rating_score).toBe(90);
    });

    it('should fallback to providers table when materialized view fails', async () => {
      const mockProviders = [
        {
          id: '1',
          name: 'Dr. Johnson',
          type: 'Cardiology',
          specialties: ['Cardiology'],
          accepted_insurance: ['Aetna'],
          in_network_plans: ['Aetna'],
          rating: 4.8,
          latitude: 42.3601,
          longitude: -71.0589,
          availability_next: 'Tomorrow'
        }
      ];

      // Mock materialized view failure, then successful fallback
      let callCount = 0;
      mockSupabase.from.mockImplementation((table) => {
        callCount++;
        if (table === 'provider_match_cache' && callCount === 1) {
          return {
            select: jest.fn(() => ({
              contains: jest.fn(() => ({
                or: jest.fn(() => ({
                  gte: jest.fn(() => ({
                    order: jest.fn(() => ({
                      limit: jest.fn(() => ({
                        data: null,
                        error: new Error('Materialized view not available')
                      }))
                    }))
                  }))
                }))
              }))
            }))
          };
        } else {
          return {
            select: jest.fn(() => ({
              contains: jest.fn(() => ({
                or: jest.fn(() => ({
                  gte: jest.fn(() => ({
                    order: jest.fn(() => ({
                      limit: jest.fn(() => ({
                        data: mockProviders,
                        error: null
                      }))
                    }))
                  }))
                }))
              }))
            }))
          };
        }
      });

      const result = await searchProvidersOptimized({
        specialty: 'Cardiology',
        insurance: 'Aetna'
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Dr. Johnson');
    });

    it('should apply geographic filtering correctly', async () => {
      const mockProviders = [
        {
          id: '1',
          name: 'Dr. Near',
          latitude: 42.3601,
          longitude: -71.0589,
          specialties: ['Physical Therapy'],
          accepted_insurance: ['Blue Cross'],
          in_network_plans: ['Blue Cross'],
          rating: 4.5,
          availability_score: 80,
          rating_score: 90
        },
        {
          id: '2',
          name: 'Dr. Far',
          latitude: 42.5000,
          longitude: -71.2000,
          specialties: ['Physical Therapy'],
          accepted_insurance: ['Blue Cross'],
          in_network_plans: ['Blue Cross'],
          rating: 4.5,
          availability_score: 80,
          rating_score: 90
        }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          contains: jest.fn(() => ({
            or: jest.fn(() => ({
              gte: jest.fn(() => ({
                lte: jest.fn(() => ({
                  gte: jest.fn(() => ({
                    lte: jest.fn(() => ({
                      order: jest.fn(() => ({
                        limit: jest.fn(() => ({
                          data: mockProviders,
                          error: null
                        }))
                      }))
                    }))
                  }))
                }))
              }))
            }))
          }))
        }))
      });

      const result = await searchProvidersOptimized({
        specialty: 'Physical Therapy',
        maxDistance: 5,
        patientLat: 42.3601,
        patientLng: -71.0589
      });

      // Should filter out the far provider
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Dr. Near');
    });
  });

  describe('searchPatientsOptimized', () => {
    it('should use dashboard view for optimized patient search', async () => {
      const mockPatients = [
        {
          id: '1',
          name: 'John Doe',
          diagnosis: 'Knee injury',
          leakage_risk_score: 85,
          leakage_risk_level: 'high',
          referral_status: 'needed',
          insurance: 'Blue Cross',
          age: 45,
          days_since_discharge: 7
        }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          or: jest.fn(() => ({
            eq: jest.fn(() => ({
              gte: jest.fn(() => ({
                order: jest.fn(() => ({
                  range: jest.fn(() => ({
                    data: mockPatients,
                    error: null
                  }))
                }))
              }))
            }))
          }))
        }))
      });

      const result = await searchPatientsOptimized({
        searchTerm: 'knee',
        riskLevel: 'high',
        limit: 10
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('dashboard_patients');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('John Doe');
    });

    it('should apply multiple filters correctly', async () => {
      const mockPatients = [
        {
          id: '1',
          name: 'Jane Smith',
          diagnosis: 'Heart condition',
          leakage_risk_score: 75,
          leakage_risk_level: 'high',
          referral_status: 'needed',
          insurance: 'Aetna',
          age: 65,
          days_since_discharge: 3
        }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                gte: jest.fn(() => ({
                  lte: jest.fn(() => ({
                    order: jest.fn(() => ({
                      range: jest.fn(() => ({
                        data: mockPatients,
                        error: null
                      }))
                    }))
                  }))
                }))
              }))
            }))
          }))
        }))
      });

      const result = await searchPatientsOptimized({
        riskLevel: 'high',
        referralStatus: 'needed',
        insurance: 'Aetna',
        minRiskScore: 70,
        maxRiskScore: 90
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Jane Smith');
    });
  });

  describe('batchProviderLookup', () => {
    it('should return empty map for empty provider IDs', async () => {
      const result = await batchProviderLookup([]);
      expect(result.size).toBe(0);
    });

    it('should use materialized view for batch lookup', async () => {
      const mockProviders = [
        {
          id: '1',
          name: 'Dr. Alpha',
          specialties: ['Cardiology'],
          accepted_insurance: ['Blue Cross'],
          in_network_plans: ['Blue Cross'],
          availability_score: 90,
          rating_score: 85
        },
        {
          id: '2',
          name: 'Dr. Beta',
          specialties: ['Orthopedics'],
          accepted_insurance: ['Aetna'],
          in_network_plans: ['Aetna'],
          availability_score: 75,
          rating_score: 92
        }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          in: jest.fn(() => ({
            data: mockProviders,
            error: null
          }))
        }))
      });

      const result = await batchProviderLookup(['1', '2']);

      expect(mockSupabase.from).toHaveBeenCalledWith('provider_match_cache');
      expect(result.size).toBe(2);
      expect(result.get('1')?.name).toBe('Dr. Alpha');
      expect(result.get('2')?.name).toBe('Dr. Beta');
      expect((result.get('1') as any)?._cached_availability_score).toBe(90);
      expect((result.get('2') as any)?._cached_rating_score).toBe(92);
    });

    it('should fallback to providers table when cache fails', async () => {
      const mockProviders = [
        {
          id: '1',
          name: 'Dr. Gamma',
          specialties: ['Physical Therapy'],
          accepted_insurance: ['Medicare'],
          in_network_plans: ['Medicare']
        }
      ];

      // Mock cache failure, then successful fallback
      let callCount = 0;
      mockSupabase.from.mockImplementation((table) => {
        callCount++;
        if (table === 'provider_match_cache' && callCount === 1) {
          return {
            select: jest.fn(() => ({
              in: jest.fn(() => ({
                data: null,
                error: new Error('Cache not available')
              }))
            }))
          };
        } else {
          return {
            select: jest.fn(() => ({
              in: jest.fn(() => ({
                data: mockProviders,
                error: null
              }))
            }))
          };
        }
      });

      const result = await batchProviderLookup(['1']);

      expect(result.size).toBe(1);
      expect(result.get('1')?.name).toBe('Dr. Gamma');
    });
  });

  describe('findProvidersWithinDistance', () => {
    it('should use optimized geographic search function', async () => {
      const mockResults = [
        {
          id: '1',
          name: 'Dr. Nearby',
          type: 'Physical Therapy',
          address: '123 Main St',
          phone: '555-0123',
          rating: 4.5,
          distance_miles: 2.3,
          specialties: ['Physical Therapy'],
          accepted_insurance: ['Blue Cross'],
          availability_next: 'This week'
        }
      ];

      // Mock the RPC call
      mockSupabase.rpc.mockReturnValue({
        data: mockResults,
        error: null
      });

      const result = await findProvidersWithinDistance({
        patientLat: 42.3601,
        patientLng: -71.0589,
        maxDistance: 10,
        minRating: 4.0,
        insurance: 'Blue Cross'
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('find_providers_within_distance', {
        patient_lat: 42.3601,
        patient_lng: -71.0589,
        max_distance_miles: 10,
        min_rating: 4.0,
        provider_type: undefined,
        insurance_plan: 'Blue Cross',
        limit_results: 10
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Dr. Nearby');
      expect((result[0] as any).distance).toBe(2.3);
    });

    it('should fallback to basic search when RPC fails', async () => {
      // Mock RPC failure
      mockSupabase.rpc.mockReturnValue({
        data: null,
        error: new Error('Function not found')
      });

      // Mock fallback search success
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          contains: jest.fn(() => ({
            or: jest.fn(() => ({
              gte: jest.fn(() => ({
                order: jest.fn(() => ({
                  limit: jest.fn(() => ({
                    data: [{ id: '1', name: 'Fallback Provider' }],
                    error: null
                  }))
                }))
              }))
            }))
          }))
        }))
      });

      const result = await findProvidersWithinDistance({
        patientLat: 42.3601,
        patientLng: -71.0589,
        maxDistance: 10
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Fallback Provider');
    });
  });

  describe('getHighRiskPatients', () => {
    it('should use optimized high-risk patient function', async () => {
      const mockResults = [
        {
          id: '1',
          name: 'High Risk Patient',
          diagnosis: 'Complex condition',
          leakage_risk_score: 85,
          leakage_risk_level: 'high',
          referral_status: 'needed',
          days_since_discharge: 5,
          age: 72,
          insurance: 'Medicare',
          required_followup: 'Cardiology'
        }
      ];

      mockSupabase.rpc.mockReturnValue({
        data: mockResults,
        error: null
      });

      const result = await getHighRiskPatients({
        riskThreshold: 80,
        limit: 25
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_high_risk_patients', {
        risk_threshold: 80,
        limit_results: 25,
        offset_results: 0
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('High Risk Patient');
      expect(result[0].leakageRisk.score).toBe(85);
      expect((result[0] as any).age).toBe(72);
      expect((result[0] as any).daysSinceDischarge).toBe(5);
    });
  });

  describe('maintainQueryPerformance', () => {
    it('should call maintenance function successfully', async () => {
      mockSupabase.rpc.mockReturnValue({
        data: null,
        error: null
      });

      const result = await maintainQueryPerformance();

      expect(mockSupabase.rpc).toHaveBeenCalledWith('maintain_query_performance');
      expect(result.success).toBe(true);
      expect(result.message).toContain('completed successfully');
    });

    it('should handle maintenance errors gracefully', async () => {
      mockSupabase.rpc.mockReturnValue({
        data: null,
        error: new Error('Maintenance failed')
      });

      const result = await maintainQueryPerformance();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Maintenance failed');
    });
  });

  describe('performFullTextSearch', () => {
    it('should search patients using full-text search', async () => {
      const mockPatients = [
        {
          id: '1',
          name: 'John Doe',
          diagnosis: 'Heart condition',
          leakage_risk_score: 75,
          leakage_risk_level: 'high'
        }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          textSearch: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => ({
                data: mockPatients,
                error: null
              }))
            }))
          }))
        }))
      });

      const result = await performFullTextSearch({
        searchTerm: 'heart',
        searchType: 'patients',
        limit: 10
      });

      expect(result.patients).toHaveLength(1);
      expect(result.patients[0].name).toBe('John Doe');
      expect(result.totalResults).toBe(1);
    });

    it('should search both patients and providers', async () => {
      const mockPatients = [{ id: '1', name: 'Patient One', leakage_risk_score: 60, leakage_risk_level: 'medium' }];
      const mockProviders = [{ id: '1', name: 'Dr. Provider', specialties: [], accepted_insurance: [], in_network_plans: [] }];

      let callCount = 0;
      mockSupabase.from.mockImplementation((table) => {
        callCount++;
        const mockData = table === 'patients' ? mockPatients : mockProviders;
        
        return {
          select: jest.fn(() => ({
            textSearch: jest.fn(() => ({
              order: jest.fn(() => ({
                limit: jest.fn(() => ({
                  data: mockData,
                  error: null
                }))
              }))
            }))
          }))
        };
      });

      const result = await performFullTextSearch({
        searchTerm: 'test',
        searchType: 'both',
        limit: 20
      });

      expect(result.patients).toHaveLength(1);
      expect(result.providers).toHaveLength(1);
      expect(result.totalResults).toBe(2);
    });

    it('should fallback to ILIKE search when full-text search fails', async () => {
      const mockPatients = [{ id: '1', name: 'Fallback Patient', leakage_risk_score: 50, leakage_risk_level: 'medium' }];

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call fails (full-text search)
          return {
            select: jest.fn(() => ({
              textSearch: jest.fn(() => ({
                order: jest.fn(() => ({
                  limit: jest.fn(() => ({
                    data: null,
                    error: new Error('Full-text search not available')
                  }))
                }))
              }))
            }))
          };
        } else {
          // Second call succeeds (ILIKE fallback)
          return {
            select: jest.fn(() => ({
              or: jest.fn(() => ({
                order: jest.fn(() => ({
                  limit: jest.fn(() => ({
                    data: mockPatients,
                    error: null
                  }))
                }))
              }))
            }))
          };
        }
      });

      const result = await performFullTextSearch({
        searchTerm: 'fallback',
        searchType: 'patients'
      });

      expect(result.patients).toHaveLength(1);
      expect(result.patients[0].name).toBe('Fallback Patient');
    });
  });

  describe('getQueryStats (enhanced)', () => {
    it('should return comprehensive query statistics', async () => {
      // Mock all the count queries
      const mockCountResult = { count: 10, error: null };
      
      mockSupabase.from.mockImplementation((table) => ({
        select: jest.fn(() => ({
          gte: jest.fn(() => mockCountResult),
          in: jest.fn(() => mockCountResult),
          // Default count result
          count: 10,
          error: null
        }))
      }));

      const result = await getQueryStats();

      expect(result.totalPatients).toBe(10);
      expect(result.totalProviders).toBe(10);
      expect(result.totalReferrals).toBe(10);
      expect(result.highRiskPatients).toBe(10);
      expect(result.activeReferrals).toBe(10);
      expect(result.cacheStatus).toBe('available');
      expect(result.performance).toBeDefined();
      expect(typeof result.performance.avgPatientQueryTime).toBe('number');
      expect(typeof result.performance.avgProviderQueryTime).toBe('number');
      expect(typeof result.performance.cacheHitRate).toBe('number');
    });
  });
});