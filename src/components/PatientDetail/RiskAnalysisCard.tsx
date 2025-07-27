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
  const [isLoading, setIsLoading] = useState(false);

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

  // Show skeleton if patient data is not fully loaded
  if (!patient || !patient.leakageRisk) {
    return <RiskAnalysisCardSkeleton />;
  }

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Star className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Leakage Risk Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-3 sm:pt-6">
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">
              Overall Risk Score
            </span>
            <Badge
              className={`text-xs sm:text-sm ${getRiskBadgeClass(patient.leakageRisk.level)} flex-shrink-0`}
            >
              <span className="hidden sm:inline">
                {patient.leakageRisk.score}/100 -{" "}
                {patient.leakageRisk.level.toUpperCase()}
              </span>
              <span className="sm:hidden">
                {patient.leakageRisk.score}% {patient.leakageRisk.level.toUpperCase()}
              </span>
            </Badge>
          </div>

          {patient.leakageRisk.factors && (
            <>
              {/* Simple view */}
              {!showDetailedExplanation && (
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs sm:text-sm font-semibold text-foreground">
                      Risk Factor Breakdown:
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDetailedExplanation(true)}
                      className="h-5 sm:h-6 px-1 sm:px-2 text-xs flex-shrink-0"
                    >
                      <span className="hidden sm:inline">Detailed View</span>
                      <span className="sm:hidden">Details</span>
                      <ChevronDown className="ml-1 h-2 w-2 sm:h-3 sm:w-3" />
                    </Button>
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
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
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDetailedExplanation(false)}
                      className="h-5 sm:h-6 px-1 sm:px-2 text-xs"
                    >
                      <span className="hidden sm:inline">Simple View</span>
                      <span className="sm:hidden">Simple</span>
                      <ChevronUp className="ml-1 h-2 w-2 sm:h-3 sm:w-3" />
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
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs sm:text-sm text-muted-foreground truncate flex-1 min-w-0">{label}</span>
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        <div className="w-12 sm:w-20 bg-muted rounded-full h-1.5 sm:h-2">
          <div
            className={`${getBarColor(value)} h-1.5 sm:h-2 rounded-full`}
            style={{ width: `${value}%` }}
          />
        </div>
        <span className="text-xs sm:text-sm font-medium w-6 sm:w-8 text-right">{value}</span>
      </div>
    </div>
  );
};

const RiskAnalysisCardSkeleton = () => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Star className="h-5 w-5 text-primary" />
        Leakage Risk Analysis
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4 animate-pulse">
        {/* Overall Risk Score Skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 bg-muted rounded"></div>
          <div className="h-6 w-24 bg-muted rounded-full"></div>
        </div>

        {/* Risk Factor Breakdown Skeleton */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-4 w-36 bg-muted rounded"></div>
            <div className="h-6 w-24 bg-muted rounded"></div>
          </div>

          <div className="space-y-2">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="h-3 w-28 bg-muted rounded"></div>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 bg-muted rounded-full"></div>
                  <div className="h-3 w-8 bg-muted rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);
