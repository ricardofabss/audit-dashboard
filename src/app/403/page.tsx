import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Access denied</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-300">You are authenticated, but your current role does not allow access to this area.</p>
          <Link href="/dashboard" className="block">
            <Button className="w-full">Go to dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
