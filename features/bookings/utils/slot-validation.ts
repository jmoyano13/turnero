const SLOT_TIME_PATTERN = /^(?:[01]\d|2[0-3]):(?:00|30):00$/;

export function isValidSlotStartTime(value: string): boolean {
  if (!SLOT_TIME_PATTERN.test(value)) return false;

  const [hours, minutes] = value.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes;
  return totalMinutes % 90 === 30 && totalMinutes <= 23 * 60;
}

export function getValidSlotStartTimes(): string[] {
  return Array.from({ length: 16 }, (_, index) => {
    const minutes = 30 + index * 90;
    const hours = Math.floor(minutes / 60);
    return `${String(hours).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:00`;
  });
}
