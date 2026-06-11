"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import sharp from "sharp";
import { z } from "zod";
import { locales } from "@/i18n/config";
import { createAdminClient } from "@/shared/lib/supabase/admin";
import { createClient } from "@/shared/lib/supabase/server";
import { getCurrentUserId } from "@/shared/lib/auth";
import { setLocaleCookie } from "@/shared/lib/locale-cookie";
import type { Locale } from "@/shared/types/database";

const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

const settingsSchema = z.object({
  notify_goals: z
    .enum(["true", "false"])
    .transform((value) => value === "true"),
});

const localeSchema = z.object({
  locale: z.enum(locales),
});

function createDisplayNameSchema(
  nameRequired: string,
  nameTooLong: string,
) {
  return z.object({
    display_name: z.string().trim().min(1, nameRequired).max(32, nameTooLong),
  });
}

const allowedAvatarMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

function getAvatarFolder(userId: string): string {
  return `${userId}`;
}

function getPublicAvatarUrl(path: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }

  return `${baseUrl}/storage/v1/object/public/${AVATAR_BUCKET}/${path}`;
}

async function removeExistingAvatars(userId: string): Promise<void> {
  const admin = createAdminClient();
  const folder = getAvatarFolder(userId);
  const { data: existingFiles, error } = await admin.storage
    .from(AVATAR_BUCKET)
    .list(folder);

  if (error) {
    throw new Error(error.message);
  }

  if (!existingFiles?.length) return;

  const paths = existingFiles
    .filter((file) => file.name)
    .map((file) => `${folder}/${file.name}`);

  if (!paths.length) return;

  const { error: removeError } = await admin.storage
    .from(AVATAR_BUCKET)
    .remove(paths);

  if (removeError) {
    throw new Error(removeError.message);
  }
}

export async function updateNotificationSettings(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const t = await getTranslations("common.errors");
  const userId = await getCurrentUserId();
  if (!userId) return { error: t("notAuthenticated") };

  const parsed = settingsSchema.safeParse({
    notify_goals: formData.get("notify_goals"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("invalidInput") };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      notify_goals: parsed.data.notify_goals,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { success: true };
}

export async function updateLocale(
  locale: Locale,
): Promise<{ error?: string; success?: boolean }> {
  const t = await getTranslations("common.errors");
  const userId = await getCurrentUserId();
  if (!userId) return { error: t("notAuthenticated") };

  const parsed = localeSchema.safeParse({ locale });
  if (!parsed.success) {
    return { error: t("invalidInput") };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      locale: parsed.data.locale,
      locale_custom: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) return { error: error.message };

  await setLocaleCookie(parsed.data.locale);
  revalidatePath("/", "layout");
  revalidatePath("/settings");
  return { success: true };
}

export async function updateDisplayName(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const t = await getTranslations("common.errors");
  const userId = await getCurrentUserId();
  if (!userId) return { error: t("notAuthenticated") };

  const displayNameSchema = createDisplayNameSchema(
    t("nameRequired"),
    t("nameTooLong"),
  );

  const parsed = displayNameSchema.safeParse({
    display_name: formData.get("display_name"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("invalidInput") };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.display_name,
      display_name_custom: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { success: true };
}

export async function updateAvatar(
  _prev: { error?: string; photoUrl?: string } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean; photoUrl?: string }> {
  const t = await getTranslations("common.errors");
  const userId = await getCurrentUserId();
  if (!userId) return { error: t("notAuthenticated") };

  const avatar = formData.get("avatar");
  if (!(avatar instanceof File) || avatar.size === 0) {
    return { error: t("chooseImage") };
  }

  if (avatar.size > MAX_AVATAR_BYTES) {
    return { error: t("imageTooLarge") };
  }

  const mimeType = avatar.type.toLowerCase();
  const extension = avatar.name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
  const isHeic =
    mimeType === "image/heic" ||
    mimeType === "image/heif" ||
    extension === ".heic" ||
    extension === ".heif";

  if (mimeType && !allowedAvatarMimeTypes.has(mimeType) && !isHeic) {
    return { error: t("unsupportedImageFormat") };
  }

  let processed: Buffer;
  try {
    const input = Buffer.from(await avatar.arrayBuffer());
    processed = await sharp(input, { failOn: "none" })
      .rotate()
      .resize(512, 512, { fit: "cover", position: "centre" })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    return { error: t("failedProcessImage") };
  }

  const admin = createAdminClient();
  const objectPath = `${getAvatarFolder(userId)}/${Date.now()}.webp`;

  try {
    await removeExistingAvatars(userId);
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : t("failedReplaceAvatar"),
    };
  }

  const { error: uploadError } = await admin.storage
    .from(AVATAR_BUCKET)
    .upload(objectPath, processed, {
      contentType: "image/webp",
      upsert: true,
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const photoUrl = getPublicAvatarUrl(objectPath);
  const supabase = await createClient();
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      photo_url: photoUrl,
      avatar_custom: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (profileError) return { error: profileError.message };

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { success: true, photoUrl };
}
