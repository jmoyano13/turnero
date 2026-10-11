export type AvailabilityStatus = "available" | "booked" | "locked";

export interface CourtRecord {
  id: string;
  name: string;
}

export interface BookingRecord {
  id: string;
  court_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  player_id: string | null;
  manual_player_name: string | null;
  player_first_name?: string | null;
  player_last_name?: string | null;
  status: "confirmed" | "cancelled";
  is_manual?: boolean;
  total_price?: number;
  deposit_amount?: number;
  payment_status?: "none" | "pending" | "paid" | "refund_pending";
  refund_required?: boolean;
}

export interface LockRecord {
  id: string;
  court_id: string | null;
  court_scope: "single" | "both";
  lock_type: "one_time" | "recurring";
  reason: string;
  specific_date: string | null;
  day_of_week: number | null;
  start_time: string;
  end_time: string;
}

export interface AvailabilitySlot {
  courtId: string;
  courtName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: AvailabilityStatus;
  price: number;
  isBookable: boolean;
  unavailableReason?: "past" | "in_progress";
  booking?: Pick<BookingRecord,
    "id" | "player_id" | "manual_player_name" | "player_first_name" | "player_last_name" |
    "is_manual" | "total_price" | "deposit_amount" | "payment_status" | "refund_required"
  >;
  lockReason?: string;
}

export const COURT_SLOT_MINUTES = 90;
export const PLAYER_BOOKING_WINDOW_DAYS = 7;
export const BUSINESS_TIME_ZONE = "America/Argentina/Buenos_Aires";

function dateAtUtcMidnight(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

export function addCalendarDays(date: string, days: number) {
  const result = dateAtUtcMidnight(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

export function getBusinessDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getBusinessMinutes(now: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BUSINESS_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return Number(values.hour) * 60 + Number(values.minute);
}

export function isPlayerDateAllowed(date: string, now = new Date()) {
  const today = getBusinessDate(now);
  return date >= today && date <= addCalendarDays(today, PLAYER_BOOKING_WINDOW_DAYS);
}

export function isPlayerCancellationAllowed(date: string, time: string, now = new Date()) {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes, seconds] = time.split(":").map(Number);
  const localTimestamp = Date.UTC(year, month - 1, day, hours, minutes, seconds ?? 0);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  let startTimestamp = localTimestamp;
  for (let iteration = 0; iteration < 2; iteration += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(startTimestamp)).map(({ type, value }) => [type, value]));
    const representedTimestamp = Date.UTC(
      Number(parts.year), Number(parts.month) - 1, Number(parts.day),
      Number(parts.hour), Number(parts.minute), Number(parts.second),
    );
    startTimestamp = localTimestamp - (representedTimestamp - startTimestamp);
  }
  return startTimestamp - now.getTime() >= 12 * 60 * 60 * 1000;
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

function formatTimeFromMinutes(totalMinutes: number) {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
}

function intervalOverlaps(start: string, end: string, otherStart: string, otherEnd: string) {
  const startMinutes = timeToMinutes(start);
  const otherStartMinutes = timeToMinutes(otherStart);
  const endMinutes = timeToMinutes(end) || (startMinutes > 0 ? 1440 : 0);
  const otherEndMinutes = timeToMinutes(otherEnd) || (otherStartMinutes > 0 ? 1440 : 0);
  return startMinutes < otherEndMinutes && otherStartMinutes < endMinutes;
}

function lockMatchesDate(lock: LockRecord, date: string) {
  if (lock.lock_type === "one_time") return lock.specific_date === date;
  return lock.day_of_week === dateAtUtcMidnight(date).getUTCDay();
}

export function createAvailabilitySlots({
  date,
  courts,
  bookings,
  locks,
  price,
  now = new Date(),
}: {
  date: string;
  courts: CourtRecord[];
  bookings: BookingRecord[];
  locks: LockRecord[];
  price: number;
  now?: Date;
}): AvailabilitySlot[] {
  const today = getBusinessDate(now);
  const currentMinutes = getBusinessMinutes(now);
  const isAllowedDate = isPlayerDateAllowed(date, now);

  return courts.flatMap((court) =>
    Array.from({ length: 24 * 60 / COURT_SLOT_MINUTES }, (_, index) => {
      const startMinutes = 30 + index * COURT_SLOT_MINUTES;
      const endMinutes = startMinutes + COURT_SLOT_MINUTES;
      const startTime = formatTimeFromMinutes(startMinutes);
      const endTime = formatTimeFromMinutes(endMinutes);
      const booking = bookings.find((item) =>
        item.court_id === court.id && item.status === "confirmed" &&
        intervalOverlaps(startTime, endTime, item.start_time, item.end_time),
      );
      const lock = locks.find((item) =>
        (item.court_scope === "both" || item.court_id === court.id) &&
        lockMatchesDate(item, date) &&
        intervalOverlaps(startTime, endTime, item.start_time, item.end_time),
      );
      const unavailableReason = date < today || (date === today && startMinutes < currentMinutes)
        ? (date === today && startMinutes + COURT_SLOT_MINUTES > currentMinutes ? "in_progress" : "past")
        : undefined;
      const status = booking ? "booked" : lock ? "locked" : "available";

      return {
        courtId: court.id,
        courtName: court.name,
        date,
        startTime,
        endTime,
        status,
        price,
        isBookable: status === "available" && isAllowedDate && !unavailableReason,
        ...(unavailableReason ? { unavailableReason } : {}),
        ...(booking ? { booking: {
          id: booking.id,
          player_id: booking.player_id,
          manual_player_name: booking.manual_player_name,
          player_first_name: booking.player_first_name,
          player_last_name: booking.player_last_name,
        } } : {}),
        ...(lock ? { lockReason: lock.reason } : {}),
      } satisfies AvailabilitySlot;
    }),
  );
}