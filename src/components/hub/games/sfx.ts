/**
 * Rafli mini-games — procedural Web Audio sound effects.
 *
 * A faithful TypeScript port of the design handoff's `sfx.js`. Every tone is
 * synthesised at runtime (no audio assets), so the bundle stays asset-free.
 * A single `AudioContext` is created lazily on first use and resumed if the
 * browser suspended it — the first call must therefore happen inside a user
 * gesture (all triggers are click/drag-driven, so this holds). Every method
 * is a no-op during SSR and when Web Audio is unavailable, so callers can
 * fire them unconditionally (`sfx.win()`), no guarding required at the call
 * site.
 */

/** Older Safari exposes the constructor under a vendor prefix. */
interface WebkitWindow {
	webkitAudioContext?: typeof AudioContext;
}

let context: AudioContext | null = null;
/** Throttle guard for the rapid-fire scratch sound (ms timestamp). */
let lastScratchAt = 0;

/**
 * Returns the shared, resumed AudioContext, lazily creating it. Null when
 * running on the server or when the platform has no Web Audio support.
 *
 * @returns The live AudioContext, or null when unavailable
 */
function audio(): AudioContext | null {
	if (typeof window === 'undefined') {
		return null;
	}
	if (!context) {
		const Ctor =
			window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
		if (!Ctor) {
			return null;
		}
		try {
			context = new Ctor();
		} catch {
			return null;
		}
	}
	if (context.state === 'suspended') {
		void context.resume();
	}
	return context;
}

/** Short band-passed noise burst — self-throttled to 80ms between hits. */
function scratch(): void {
	const now = Date.now();
	if (now - lastScratchAt < 80) {
		return;
	}
	lastScratchAt = now;
	const a = audio();
	if (!a) {
		return;
	}
	const len = Math.floor(a.sampleRate * 0.072);
	const buf = a.createBuffer(1, len, a.sampleRate);
	const d = buf.getChannelData(0);
	for (let i = 0; i < len; i++) {
		d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 0.4);
	}
	const src = a.createBufferSource();
	src.buffer = buf;
	const bp = a.createBiquadFilter();
	bp.type = 'bandpass';
	bp.frequency.value = 2600 + Math.random() * 900;
	bp.Q.value = 0.55;
	const g = a.createGain();
	g.gain.value = 0.13;
	src.connect(bp);
	bp.connect(g);
	g.connect(a.destination);
	src.start();
}

/** Metallic hum that ramps up then decelerates over ~2.85s. */
function coinSpin(): void {
	const a = audio();
	if (!a) {
		return;
	}
	const osc = a.createOscillator();
	const dist = a.createWaveShaper();
	const crv = new Float32Array(256);
	for (let i = 0; i < 256; i++) {
		crv[i] = ((2 * i) / 255 - 1) * 0.6;
	}
	dist.curve = crv;
	const g = a.createGain();
	osc.type = 'sawtooth';
	const t = a.currentTime;
	osc.frequency.setValueAtTime(110, t);
	osc.frequency.linearRampToValueAtTime(320, t + 0.55);
	osc.frequency.linearRampToValueAtTime(240, t + 1.4);
	osc.frequency.linearRampToValueAtTime(160, t + 2.2);
	osc.frequency.linearRampToValueAtTime(120, t + 2.8);
	g.gain.setValueAtTime(0, t);
	g.gain.linearRampToValueAtTime(0.16, t + 0.12);
	g.gain.setValueAtTime(0.16, t + 2.3);
	g.gain.linearRampToValueAtTime(0, t + 2.8);
	osc.connect(dist);
	dist.connect(g);
	g.connect(a.destination);
	osc.start(t);
	osc.stop(t + 2.85);
}

