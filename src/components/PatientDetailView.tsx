import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, CreditCard, Calendar, Plus, Check, Star, Clock, Phone } from "lucide-react";
import { ProviderMatchCards } from "./ProviderMatchCards";

import { Patient } from "@/types";

interface PatientDetailViewProps {
  patient: Patient;
  onBack: () => void;
}

export const PatientDetailView = ({ patient, onBack }: PatientDetailViewProps) => {
  const [showProviderMatch, setShowProviderMatch] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);

  const handleAddFollowupCare = () => {
    setShowProviderMatch(true);
  };

  const handleProviderSelected = (provider: any) => {
    setSelectedProvider(provider);
    setShowProviderMatch(false);
  };

  const getRiskBadgeClass = (level: string) => {
    switch (level) {
      case "high": return "bg-risk-high-bg text-risk-high border-risk-high";
      case "medium": return "bg-risk-medium-bg text-risk-medium border-risk-medium";
      case "low": return "bg-risk-low-bg text-risk-low border-risk-low";
      default: return "";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">Discharge Plan: {patient.name}</h1>
              <p className="text-muted-foreground">{patient.diagnosis}</p>
            </div>
            <Badge 
              className={`text-sm px-3 py-1 ${getRiskBadgeClass(patient.leakageRisk.level)}`}
            >
              {patient.leakageRisk.score}% Leakage Risk - {patient.leakageRisk.level.toUpperCase()}
            </Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Patient Summary Panel (Sticky) */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Patient Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                    <p className="text-foreground font-semibold">{patient.name}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
                    <p className="text-foreground">{new Date(patient.date_of_birth).toLocaleDateString()}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Age</p>
                    <p className="text-foreground">{patient.age} years</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Diagnosis</p>
                    <p className="text-foreground">{patient.diagnosis}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Discharge Date</p>
                    <p className="text-foreground">{new Date(patient.discharge_date).toLocaleDateString()}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Days Since Discharge</p>
                    <p className="text-foreground">{patient.daysSinceDischarge} days</p>
                  </div>

                  <div className="flex items-start gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Insurance</p>
                      <p className="text-foreground">{patient.insurance}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Home Address</p>
                      <p className="text-foreground text-sm">{patient.address}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Required Follow-up Care */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Plus className="h-5 w-5 text-primary" />
                    Required Follow-up Care
                  </span>
                  {!showProviderMatch && !selectedProvider && (
                    <Button onClick={handleAddFollowupCare} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Follow-up Care
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 p-4 bg-primary-light rounded-lg">
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{patient.required_followup}</p>
                    <p className="text-sm text-muted-foreground">Post-surgical rehabilitation required</p>
                  </div>
                  <Badge variant="outline" className="bg-warning-light text-warning border-warning">
                    High Priority
                  </Badge>
                </div>

                {selectedProvider && (
                  <div className="mt-4 p-4 bg-success-light rounded-lg border border-success/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Check className="h-5 w-5 text-success" />
                      <span className="font-semibold text-success">Provider Selected</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-foreground">{selectedProvider.name}</p>
                        <p className="text-muted-foreground">{selectedProvider.address}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Next available: {selectedProvider.availability}</p>
                        <p className="text-muted-foreground">Distance: {selectedProvider.distance}</p>
                      </div>
                    </div>
                    <Button size="sm" className="mt-3 gap-2">
                      <Phone className="h-4 w-4" />
                      Confirm & Send Referral
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Provider Matching Interface */}
            {showProviderMatch && (
              <ProviderMatchCards 
                patientInsurance={patient.insurance}
                patientAddress={patient.address}
                onProviderSelected={handleProviderSelected}
                onCancel={() => setShowProviderMatch(false)}
              />
            )}

            {/* Risk Factor Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  Leakage Risk Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Overall Risk Score</span>
                    <Badge className={`${getRiskBadgeClass(patient.leakageRisk.level)}`}>
                      {patient.leakageRisk.score}/100 - {patient.leakageRisk.level.toUpperCase()}
                    </Badge>
                  </div>
                  
                  {patient.leakageRisk.factors && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-foreground">Risk Factor Breakdown:</h4>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Age Factor</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-muted rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full" 
                                style={{ width: `${patient.leakageRisk.factors.age}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium w-8">{patient.leakageRisk.factors.age}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Diagnosis Complexity</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-muted rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full" 
                                style={{ width: `${patient.leakageRisk.factors.diagnosisComplexity}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium w-8">{patient.leakageRisk.factors.diagnosisComplexity}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Time Since Discharge</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-muted rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full" 
                                style={{ width: `${patient.leakageRisk.factors.timeSinceDischarge}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium w-8">{patient.leakageRisk.factors.timeSinceDischarge}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Insurance Type</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-muted rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full" 
                                style={{ width: `${patient.leakageRisk.factors.insuranceType}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium w-8">{patient.leakageRisk.factors.insuranceType}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Geographic Factors</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-muted rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full" 
                                style={{ width: `${patient.leakageRisk.factors.geographicFactors}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium w-8">{patient.leakageRisk.factors.geographicFactors}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Referral Status Tracker */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Referral Status Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${selectedProvider ? 'bg-success' : 'bg-warning'}`}></div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        {selectedProvider ? 'Provider Selected' : 'Referral Needed'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedProvider ? 'Ready to send referral' : 'Waiting for provider selection'}
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground">Today</span>
                  </div>

                  <div className="flex items-center gap-4 opacity-50">
                    <div className="w-3 h-3 rounded-full bg-muted"></div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">Referral Sent</p>
                      <p className="text-sm text-muted-foreground">Digital referral transmitted to provider</p>
                    </div>
                    <span className="text-sm text-muted-foreground">Pending</span>
                  </div>

                  <div className="flex items-center gap-4 opacity-50">
                    <div className="w-3 h-3 rounded-full bg-muted"></div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">Appointment Scheduled</p>
                      <p className="text-sm text-muted-foreground">Provider confirms appointment time</p>
                    </div>
                    <span className="text-sm text-muted-foreground">Pending</span>
                  </div>

                  <div className="flex items-center gap-4 opacity-50">
                    <div className="w-3 h-3 rounded-full bg-muted"></div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">Care Completed</p>
                      <p className="text-sm text-muted-foreground">Patient attends appointment</p>
                    </div>
                    <span className="text-sm text-muted-foreground">Pending</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};