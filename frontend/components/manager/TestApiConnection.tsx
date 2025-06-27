'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useManagerClasses } from '@/hooks/useManagerClasses';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export function TestApiConnection() {
  const [testResults, setTestResults] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const { data, error, isLoading, refetch } = useManagerClasses({ limit: 1 });

  const runConnectionTest = async () => {
    setTesting(true);
    try {
      const result = await refetch();
      setTestResults({
        success: true,
        data: result.data,
        error: null,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      setTestResults({
        success: false,
        data: null,
        error: err,
        timestamp: new Date().toISOString()
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {error ? <WifiOff className="h-5 w-5 text-red-500" /> : <Wifi className="h-5 w-5 text-green-500" />}
          API Connection Test
        </CardTitle>
        <CardDescription>
          Test manager classes API connectivity and data fetching
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={runConnectionTest}
            disabled={testing || isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${testing ? 'animate-spin' : ''}`} />
            {testing ? 'Testing...' : 'Test Connection'}
          </Button>
          
          <Badge variant={error ? 'destructive' : 'default'}>
            {isLoading ? 'Loading...' : error ? 'Error' : data ? `${data.length} classes` : 'Not tested'}
          </Badge>
        </div>

        {/* Current Query Status */}
        <div className="space-y-2">
          <h4 className="font-semibold">Current Query Status:</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Loading: <Badge variant="outline">{isLoading ? 'Yes' : 'No'}</Badge></div>
            <div>Error: <Badge variant="outline">{error ? 'Yes' : 'No'}</Badge></div>
            <div>Data: <Badge variant="outline">{data ? `${data.length} items` : 'None'}</Badge></div>
          </div>
        </div>

        {/* Error Details */}
        {error && (
          <div className="space-y-2">
            <h4 className="font-semibold text-red-600">Error Details:</h4>
            <pre className="bg-red-50 p-3 rounded text-xs overflow-x-auto">
              {JSON.stringify(error, null, 2)}
            </pre>
          </div>
        )}

        {/* Success Data */}
        {data && data.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-green-600">Sample Data:</h4>
            <pre className="bg-green-50 p-3 rounded text-xs overflow-x-auto">
              {JSON.stringify(data[0], null, 2)}
            </pre>
          </div>
        )}

        {/* Test Results */}
        {testResults && (
          <div className="space-y-2">
            <h4 className="font-semibold">Test Results:</h4>
            <div className="text-xs text-gray-600">Tested at: {testResults.timestamp}</div>
            <Badge variant={testResults.success ? 'default' : 'destructive'}>
              {testResults.success ? 'Success' : 'Failed'}
            </Badge>
            {testResults.error && (
              <pre className="bg-red-50 p-3 rounded text-xs overflow-x-auto">
                {JSON.stringify(testResults.error, null, 2)}
              </pre>
            )}
            {testResults.data && (
              <pre className="bg-blue-50 p-3 rounded text-xs overflow-x-auto">
                {JSON.stringify(testResults.data, null, 2)}
              </pre>
            )}
          </div>
        )}

        {/* Debug Info */}
        <div className="space-y-2 border-t pt-4">
          <h4 className="font-semibold text-gray-600">Debug Info:</h4>
          <div className="text-xs space-y-1">
            <div>API Base: {process.env.NEXT_PUBLIC_API_URL || 'https://eduscan.local/api/v1'}</div>
            <div>Endpoint: /classes/</div>
            <div>Expected: Manager classes for current organization</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 