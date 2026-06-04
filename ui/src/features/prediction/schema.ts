import { z } from "zod";
import { DEFAULT_FORECAST_PRESETS } from "./types";

export function parseUserIdsRaw(raw: string): number[] {
  const trimmed = raw.trim();
  if (!trimmed) {
    return [];
  }
  return trimmed
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => {
      const value = Number(part);
      if (!Number.isInteger(value)) {
        throw new Error("not_integer");
      }
      return value;
    });
}

type SchemaContext = {
  forecastPresets: number[];
  publisherUniverse: number[];
  requirePublishers: boolean;
};

export function createCampaignFormSchema(context: SchemaContext) {
  const presets =
    context.forecastPresets.length > 0
      ? context.forecastPresets
      : [...DEFAULT_FORECAST_PRESETS];

  return z
    .object({
      cpm: z
        .number({ invalid_type_error: "required" })
        .refine((v) => !Number.isNaN(v), { message: "required" })
        .refine((v) => v >= 0, { message: "cpm_negative" }),
      forecast_duration_hours: z
        .number({ invalid_type_error: "required" })
        .refine((v) => presets.includes(v), { message: "invalid_preset" }),
      publishers: z.array(z.number().int()),
      audience_size: z
        .number({ invalid_type_error: "required" })
        .refine((v) => !Number.isNaN(v), { message: "required" })
        .refine((v) => Number.isInteger(v), { message: "audience_integer" })
        .refine((v) => v >= 1, { message: "audience_min" }),
      user_ids_raw: z.string(),
    })
    .superRefine((data, ctx) => {
      let userIds: number[] = [];
      try {
        userIds = parseUserIdsRaw(data.user_ids_raw);
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "user_ids_invalid",
          path: ["user_ids_raw"],
        });
        return;
      }

      if (data.audience_size < userIds.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "audience_vs_users",
          path: ["audience_size"],
        });
      }

      if (context.requirePublishers && data.publishers.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "publishers_required",
          path: ["publishers"],
        });
      }

      if (context.publisherUniverse.length > 0) {
        const invalid = data.publishers.filter(
          (id: number) => !context.publisherUniverse.includes(id),
        );
        if (invalid.length > 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "publishers_invalid",
            path: ["publishers"],
          });
        }
      }
    });
}

export type CampaignFormSchema = ReturnType<typeof createCampaignFormSchema>;
export type CampaignFormInput = z.infer<CampaignFormSchema>;

export function formValuesToCampaignRequest(
  values: CampaignFormInput,
): import("./types").CampaignRequest {
  const user_ids = parseUserIdsRaw(values.user_ids_raw);
  return {
    cpm: values.cpm,
    hour_start: 0,
    hour_end: values.forecast_duration_hours,
    publishers: values.publishers,
    audience_size: values.audience_size,
    user_ids,
  };
}

export const defaultCampaignFormValues: CampaignFormInput = {
  cpm: 0,
  forecast_duration_hours: 24,
  publishers: [],
  audience_size: 1000,
  user_ids_raw: "",
};
