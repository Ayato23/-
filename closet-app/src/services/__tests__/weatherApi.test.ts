import { parseForecast } from '../weatherApi';

const sample = {
  daily: {
    time: ['2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09'],
    temperature_2m_max: [18.2, 3.1, 12, 15],
    temperature_2m_min: [10.1, -2.4, 6, 8],
    precipitation_probability_max: [10, 80, null, 40],
    snowfall_sum: [0, 1.2, 0, 0],
  },
};

it('parses four days and detects snow', () => {
  const days = parseForecast(sample);
  expect(days).toHaveLength(4);
  expect(days[1]).toEqual({ date: '2026-11-07', tempMax: 3.1, tempMin: -2.4, precipProb: 80, snow: true, manual: false });
  expect(days[0].snow).toBe(false);
});

it('treats a missing precipitation value as 0', () => {
  expect(parseForecast(sample)[2].precipProb).toBe(0);
});

it('returns [] for malformed input', () => {
  expect(parseForecast({})).toEqual([]);
  expect(parseForecast(null)).toEqual([]);
  expect(parseForecast({ daily: { time: 'x' } })).toEqual([]);
});
