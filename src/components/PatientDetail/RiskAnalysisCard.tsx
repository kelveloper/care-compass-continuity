import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, ChevronDown, ChevronUp } from "lucide-react";
import { Patient } from "@/types";
import { useState } from "react";
import { RiskScoreExplanation } from "./index";
import { Button } from "@/components/ui/button";

interface RiskAnalysisCardProps {
  patient: Patient;
}

export const RiskAnalysisCard = ({ patient }: RiskAnalysisCardProps) => {
  const [showDetailedExplanation, setShowDetailedExplanation] = useState(false);

  const getRiskBadgeClass = (level: string) => {
    switch (level) {
      case "high":
        return "bg-risk-high-bg text-risk-high border-risk-high";
      case "medium":
        return "bg-risk-medium-bg text-risk-medium border-risk-medium";
      case "low":
        return "bg-risk-low-bg text-risk-low border-risk-low";
      default:
        return "";
    }
  };

  return (
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
            <span className="text-sm font-medium text-muted-foreground">
              Overall Risk Score
            </span>
            <Badge
              className={`${getRiskBadgeClass(patient.leakageRisk.level)}`}
            >
              {patient.leakageRisk.score}/100 -{" "}
              {patient.leakageRisk.level.toUpperCase()}
            </Badge>
          </div>

          {patient.leakageRisk.factors && (
            <>
              {/* Simple view */}
              {!showDetailedExplanation && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-foreground">
                      Risk Factor Breakdown:
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDetailedExplanation(true)}
                      className="h-6 px-2 text-xs"
                    >
                      Detailed View <ChevronDown className="ml-1 h-3 w-3" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <RiskFactorBar
                      label="Age Factor"
                      value={patient.leakageRisk.factors.age}
                    />
                    <RiskFactorBar
                      label="Diagnosis Complexity"
                      value={patient.leakageRisk.factors.diagnosisComplexity}
                    />
                    <RiskFactorBar
                      label="Time Since Discharge"
                      value={patient.leakageRisk.factors.timeSinceDischarge}
                    />
                    <RiskFactorBar
                      label="Insurance Type"
                      value={patient.leakageRisk.factors.insuranceType}
                    />
                    <RiskFactorBar
                      label="Geographic Factors"
                      value={patient.leakageRisk.factors.geographicFactors}
                    />
                    {patient.leakageRisk.factors.previousReferralHistory !==
                      undefined && (
                      <RiskFactorBar
                        label="Referral History"
                        value={
                          patient.leakageRisk.factors.previousReferralHistory
                        }
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Detailed explanation */}
              {showDetailedExplanation && (
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDetailedExplanation(false)}
                      className="h-6 px-2 text-xs"
                    >
                      Simple View <ChevronUp className="ml-1 h-3 w-3" />
                    </Button>
                  </div>

                  <RiskScoreExplanation
                    score={patient.leakageRisk.score}
                    level={patient.leakageRisk.level}
                    factors={patient.leakageRisk.factors}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface RiskFactorBarProps {
  label: string;
  value: number;
}

const RiskFactorBar = ({ label, value }: RiskFactorBarProps) => {
  // Get color based on risk value
  const getBarColor = (value: number) => {
    if (value >= 70) return "bg-destructive";
    if (value >= 40) return "bg-amber-500";
    return "bg-emerald-500";
  };

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <div className="w-20 bg-muted rounded-full h-2">
          <div
            className={`${getBarColor(value)} h-2 rounded-full`}
            style={{ width: `${value}%` }}
          />
        </div>
        <span className="text-sm font-medium w-8">{value}</span>
      </div>
    </div>
  );
};
