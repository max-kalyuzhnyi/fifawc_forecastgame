import Link from "next/link";
import { LoginForm } from "@/features/auth/ui/LoginForm";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  return (
    <main className="flex min-h-full flex-col items-center justify-center px-4 py-12">
      <Card className="glass corner-squircle w-full max-w-sm border-0 bg-transparent shadow-none ring-0">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">WC 2026 Forecast</CardTitle>
          <CardDescription>Sign in to make your picks</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            No account?{" "}
            <Button variant="link" className="h-auto p-0" asChild>
              <Link href="/signup">Sign up</Link>
            </Button>
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}
