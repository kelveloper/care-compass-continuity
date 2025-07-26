import { Provider, ProviderMatch, Patient } from "@/types";

/**
 * Calculate distance between two points using Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Get approximate coordinates for Boston area addresses (simplified geocoding)
 */
export function getApproximateCoordinates(address: string): { lat: number; lng: number } {
  const addressLower = address.toLowerCase();
  
  // Boston neighborhoods
  if (addressLower.includes('beacon hill') || addressLower.includes('beacon st')) {
    return { lat: 42.3584, lng: -71.0598 };
  } else if (addressLower.includes('back bay') || addressLower.includes('boylston')) {
    return { lat: 42.3505, lng: -71.0743 };
  } else if (addressLower.includes('south end')) {
    return { lat: 42.3398, lng: -71.0621 };
  } else if (addressLower.includes('cambridge')) {
    return { lat: 42.3736, lng: -71.1097 };
  } else if (addressLower.includes('brookline')) {
    return { lat: 42.3467, lng: -71.1206 };
  } else if (addressLower.includes('somerville')) {
    return { lat: 42.3875, lng: -71.0995 };
  } else if (addressLower.includes('boston')) {
    return { lat: 42.3601, lng: -71.0589 }; // Downtown Boston
  }
  
  // Default to Boston center
  return { lat: 42.3601, lng: -71.0589 };
}

/**
 * Check if provider is in network for patient's insurance
 * Implements insurance network matching requirement
 * 
 * @param provider - The provider to check
 * @param patientInsurance - The patient's insurance plan
 * @returns boolean indicating if the provider is in-network
 */
export function isInNetwork(provider: Provider, patientInsurance: string): boolean {
  if (!patientInsurance) {
    return false;
  }
  
  // Check both in_network_plans and accepted_insurance for compatibility
  const networkPlans = provider.in_network_plans || [];
  const acceptedInsurance = provider.accepted_insurance || [];
  
  if (networkPlans.length === 0 && acceptedInsurance.length === 0) {
    return false;
  }
  
  const patientInsuranceLower = patientInsurance.toLowerCase();
  
  // Check in_network_plans first (primary field in database)
  const inNetworkMatch = networkPlans.some(plan => {
    const planLower = plan.toLowerCase();
    
    // Exact match
    if (planLower === patientInsuranceLower) {
      return true;
    }
    
    // Partial match - check if the plan contains the patient's insurance name
    // or if the patient's insurance contains the plan name
    return planLower.includes(patientInsuranceLower) || 
           patientInsuranceLower.includes(planLower);
  });
  
  if (inNetworkMatch) {
    return true;
  }
  
  // Fallback to accepted_insurance for backward compatibility
  return acceptedInsurance.some(insurance => {
    const insuranceLower = insurance.toLowerCase();
    
    // Exact match
    if (insuranceLower === patientInsuranceLower) {
      return true;
    }
    
    // Partial match
    return insuranceLower.includes(patientInsuranceLower) || 
           patientInsuranceLower.includes(insuranceLower);
  });
}

/**
 * Check if provider specialty matches required followup
 * Implements specialty matching requirement
 * 
 * @param provider - The provider to check
 * @param requiredFollowup - The required followup service
 * @returns boolean indicating if the provider's specialty matches the required followup
 */
