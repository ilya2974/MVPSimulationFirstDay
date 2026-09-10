import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white text-[#121217]">
      <Card className="w-full max-w-md mx-4 border-[#C2C2C2] shadow-[0_5px_12px_rgba(18,18,23,0.08)]">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-[#E71026]" />
            <h1 className="text-2xl font-bold">
              404 Page Not Found
            </h1>
          </div>

          <p className="mt-4 text-sm text-[#626269]">
            Did you forget to add the page to the router?
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
