import { describe, expect, it } from 'vitest';
import { current as acdcCurrent, displacement } from '../../src/widgets/ac-dc/model.ts';
import { boilingPointPropane, boilingPointWater } from '../../src/widgets/boiling-point/model.ts';
import { cop } from '../../src/widgets/cop-explorer/model.ts';
import { flow } from '../../src/widgets/electron-flow/model.ts';
import { cycleStates, OUTDOOR_RANGE } from '../../src/widgets/heat-pump-cycle/model.ts';
import { logPosition, logValue } from '../../src/widgets/kit/scale.ts';
import { ohmsDigits, PRESETS, solve } from '../../src/widgets/ohms-law/model.ts';
import { circuit } from '../../src/widgets/series-parallel/model.ts';

describe('log scale (sliders)', () => {
  it('maps the ends of the range to the ends of the track', () => {
    expect(logPosition(1, 1, 1000, 1000)).toBeCloseTo(0);
    expect(logPosition(1000, 1, 1000, 1000)).toBeCloseTo(1000);
    expect(logPosition(10, 1, 1000, 1000)).toBeCloseTo(333.33, 1);
  });

  it('round-trips values and snaps to the step', () => {
    expect(logValue(logPosition(100, 1, 1000, 1000), 1, 1000, 1000, 1)).toBe(100);
    expect(logValue(500, 1, 10000, 1000, 10)).toBe(100);
  });
});

describe('electron flow (battery, switch, bulb)', () => {
  it('has no current and a dark bulb when the switch is open', () => {
    expect(flow({ volts: 12, closed: false })).toEqual({ amps: 0, glow: 0 });
  });

  it('follows I = V / R with the 4 Ω bulb', () => {
    expect(flow({ volts: 6, closed: true }).amps).toBeCloseTo(1.5);
    expect(flow({ volts: 12, closed: true }).amps).toBeCloseTo(3);
  });

  it('glows in proportion to power: full at 12 V, a quarter at 6 V', () => {
    expect(flow({ volts: 12, closed: true }).glow).toBeCloseTo(1);
    expect(flow({ volts: 6, closed: true }).glow).toBeCloseTo(0.25);
    expect(flow({ volts: 0, closed: true }).glow).toBe(0);
  });
});

describe("Ohm's law playground", () => {
  it('solves current and power from voltage and resistance', () => {
    expect(solve({ volts: 12, ohms: 6 })).toEqual({ amps: 2, watts: 24 });
    const kettle = solve({ volts: 230, ohms: 26.45 });
    expect(kettle.amps).toBeCloseTo(8.7, 1);
    expect(kettle.watts).toBeCloseTo(2000, -1);
  });

  it('gives zero current with zero voltage', () => {
    expect(solve({ volts: 0, ohms: 10 })).toEqual({ amps: 0, watts: 0 });
  });
});

describe("Ohm's law presets", () => {
  it('use resistances that display exactly, so the shown sum always adds up', () => {
    for (const preset of PRESETS) {
      const shown = Number(preset.ohms.toFixed(ohmsDigits(preset.ohms)));
      expect(shown, preset.id).toBe(preset.ohms);
    }
  });
});

describe('series and parallel bulbs (6 V battery, 6 Ω bulbs)', () => {
  it('series: the same current flows through every bulb, each dimmer', () => {
    const result = circuit('series', [true, true]);
    expect(result.totalAmps).toBeCloseTo(0.5);
    expect(result.bulbs.map((b) => b.amps)).toEqual([0.5, 0.5]);
    expect(result.bulbs.map((b) => b.brightness)).toEqual([0.25, 0.25]);
  });

  it('series: removing one bulb breaks the loop and all go dark', () => {
    const result = circuit('series', [true, false, true]);
    expect(result.totalAmps).toBe(0);
    expect(result.bulbs.map((b) => b.brightness)).toEqual([0, 0, 0]);
  });

  it('parallel: every bulb gets the full push and shines fully; currents add up', () => {
    const result = circuit('parallel', [true, true, true]);
    expect(result.bulbs.map((b) => b.brightness)).toEqual([1, 1, 1]);
    expect(result.totalAmps).toBeCloseTo(3);
  });

  it('parallel: removing one bulb leaves the others shining', () => {
    const result = circuit('parallel', [true, false, true]);
    expect(result.bulbs.map((b) => b.brightness)).toEqual([1, 0, 1]);
    expect(result.totalAmps).toBeCloseTo(2);
  });
});