export function hasSpecialtyMatch(provider: Provider, requiredFollowup: string): boolean {
  if (!requiredFollowup || !provider.specialties) {
    return false;
  }
  
  // If specialties array is empty, rely only on provider type
  if (provider.specialties.length === 0) {
    const followupLower = requiredFollowup.toLowerCase();
    const providerType = provider.type.toLowerCase();
    
    // Check if provider type directly matches required followup
    return providerType.includes(followupLower) || followupLower.includes(providerType);
  }
  
  const followupLower = requiredFollowup.toLowerCase();
  const providerType = provider.type.toLowerCase();
  
  // Map common terms to standardized specialties for better matching
  const specialtyMap: Record<string, string[]> = {
    'physical therapy': ['physical therapy', 'rehabilitation', 'sports medicine', 'pt'],
    'cardiology': ['cardiology', 'heart', 'cardiac', 'cardiovascular'],
    'orthopedics': ['orthopedics', 'orthopedic', 'bone', 'joint', 'musculoskeletal'],
    'surgery': ['surgery', 'surgical', 'operative'],
    'neurosurgery': ['neurosurgery', 'brain surgery', 'spine surgery', 'neurological surgery'],
    'primary care': ['primary care', 'family medicine', 'internal medicine', 'general practice'],
    'pediatrics': ['pediatrics', 'children', 'child', 'adolescent'],
    'obgyn': ['obgyn', 'obstetrics', 'gynecology', 'women\'s health'],
    'dermatology': ['dermatology', 'skin', 'cosmetic'],
    'psychiatry': ['psychiatry', 'mental health', 'behavioral health', 'psychology']
  };
  
  // Direct type matches
  for (const [specialty, terms] of Object.entries(specialtyMap)) {
    if (terms.some(term => followupLower.includes(term)) && 
        (providerType.includes(specialty) || terms.some(term => providerType.includes(term)))) {
      return true;
    }
  }
  
  // Check if provider type directly matches required followup
  if (providerType.includes(followupLower) || followupLower.includes(providerType)) {
    return true;
  }
  
  // Specialty matches - check each specialty against required followup
  return provider.specialties.some(specialty => {
    const specialtyLower = specialty.toLowerCase();
    
    // Direct match
    if (specialtyLower === followupLower) {
      return true;
    }
    
    // Partial match
    if (specialtyLower.includes(followupLower) || followupLower.includes(specialtyLower)) {
      return true;
    }
    
    // Check against mapped terms
    for (const terms of Object.values(specialtyMap)) {
      if (terms.some(term => specialtyLower.includes(term)) && 
          terms.some(term => followupLower.includes(term))) {
        return true;
      }
    }
    
    return false;
  });
}

/**
 * Calculate availability score based on next available appointment
 * Implements availability filtering requirement
 * 
 * @param availabilityText - Text describing next available appointment
 * @returns Numeric score from 0-100 representing availability (higher is better)
 */
export function calculateAvailabilityScore(availabilityText: string | null): number {
  if (!availabilityText) return 0;
  
  const text = availabilityText.toLowerCase();
  const currentDate = new Date();
  const currentDay = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
  
  // Immediate availability (0-1 days)
  if (text.includes('today') || text.includes('same day') || text.includes('immediately')) {
    return 100;
  } 
  
  // Very soon (1-2 days)
  if (text.includes('tomorrow') || text.includes('next day')) {
    return 95;
  }
  
  // This week (specific days)
  const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < weekdays.length; i++) {
    if (text.includes(weekdays[i])) {
      // Calculate days until this weekday
      let daysUntil = (i - currentDay + 7) % 7;
      if (daysUntil === 0) daysUntil = 7; // If today's name is mentioned, assume next week
      
      // Score based on how soon the day is (closer = higher score)
      return Math.max(30, 100 - (daysUntil * 10));
    }
  }
  
  // This week (general)
  if (text.includes('this week')) {
    return 80;
  }
  
  // Next week
  if (text.includes('next week')) {
    return 60;
  }
  
  // Within 2 weeks
  if (text.includes('within 2 weeks') || text.includes('within two weeks')) {
    return 50;
  }
  
  // Specific months
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const currentMonth = currentDate.getMonth(); // 0-11
  
  for (let i = 0; i < months.length; i++) {
    if (text.includes(months[i])) {
      // Calculate months until this month
      let monthsUntil = (i - currentMonth + 12) % 12;
      if (monthsUntil === 0) monthsUntil = 12; // If current month is mentioned, assume next year
      
      // Score based on how soon the month is (closer = higher score)
      return Math.max(10, 50 - (monthsUntil * 5));
    }
  }
  
  // General timeframes
  if (text.includes('next month')) {
    return 40;
  }
  
  if (text.includes('within a month') || text.includes('within 1 month')) {
    return 35;
  }
  
  if (text.includes('within 2 months') || text.includes('within two months')) {
    return 25;
  }
  
  if (text.includes('within 3 months') || text.includes('within three months')) {
    return 15;
  }
  
  // Default for any other availability text
  return 20;
}

/**
 * Calculate geographic proximity score based on distance
 * Implements geographic proximity requirement
 * 
 * @param distance - Distance in miles between patient and provider
 * @returns Numeric score from 0-100 representing proximity (higher is better)
 */
export function calculateProximityScore(distance: number): number {
  // Scoring tiers based on distance
  if (distance < 1) {
    return 100; // Very close (< 1 mile)
  } else if (distance < 3) {
    return 90; // Close (1-3 miles)
  } else if (distance < 5) {
    return 80; // Reasonable (3-5 miles)
  } else if (distance < 10) {
    return 70; // Moderate (5-10 miles)
  } else if (distance < 15) {
    return 60; // Getting far (10-15 miles)
  } else if (distance < 20) {
    return 50; // Far (15-20 miles)
  } else if (distance < 30) {
    return 40; // Very far (20-30 miles)
  } else if (distance < 50) {
    return 30; // Distant (30-50 miles)
  } else {
    return Math.max(0, 25 - Math.floor((distance - 50) / 10)); // Decreasing score for distances > 50 miles
  }
}

