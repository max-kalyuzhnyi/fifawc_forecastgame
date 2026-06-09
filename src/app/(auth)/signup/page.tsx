import Link from "next/link";
import { SignUpForm } from "@/features/auth/ui/SignUpForm";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SignUpPage() {
  return (
    <main className="flex min-h-full flex-col items-center justify-center px-4 py-12">
      <Card className="glass corner-squircle w-full max-w-sm border-0 bg-transparent shadow-none ring-0">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">WC 2026 Forecast</CardTitle>
          <CardDescription>Create your account</CardDescription>
        </CardHeader>
        <CardContent>
          <SignUpForm />
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Button variant="link" className="h-auto p-0" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}
