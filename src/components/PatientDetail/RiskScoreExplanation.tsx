import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RiskFactors } from "@/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  InfoIcon, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  Heart, 
  Calendar, 
  User, 
  Shield 
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface RiskScoreExplanationProps {
  score: number;
  level: "low" | "medium" | "high";
  factors: RiskFactors;
}

const RiskScoreExplanation: React.FC<RiskScoreExplanationProps> = ({
  score,
  level,
  factors,
}) => {
  // Get color based on risk level
  const getRiskColor = () => {
    switch (level) {
      case "high":
        return "bg-destructive text-destructive-foreground";
      case "medium":
        return "bg-amber-500 text-white";
      case "low":
        return "bg-emerald-500 text-white";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  // Get progress color based on factor value
  const getFactorColor = (value: number) => {
    if (value >= 70) return "bg-destructive";
    if (value >= 40) return "bg-amber-500";
    return "bg-emerald-500";
  };

  // Get factor icon based on factor type
  const getFactorIcon = (factor: keyof RiskFactors) => {
    switch (factor) {
      case "age":
        return <User className="h-4 w-4" />;
      case "diagnosisComplexity":
        return <Heart className="h-4 w-4" />;
      case "timeSinceDischarge":
        return <Clock className="h-4 w-4" />;
      case "insuranceType":
        return <Shield className="h-4 w-4" />;
      case "geographicFactors":
        return <MapPin className="h-4 w-4" />;
      case "previousReferralHistory":
        return <Calendar className="h-4 w-4" />;
      default:
        return <InfoIcon className="h-4 w-4" />;
    }
  };

  // Get explanation text for each factor
  const getFactorExplanation = (factor: keyof RiskFactors, value: number) => {
    switch (factor) {
      case "age":
        if (value >= 70)
          return "Elderly patients have higher risk of care discontinuity due to mobility challenges, multiple comorbidities, and potential cognitive issues that can complicate follow-up care.";
        if (value >= 40) return "Middle-aged patients have moderate risk factors that may affect care continuity, including work obligations and family responsibilities.";
        return "Younger patients typically have lower leakage risk due to fewer comorbidities and better mobility, making follow-up care easier to manage.";

      case "diagnosisComplexity":
        if (value >= 70)
          return "Complex diagnosis requires specialized follow-up care that may be limited in availability, increasing the risk of care discontinuity. These conditions often require coordination between multiple specialists.";
        if (value >= 40) return "Moderately complex condition requiring regular follow-up but with more widely available treatment options. May still present challenges in care coordination.";
        return "Routine condition with standard follow-up needs that are widely available in most healthcare networks, presenting minimal risk for care discontinuity.";

      case "timeSinceDischarge":
        if (value >= 70)
          return "Long time since discharge significantly increases risk as patients may lose momentum in their care journey. Research shows follow-up compliance drops dramatically after 14 days.";
        if (value >= 40) return "Moderate time since discharge presents increasing risk. The 7-14 day window is critical for maintaining care continuity and preventing complications.";
        return "Recent discharge means the patient is still actively engaged with the care system. Early follow-up (within 7 days) is associated with better outcomes and reduced readmissions.";

      case "insuranceType":
        if (value >= 70)
          return "Insurance limitations significantly restrict provider options, creating barriers to appropriate follow-up care. Medicaid and certain Medicare plans have more limited provider networks.";
        if (value >= 40) return "Some network restrictions may apply, potentially limiting access to certain specialists or facilities. HMO plans typically have more network restrictions than PPO plans.";
        return "Good insurance coverage with wide provider network offers flexibility in choosing appropriate follow-up care providers, minimizing barriers to care continuity.";

      case "geographicFactors":
        if (value >= 70)
          return "Location has limited access to needed providers, creating significant barriers to follow-up care. Rural areas often lack specialists and may require extensive travel for appointments.";
        if (value >= 40)
          return "Moderate distance to appropriate care facilities may present logistical challenges for regular follow-up visits, particularly for patients with limited transportation options.";
        return "Good geographic access to needed care providers minimizes travel barriers and makes it easier to maintain regular follow-up appointments, reducing leakage risk.";

      case "previousReferralHistory":
        if (value >= 70) return "History of missed or cancelled appointments indicates significant risk of future non-compliance. Patients with multiple cancelled referrals are 3x more likely to miss future appointments.";
        if (value >= 40) return "Mixed history of referral completion suggests moderate risk. Some previous compliance issues may indicate potential barriers to care that should be addressed.";
        return "Good history of completing referrals demonstrates patient reliability and engagement with their care plan, suggesting lower risk for future care discontinuity.";

      default:
        return "Factor contributes to overall risk score based on statistical analysis of patient outcomes and care continuity patterns.";
    }
  };

  // Get recommendations based on risk factors
  const getRecommendations = () => {
    const highRiskFactors = Object.entries(factors)
      .filter(([_, value]) => value >= 70)
      .map(([key]) => key as keyof RiskFactors);

    if (highRiskFactors.length === 0) {
      return ["Monitor patient progress through standard follow-up protocols"];
    }

    const recommendations: string[] = [];

    if (highRiskFactors.includes("age")) {
      recommendations.push("Consider arranging transportation assistance for elderly patient");
      recommendations.push("Evaluate need for caregiver involvement in follow-up planning");
    }

    if (highRiskFactors.includes("diagnosisComplexity")) {
      recommendations.push("Schedule care coordination call to ensure clear understanding of follow-up needs");
      recommendations.push("Provide detailed written instructions for complex care requirements");
    }

    if (highRiskFactors.includes("timeSinceDischarge")) {
      recommendations.push("Prioritize immediate outreach to re-engage patient in care plan");
      recommendations.push("Schedule follow-up appointment within 48-72 hours if possible");
    }

    if (highRiskFactors.includes("insuranceType")) {
      recommendations.push("Verify in-network providers before making referrals");
      recommendations.push("Consider patient financial assistance programs if needed");
    }

    if (highRiskFactors.includes("geographicFactors")) {
      recommendations.push("Explore telehealth options for follow-up care");
      recommendations.push("Identify providers closer to patient's location when possible");
    }

    if (highRiskFactors.includes("previousReferralHistory")) {
      recommendations.push("Implement enhanced appointment reminders (calls, texts, emails)");
      recommendations.push("Discuss specific barriers to keeping appointments with patient");
    }

    return recommendations;
  };

  // Get overall risk summary
  const getRiskSummary = () => {
    switch (level) {
      case "high":
        return "This patient has a high risk of care discontinuity and requires immediate intervention to prevent potential leakage from the care network. Multiple risk factors contribute to this assessment, with targeted interventions recommended to address specific barriers to care.";
      case "medium":
        return "This patient has a moderate risk of care discontinuity. While not requiring urgent intervention, proactive follow-up is recommended to address potential barriers to care continuity and prevent escalation to high-risk status.";
      case "low":
        return "This patient has a low risk of care discontinuity. Standard follow-up protocols are appropriate, with minimal risk of leakage from the care network based on current assessment factors.";
      default:
        return "Risk assessment incomplete. Additional patient information may be required for a comprehensive evaluation.";
    }
  };

  // Get the top contributing factors (highest 2)
  const getTopFactors = () => {
    return Object.entries(factors)
      .filter(([_, value]) => value !== undefined)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 2)
      .map(([key]) => key as keyof RiskFactors);
  };

  const topFactors = getTopFactors();
  const recommendations = getRecommendations();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Risk Score Explanation</span>
          <div
            className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor()}`}
          >
            {score}% - {level.toUpperCase()}
          </div>
        </CardTitle>
        <CardDescription>
          Comprehensive analysis of factors contributing to this patient's leakage risk
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Risk Summary */}
          <div className="bg-muted p-3 rounded-md">
            <p className="text-sm">{getRiskSummary()}</p>
            {level === "high" && (
              <div className="flex items-center gap-2 mt-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <p className="text-sm font-medium text-destructive">
                  Immediate intervention recommended
                </p>
              </div>
            )}
          </div>

          {/* Top Contributing Factors */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Primary Risk Drivers:</h4>
            <div className="flex flex-wrap gap-2">
              {topFactors.map((factor) => (
                <Badge key={factor} variant="outline" className="flex items-center gap-1">
                  {getFactorIcon(factor)}
                  <span>
                    {factor === "diagnosisComplexity"
                      ? "Diagnosis Complexity"
                      : factor === "timeSinceDischarge"
                      ? "Time Since Discharge"
                      : factor === "insuranceType"
                      ? "Insurance Type"
                      : factor === "geographicFactors"
                      ? "Geographic Factors"
                      : factor === "previousReferralHistory"
                      ? "Referral History"
                      : factor}
                  </span>
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Detailed Factor Breakdown */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Risk Factor Breakdown:</h4>
            {Object.entries(factors).map(([key, value]) => {
              // Skip undefined values
              if (value === undefined) return null;

              const factorKey = key as keyof RiskFactors;
              const explanation = getFactorExplanation(factorKey, value);

              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {getFactorIcon(factorKey)}
                      <span className="font-medium capitalize">
                        {key === "diagnosisComplexity"
                          ? "Diagnosis Complexity"
                          : key === "timeSinceDischarge"
                          ? "Time Since Discharge"
                          : key === "insuranceType"
                          ? "Insurance Type"
                          : key === "geographicFactors"
                          ? "Geographic Factors"
                          : key === "previousReferralHistory"
                          ? "Referral History"
                          : key}
                      </span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <InfoIcon className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            <p>{explanation}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <span className="text-sm font-medium">{value}%</span>
                  </div>
                  <Progress value={value} className={getFactorColor(value)} />
                </div>
              );
            })}
          </div>

          <Separator />

          {/* Recommendations */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Recommended Actions:</h4>
            <ul className="space-y-1 list-disc pl-5">
              {recommendations.map((rec, index) => (
                <li key={index} className="text-sm">
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        <p>
          Risk score calculated based on multiple weighted factors including age, diagnosis complexity, 
          time since discharge, insurance type, geographic factors, and referral history.
        </p>
      </CardFooter>
    </Card>
  );
};

export default RiskScoreExplanation;
