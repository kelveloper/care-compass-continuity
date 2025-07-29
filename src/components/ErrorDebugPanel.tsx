import React, { useState } from 'react';
import { errorLogger } from '@/lib/error-logger';
import { ErrorState } from '@/types/error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Trash2, Bug, RefreshCw } from 'lucide-react';

export function ErrorDebugPanel() {
  const [errors, setErrors] = useState<ErrorState[]>(() => errorLogger.getStoredErrors());
  const [isOpen, setIsOpen] = useState(false);

  const refreshErrors = () => {
    setErrors(errorLogger.getStoredErrors());
  };

  const clearErrors = () => {
    errorLogger.clearStoredErrors();
    setErrors([]);
  };

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="bg-background border-2 shadow-lg"
          >
            <Bug className="h-4 w-4 mr-2" />
            Errors ({errors.length})
            <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-2">
          <Card className="w-96 max-h-96 shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm">Error Debug Panel</CardTitle>
                  <CardDescription className="text-xs">
                    Development mode - Recent errors
                  </CardDescription>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={refreshErrors}
                    className="h-6 w-6 p-0"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearErrors}
                    className="h-6 w-6 p-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              {errors.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No errors recorded
                </p>
              ) : (
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {errors.map((error, index) => (
                      <div key={index} className="border rounded p-2 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="outline" className="text-xs">
                            {error.type.toUpperCase()}
                          </Badge>
                          <span className="text-muted-foreground">
                            {(() => {
                              try {
                                if (error.timestamp instanceof Date) {
                                  return error.timestamp.toLocaleTimeString();
                                }
                                return new Date(error.timestamp).toLocaleTimeString();
                              } catch (e) {
                                return 'Invalid timestamp';
                              }
                            })()}
                          </span>
                        </div>
                        
                        <p className="font-medium mb-1 break-words">
                          {error.message}
                        </p>
                        
                        {error.stack && (
                          <details className="mt-1">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                              Stack trace
                            </summary>
                            <pre className="mt-1 p-1 bg-muted rounded text-xs overflow-auto max-h-20 whitespace-pre-wrap">
                              {error.stack}
                            </pre>
                          </details>
                        )}
                        
                        {error.componentStack && (
                          <details className="mt-1">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                              Component stack
                            </summary>
                            <pre className="mt-1 p-1 bg-muted rounded text-xs overflow-auto max-h-20 whitespace-pre-wrap">
                              {error.componentStack}
                            </pre>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}