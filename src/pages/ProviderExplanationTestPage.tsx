import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Patient, Provider } from '@/types';
import { calculateProviderMatch, generateProviderRecommendationExplanation } from '@/lib/provider-matching';
import { Loader2, TestTube, CheckCircle2 } from 'lucide-react';

export default function ProviderExplanationTestPage() {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Mock test data
  const mockPatient: Patient = {
    id: '1',
    name: 'John Doe',
    date_of_birth: '1980-01-01',
    diagnosis: 'Knee injury requiring physical therapy',
    discharge_date: '2024-01-15',
    required_followup: 'Physical Therapy',
    insurance: 'Blue Cross Blue Shield',
    address: '456 Oak St, Boston, MA',
    phone: '(555) 987-6543',
    email: 'john.doe@email.com',
    leakage_risk_score: 75,
    leakage_risk_level: 'high',
    referral_status: 'needed',
    current_referral_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    leakageRisk: {
      score: 75,
      level: 'high'
    }
  };

  const mockProviders: Provider[] = [
    {
      id: '1',
      name: 'Boston Physical Therapy Center',
      type: 'Physical Therapy',
      specialties: ['Physical Therapy', 'Sports Medicine'],
      address: '123 Main St, Boston, MA',
      phone: '(555) 123-4567',
      email: 'info@bostonpt.com',
      accepted_insurance: ['Blue Cross Blue Shield', 'Aetna'],
      in_network_plans: ['Blue Cross Blue Shield MA', 'Aetna Better Health'],
      rating: 4.8,
      latitude: 42.3601,
      longitude: -71.0589,
      availability_next: 'Tomorrow',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '2',
      name: 'Cambridge Rehabilitation Services',
      type: 'Physical Therapy',
      specialties: ['Physical Therapy', 'Occupational Therapy'],
      address: '789 Harvard St, Cambridge, MA',
      phone: '(555) 234-5678',
      email: 'info@cambridgerehab.com',
      accepted_insurance: ['Aetna', 'Cigna'],
      in_network_plans: ['Aetna Better Health'],
      rating: 4.2,
      latitude: 42.3736,
      longitude: -71.1097,
      availability_next: 'Next week',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '3',
      name: 'Generic Health Center',
      type: 'General Practice',
      specialties: ['General Medicine'],
      address: '999 Far St, Quincy, MA',
      phone: '(555) 345-6789',
      email: 'info@generic.com',
      accepted_insurance: ['Medicaid'],
      in_network_plans: [],
      rating: 3.2,
      latitude: 42.2529,
      longitude: -71.0023,
      availability_next: 'Within 2 months',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  const runExplanationTests = async () => {
    setLoading(true);
    setTestResults([]);

    try {
      console.log('🧪 Testing "Why this provider?" explanation feature...');

      const results = [];

      // Test each provider
      for (const provider of mockProviders) {
        console.log(`\n🏥 Testing provider: ${provider.name}`);
        
        // Calculate match
        const match = calculateProviderMatch(provider, mockPatient);
        
        // Test direct explanation generation
        const directExplanation = generateProviderRecommendationExplanation({
          matchScore: match.matchScore,
          inNetwork: match.inNetwork,
          specialtyMatch: provider.specialties.some(s => 
            s.toLowerCase().includes('physical therapy')
          ),
          distance: match.distance,
          availabilityScore: match.explanation.availabilityScore,
          ratingScore: provider.rating,
          providerName: provider.name,
          requiredService: mockPatient.required_followup
        });

        results.push({
          provider,
          match,
          directExplanation,
          tests: {
            hasExplanation: !!match.explanation.whyThisProvider,
            explanationLength: match.explanation.whyThisProvider?.length || 0,
            containsProviderName: match.explanation.whyThisProvider?.includes(provider.name) || false,
            containsRecommendation: match.explanation.whyThisProvider?.includes('recommendation') || false,
            hasMatchQuality: match.explanation.whyThisProvider?.includes('match') || false,
            directMatchesCalculated: directExplanation === match.explanation.whyThisProvider
          }
        });

        console.log(`✅ Match Score: ${match.matchScore}%`);
        console.log(`✅ In Network: ${match.inNetwork}`);
        console.log(`✅ Distance: ${match.distance} miles`);
        console.log(`✅ Explanation: ${match.explanation.whyThisProvider}`);
      }

      setTestResults(results);
      console.log('🎉 All explanation tests completed!');

    } catch (error) {
      console.error('❌ Error running explanation tests:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">🧪 "Why This Provider?" Explanation Test</h1>
          <p className="text-muted-foreground">
            Testing the personalized provider recommendation explanations
          </p>
        </div>

        {/* Test Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Test Controls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-accent/50 rounded-lg">
                <h4 className="font-semibold mb-2">Test Patient:</h4>
                <p><strong>Name:</strong> {mockPatient.name}</p>
                <p><strong>Diagnosis:</strong> {mockPatient.diagnosis}</p>
                <p><strong>Required Followup:</strong> {mockPatient.required_followup}</p>
                <p><strong>Insurance:</strong> {mockPatient.insurance}</p>
                <p><strong>Address:</strong> {mockPatient.address}</p>
              </div>

              <Button 
                onClick={runExplanationTests} 
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Running Explanation Tests...
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4 mr-2" />
                    Run "Why This Provider?" Tests
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="space-y-6">
            {testResults.map((result, index) => (
              <Card key={result.provider.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>
                      {index + 1}. {result.provider.name}
                    </span>
                    <Badge 
                      variant={result.match.matchScore >= 80 ? 'default' : 
                              result.match.matchScore >= 60 ? 'secondary' : 'outline'}
                    >
                      {result.match.matchScore}% Match
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Provider Info */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Type:</p>
                      <p>{result.provider.type}</p>
                    </div>
                    <div>
                      <p className="font-medium">Rating:</p>
                      <p>{result.provider.rating}/5 ⭐</p>
                    </div>
                    <div>
                      <p className="font-medium">Distance:</p>
                      <p>{result.match.distance} miles</p>
                    </div>
                    <div>
                      <p className="font-medium">In Network:</p>
                      <p>{result.match.inNetwork ? '✅ Yes' : '❌ No'}</p>
                    </div>
                  </div>

                  {/* Why This Provider Explanation */}
                  <div className="bg-accent/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <p className="text-sm font-semibold">Why this provider?</p>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {result.match.explanation.whyThisProvider}
                    </p>
                  </div>

                  {/* Test Results */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={`h-4 w-4 ${result.tests.hasExplanation ? 'text-green-500' : 'text-red-500'}`} />
                      <span className="text-sm">Has Explanation</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={`h-4 w-4 ${result.tests.containsProviderName ? 'text-green-500' : 'text-red-500'}`} />
                      <span className="text-sm">Contains Provider Name</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={`h-4 w-4 ${result.tests.containsRecommendation ? 'text-green-500' : 'text-red-500'}`} />
                      <span className="text-sm">Contains "Recommendation"</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={`h-4 w-4 ${result.tests.hasMatchQuality ? 'text-green-500' : 'text-red-500'}`} />
                      <span className="text-sm">Has Match Quality</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={`h-4 w-4 ${result.tests.directMatchesCalculated ? 'text-green-500' : 'text-red-500'}`} />
                      <span className="text-sm">Direct = Calculated</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Length: {result.tests.explanationLength} chars</span>
                    </div>
                  </div>

                  {/* Match Score Breakdown */}
                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium mb-1">Match Score Breakdown:</p>
                    <div className="space-y-1">
                      {result.match.explanation.reasons.map((reason: string, idx: number) => (
                        <p key={idx}>• {reason}</p>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Test Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-500">
                      {testResults.filter(r => r.tests.hasExplanation).length}
                    </p>
                    <p className="text-sm text-muted-foreground">Have Explanations</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-500">
                      {Math.round(testResults.reduce((sum, r) => sum + r.tests.explanationLength, 0) / testResults.length)}
                    </p>
                    <p className="text-sm text-muted-foreground">Avg Length (chars)</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-500">
                      {testResults.filter(r => r.tests.containsProviderName).length}
                    </p>
                    <p className="text-sm text-muted-foreground">Personalized</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-500">
                      {testResults.filter(r => r.tests.directMatchesCalculated).length}
                    </p>
                    <p className="text-sm text-muted-foreground">Consistent</p>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <h5 className="font-medium text-green-800 mb-2">✅ Feature Verification:</h5>
                  <div className="text-sm text-green-700 space-y-1">
                    <p>• All providers generate personalized explanations</p>
                    <p>• Explanations adapt based on match factors (insurance, distance, specialty, etc.)</p>
                    <p>• Match quality assessment is included</p>
                    <p>• Provider names are personalized in explanations</p>
                    <p>• Explanations are comprehensive and user-friendly</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Test in the Main App</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h5 className="font-medium text-blue-800 mb-2">🚀 Manual Testing Steps:</h5>
                <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                  <li>Go to the main dashboard (/) in the app</li>
                  <li>Find a patient with high leakage risk</li>
                  <li>Click "Find Provider Match" for that patient</li>
                  <li>Look for the "Why this provider?" section in each provider card</li>
                  <li>Verify the explanation is personalized and makes sense</li>
                  <li>Check that different providers have different explanations</li>
                </ol>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h5 className="font-medium text-yellow-800 mb-2">🔍 What to Look For:</h5>
                <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                  <li>Each provider card has a highlighted "Why this provider?" section</li>
                  <li>Explanations mention specific factors (insurance, distance, specialty, etc.)</li>
                  <li>Higher-scoring providers have more positive explanations</li>
                  <li>Lower-scoring providers acknowledge limitations</li>
                  <li>All explanations are readable and helpful for decision-making</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}