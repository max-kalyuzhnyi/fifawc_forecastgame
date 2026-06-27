"use client";

import { useTranslations } from "next-intl";
import { getBoostBudgetMatrix } from "@/entities/playoff/model/boostBudget";
import { ROUND_WEIGHTS } from "@/entities/match/model/types";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface PlayoffHowToDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlayoffHowToDrawer({
  open,
  onOpenChange,
}: PlayoffHowToDrawerProps) {
  const t = useTranslations("playoff.howTo");
  const matrix = getBoostBudgetMatrix();

  const weightRows = Object.entries(ROUND_WEIGHTS)
    .filter(([key]) => !key.startsWith("group_"))
    .map(([key, weight]) => ({
      key,
      label: t(`rounds.${key}` as never),
      weight,
    }));

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t("title")}</DrawerTitle>
          <DrawerDescription>{t("description")}</DrawerDescription>
        </DrawerHeader>

        <div className="max-h-[55dvh] space-y-4 overflow-y-auto px-4 pb-2 text-sm">
          <section className="space-y-2">
            <h3 className="font-semibold text-foreground">{t("weightsTitle")}</h3>
            <ul className="space-y-2">
              {weightRows.map((row) => (
                <li
                  key={row.key}
                  className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2"
                >
                  <span>{row.label}</span>
                  <span className="font-semibold tabular-nums">x{row.weight}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold text-foreground">{t("boostsTitle")}</h3>
            <p className="text-muted-foreground">{t("boostsIntro")}</p>
            <div className="overflow-x-auto rounded-xl bg-white/5">
              <table className="min-w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-3 py-2 font-medium">{t("tierColumn")}</th>
                    <th className="px-3 py-2 font-medium">{t("roundOf32")}</th>
                    <th className="px-3 py-2 font-medium">{t("roundOf16")}</th>
                    <th className="px-3 py-2 font-medium">{t("quarterFinal")}</th>
                    <th className="px-3 py-2 font-medium">{t("semiFinal")}</th>
                  </tr>
                </thead>
                <tbody>
                  {([1, 2, 3, 4] as const).map((tier) => (
                    <tr key={tier} className="border-b border-white/5 last:border-0">
                      <td className="px-3 py-2 font-medium">
                        {t(`tiers.t${tier}` as never)}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {matrix[tier].round_of_32}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {matrix[tier].round_of_16}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {matrix[tier].quarter_final}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {matrix[tier].semi_final}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-muted-foreground">{t("boostsNote")}</p>
          </section>

          <section className="rounded-xl bg-white/5 px-3 py-2 text-muted-foreground">
            {t("tiersIntro")}
          </section>
        </div>

        <DrawerFooter className="pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)]">
          <Button
            className="h-14 w-full text-base font-semibold"
            size="xl"
            onClick={() => onOpenChange(false)}
          >
            {t("close")}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
