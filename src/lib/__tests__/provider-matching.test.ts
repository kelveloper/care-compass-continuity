import { describe, it, expect } from '@jest/globals';
import {
  calculateDistance,
  getApproximateCoordinates,
  isInNetwork,
  hasSpecialtyMatch,
  calculateAvailabilityScore,
  calculateProximityScore,
  calculateProviderMatch,
  findMatchingProviders,
  SCORING_WEIGHTS,
  getScoringAlgorithmExplanation,
  generateProviderRecommendationExplanation
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
  current_referral_id: null,
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

  describe('Multi-factor scoring algorithm', () => {
    it('should have correct scoring weights that sum to 1.0', () => {
      const totalWeight = Object.values(SCORING_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
      expect(totalWeight).toBe(1.0);
    });

    it('should prioritize insurance network match (30% weight)', () => {
      expect(SCORING_WEIGHTS.insurance).toBe(0.30);
    });

    it('should weight distance appropriately (25% weight)', () => {
      expect(SCORING_WEIGHTS.distance).toBe(0.25);
    });

    it('should weight specialty match appropriately (20% weight)', () => {
      expect(SCORING_WEIGHTS.specialty).toBe(0.20);
    });

    it('should weight availability appropriately (15% weight)', () => {
      expect(SCORING_WEIGHTS.availability).toBe(0.15);
    });

    it('should weight provider rating appropriately (10% weight)', () => {
      expect(SCORING_WEIGHTS.rating).toBe(0.10);
    });

    it('should provide detailed scoring algorithm explanation', () => {
      const explanation = getScoringAlgorithmExplanation();
      
      expect(explanation.description).toContain('Multi-factor');
      expect(explanation.factors).toHaveLength(5);
      expect(explanation.totalWeight).toBe(1.0);
      expect(explanation.scoreRange).toContain('0-100');
      
      // Check that all factors are explained
      const factorNames = explanation.factors.map(f => f.name);
      expect(factorNames).toContain('Insurance Network Match');
      expect(factorNames).toContain('Geographic Distance');
      expect(factorNames).toContain('Specialty Match');
      expect(factorNames).toContain('Availability');
      expect(factorNames).toContain('Provider Rating');
    });
  });

  describe('calculateProviderMatch with enhanced scoring', () => {
    it('should heavily favor in-network providers', () => {
      // Create two identical providers except for insurance
      const inNetworkProvider = { ...mockProviders[0] };
      const outOfNetworkProvider = { 
        ...mockProviders[0], 
        id: '999',
        in_network_plans: ['Different Insurance'],
        accepted_insurance: ['Different Insurance']
      };
      
      const inNetworkMatch = calculateProviderMatch(inNetworkProvider, mockPatient);
      const outOfNetworkMatch = calculateProviderMatch(outOfNetworkProvider, mockPatient);
      
      // In-network should score significantly higher
      expect(inNetworkMatch.matchScore).toBeGreaterThan(outOfNetworkMatch.matchScore);
      expect(inNetworkMatch.inNetwork).toBe(true);
      expect(outOfNetworkMatch.inNetwork).toBe(false);
    });

    it('should provide detailed explanations with visual indicators', () => {
      const match = calculateProviderMatch(mockProviders[0], mockPatient);
      
      expect(match.explanation.reasons.length).toBeGreaterThan(0);
      
      // Should include visual indicators
      const reasonsText = match.explanation.reasons.join(' ');
      expect(reasonsText).toMatch(/[✓⚠•]/); // Should contain visual indicators
    });

    it('should calculate scores for all five factors', () => {
      const match = calculateProviderMatch(mockProviders[0], mockPatient);
      
      expect(match.explanation.distanceScore).toBeGreaterThanOrEqual(0);
      expect(match.explanation.insuranceScore).toBeGreaterThanOrEqual(0);
      expect(match.explanation.availabilityScore).toBeGreaterThanOrEqual(0);
      expect(match.explanation.specialtyScore).toBeGreaterThanOrEqual(0);
      expect(match.explanation.ratingScore).toBeGreaterThanOrEqual(0);
      
      expect(match.explanation.distanceScore).toBeLessThanOrEqual(100);
      expect(match.explanation.insuranceScore).toBeLessThanOrEqual(100);
      expect(match.explanation.availabilityScore).toBeLessThanOrEqual(100);
      expect(match.explanation.specialtyScore).toBeLessThanOrEqual(100);
      expect(match.explanation.ratingScore).toBeLessThanOrEqual(100);
    });

    it('should include "Why this provider?" explanation', () => {
      const match = calculateProviderMatch(mockProviders[0], mockPatient);
      
      expect(match.explanation.whyThisProvider).toBeDefined();
      expect(match.explanation.whyThisProvider).toContain(mockProviders[0].name);
      expect(match.explanation.whyThisProvider).toContain('top recommendation because');
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

    it('should prioritize providers with better multi-factor scores', () => {
      const matches = findMatchingProviders(mockProviders, mockPatient, 3);
      
      // First match should be the Physical Therapy provider (specialty + insurance match)
      expect(matches[0].provider.type).toBe('Physical Therapy');
      expect(matches[0].inNetwork).toBe(true);
      expect(matches[0].matchScore).toBeGreaterThan(70); // Should score high due to perfect matches
    });
  });

  describe('generateProviderRecommendationExplanation', () => {
    it('should generate comprehensive "Why this provider?" explanations', () => {
      const explanation = generateProviderRecommendationExplanation({
        matchScore: 85,
        inNetwork: true,
        specialtyMatch: true,
        distance: 3.2,
        availabilityScore: 95,
        ratingScore: 4.8,
        providerName: 'Boston Physical Therapy Center',
        requiredService: 'Physical Therapy'
      });

      expect(explanation).toContain('Boston Physical Therapy Center is our top recommendation because');
      expect(explanation).toContain('insurance plan');
      expect(explanation).toContain('expertise in physical therapy');
      expect(explanation).toContain('reasonably close');
      expect(explanation).toContain('immediately or tomorrow');
      expect(explanation).toContain('outstanding patient satisfaction ratings');
    });

    it('should handle providers with limited benefits gracefully', () => {
      const explanation = generateProviderRecommendationExplanation({
        matchScore: 45,
        inNetwork: false,
        specialtyMatch: false,
        distance: 25,
        availabilityScore: 30,
        ratingScore: 3.2,
        providerName: 'Generic Provider',
        requiredService: 'Physical Therapy'
      });

      expect(explanation).toContain('Generic Provider');
      expect(explanation).toContain('physical therapy services');
    });

    it('should provide appropriate match quality assessment', () => {
      const excellentMatch = generateProviderRecommendationExplanation({
        matchScore: 95,
        inNetwork: true,
        specialtyMatch: true,
        distance: 1,
        availabilityScore: 100,
        ratingScore: 5.0,
        providerName: 'Perfect Provider',
        requiredService: 'Physical Therapy'
      });

      const poorMatch = generateProviderRecommendationExplanation({
        matchScore: 40,
        inNetwork: false,
        specialtyMatch: true, // Give it at least one reason so it doesn't fall into edge case
        distance: 30,
        availabilityScore: 20,
        ratingScore: 3.0,
        providerName: 'Poor Provider',
        requiredService: 'Physical Therapy'
      });

      expect(excellentMatch).toContain('exceptional match');
      expect(poorMatch).toContain('consider other options');
    });
  });
});