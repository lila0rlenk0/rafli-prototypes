// Pattern guard: only accepts the wall-clock shape `YYYY-MM-DDTHH:mm`
// (optional seconds). Anything else is delegated to the native parser,
// which keeps existing callers that already pass full ISO strings safe.
const WALL_CLOCK_PATTERN =
	/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/**
 * Converts a wall-clock datetime (`YYYY-MM-DDTHH:mm`) interpreted in an
 * IANA timezone into a UTC ISO string.
 *
 * Why this exists: `new Date('2025-06-15T14:30').toISOString()` parses
 * the literal as local in some environments and UTC in others — the
 * value the host actually intended (e.g. "2pm in New York") gets
 * silently shifted by their browser offset. We instead derive the
 * target-zone offset for that wall-clock via `Intl.DateTimeFormat` and
 * subtract it explicitly, so the resulting UTC matches the host's
 * intent regardless of where the request is rendered.
 *
 * Algorithm:
 *   1. Treat the wall-clock components as if they were already UTC.
 *   2. Format that UTC moment in the target zone — the formatted
 *      wall-clock minus the input wall-clock equals the zone's offset
 *      at that instant (DST-aware).
 *   3. Subtract the offset to recover the true UTC moment.
 *
 * @param wallClockIso - Local wall-clock string in `YYYY-MM-DDTHH:mm[:ss]` form (no offset)
 * @param timeZone - IANA timezone identifier (e.g. `America/New_York`)
 * @returns UTC ISO 8601 string ending in `Z`
 */
export function zonedTimeToUtcIso(
	wallClockIso: string,
	timeZone: string,
): string {
	const match = WALL_CLOCK_PATTERN.exec(wallClockIso);
	if (!match) {
		// Fallback for already-Z-suffixed or otherwise unambiguous strings —
		// caller passed something we don't need to disambiguate.
		return new Date(wallClockIso).toISOString();
	}

	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const hour = Number(match[4]);
	const minute = Number(match[5]);
	const second = match[6] ? Number(match[6]) : 0;

	// Step 1: pretend the wall-clock is UTC. This is *not* the answer —
	// it's the probe we feed back into Intl to discover the offset.
	const probeUtcMs = Date.UTC(year, month - 1, day, hour, minute, second);

	// Step 2: format the probe in the target zone. The parts come back as
	// what the wall-clock would *appear* to be in that zone, which lets
	// us compute the zone's offset for that specific instant.
	const dtf = new Intl.DateTimeFormat('en-US', {
		timeZone,
		hourCycle: 'h23',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	});
	const parts = dtf.formatToParts(new Date(probeUtcMs));

	const zoned: Record<string, number> = {};
	for (const part of parts) {
		if (part.type !== 'literal') zoned[part.type] = Number(part.value);
	}

	// `h23` should give 00–23, but some runtimes emit 24 at midnight —
	// normalize so Date.UTC doesn't roll the day forward unexpectedly.
	if (zoned.hour === 24) zoned.hour = 0;

	const zonedAsUtcMs = Date.UTC(
		zoned.year,
		zoned.month - 1,
		zoned.day,
		zoned.hour,
		zoned.minute,
		zoned.second,
	);

	// Step 3: the offset is the gap between probe and zoned interpretations.
	// Subtract it from the probe to recover the true UTC moment.
	const offsetMs = zonedAsUtcMs - probeUtcMs;
	return new Date(probeUtcMs - offsetMs).toISOString();
}

/**
 * Inverse of `zonedTimeToUtcIso`: takes a UTC ISO instant and returns the
 * wall-clock components (`date` = `YYYY-MM-DD`, `time` = `HH:mm`) as the
 * host saw them in `timeZone`.
 *
 * Why this exists: the edit form stores `startDate` / `startTime` as
 * separate wall-clock fragments. Extracting them via `toLocaleTimeString`
 * (browser-local) drifts whenever the editor's browser timezone differs
 * from the raffle's saved timezone — and round-trips through the diff
 * helper produce phantom changes. Extracting in `timeZone` keeps both
 * halves of the round-trip on the same convention.
 *
 * @param utcIso - UTC ISO 8601 string (with `Z` suffix or numeric offset)
 * @param timeZone - IANA timezone identifier (e.g. `America/New_York`)
 * @returns `{ date, time }` wall-clock pair in the target zone
 */
export function utcIsoToZonedWallClock(
	utcIso: string,
	timeZone: string,
): { date: string; time: string } {
	const dtf = new Intl.DateTimeFormat('en-US', {
		timeZone,
		hourCycle: 'h23',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
	});
	const parts = dtf.formatToParts(new Date(utcIso));
	const zoned: Record<string, string> = {};
	for (const part of parts) {
		if (part.type !== 'literal') zoned[part.type] = part.value;
	}
	// `h23` should give 00–23, but some runtimes emit 24 at midnight —
	// normalize so the wall-clock stays inside the same day.
	const hour = zoned.hour === '24' ? '00' : zoned.hour;
	return {
		date: `${zoned.year}-${zoned.month}-${zoned.day}`,
		time: `${hour}:${zoned.minute}`,
	};
}
