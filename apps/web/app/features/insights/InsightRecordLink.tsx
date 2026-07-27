import { Link } from "react-router";
import { Text } from "@repo/ui";

/**
 * Deep-link badge for insight grounding ids. Falls back to plain text if the
 * path cannot be built.
 */
export function InsightRecordLink({
  entityName,
  recordId,
}: {
  readonly entityName: string;
  readonly recordId: string;
}) {
  const id = recordId.trim();
  if (!id || !entityName.trim()) {
    return null;
  }

  try {
    const to = `/app/${encodeURIComponent(entityName)}/${encodeURIComponent(id)}`;
    return (
      <Link
        to={to}
        className="text-muted-foreground mt-0.5 inline-block max-w-full truncate text-xs hover:underline"
      >
        {id}
      </Link>
    );
  } catch {
    return <Text className="text-muted-foreground mt-0.5 text-xs">{id}</Text>;
  }
}
