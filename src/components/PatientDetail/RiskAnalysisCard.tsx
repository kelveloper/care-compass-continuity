import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { Patient } from "@/types";

interface RiskAnalysisCardProps {
  patient: Patient;
}

export const RiskAnalysisCard = ({ patient }: RiskAnalysisCardProps) => {
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
            <Badge className={`${getRiskBadgeClass(patient.leakageRisk.level)}`}>
              {patient.leakageRisk.score}/100 -{" "}
              {patient.leakageRisk.level.toUpperCase()}
            </Badge>
          </div>

          {patient.leakageRisk.factors && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">
                Risk Factor Breakdown:
              </h4>

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
                  label="Geographic Distance"
                  value={patient.leakageRisk.factors.geographicDistance}
                />
                <RiskFactorBar
                  label="Insurance Coverage"
                  value={patient.leakageRisk.factors.insuranceCoverage}
                />
              </div>
            </div>
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

const RiskFactorBar = ({ label, value }: RiskFactorBarProps) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-muted-foreground">{label}</span>
    <div className="flex items-center gap-2">
      <div className="w-20 bg-muted rounded-full h-2">
        <div
          className="bg-primary h-2 rounded-full"
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-sm font-medium w-8">{value}</span>
    </div>
  </div>
);