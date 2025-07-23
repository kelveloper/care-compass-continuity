import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, CheckCircle2, Star, Phone, X, Loader2, AlertCircle } from "lucide-react";
import { useProviderMatch } from "@/hooks/use-provider-match";
import { Patient, ProviderMatch } from "@/types";

interface ProviderMatchCardsProps {
  patient: Patient;
  onProviderSelected: (provider: any) => void;
  onCancel: () => void;
}

export const ProviderMatchCards = ({ 
  patient, 
  onProviderSelected, 
  onCancel 
}: ProviderMatchCardsProps) => {
  const { findMatches, isMatching, error, providersLoading, isReady } = useProviderMatch();
  const [matches, setMatches] = useState<ProviderMatch[]>([]);

  useEffect(() => {
    const loadMatches = async () => {
      if (isReady && patient) {
        try {
          const providerMatches = await findMatches(patient, patient.required_followup, 3);
          setMatches(providerMatches);
        } catch (err) {
          console.error('Failed to find provider matches:', err);
        }
      }
    };

    loadMatches();
  }, [patient, isReady, findMatches]);

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
        </p>
      </CardHeader>
      <CardContent>
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-muted-foreground">Finding best provider matches...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-6 w-6" />
              <span className="font-medium">Failed to load providers</span>
            </div>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              {error}
            </p>
          </div>
        )}

        {/* Provider Matches */}
        {!loading && !error && matches.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {matches.map((match, index) => (
                <div
                  key={match.provider.id}
                  className={`relative rounded-lg border-2 transition-all hover:shadow-lg ${
                    index === 0 
                      ? 'border-primary bg-primary-light/30' 
                      : 'border-border bg-card hover:border-primary/50'
                  }`}
                >
                  {index === 0 && (
                    <div className="absolute -top-3 left-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold">
                      Best Match ({match.matchScore}%)
                    </div>
                  )}
                  
                  <div className="p-6 space-y-4">
                    {/* Provider Header */}
                    <div>
                      <h3 className="font-bold text-lg text-foreground">{match.provider.name}</h3>
                      <p className="text-sm text-muted-foreground">{match.provider.type}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="h-4 w-4 fill-warning text-warning" />
                        <span className="text-sm font-medium">{match.provider.rating}</span>
                        <span className="text-xs text-muted-foreground">(Reviews)</span>
                      </div>
                    </div>

                    {/* Key Information */}
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <Clock className="h-4 w-4 text-success mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-foreground">Next Available</p>
                          <p className="text-sm text-success font-semibold">
                            {match.provider.availability_next || "Call to schedule"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-primary mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-foreground">Distance</p>
                          <p className="text-sm text-muted-foreground">{match.distance} miles from patient</p>
                          <p className="text-xs text-muted-foreground">{match.provider.address}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <CheckCircle2 className={`h-4 w-4 ${match.inNetwork ? 'text-success' : 'text-muted-foreground'}`} />
                        <div>
                          <Badge 
                            variant={match.inNetwork ? "default" : "secondary"}
                            className={match.inNetwork ? "bg-success-light text-success border-success" : ""}
                          >
                            {match.inNetwork ? "In-Network ✓" : "Out-of-Network"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Specialties */}
                    <div>
                      <p className="text-sm font-medium text-foreground mb-2">Specialties</p>
                      <div className="flex flex-wrap gap-1">
                        {match.provider.specialties.slice(0, 2).map((specialty) => (
                          <Badge key={specialty} variant="outline" className="text-xs">
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

                    {/* Match Score Breakdown */}
                    <div className="text-xs text-muted-foreground">
                      <p className="font-medium mb-1">Match Score: {match.matchScore}%</p>
                      <div className="space-y-1">
                        {match.explanation.reasons.map((reason, idx) => (
                          <p key={idx}>• {reason}</p>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2">
                      <Button 
                        className="w-full" 
                        onClick={() => onProviderSelected({
                          ...match.provider,
                          distance: `${match.distance} miles`,
                          availability: match.provider.availability_next || "Call to schedule",
                          inNetwork: match.inNetwork
                        })}
                        variant={index === 0 ? "default" : "outline"}
                      >
                        Select This Provider
                      </Button>
                      <Button variant="ghost" size="sm" className="w-full gap-2">
                        <Phone className="h-4 w-4" />
                        Call {match.provider.phone}
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
        {!loading && !error && matches.length === 0 && (
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