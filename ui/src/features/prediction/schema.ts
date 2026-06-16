import { z } from "zod";
import { countSweepPoints } from "./lib/sweep";
import {
  DEFAULT_FORECAST_PRESETS,
  DEFAULT_MAX_SWEEP_POINTS,
  type CampaignBaseRequest,
  type CpmRange,
  type CpmSweepRequest,
} from "./types";

export function resolveCpmInputStep(step: number | undefined): number {
  if (step === 0.1 || step === 1) {
    return step;
  }
  return 0.1;
}

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
    })
    .superRefine((data, ctx) => {
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

export function formValuesToCampaignBaseRequest(
  values: CampaignFormInput,
): CampaignBaseRequest {
  return {
    hour_start: 0,
    hour_end: values.forecast_duration_hours,
    publishers: values.publishers,
    audience_size: values.audience_size,
    user_ids: [],
  };
}

export function formValuesToCampaignRequest(
  values: CampaignFormInput,
): import("./types").CampaignRequest {
  const base = formValuesToCampaignBaseRequest(values);
  return {
    cpm: values.cpm,
    ...base,
  };
}

const finiteNumber = z
  .number({ invalid_type_error: "required" })
  .refine((v) => Number.isFinite(v), { message: "required" });

type SweepSchemaContext = {
  maxSweepPoints: number;
};

export function createCpmSweepControlsSchema(context: SweepSchemaContext) {
  const maxPoints = context.maxSweepPoints;

  return z
    .object({
      min: finiteNumber.refine((v) => v >= 0, { message: "sweep_min_negative" }),
      max: finiteNumber,
      step: finiteNumber.refine((v) => v > 0, { message: "sweep_step_invalid" }),
    })
    .superRefine((data, ctx) => {
      if (data.max < data.min) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "sweep_max_below_min",
          path: ["max"],
        });
      }

      const pointCount = countSweepPoints(data.min, data.max, data.step);
      if (pointCount > maxPoints) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "sweep_too_many_points",
          path: ["step"],
        });
      }
    });
}

export type CpmSweepControlsInput = z.infer<
  ReturnType<typeof createCpmSweepControlsSchema>
>;

export function buildCpmSweepRequest(
  formValues: CampaignFormInput,
  cpmRange: CpmRange,
): CpmSweepRequest {
  return {
    base_request: formValuesToCampaignBaseRequest(formValues),
    cpm_range: cpmRange,
  };
}

export function createCampaignSweepFormSchema(context: {
  forecastPresets: number[];
  publisherUniverse: number[];
  requirePublishers: boolean;
  maxSweepPoints?: number;
}) {
  const campaignSchema = createCampaignFormSchema({
    forecastPresets: context.forecastPresets,
    publisherUniverse: context.publisherUniverse,
    requirePublishers: context.requirePublishers,
  });

  const sweepControlsSchema = createCpmSweepControlsSchema({
    maxSweepPoints: context.maxSweepPoints ?? DEFAULT_MAX_SWEEP_POINTS,
  });

  return campaignSchema.and(
    z.object({
      sweep: sweepControlsSchema,
    }),
  );
}

export function getDefaultSweepControls(metadata?: {
  cpm: { min: number; max: number; step: number };
}): CpmSweepControlsInput {
  return {
    min: metadata?.cpm.min ?? 0,
    max: metadata?.cpm.max ?? 100,
    step: metadata?.cpm.step ?? 5,
  };
}

export const defaultCampaignFormValues: CampaignFormInput = {
  cpm: 0,
  forecast_duration_hours: 24,
  publishers: [],
  audience_size: 1000,
};
