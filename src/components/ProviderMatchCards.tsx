import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, CheckCircle2, Star, Phone, X, Loader2, AlertCircle } from "lucide-react";
import { useProviderMatch } from "@/hooks/use-provider-match";
import { useOptimisticUpdates } from "@/hooks/use-optimistic-updates";
import { Patient, Provider, ProviderMatch } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useListKeyboardNavigation } from "@/hooks/use-keyboard-navigation";
import { useInteractionTracking, useEngagementTracking } from "@/hooks/use-analytics";

interface ProviderMatchCardsProps {
  patient: Patient;
  onProviderSelected: (provider: Provider) => void;
  onCancel: () => void;
}

export const ProviderMatchCards = ({ 
  patient, 
  onProviderSelected, 
  onCancel 
}: ProviderMatchCardsProps) => {
  const { trackProviderAction, trackFlow } = useInteractionTracking();
  const { trackFeatureUse } = useEngagementTracking();
  
  const { findMatches, isMatching, error, providersLoading, isReady, refreshProviders } = useProviderMatch();
  const [matches, setMatches] = useState<ProviderMatch[]>([]);
  const { toast } = useToast();
  
  // Use optimistic updates for provider selection
  const { selectProvider: selectProviderOptimistic } = useOptimisticUpdates();

  // Keyboard navigation for provider cards
  const {
    selectedIndex,
    setSelectedIndex,
    focusItem,
    setItemRef,
  } = useListKeyboardNavigation(
    matches,
    (match, index) => {
      // Create a safe provider object with all required properties
      const safeProvider = {
        ...match.provider,
        distance: typeof match.distance === 'number' ? match.distance : 0,
        distanceText: `${match.distance} miles`,
        availability: match.provider.availability_next || "Call to schedule",
        inNetwork: !!match.inNetwork,
        rating: match.provider.rating || 0,
        specialties: match.provider.specialties || [],
        accepted_insurance: match.provider.accepted_insurance || [],
        in_network_plans: match.provider.in_network_plans || [],
      };
      
      selectProviderOptimistic(patient.id, safeProvider, onProviderSelected);
      trackProviderAction('select');
      trackFlow('provider_selected', 'provider_matching');
    },
    onCancel
  );

  useEffect(() => {
    const loadMatches = async () => {
      if (!isReady || !patient) {
        return;
      }

      try {
        // First refresh providers to ensure we have the latest data
        await refreshProviders();
        
        // Then find matches based on the patient's required followup
        trackProviderAction('search');
        trackFeatureUse('provider_matching');
        const providerMatches = await findMatches(patient, patient.required_followup, 3);
        
        // Validate the matches to ensure they have all required properties
        const validatedMatches = providerMatches.map(match => {
          // Ensure provider has all required properties
          const provider = {
            ...match.provider,
            id: match.provider.id || 'unknown',
            name: match.provider.name || 'Unknown Provider',
            type: match.provider.type || 'Unknown Type',
            address: match.provider.address || 'Unknown Address',
            phone: match.provider.phone || 'Unknown',
            specialties: Array.isArray(match.provider.specialties) ? match.provider.specialties : [],
            accepted_insurance: Array.isArray(match.provider.accepted_insurance) ? match.provider.accepted_insurance : [],
            in_network_plans: Array.isArray(match.provider.in_network_plans) ? match.provider.in_network_plans : [],
            rating: typeof match.provider.rating === 'number' ? match.provider.rating : 0,
            created_at: match.provider.created_at || new Date().toISOString(),
          };
          
          return {
            ...match,
            provider,
            distance: typeof match.distance === 'number' ? match.distance : 0,
            matchScore: typeof match.matchScore === 'number' ? match.matchScore : 0,
            inNetwork: !!match.inNetwork,
            explanation: {
              ...match.explanation,
              distanceScore: typeof match.explanation.distanceScore === 'number' ? match.explanation.distanceScore : 0,
              insuranceScore: typeof match.explanation.insuranceScore === 'number' ? match.explanation.insuranceScore : 0,
              availabilityScore: typeof match.explanation.availabilityScore === 'number' ? match.explanation.availabilityScore : 0,
              specialtyScore: typeof match.explanation.specialtyScore === 'number' ? match.explanation.specialtyScore : 0,
              ratingScore: typeof match.explanation.ratingScore === 'number' ? match.explanation.ratingScore : 0,
              reasons: Array.isArray(match.explanation.reasons) ? match.explanation.reasons : ['No explanation available'],
            }
          };
        });
        
        setMatches(validatedMatches);
        
        if (validatedMatches.length === 0) {
          toast({
            title: "No matching providers found",
            description: "Try adjusting the search criteria or contact support for assistance.",
            variant: "destructive",
          });
        }
      } catch (err) {
        console.error('Failed to find provider matches:', err);
        toast({
          title: "Error finding providers",
          description: "There was a problem connecting to the database. Please try again.",
          variant: "destructive",
        });
      }
    };

    loadMatches();
  }, [patient, isReady, findMatches, refreshProviders, toast]);

  // Determine the specialty type for the header
  const getSpecialtyType = (followup: string) => {
    const followupLower = followup.toLowerCase();
    if (followupLower.includes('physical therapy')) return 'Physical Therapy';
    if (followupLower.includes('cardiology')) return 'Cardiology';
    if (followupLower.includes('orthopedics')) return 'Orthopedics';
    if (followupLower.includes('surgery')) return 'Surgery';
    if (followupLower.includes('neurosurgery')) return 'Neurosurgery';
    return 'Specialist Care';
  };

  const specialtyType = getSpecialtyType(patient.required_followup);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            Smart Provider Match - {specialtyType}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-muted-foreground">
          AI-recommended providers based on proximity, availability, and insurance coverage
          <br />
          <span className="text-xs text-muted-foreground/80">
            Use <kbd className="px-1 py-0.5 text-xs bg-muted rounded">↑↓</kbd> to navigate, 
            <kbd className="px-1 py-0.5 text-xs bg-muted rounded mx-1">Enter</kbd> to select, 
            <kbd className="px-1 py-0.5 text-xs bg-muted rounded">Esc</kbd> to close
          </span>
        </p>
      </CardHeader>
      <CardContent>
        {/* Loading State */}
        {(isMatching || providersLoading) && (
          <div className="space-y-6">
            {/* Loading message */}
            <div className="flex items-center justify-center py-4">
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-primary" />
                <span className="text-sm sm:text-base text-muted-foreground">Finding best provider matches...</span>
              </div>
            </div>
            
            {/* Provider card skeletons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {[...Array(3)].map((_, index) => (
                <div
                  key={index}
                  className={`relative rounded-lg border-2 transition-all ${
                    index === 0 
                      ? 'border-primary bg-primary-light/30' 
                      : 'border-border bg-card'
                  }`}
                >
                  {index === 0 && (
                    <div className="absolute -top-3 left-4 bg-muted px-3 py-1 rounded-full">
                      <div className="h-3 w-20 bg-muted-foreground/20 rounded animate-pulse"></div>
                    </div>
                  )}
                  
                  <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                    {/* Provider Header Skeleton */}
                    <div>
                      <div className="h-5 sm:h-6 w-32 sm:w-40 bg-muted rounded mb-2 animate-pulse"></div>
                      <div className="h-3 sm:h-4 w-20 sm:w-24 bg-muted rounded mb-2 animate-pulse"></div>
                      <div className="flex items-center gap-1">
                        <div className="h-3 w-3 sm:h-4 sm:w-4 bg-muted rounded animate-pulse"></div>
                        <div className="h-3 sm:h-4 w-6 sm:w-8 bg-muted rounded animate-pulse"></div>
                        <div className="h-3 w-12 sm:w-16 bg-muted rounded animate-pulse"></div>
                      </div>
                    </div>

                    {/* Key Information Skeleton */}
                    <div className="space-y-2 sm:space-y-3">
                      {/* Availability */}
                      <div className="flex items-start gap-2">
                        <div className="h-3 w-3 sm:h-4 sm:w-4 bg-muted rounded mt-0.5 animate-pulse flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <div className="h-3 sm:h-4 w-20 sm:w-24 bg-muted rounded mb-1 animate-pulse"></div>
                          <div className="h-3 sm:h-4 w-24 sm:w-32 bg-muted rounded animate-pulse"></div>
                        </div>
                      </div>

                      {/* Distance */}
                      <div className="flex items-start gap-2">
                        <div className="h-3 w-3 sm:h-4 sm:w-4 bg-muted rounded mt-0.5 animate-pulse flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <div className="h-3 sm:h-4 w-12 sm:w-16 bg-muted rounded mb-1 animate-pulse"></div>
                          <div className="h-3 sm:h-4 w-20 sm:w-28 bg-muted rounded mb-1 animate-pulse"></div>
                          <div className="h-3 w-28 sm:w-36 bg-muted rounded animate-pulse"></div>
                        </div>
                      </div>

                      {/* Insurance */}
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 sm:h-4 sm:w-4 bg-muted rounded animate-pulse flex-shrink-0"></div>
                        <div className="h-5 sm:h-6 w-20 sm:w-24 bg-muted rounded-full animate-pulse"></div>
                      </div>
                    </div>

                    {/* Specialties Skeleton */}
                    <div>
                      <div className="h-3 sm:h-4 w-16 sm:w-20 bg-muted rounded mb-1 sm:mb-2 animate-pulse"></div>
                      <div className="flex flex-wrap gap-1">
                        <div className="h-4 sm:h-5 w-12 sm:w-16 bg-muted rounded-full animate-pulse"></div>
                        <div className="h-4 sm:h-5 w-16 sm:w-20 bg-muted rounded-full animate-pulse"></div>
                      </div>
                    </div>

                    {/* Explanation Skeleton */}
                    <div className="bg-accent/50 rounded-lg p-2 sm:p-3 space-y-1 sm:space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-muted rounded-full animate-pulse flex-shrink-0"></div>
                        <div className="h-3 sm:h-4 w-24 sm:w-32 bg-muted rounded animate-pulse"></div>
                      </div>
                      <div className="space-y-1">
                        <div className="h-3 w-full bg-muted rounded animate-pulse"></div>
                        <div className="h-3 w-3/4 bg-muted rounded animate-pulse"></div>
                      </div>
                    </div>

                    {/* Match Score Skeleton */}
                    <div className="space-y-0.5 sm:space-y-1">
                      <div className="h-3 w-20 sm:w-24 bg-muted rounded animate-pulse"></div>
                      <div className="h-3 w-full bg-muted rounded animate-pulse"></div>
                      <div className="h-3 w-5/6 bg-muted rounded animate-pulse"></div>
                    </div>

                    {/* Action Buttons Skeleton */}
                    <div className="space-y-2">
                      <div className="h-8 sm:h-10 w-full bg-muted rounded animate-pulse"></div>
                      <div className="h-7 sm:h-8 w-full bg-muted rounded animate-pulse"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !(isMatching || providersLoading) && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-6 w-6" />
              <span className="font-medium">Failed to load providers</span>
            </div>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              {error}
            </p>
            <Button 
              onClick={async () => {
                // Retry loading matches with proper error handling
                setMatches([]);
                try {
                  // First refresh providers to ensure we have the latest data
                  await refreshProviders();
                  
                  // Then find matches based on the patient's required followup
                  const providerMatches = await findMatches(patient, patient.required_followup, 3);
                  setMatches(providerMatches);
                  
                  if (providerMatches.length > 0) {
                    toast({
                      title: "Providers found",
                      description: `Found ${providerMatches.length} matching providers.`,
                    });
                  } else {
                    toast({
                      title: "No matching providers found",
                      description: "Try adjusting the search criteria or contact support for assistance.",
                      variant: "destructive",
                    });
                  }
                } catch (err) {
                  console.error('Failed to find provider matches:', err);
                  toast({
                    title: "Error finding providers",
                    description: "There was a problem connecting to the database. Please try again.",
                    variant: "destructive",
                  });
                }
              }}
              variant="outline"
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        )}

        {/* Provider Matches */}
        {!(isMatching || providersLoading) && !error && matches.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {matches.map((match, index) => (
                <div
                  key={match.provider.id}
                  ref={setItemRef(index)}
                  tabIndex={0}
                  role="button"
                  aria-label={`Select ${match.provider.name}, ${match.provider.type}, ${match.distance} miles away, ${match.inNetwork ? 'In-network' : 'Out-of-network'}`}
                  className={`relative rounded-lg border-2 transition-all hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer ${
                    index === 0 
                      ? 'border-primary bg-primary-light/30' 
                      : 'border-border bg-card hover:border-primary/50'
                  } ${
                    selectedIndex === index ? 'ring-2 ring-primary ring-offset-2' : ''
                  }`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      // Create a safe provider object with all required properties
                      const safeProvider = {
                        ...match.provider,
                        distance: typeof match.distance === 'number' ? match.distance : 0,
                        distanceText: `${match.distance} miles`,
                        availability: match.provider.availability_next || "Call to schedule",
                        inNetwork: !!match.inNetwork,
                        rating: match.provider.rating || 0,
                        specialties: match.provider.specialties || [],
                        accepted_insurance: match.provider.accepted_insurance || [],
                        in_network_plans: match.provider.in_network_plans || [],
                      };
                      
                      selectProviderOptimistic(patient.id, safeProvider, onProviderSelected);
                    }
                  }}
                  onFocus={() => setSelectedIndex(index)}
                >
                  {index === 0 && (
                    <div className="absolute -top-3 left-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold">
                      Best Match ({match.matchScore}%)
                    </div>
                  )}
                  
                  <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                    {/* Provider Header */}
                    <div>
                      <h3 className="font-bold text-base sm:text-lg text-foreground truncate">{match.provider.name}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">{match.provider.type}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="h-3 w-3 sm:h-4 sm:w-4 fill-warning text-warning" />
                        <span className="text-xs sm:text-sm font-medium">{match.provider.rating}</span>
                        <span className="text-xs text-muted-foreground">(Reviews)</span>
                      </div>
                    </div>

                    {/* Key Information */}
                    <div className="space-y-2 sm:space-y-3">
                      <div className="flex items-start gap-2">
                        <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-success mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-medium text-foreground">Next Available</p>
                          <p className="text-xs sm:text-sm text-success font-semibold truncate">
                            {match.provider.availability_next || "Call to schedule"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-primary mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-medium text-foreground">Distance</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">{match.distance} miles from patient</p>
                          <p className="text-xs text-muted-foreground truncate">{match.provider.address}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <CheckCircle2 className={`h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 ${match.inNetwork ? 'text-success' : 'text-muted-foreground'}`} />
                        <div>
                          <Badge 
                            variant={match.inNetwork ? "default" : "secondary"}
                            className={`text-xs ${match.inNetwork ? "bg-success-light text-success border-success" : ""}`}
                          >
                            {match.inNetwork ? "In-Network ✓" : "Out-of-Network"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Specialties */}
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-foreground mb-1 sm:mb-2">Specialties</p>
                      <div className="flex flex-wrap gap-1">
                        {match.provider.specialties.slice(0, 2).map((specialty) => (
                          <Badge key={specialty} variant="outline" className="text-xs truncate max-w-[120px]">
                            {specialty}
                          </Badge>
                        ))}
                        {match.provider.specialties.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{match.provider.specialties.length - 2} more
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Why This Provider? Explanation */}
                    <div className="bg-accent/50 rounded-lg p-2 sm:p-3 space-y-1 sm:space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary rounded-full flex-shrink-0"></div>
                        <p className="text-xs sm:text-sm font-semibold text-foreground">Why this provider?</p>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        {match.explanation.whyThisProvider || 
                         `${match.provider.name} is recommended based on their specialty match, proximity to your location, and insurance network status.`}
                      </p>
                    </div>

                    {/* Match Score Breakdown */}
                    <div className="text-xs text-muted-foreground">
                      <p className="font-medium mb-1">Match Score: {match.matchScore}%</p>
                      <div className="space-y-0.5 sm:space-y-1">
                        {match.explanation.reasons.slice(0, 3).map((reason, idx) => (
                          <p key={idx} className="text-xs leading-tight">• {reason}</p>
                        ))}
                        {match.explanation.reasons.length > 3 && (
                          <p className="text-xs text-muted-foreground/70">
                            +{match.explanation.reasons.length - 3} more factors
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2">
                      <Button 
                        className="w-full text-xs sm:text-sm h-8 sm:h-9" 
                        onClick={() => {
                          // Create a safe provider object with all required properties
                          const safeProvider = {
                            ...match.provider,
                            // Ensure distance is a number
                            distance: typeof match.distance === 'number' ? match.distance : 0,
                            // Add distanceText
                            distanceText: `${match.distance} miles`,
                            // Ensure availability is a string
                            availability: match.provider.availability_next || "Call to schedule",
                            // Ensure inNetwork is a boolean
                            inNetwork: !!match.inNetwork,
                            // Ensure other properties have default values
                            rating: match.provider.rating || 0,
                            specialties: match.provider.specialties || [],
                            accepted_insurance: match.provider.accepted_insurance || [],
                            in_network_plans: match.provider.in_network_plans || [],
                          };
                          
                          // Use optimistic provider selection for immediate feedback
                          selectProviderOptimistic(patient.id, safeProvider, onProviderSelected);
                        }}
                        variant={index === 0 ? "default" : "outline"}
                      >
                        Select This Provider
                      </Button>
                      <Button variant="ghost" size="sm" className="w-full gap-1 sm:gap-2 text-xs sm:text-sm h-7 sm:h-8">
                        <Phone className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="truncate">Call {match.provider.phone}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Explanation Section */}
            <div className="mt-6 p-4 bg-accent rounded-lg">
              <h4 className="font-semibold text-foreground mb-2">Why these providers?</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Matched to patient's insurance plan ({patient.insurance})</li>
                <li>• Optimized for proximity to patient's location</li>
                <li>• Specialized in {patient.required_followup.toLowerCase()}</li>
                <li>• Ranked by availability, ratings, and network status</li>
                <li>• AI-powered matching considers multiple factors simultaneously</li>
              </ul>
            </div>
          </>
        )}

        {/* No Matches State */}
        {!(isMatching || providersLoading) && !error && matches.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <h3 className="font-medium text-foreground">No providers found</h3>
              <p className="text-sm text-muted-foreground">
                We couldn't find any providers matching your criteria. Please try expanding your search.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};