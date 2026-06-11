import { AppPageTransition } from "@/shared/ui/AppPageTransition";

export default function AppTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppPageTransition>{children}</AppPageTransition>;
}