describe('AC and DC', () => {
  it('DC current stays the same', () => {
    expect(acdcCurrent(0.3, 'dc', 1)).toBe(1);
    expect(acdcCurrent(7.1, 'dc', 1)).toBe(1);
  });

  it('AC current averages to zero over a whole cycle', () => {
    const f = 0.5;
    const samples = Array.from({ length: 1000 }, (_, i) => acdcCurrent((i / 1000) / f, 'ac', f));
    expect(samples.reduce((a, b) => a + b, 0) / samples.length).toBeCloseTo(0, 5);
    expect(acdcCurrent(0.25 / f, 'ac', f)).toBeCloseTo(1);
  });

  it('AC electrons come back to where they started; DC electrons keep going', () => {
    const f = 0.5;
    expect(displacement(1 / f, 'ac', f)).toBeCloseTo(displacement(0, 'ac', f), 6);
    expect(displacement(2, 'dc', f)).toBeGreaterThan(displacement(1, 'dc', f));
  });
});

describe('heat pump cycle temperatures', () => {
  it('heating: the indoor coil is hotter than the room, the outdoor coil colder than the outside air', () => {
    const s = cycleStates('heating', 0, 21);
    expect(s.indoorCoil).toBeGreaterThan(21);
    expect(s.outdoorCoil).toBeLessThan(0);
    expect(s.afterCompressor).toBeGreaterThan(s.indoorCoil);
    expect(s.afterValve).toBeLessThan(s.afterCompressor);
  });

  it('never shows impossible temperatures anywhere in the allowed outdoor range', () => {
    for (const mode of ['heating', 'cooling'] as const) {
      const [min, max] = OUTDOOR_RANGE[mode];
      const indoor = mode === 'heating' ? 21 : 25;
      for (let outdoor = min; outdoor <= max; outdoor++) {
        const s = cycleStates(mode, outdoor, indoor);
        const condensing = mode === 'heating' ? s.indoorCoil : s.outdoorCoil;
        const evaporating = mode === 'heating' ? s.outdoorCoil : s.indoorCoil;
        expect(condensing - 3, `${mode} ${outdoor}`).toBeGreaterThan(s.afterValve);
        expect(s.afterCompressor, `${mode} ${outdoor}`).toBeGreaterThan(condensing);
        expect(evaporating, `${mode} ${outdoor}`).toBeLessThan(condensing);
      }
    }
  });

  it('cooling: the indoor coil is colder than the room, the outdoor coil hotter than the outside air', () => {
    const s = cycleStates('cooling', 32, 25);
    expect(s.indoorCoil).toBeLessThan(25);
    expect(s.outdoorCoil).toBeGreaterThan(32);
    expect(s.afterCompressor).toBeGreaterThan(s.outdoorCoil);
  });
});

describe('coefficient of performance', () => {
  it('is about 4 at +7 °C outside with 35 °C floor heating', () => {
    expect(cop(7, 35)).toBeCloseTo(4.1, 1);
  });

  it('falls as it gets colder outside and as the water gets hotter', () => {
    expect(cop(-7, 35)).toBeLessThan(cop(7, 35));
    expect(cop(7, 55)).toBeLessThan(cop(7, 35));
  });

  it('never drops below 1 (it can always at least turn electricity into heat)', () => {
    expect(cop(-60, 70)).toBeGreaterThanOrEqual(1);
  });
});

describe('boiling point', () => {
  it('water boils at 100 °C at sea level', () => {
    expect(boilingPointWater(1.01325)).toBeCloseTo(100, 0);
  });

  it('water boils at about 70 °C on Everest and about 120 °C in a pressure cooker', () => {
    expect(boilingPointWater(0.31)).toBeCloseTo(70, 0);
    expect(boilingPointWater(2)).toBeCloseTo(120, 0);
  });

  it('propane (refrigerant R-290) boils at −42 °C at normal pressure, matching NIST data across the slider range', () => {
    expect(Math.abs(boilingPointPropane(1.01325) - -42.1)).toBeLessThan(0.3);
    expect(Math.abs(boilingPointPropane(1.6804) - -30)).toBeLessThan(0.3); // NIST: 1.6804 bar at −30 °C
    expect(boilingPointPropane(0.3)).toBeLessThan(-55);
  });
});