/**
 * Multi-factor scoring algorithm weights and configuration
 * These weights determine the relative importance of each matching factor
 */
export const SCORING_WEIGHTS = {
  insurance: 0.30,   // Insurance network match is most critical (30%)
  distance: 0.25,    // Geographic proximity is very important (25%)
  specialty: 0.20,   // Specialty match is important (20%)
  availability: 0.15, // Availability timing matters (15%)
  rating: 0.10,      // Provider quality/rating (10%)
} as const;

/**
 * Get detailed explanation of the scoring algorithm
 * @returns Object describing how the multi-factor scoring works
 */
export function getScoringAlgorithmExplanation() {
  return {
    description: "Multi-factor provider matching algorithm that evaluates providers across 5 key dimensions",
    factors: [
      {
        name: "Insurance Network Match",
        weight: SCORING_WEIGHTS.insurance,
        description: "In-network providers receive full points (100), out-of-network receive penalty (25)",
        importance: "Most critical - affects patient costs significantly"
      },
      {
        name: "Geographic Distance",
        weight: SCORING_WEIGHTS.distance,
        description: "Closer providers score higher using distance-based tiers",
        importance: "Very important - affects patient convenience and compliance"
      },
      {
        name: "Specialty Match",
        weight: SCORING_WEIGHTS.specialty,
        description: "Providers matching required service type receive full points (100)",
        importance: "Important - ensures appropriate care expertise"
      },
      {
        name: "Availability",
        weight: SCORING_WEIGHTS.availability,
        description: "Earlier availability receives higher scores (immediate=100, later=lower)",
        importance: "Moderately important - affects care continuity timing"
      },
      {
        name: "Provider Rating",
        weight: SCORING_WEIGHTS.rating,
        description: "5-star rating system converted to 100-point scale",
        importance: "Least important but still factors in quality assessment"
      }
    ],
    totalWeight: Object.values(SCORING_WEIGHTS).reduce((sum, weight) => sum + weight, 0),
    scoreRange: "0-100 (higher scores indicate better matches)"
  };
}

/**
 * Generate "Why this provider?" explanation based on match factors
 * @param params - Object containing match parameters
 * @returns String explanation of why this provider is recommended
 */
