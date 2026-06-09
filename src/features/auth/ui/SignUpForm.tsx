"use client";

import { useActionState } from "react";
import { signUp } from "../actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function SignUpForm() {
  const [state, action, pending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      return (await signUp(formData)) ?? null;
    },
    null,
  );

  return (
    <form action={action} className="w-full max-w-sm">
      <FieldGroup>
        <Field>
          <Input
            id="display_name"
            name="display_name"
            type="text"
            placeholder="Display name"
            aria-label="Display name"
            required
          />
        </Field>
        <Field>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="Email"
            aria-label="Email"
            required
          />
        </Field>
        <Field>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Password"
            aria-label="Password"
            required
            minLength={6}
          />
        </Field>
        {state?.error && (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Creating account…" : "Sign up"}
        </Button>
      </FieldGroup>
    </form>
  );
}