/** Metallic thud followed by a fading ring — the coin settling. */
function coinLand(): void {
	const a = audio();
	if (!a) {
		return;
	}
	const t = a.currentTime;
	const thud = a.createOscillator();
	const thudG = a.createGain();
	thud.type = 'sine';
	thud.frequency.setValueAtTime(160, t);
	thud.frequency.exponentialRampToValueAtTime(60, t + 0.18);
	thudG.gain.setValueAtTime(0.38, t);
	thudG.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
	thud.connect(thudG);
	thudG.connect(a.destination);
	thud.start(t);
	thud.stop(t + 0.25);
	const ring = a.createOscillator();
	const ringG = a.createGain();
	ring.type = 'sine';
	ring.frequency.value = 820;
	ringG.gain.setValueAtTime(0, t + 0.02);
	ringG.gain.linearRampToValueAtTime(0.18, t + 0.06);
	ringG.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
	ring.connect(ringG);
	ringG.connect(a.destination);
	ring.start(t + 0.02);
	ring.stop(t + 0.6);
}

/** Five quick ascending notes that open the fanfare. */
function playWinSweep(a: AudioContext, t: number): void {
	[523.25, 587.33, 659.25, 783.99, 1046.5].forEach((f, i) => {
		const osc = a.createOscillator();
		const g = a.createGain();
		osc.type = 'triangle';
		osc.frequency.value = f;
		const ts = t + i * 0.068;
		g.gain.setValueAtTime(0, ts);
		g.gain.linearRampToValueAtTime(0.18 - i * 0.01, ts + 0.03);
		g.gain.exponentialRampToValueAtTime(0.001, ts + 0.22);
		osc.connect(g);
		g.connect(a.destination);
		osc.start(ts);
		osc.stop(ts + 0.25);
	});
}

/** The big triumphant C-major chord landing. */
function playWinChord(a: AudioContext, ct: number): void {
	const chord: readonly [number, OscillatorType, number][] = [
		[261.63, 'triangle', 0.2],
		[523.25, 'sine', 0.18],
		[659.25, 'sine', 0.16],
		[783.99, 'sine', 0.16],
		[1046.5, 'sine', 0.22],
	];
	chord.forEach(([freq, type, peak]) => {
		const osc = a.createOscillator();
		const g = a.createGain();
		osc.type = type;
		osc.frequency.value = freq;
		g.gain.setValueAtTime(0, ct);
		g.gain.linearRampToValueAtTime(peak, ct + 0.05);
		g.gain.setValueAtTime(peak * 0.88, ct + 0.3);
		g.gain.exponentialRampToValueAtTime(0.001, ct + 2.1);
		osc.connect(g);
		g.connect(a.destination);
		osc.start(ct);
		osc.stop(ct + 2.2);
	});
}

/** High sparkle pings layered over the chord. */
function playWinSparkles(a: AudioContext, ct: number): void {
	[2093, 2637, 3136].forEach((f, i) => {
		const osc = a.createOscillator();
		const g = a.createGain();
		osc.type = 'sine';
		osc.frequency.value = f;
		const ts = ct + 0.04 + i * 0.07;
		g.gain.setValueAtTime(0, ts);
		g.gain.linearRampToValueAtTime(0.07, ts + 0.02);
		g.gain.exponentialRampToValueAtTime(0.001, ts + 0.4);
		osc.connect(g);
		g.connect(a.destination);
		osc.start(ts);
		osc.stop(ts + 0.45);
	});
}

/** A kick-drum thud on the chord landing. */
function playWinKick(a: AudioContext, ct: number): void {
	const kick = a.createOscillator();
	const kickG = a.createGain();
	kick.type = 'sine';
	kick.frequency.setValueAtTime(210, ct);
	kick.frequency.exponentialRampToValueAtTime(45, ct + 0.22);
	kickG.gain.setValueAtTime(0.5, ct);
	kickG.gain.exponentialRampToValueAtTime(0.001, ct + 0.28);
	kick.connect(kickG);
	kickG.connect(a.destination);
	kick.start(ct);
	kick.stop(ct + 0.32);
}

