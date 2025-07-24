import { describe, it, expect } from 'vitest';
import {
  calculateDistance,
  getApproximateCoordinates,
  isInNetwork,
  hasSpecialtyMatch,
  calculateAvailabilityScore,
  calculateProximityScore,
  calculateProviderMatch,
  findMatchingProviders
} from '../provider-matching';
import { Provider, Patient } from '@/types';

// Mock data
const mockPatient: Patient = {
  id: '1',
  name: 'John Doe',
  date_of_birth: '1980-01-01',
  diagnosis: 'Post-surgical knee rehabilitation',
  discharge_date: '2024-01-15',
  required_followup: 'Physical Therapy',
  insurance: 'Blue Cross Blue Shield',
  address: '100 Commonwealth Ave, Boston, MA',
  leakage_risk_score: 75,
  leakage_risk_level: 'high',
  referral_status: 'needed',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  leakageRisk: {
    score: 75,
    level: 'high',
  },
};

const mockProviders: Provider[] = [
  {
    id: '1',
    name: 'Boston Physical Therapy Center',
    type: 'Physical Therapy',
    address: '123 Main St, Boston, MA',
    phone: '617-555-0101',
    specialties: ['Physical Therapy', 'Sports Medicine'],
    accepted_insurance: ['Blue Cross Blue Shield', 'Aetna'],
    rating: 4.8,
    latitude: 42.3601,
    longitude: -71.0589,
    availability_next: 'Tomorrow',
    in_network_plans: ['Blue Cross Blue Shield MA', 'Aetna Better Health'],
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Cambridge Cardiology Associates',
    type: 'Cardiology',
    address: '456 Harvard St, Cambridge, MA',
    phone: '617-555-0102',
    specialties: ['Cardiology', 'Interventional Cardiology'],
    accepted_insurance: ['Harvard Pilgrim', 'Tufts Health Plan'],
    rating: 4.6,
    latitude: 42.3736,
    longitude: -71.1097,
    availability_next: 'Next week',
    in_network_plans: ['Harvard Pilgrim', 'Tufts Health Plan'],
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '3',
    name: 'Brookline Orthopedic Specialists',
    type: 'Orthopedics',
    address: '789 Beacon St, Brookline, MA',
    phone: '617-555-0103',
    specialties: ['Orthopedics', 'Sports Medicine', 'Joint Replacement'],
    accepted_insurance: ['Blue Cross Blue Shield', 'United Healthcare'],
    rating: 4.7,
    latitude: 42.3467,
    longitude: -71.1206,
    availability_next: 'This week',
    in_network_plans: ['Blue Cross Blue Shield MA', 'United Healthcare'],
    created_at: '2024-01-01T00:00:00Z',
  },
];

describe('Provider Matching Functions', () => {
  describe('isInNetwork', () => {
    it('should correctly identify in-network providers', () => {
      // Provider with exact insurance match
      expect(isInNetwork(mockProviders[0], 'Blue Cross Blue Shield MA')).toBe(true);
      
      // Provider with partial insurance match
      expect(isInNetwork(mockProviders[0], 'Blue Cross Blue Shield')).toBe(true);
      
      // Provider with no insurance match
      expect(isInNetwork(mockProviders[1], 'Blue Cross Blue Shield')).toBe(false);
      
      // Edge cases
      expect(isInNetwork(mockProviders[0], '')).toBe(false);
      expect(isInNetwork({ ...mockProviders[0], in_network_plans: [], accepted_insurance: [] }, 'Blue Cross Blue Shield')).toBe(false);
    });
  });

  describe('hasSpecialtyMatch', () => {
    it('should correctly identify specialty matches', () => {
      // Direct specialty match
      expect(hasSpecialtyMatch(mockProviders[0], 'Physical Therapy')).toBe(true);
      
      // Related specialty match
      expect(hasSpecialtyMatch(mockProviders[0], 'Sports Medicine')).toBe(true);
      
      // No specialty match
      expect(hasSpecialtyMatch(mockProviders[0], 'Cardiology')).toBe(false);
      
      // Edge cases
      expect(hasSpecialtyMatch(mockProviders[0], '')).toBe(false);
      // Provider with empty specialties but matching type should still match
      expect(hasSpecialtyMatch({ ...mockProviders[0], specialties: [] }, 'Physical Therapy')).toBe(true);
    });
  });

  describe('calculateAvailabilityScore', () => {
    it('should correctly score availability based on text', () => {
      // Immediate availability
      expect(calculateAvailabilityScore('Today')).toBeGreaterThanOrEqual(90);
      expect(calculateAvailabilityScore('Tomorrow')).toBeGreaterThanOrEqual(90);
      
      // Soon availability
      expect(calculateAvailabilityScore('This week')).toBeGreaterThanOrEqual(70);
      
      // Later availability
      expect(calculateAvailabilityScore('Next week')).toBeLessThan(70);
      expect(calculateAvailabilityScore('Next month')).toBeLessThan(50);
      
      // Edge cases
      expect(calculateAvailabilityScore(null)).toBe(0);
      expect(calculateAvailabilityScore('')).toBeLessThan(30);
    });
  });

  describe('calculateProximityScore', () => {
    it('should correctly score proximity based on distance', () => {
      // Very close
      expect(calculateProximityScore(0.5)).toBeGreaterThanOrEqual(90);
      
      // Moderate distance
      expect(calculateProximityScore(5)).toBeLessThan(90);
      expect(calculateProximityScore(10)).toBeLessThan(80);
      
      // Far distance
      expect(calculateProximityScore(30)).toBeLessThan(50);
      expect(calculateProximityScore(100)).toBeLessThan(30);
    });
  });

  describe('calculateProviderMatch', () => {
    it('should calculate comprehensive match scores', () => {
      // Test with in-network provider
      const match1 = calculateProviderMatch(mockProviders[0], mockPatient);
      expect(match1.matchScore).toBeGreaterThan(70);
      expect(match1.inNetwork).toBe(true);
      expect(match1.explanation.reasons.length).toBeGreaterThan(0);
      
      // Test with out-of-network provider
      const match2 = calculateProviderMatch(mockProviders[1], mockPatient);
      expect(match2.matchScore).toBeLessThan(match1.matchScore);
      expect(match2.inNetwork).toBe(false);
    });
  });

  describe('findMatchingProviders', () => {
    it('should find and rank providers for a patient', () => {
      const matches = findMatchingProviders(mockProviders, mockPatient, 3);
      
      // Should return correct number of matches
      expect(matches.length).toBe(3);
      
      // Should be sorted by match score (highest first)
      expect(matches[0].matchScore).toBeGreaterThanOrEqual(matches[1].matchScore);
      expect(matches[1].matchScore).toBeGreaterThanOrEqual(matches[2].matchScore);
      
      // Should include explanation data
      expect(matches[0].explanation).toBeDefined();
      expect(matches[0].explanation.reasons.length).toBeGreaterThan(0);
    });
  });
});