export function generateProviderRecommendationExplanation(params: {
  matchScore: number;
  inNetwork: boolean;
  specialtyMatch: boolean;
  distance: number;
  availabilityScore: number;
  ratingScore: number;
  providerName: string;
  requiredService: string;
}): string {
  const {
    matchScore,
    inNetwork,
    specialtyMatch,
    distance,
    availabilityScore,
    ratingScore,
    providerName,
    requiredService
  } = params;

  let explanation = `${providerName} is our top recommendation because `;
  const reasons: string[] = [];

  // Primary reasons (highest weighted factors) - Insurance Network (30% weight)
  if (inNetwork) {
    reasons.push("they accept your insurance plan, which means lower out-of-pocket costs");
  } else {
    reasons.push("they provide the specialized care you need (though they're out-of-network, which may cost more)");
  }

  // Specialty Match (20% weight)
  if (specialtyMatch) {
    reasons.push(`they have proven expertise in ${requiredService.toLowerCase()}`);
  } else {
    reasons.push(`they can provide ${requiredService.toLowerCase()} services`);
  }

  // Geographic Distance (25% weight)
  if (distance < 1) {
    reasons.push(`they're extremely convenient to reach (less than 1 mile from your location)`);
  } else if (distance < 3) {
    reasons.push(`they're very close to your location (${Math.round(distance * 10) / 10} miles away)`);
  } else if (distance < 10) {
    reasons.push(`they're reasonably close (${Math.round(distance * 10) / 10} miles from your location)`);
  } else if (distance < 20) {
    reasons.push(`they're within a reasonable driving distance (${Math.round(distance * 10) / 10} miles away)`);
  } else {
    reasons.push(`they're available for your care needs (${Math.round(distance * 10) / 10} miles from your location)`);
  }

  // Availability (15% weight)
  if (availabilityScore >= 95) {
    reasons.push("they can see you immediately or tomorrow");
  } else if (availabilityScore >= 80) {
    reasons.push("they have excellent availability this week");
  } else if (availabilityScore >= 60) {
    reasons.push("they have good availability next week");
  } else if (availabilityScore >= 40) {
    reasons.push("they can schedule you within the next month");
  } else {
    reasons.push("they're working to accommodate your scheduling needs");
  }

  // Provider Rating (10% weight)
  if (ratingScore >= 4.8) {
    reasons.push("they have outstanding patient satisfaction ratings (4.8+ stars)");
  } else if (ratingScore >= 4.5) {
    reasons.push("they have excellent patient reviews (4.5+ stars)");
  } else if (ratingScore >= 4.0) {
    reasons.push("they have strong patient satisfaction scores (4.0+ stars)");
  } else if (ratingScore >= 3.5) {
    reasons.push("they maintain good patient relationships");
  }

  // Handle edge cases
  if (reasons.length === 0) {
    return `${providerName} is available to provide ${requiredService.toLowerCase()} services and can help with your care needs.`;
  }

  // Construct the explanation with better flow
  if (reasons.length === 1) {
    explanation += reasons[0] + ".";
  } else if (reasons.length === 2) {
    explanation += reasons[0] + " and " + reasons[1] + ".";
  } else if (reasons.length === 3) {
    explanation += reasons[0] + ", " + reasons[1] + ", and " + reasons[2] + ".";
  } else {
    // For 4+ reasons, group them better
    const lastReason = reasons.pop();
    explanation += reasons.slice(0, -1).join(", ") + ", " + reasons[reasons.length - 1] + ", and " + lastReason + ".";
  }

  // Add personalized match score context
  if (matchScore >= 90) {
    explanation += " This is an exceptional match that meets all your key requirements.";
  } else if (matchScore >= 80) {
    explanation += " This is an excellent match for your specific needs.";
  } else if (matchScore >= 70) {
    explanation += " This provider is a strong match for your care requirements.";
  } else if (matchScore >= 60) {
    explanation += " This provider meets most of your important criteria.";
  } else if (matchScore >= 50) {
    explanation += " While not perfect, this provider can address your care needs effectively.";
  } else {
    explanation += " This provider is available to help, though you may want to consider other options if available.";
  }

  return explanation;
}

/**
 * Calculate comprehensive provider match score using multi-factor scoring algorithm
 * Implements all required scoring factors with proper weighting:
 * - Distance weight (closer = better) - 25%
 * - Insurance network match (in-network = higher score) - 30%
 * - Availability (sooner = better) - 15%
 * - Provider rating - 10%
 * - Specialty match - 20%
 * 
 * @param provider - Provider to evaluate
 * @param patient - Patient to match with
 * @returns ProviderMatch object with scores and explanations
 */
