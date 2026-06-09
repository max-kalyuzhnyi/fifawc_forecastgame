import { TelegramLogin } from "@/features/auth/ui/TelegramLogin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  return (
    <main className="flex min-h-full flex-col items-center justify-center px-4 py-12">
      <Card className="glass corner-squircle w-full max-w-sm border-0 bg-transparent shadow-none ring-0">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">WC 2026 Forecast</CardTitle>
          <CardDescription>Sign in with Telegram to make your picks</CardDescription>
        </CardHeader>
        <CardContent>
          <TelegramLogin />
        </CardContent>
      </Card>
    </main>
  );
}
