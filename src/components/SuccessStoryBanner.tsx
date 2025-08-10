import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, X, TrendingUp, Clock, DollarSign, Users } from "lucide-react";

interface SuccessStoryBannerProps {
  patientName: string;
  providerName: string;
  timeToMatch: string;
  revenueProtected: string;
  onDismiss: () => void;
}

export const SuccessStoryBanner = ({
  patientName,
  providerName,
  timeToMatch,
  revenueProtected,
  onDismiss,
}: SuccessStoryBannerProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Auto-dismiss after 10 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onDismiss, 300); // Allow fade out animation
    }, 10000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!isVisible) {
    return null;
  }

  return (
    <Card className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-2 border-green-200 dark:border-green-800 shadow-lg animate-in slide-in-from-top-2 duration-500">
      <div className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-bold text-green-800 dark:text-green-200 text-lg">
                  🎉 Success Story in Action!
                </h3>
                <Badge className="bg-green-100 text-green-800 border-green-300 text-xs font-bold animate-pulse">
                  PATIENT SAVED
                </Badge>
              </div>
              
              <div className="bg-white dark:bg-gray-900/50 rounded-lg p-3 mb-3 border border-green-200 dark:border-green-800">
                <p className="text-sm text-gray-800 dark:text-gray-200 mb-2">
                  <strong className="text-green-700 dark:text-green-300">Brenda just prevented patient leakage!</strong> 
                  <span className="font-semibold"> {patientName}</span> has been successfully matched with 
                  <span className="font-semibold"> {providerName}</span> and the referral is on its way.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/30 rounded p-2">
                    <Clock className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <div>
                      <div className="font-bold text-green-800 dark:text-green-200">
                        {timeToMatch}
                      </div>
                      <div className="text-green-600 dark:text-green-400">match time</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/30 rounded p-2">
                    <DollarSign className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <div>
                      <div className="font-bold text-blue-800 dark:text-blue-200">
                        {revenueProtected}
                      </div>
                      <div className="text-blue-600 dark:text-blue-400">revenue protected</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-950/30 rounded p-2">
                    <TrendingUp className="h-4 w-4 text-purple-600 flex-shrink-0" />
                    <div>
                      <div className="font-bold text-purple-800 dark:text-purple-200">
                        94%
                      </div>
                      <div className="text-purple-600 dark:text-purple-400">match score</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 rounded p-2">
                    <Users className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    <div>
                      <div className="font-bold text-amber-800 dark:text-amber-200">
                        1 of 3
                      </div>
                      <div className="text-amber-600 dark:text-amber-400">high-risk saved today</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1 text-green-700 dark:text-green-300">
                  <span className="font-bold">Before AI:</span>
                  <span>45 min research + manual calls</span>
                </div>
                <div className="flex items-center gap-1 text-green-700 dark:text-green-300">
                  <span className="font-bold">With AI:</span>
                  <span>30 sec perfect match + 1-click referral</span>
                </div>
              </div>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsVisible(false);
              setTimeout(onDismiss, 300);
            }}
            className="flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};