export function calculateProviderMatch(
  provider: Provider,
  patient: Patient
): ProviderMatch {
  // Calculate geographic distance using coordinates
  const patientCoords = getApproximateCoordinates(patient.address);
  const providerCoords = {
    lat: provider.latitude || 42.3601,
    lng: provider.longitude || -71.0589
  };
  
  const distance = calculateDistance(
    patientCoords.lat,
    patientCoords.lng,
    providerCoords.lat,
    providerCoords.lng
  );
  
  // Factor 1: Insurance network matching (30% weight)
  const inNetwork = isInNetwork(provider, patient.insurance);
  const insuranceScore = inNetwork ? 100 : 25; // Strong penalty for out-of-network
  
  // Factor 2: Specialty matching (20% weight)
  const specialtyMatch = hasSpecialtyMatch(provider, patient.required_followup);
  const specialtyScore = specialtyMatch ? 100 : 15; // Strong penalty for specialty mismatch
  
  // Factor 3: Distance weight - closer is better (25% weight)
  const distanceScore = calculateProximityScore(distance);
  
  // Factor 4: Availability - sooner is better (15% weight)
  const availabilityScore = calculateAvailabilityScore(provider.availability_next);
  
  // Factor 5: Provider rating (10% weight)
  const ratingScore = Math.min(100, Math.max(0, (provider.rating / 5) * 100)); // Convert 5-star to 100-point scale
  
  // Calculate weighted total score using multi-factor scoring algorithm
  const matchScore = Math.round(
    insuranceScore * SCORING_WEIGHTS.insurance +
    distanceScore * SCORING_WEIGHTS.distance +
    specialtyScore * SCORING_WEIGHTS.specialty +
    availabilityScore * SCORING_WEIGHTS.availability +
    ratingScore * SCORING_WEIGHTS.rating
  );
  
  // Generate detailed explanation reasons
  const reasons: string[] = [];
  
  // Insurance network explanation (most important factor)
  if (inNetwork) {
    reasons.push("✓ In your insurance network");
  } else {
    reasons.push("⚠ Out-of-network provider (higher costs)");
  }
  
  // Specialty match explanation (second most important)
  if (specialtyMatch) {
    reasons.push(`✓ Specializes in ${patient.required_followup}`);
  } else {
    reasons.push(`⚠ May not specialize in ${patient.required_followup}`);
  }
  
  // Distance explanation (third most important)
  if (distance < 1) {
    reasons.push("✓ Very close to your location (< 1 mile)");
  } else if (distance < 5) {
    reasons.push(`✓ Close to your location (${Math.round(distance * 10) / 10} miles)`);
  } else if (distance < 15) {
    reasons.push(`• ${Math.round(distance * 10) / 10} miles from your location`);
  } else {
    reasons.push(`⚠ Far from your location (${Math.round(distance * 10) / 10} miles)`);
  }
  
  // Availability explanation
  if (availabilityScore >= 95) {
    reasons.push("✓ Available immediately or tomorrow");
  } else if (availabilityScore >= 80) {
    reasons.push("✓ Available this week");
  } else if (availabilityScore >= 60) {
    reasons.push("• Available next week");
  } else if (availabilityScore >= 40) {
    reasons.push("• Available within a month");
  } else {
    reasons.push("⚠ Limited availability");
  }
  
  // Rating explanation
  if (provider.rating >= 4.8) {
    reasons.push("✓ Exceptionally highly rated (4.8+ stars)");
  } else if (provider.rating >= 4.5) {
    reasons.push("✓ Highly rated by patients (4.5+ stars)");
  } else if (provider.rating >= 4.0) {
    reasons.push("• Well-rated provider (4.0+ stars)");
  } else if (provider.rating >= 3.5) {
    reasons.push("• Average rating (3.5+ stars)");
  } else {
    reasons.push("⚠ Below average rating");
  }
  
  // Generate "Why this provider?" explanation
  const whyThisProvider = generateProviderRecommendationExplanation({
    matchScore,
    inNetwork,
    specialtyMatch,
    distance,
    availabilityScore,
    ratingScore: provider.rating,
    providerName: provider.name,
    requiredService: patient.required_followup
  });

  return {
    provider: {
      ...provider,
      distance: Math.round(distance * 10) / 10, // Round to 1 decimal
      matchScore,
      inNetwork,
      specialtyMatch,
      availabilityScore,
    },
    matchScore,
    distance: Math.round(distance * 10) / 10,
    inNetwork,
    explanation: {
      distanceScore,
      insuranceScore,
      availabilityScore,
      specialtyScore,
      ratingScore,
      reasons,
      whyThisProvider, // Always include the "Why this provider?" explanation
    },
  };
}

/**
 * Find and rank providers for a patient
 * Enhanced to handle real data with proper error handling and validation
 */
export function findMatchingProviders(
  providers: Provider[],
  patient: Patient,
  limit: number = 5
): ProviderMatch[] {
  if (!Array.isArray(providers) || providers.length === 0) {
    console.warn('No providers available for matching');
    return [];
  }
  
  if (!patient || !patient.address || !patient.insurance || !patient.required_followup) {
    console.warn('Patient data incomplete for matching');
    return [];
  }
  
  try {
    // Filter out providers with missing critical data
    const validProviders = providers.filter(provider => 
      provider && 
      provider.id && 
      provider.name && 
      provider.address && 
      (provider.specialties || provider.type)
    );
    
    if (validProviders.length === 0) {
      console.warn('No valid providers available for matching');
      return [];
    }
    
    // Calculate match scores for each provider
    const providerMatches = validProviders.map(provider => {
      try {
        return calculateProviderMatch(provider, patient);
      } catch (err) {
        console.error(`Error calculating match for provider ${provider.id}:`, err);
        // Return a default low-score match if calculation fails
        return {
          provider,
          matchScore: 10, // Low score for providers with errors
          distance: 999, // High distance (low priority)
          inNetwork: false,
          explanation: {
            distanceScore: 0,
            insuranceScore: 0,
            availabilityScore: 0,
            specialtyScore: 0,
            ratingScore: 0,
            reasons: ['Error calculating match score']
          }
        };
      }
    });
    
    // Sort by match score and limit results
    const sortedMatches = providerMatches
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);
    
    return sortedMatches;
  } catch (err) {
    console.error('Error in provider matching algorithm:', err);
    return [];
  }
}