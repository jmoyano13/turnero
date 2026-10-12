import { z } from "zod";

import { isValidSlotStartTime } from "@/features/bookings/utils/slot-validation";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "La fecha no es válida.");

const slotTimeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):(?:00|30):00$/)
  .refine((value) => isValidSlotStartTime(value), "Elegí el inicio de un turno de 90 minutos.");

const courtIdSchema = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

export const createLockSchema = z.object({
  courtScope: z.enum(["single", "both"]),
  courtId: courtIdSchema.optional(),
  lockType: z.enum(["one_time", "recurring"]),
  specificDate: dateSchema.optional(),
  dayOfWeek: z.coerce.number().int().min(0).max(6).optional(),
  startTime: slotTimeSchema,
  reason: z.string().trim().min(2).max(120),
}).superRefine((value, context) => {
  if (value.courtScope === "single" && !value.courtId) {
    context.addIssue({ code: "custom", path: ["courtId"], message: "Elegí una cancha." });
  }
  if (value.lockType === "one_time" && !value.specificDate) {
    context.addIssue({ code: "custom", path: ["specificDate"], message: "Elegí la fecha del bloqueo." });
  }
  if (value.lockType === "recurring" && value.dayOfWeek === undefined) {
    context.addIssue({ code: "custom", path: ["dayOfWeek"], message: "Elegí el día de la semana." });
  }
});

export const updatePriceSchema = z.coerce.number().finite().positive().max(100000000);

export const deleteLockSchema = z.string().uuid();

export const weekDays = [
  "Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado",
] as const;

export function getSlotEndTime(startTime: string) {
  const [hours, minutes] = startTime.split(":").map(Number);
  const endMinutes = hours * 60 + minutes + 90;
  if (endMinutes === 1440) return "00:00:00";
  return `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}:00`;
}