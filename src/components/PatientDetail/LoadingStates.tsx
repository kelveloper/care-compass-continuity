import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle, RefreshCw } from "lucide-react";

interface LoadingSkeletonProps {
  onBack: () => void;
}

export const LoadingSkeleton = ({ onBack }: LoadingSkeletonProps) => (
  <div className="min-h-screen bg-background">
    {/* Header Skeleton */}
    <div className="border-b bg-card">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="h-9 w-36 bg-muted rounded animate-pulse"></div>
          <div className="flex-1">
            <div className="h-7 w-64 bg-muted rounded mb-2 animate-pulse"></div>
            <div className="h-5 w-48 bg-muted rounded animate-pulse"></div>
          </div>
          <div className="h-8 w-32 bg-muted rounded animate-pulse"></div>
        </div>
      </div>
    </div>

    <div className="container mx-auto px-6 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Patient Summary Panel Skeleton */}
        <div className="lg:col-span-1">
          <div className="sticky top-8">
            <div className="rounded-lg border bg-card shadow-sm">
              <div className="p-6">
                <div className="h-6 w-40 bg-muted rounded mb-6 animate-pulse"></div>
                <div className="space-y-6">
                  {[...Array(8)].map((_, i) => (
                    <div key={i}>
                      <div className="h-4 w-32 bg-muted rounded mb-2 animate-pulse"></div>
                      <div className="h-5 w-48 bg-muted rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area Skeleton */}
        <div className="lg:col-span-2 space-y-6">
          <ContentSkeleton />
          <ContentSkeleton />
          <ContentSkeleton />
        </div>
      </div>
    </div>
  </div>
);

const ContentSkeleton = () => (
  <div className="rounded-lg border bg-card shadow-sm">
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="h-6 w-48 bg-muted rounded animate-pulse"></div>
        <div className="h-9 w-36 bg-muted rounded animate-pulse"></div>
      </div>
      <div className="h-20 bg-muted rounded animate-pulse"></div>
    </div>
  </div>
);

interface ErrorStateProps {
  errorMessage: string;
  onBack: () => void;
}

export const ErrorState = ({ errorMessage, onBack }: ErrorStateProps) => (
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
            <h1 className="text-2xl font-bold text-foreground">
              Error Loading Patient
            </h1>
            <p className="text-muted-foreground">
              There was a problem loading the patient data
            </p>
          </div>
        </div>
      </div>
    </div>

    <div className="container mx-auto px-6 py-8">
      <div className="flex flex-col items-center justify-center py-12 space-y-6">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-8 w-8" />
          <span className="text-xl font-medium">
            Failed to load patient data
          </span>
        </div>
        <p className="text-center text-muted-foreground max-w-md">
          {errorMessage ||
            "There was an error loading the patient data. Please try again or contact support if the problem persists."}
        </p>
        <div className="flex gap-4">
          <Button onClick={onBack} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Return to Dashboard
          </Button>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reload Page
          </Button>
        </div>
      </div>
    </div>
  </div>
);