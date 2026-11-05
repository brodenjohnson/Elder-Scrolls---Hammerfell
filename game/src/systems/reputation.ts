// The three reputations (bible section 10): Infamy (how feared the player is),
// Standing with each faction, and Collateral (harm to people who did not deserve it).
// Changes are logged so a later UI and tests can see why a number moved.

export type ReputationState = { infamy: number; collateral: number; standing: Record<string, number>; log: { what: string; delta: Record<string, number> }[] };

export const newReputation = (): ReputationState => ({ infamy: 0, collateral: 0, standing: {}, log: [] });

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function applyReputation(r: ReputationState, what: string, delta: { infamy?: number; collateral?: number; standing?: Record<string, number> }) {
  const logged: Record<string, number> = {};
  if (delta.infamy) { r.infamy = clamp(r.infamy + delta.infamy, 0, 100); logged.infamy = delta.infamy; }
  if (delta.collateral) { r.collateral = clamp(r.collateral + delta.collateral, 0, 100); logged.collateral = delta.collateral; }
  for (const [f, d] of Object.entries(delta.standing ?? {})) { r.standing[f] = clamp((r.standing[f] ?? 0) + d, -100, 100); logged[`standing.${f}`] = d; }
  r.log.push({ what, delta: logged });
  if (r.log.length > 200) r.log.shift();
}
