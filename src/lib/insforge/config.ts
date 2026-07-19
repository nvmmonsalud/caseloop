export const INSFORGE_ASSIGNMENT_ID = "40000000-0000-0000-0000-000000000001";

export function isInsForgePersistenceEnabled() {
  return (
    process.env.NEXT_PUBLIC_PERSISTENCE_ENABLED === "true" &&
    Boolean(process.env.NEXT_PUBLIC_INSFORGE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY)
  );
}
