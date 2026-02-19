export const HUBS = [
  "Dzivarasekwa",
  "Kuwadzana",
  "Mufakose",
  "Kambuzuma",
  "Warren Park",
  "Mbare",
  "Emganwini",
  "Victoria Falls",
  "Sizinda",
  "Gwayi",
  "Gokwe",
  "Jafuta",
  "Chitungwiza",
] as const;

export type Hub = (typeof HUBS)[number];

export function isHub(value: string): value is Hub {
  return (HUBS as readonly string[]).includes(value);
}
