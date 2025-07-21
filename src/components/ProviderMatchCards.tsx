import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, CheckCircle2, Star, Phone, X } from "lucide-react";

interface Provider {
  id: string;
  name: string;
  type: string;
  address: string;
  distance: string;
  availability: string;
  inNetwork: boolean;
  rating: number;
  phone: string;
  specialties: string[];
}

interface ProviderMatchCardsProps {
  patientInsurance: string;
  patientAddress: string;
  onProviderSelected: (provider: Provider) => void;
  onCancel: () => void;
}

const mockProviders: Provider[] = [
  {
    id: "1",
    name: "Action Physical Therapy",
    type: "Physical Therapy",
    address: "125 Main St, Boston, MA 02101",
    distance: "2.1 miles",
    availability: "This Friday, Jan 19",
    inNetwork: true,
    rating: 4.8,
    phone: "(617) 555-0123",
    specialties: ["Orthopedic PT", "Post-Surgical Rehab", "Sports Medicine"]
  },
  {
    id: "2",
    name: "Boston Sports & Spine PT",
    type: "Physical Therapy",
    address: "89 Cambridge St, Boston, MA 02114",
    distance: "3.4 miles",
    availability: "Next Tuesday, Jan 23",
    inNetwork: true,
    rating: 4.6,
    phone: "(617) 555-0456",
    specialties: ["Spine Care", "Joint Replacement", "Balance Training"]
  },
  {
    id: "3",
    name: "New England Rehabilitation",
    type: "Physical Therapy",
    address: "201 Washington St, Boston, MA 02108",
    distance: "4.2 miles",
    availability: "Monday, Jan 22",
    inNetwork: false,
    rating: 4.9,
    phone: "(617) 555-0789",
    specialties: ["Orthopedic PT", "Geriatric Rehab", "Fall Prevention"]
  }
];

export const ProviderMatchCards = ({ 
  patientInsurance, 
  patientAddress, 
  onProviderSelected, 
  onCancel 
}: ProviderMatchCardsProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            Smart Provider Match - Physical Therapy
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {mockProviders.map((provider, index) => (
            <div
              key={provider.id}
              className={`relative rounded-lg border-2 transition-all hover:shadow-lg ${
                index === 0 
                  ? 'border-primary bg-primary-light/30' 
                  : 'border-border bg-card hover:border-primary/50'
              }`}
            >
              {index === 0 && (
                <div className="absolute -top-3 left-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold">
                  Best Match
                </div>
              )}
              
              <div className="p-6 space-y-4">
                {/* Provider Header */}
                <div>
                  <h3 className="font-bold text-lg text-foreground">{provider.name}</h3>
                  <p className="text-sm text-muted-foreground">{provider.type}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="h-4 w-4 fill-warning text-warning" />
                    <span className="text-sm font-medium">{provider.rating}</span>
                    <span className="text-xs text-muted-foreground">(124 reviews)</span>
                  </div>
                </div>

                {/* Key Information */}
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-success mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Next Available</p>
                      <p className="text-sm text-success font-semibold">{provider.availability}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Distance</p>
                      <p className="text-sm text-muted-foreground">{provider.distance} from patient</p>
                      <p className="text-xs text-muted-foreground">{provider.address}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`h-4 w-4 ${provider.inNetwork ? 'text-success' : 'text-muted-foreground'}`} />
                    <div>
                      <Badge 
                        variant={provider.inNetwork ? "default" : "secondary"}
                        className={provider.inNetwork ? "bg-success-light text-success border-success" : ""}
                      >
                        {provider.inNetwork ? "In-Network ✓" : "Out-of-Network"}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Specialties */}
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Specialties</p>
                  <div className="flex flex-wrap gap-1">
                    {provider.specialties.slice(0, 2).map((specialty) => (
                      <Badge key={specialty} variant="outline" className="text-xs">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <Button 
                    className="w-full" 
                    onClick={() => onProviderSelected(provider)}
                    variant={index === 0 ? "default" : "outline"}
                  >
                    Select This Provider
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full gap-2">
                    <Phone className="h-4 w-4" />
                    Call {provider.phone}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-accent rounded-lg">
          <h4 className="font-semibold text-foreground mb-2">Why these providers?</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Matched to patient's insurance plan ({patientInsurance})</li>
            <li>• Within 5 miles of patient's home address</li>
            <li>• Specialized in post-surgical knee rehabilitation</li>
            <li>• Available for appointments within the next week</li>
            <li>• High patient satisfaction ratings (4.5+ stars)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};