/** Trailing high melody riff (E6 → G6 → C7). */
function playWinRiff(a: AudioContext, ct: number): void {
	const riff: readonly [number, number, number][] = [
		[1318.5, ct + 0.55, 0.13],
		[1567.98, ct + 0.72, 0.12],
		[2093, ct + 0.88, 0.55],
	];
	riff.forEach(([freq, at, dur]) => {
		const osc = a.createOscillator();
		const g = a.createGain();
		osc.type = 'sine';
		osc.frequency.value = freq;
		g.gain.setValueAtTime(0, at);
		g.gain.linearRampToValueAtTime(dur, at + 0.03);
		g.gain.exponentialRampToValueAtTime(0.001, at + dur + 0.1);
		osc.connect(g);
		g.connect(a.destination);
		osc.start(at);
		osc.stop(at + dur + 0.15);
	});
}

/** Big celebratory fanfare — rising sweep, chord, sparkles, kick, riff. */
function win(): void {
	const a = audio();
	if (!a) {
		return;
	}
	const t = a.currentTime;
	const ct = t + 0.36;
	playWinSweep(a, t);
	playWinChord(a, ct);
	playWinSparkles(a, ct);
	playWinKick(a, ct);
	playWinRiff(a, ct);
}

/** Soft descending minor three-note motif — a gentle loss. */
function loss(): void {
	const a = audio();
	if (!a) {
		return;
	}
	[415.3, 369.99, 311.13].forEach((f, i) => {
		const osc = a.createOscillator();
		const g = a.createGain();
		osc.type = 'sine';
		osc.frequency.value = f;
		const t = a.currentTime + i * 0.14;
		g.gain.setValueAtTime(0, t);
		g.gain.linearRampToValueAtTime(0.14, t + 0.04);
		g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
		osc.connect(g);
		g.connect(a.destination);
		osc.start(t);
		osc.stop(t + 0.6);
	});
}

/** Soft mechanical click — a mystery-card tap. */
function cardPick(): void {
	const a = audio();
	if (!a) {
		return;
	}
	const t = a.currentTime;
	const osc = a.createOscillator();
	const g = a.createGain();
	osc.type = 'sine';
	osc.frequency.setValueAtTime(700, t);
	osc.frequency.exponentialRampToValueAtTime(280, t + 0.07);
	g.gain.setValueAtTime(0.14, t);
	g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
	osc.connect(g);
	g.connect(a.destination);
	osc.start(t);
	osc.stop(t + 0.1);
}

/** Papery band-passed swoosh — the cards flipping to reveal. */
function cardReveal(): void {
	const a = audio();
	if (!a) {
		return;
	}
	const len = Math.floor(a.sampleRate * 0.28);
	const buf = a.createBuffer(1, len, a.sampleRate);
	const d = buf.getChannelData(0);
	for (let i = 0; i < len; i++) {
		const t = i / len;
		d[i] = (Math.random() * 2 - 1) * Math.sin(t * Math.PI) * (1 - t * 0.5);
	}
	const src = a.createBufferSource();
	src.buffer = buf;
	const bp = a.createBiquadFilter();
	bp.type = 'bandpass';
	bp.frequency.value = 1400;
	bp.Q.value = 0.9;
	const g = a.createGain();
	g.gain.value = 0.28;
	src.connect(bp);
	bp.connect(g);
	g.connect(a.destination);
	src.start();
}

/** Soft two-note ding — the scratch prize fading into view. */
function reveal(): void {
	const a = audio();
	if (!a) {
		return;
	}
	const t = a.currentTime;
	[880, 1108].forEach((f, i) => {
		const osc = a.createOscillator();
		const g = a.createGain();
		osc.type = 'sine';
		osc.frequency.value = f;
		const ts = t + i * 0.08;
		g.gain.setValueAtTime(0, ts);
		g.gain.linearRampToValueAtTime(0.16, ts + 0.04);
		g.gain.exponentialRampToValueAtTime(0.001, ts + 0.4);
		osc.connect(g);
		g.connect(a.destination);
		osc.start(ts);
		osc.stop(ts + 0.45);
	});
}

/** Synthesised SFX surface shared by all three games. */
export const sfx = {
	scratch,
	coinSpin,
	coinLand,
	win,
	loss,
	cardPick,
	cardReveal,
	reveal,
} as const;
