import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Page not found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-300">The requested route does not exist.</p>
          <Link href="/dashboard" className="block">
            <Button className="w-full">Back to dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
