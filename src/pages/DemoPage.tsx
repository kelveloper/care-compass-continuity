import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Clock, MapPin, Star, CheckCircle2, AlertCircle, UserCircle } from "lucide-react";

const DemoPage = () => {
  const [currentStep, setCurrentStep] = useState(0);

  const demoSteps = [
    {
      title: "The Problem: Patient Leakage",
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Meet Brenda Chen, RN
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              Care Coordinator at Boston Medical Center
            </p>
          </div>
          
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-foreground mb-4">The Daily Challenge</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-destructive mb-2">200+</div>
                <div className="text-sm text-muted-foreground">Discharged patients to manage daily</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-destructive mb-2">30%</div>
                <div className="text-sm text-muted-foreground">Don't get timely follow-up care</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-destructive mb-2">$15K+</div>
                <div className="text-sm text-muted-foreground">Lost per patient who leaves network</div>
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <p className="text-muted-foreground">
              Coordinators spend hours manually searching for providers while high-risk patients slip through the cracks.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "AI-Powered Risk Dashboard",
      content: (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Brenda's New Morning View
            </h2>
            <p className="text-muted-foreground">
              AI automatically ranks patients by leakage risk
            </p>
          </div>
          
          {/* Mock patient list with Maria highlighted */}
          <div className="space-y-3">
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">Maria Rodriguez</h3>
                      <Badge className="bg-destructive text-destructive-foreground animate-pulse">
                        85% RISK
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Type 2 Diabetes with Complications</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span>Age: 72</span>
                      <span>•</span>
                      <span>Discharged: 5d ago</span>
                      <span>•</span>
                      <span className="font-medium text-primary">$18.5K at risk</span>
                    </div>
                  </div>
                  <Button variant="destructive" size="sm">
                    Urgent Action
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card className="opacity-60">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">John Smith</h3>
                      <Badge variant="secondary">45% RISK</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Post-surgical follow-up</p>
                  </div>
                  <Button variant="outline" size="sm">View Plan</Button>
                </div>
              </CardContent>
            </Card>
            
            <Card className="opacity-40">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">Sarah Johnson</h3>
                      <Badge variant="outline">25% RISK</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Routine cardiology check</p>
                  </div>
                  <Button variant="outline" size="sm">View Plan</Button>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
            <p className="text-sm text-foreground">
              <strong>Key Insight:</strong> Maria surfaces automatically as highest priority. 
              No more buried cases in spreadsheets!
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Intelligent Provider Matching",
      content: (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              The Game-Changer
            </h2>
            <p className="text-muted-foreground">
              45 minutes of work becomes 30 seconds
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Top AI Pick */}
            <Card className="border-primary bg-primary/5 relative">
              <div className="absolute -top-2 -right-2 bg-gradient-to-r from-primary to-blue-500 text-primary-foreground px-3 py-1 rounded-full text-xs font-bold">
                🏆 AI TOP PICK (94%)
              </div>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Dr. Sarah Chen, MD</CardTitle>
                <p className="text-sm text-muted-foreground">Endocrinology - Boston Medical Center</p>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-warning text-warning" />
                  <span className="text-sm font-medium">4.8</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-success" />
                  <div>
                    <p className="text-sm font-medium">Next Available</p>
                    <p className="text-sm text-success">Thursday, Jan 23</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">2.3 miles</p>
                    <p className="text-xs text-muted-foreground">12-minute drive</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <Badge className="bg-success-light text-success border-success">
                    Medicare In-Network ✓
                  </Badge>
                </div>
                
                <div className="bg-gradient-to-r from-primary/10 to-blue-500/10 border border-primary/20 rounded-lg p-3">
                  <p className="text-xs font-semibold text-foreground mb-1">🤖 AI Recommendation:</p>
                  <p className="text-xs text-muted-foreground">
                    Perfect match for Maria: diabetes specialist, 12 minutes away, accepts Medicare, available this week. 
                    This selection saves you 45+ minutes of research time.
                  </p>
                </div>
                
                <Button className="w-full">Select This Provider</Button>
              </CardContent>
            </Card>
            
            {/* Other options (simplified) */}
            <Card className="opacity-70">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Dr. Michael Torres</CardTitle>
                <p className="text-sm text-muted-foreground">Endocrinology</p>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">3.1 miles • Available Feb 2</p>
                <Badge variant="secondary">78% Match</Badge>
              </CardContent>
            </Card>
            
            <Card className="opacity-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Dr. Lisa Park</CardTitle>
                <p className="text-sm text-muted-foreground">Internal Medicine</p>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">4.2 miles • Available Jan 30</p>
                <Badge variant="outline">65% Match</Badge>
              </CardContent>
            </Card>
          </div>
          
          <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <h4 className="font-semibold text-foreground">The Impact</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              Maria gets the right care, stays in network, and Brenda can move to the next patient. 
              <strong className="text-primary">Revenue protected: $18,500</strong>
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Real Impact & Results",
      content: (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Transforming Healthcare Continuity
            </h2>
            <p className="text-muted-foreground">
              This isn't just efficiency - it's saving lives and protecting revenue
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-center">Before AI</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-destructive" />
                  <span className="text-sm">45+ minutes per patient</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm">Manual provider research</span>
                </div>
                <div className="flex items-center gap-2">
                  <UserCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm">30% patient leakage</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-destructive">$15K+ lost per patient</span>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-primary bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg text-center text-primary">With AI</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="text-sm">30 seconds to perfect match</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="text-sm">Automated provider intelligence</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="text-sm">40% reduction in leakage</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-success">$18.5K+ retained per patient</span>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="bg-gradient-to-r from-primary/10 to-blue-500/10 border border-primary/20 rounded-lg p-6 text-center">
            <h3 className="text-xl font-bold text-foreground mb-4">The Bottom Line</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-2xl font-bold text-primary mb-1">20x</div>
                <div className="text-sm text-muted-foreground">Faster patient processing</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary mb-1">3x</div>
                <div className="text-sm text-muted-foreground">More patients handled per coordinator</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary mb-1">$18.5K+</div>
                <div className="text-sm text-muted-foreground">Revenue protected per retained patient</div>
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <p className="text-lg text-muted-foreground mb-4">
              Right patient, right provider, right time.
            </p>
            <Button size="lg" className="bg-gradient-to-r from-primary to-blue-500">
              Ready to Transform Your Care Coordination?
            </Button>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Progress indicator */}
          <div className="flex items-center justify-center mb-8">
            {demoSteps.map((_, index) => (
              <div key={index} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    index <= currentStep
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {index + 1}
                </div>
                {index < demoSteps.length - 1 && (
                  <div
                    className={`w-12 h-1 mx-2 ${
                      index < currentStep ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Current step content */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-center text-2xl">
                {demoSteps[currentStep].title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {demoSteps[currentStep].content}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
            >
              Previous
            </Button>
            
            <Button
              onClick={() => setCurrentStep(Math.min(demoSteps.length - 1, currentStep + 1))}
              disabled={currentStep === demoSteps.length - 1}
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoPage;