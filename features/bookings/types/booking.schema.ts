import { z } from "zod";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "La fecha no es válida.");

const slotTimeSchema = z.string().regex(/^(?:[01]\d|2[23]):(?:00|30):00$/)
  .refine((value) => {
    const [hours, minutes] = value.split(":").map(Number);
    return (hours * 60 + minutes) % 90 === 30;
  }, "Elegí el inicio de un turno de 90 minutos.");

const uuidSchema = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

export const createManualBookingSchema = z.object({
  courtId: uuidSchema,
  bookingDate: dateSchema,
  startTime: slotTimeSchema,
  playerType: z.enum(["registered", "manual"]),
  playerId: uuidSchema.optional(),
  manualPlayerName: z.string().trim().max(100).optional(),
}).superRefine((value, context) => {
  if (value.playerType === "registered" && !value.playerId) {
    context.addIssue({ code: "custom", path: ["playerId"], message: "Elegí un jugador registrado." });
  }
  if (value.playerType === "manual" && (!value.manualPlayerName || value.manualPlayerName.length < 2)) {
    context.addIssue({ code: "custom", path: ["manualPlayerName"], message: "Ingresá el nombre del jugador (al menos 2 caracteres)." });
  }
});

export const updateBookingOwnerSchema = z.object({
  bookingId: uuidSchema,
  courtId: uuidSchema,
  bookingDate: dateSchema,
  startTime: slotTimeSchema,
});

export const cancelBookingOwnerSchema = z.object({
  bookingId: uuidSchema,
});

export const createOnlineBookingSchema = z.object({
  courtId: uuidSchema,
  bookingDate: dateSchema,
  startTime: slotTimeSchema,
});

export const cancelBookingPlayerSchema = z.object({
  bookingId: uuidSchema,
});

export type BookingActionState = {
  error?: string;
  success?: string;
};