import type { CreateTenantRoleInput } from "@repo/rbac";
import type { TenantRoleRepository } from "@repo/firestore-converters";

function stableJson(value: unknown): string {
  return JSON.stringify(value);
}

export async function ensureLocalTenantRole(
  repository: TenantRoleRepository,
  tenantId: string,
  input: CreateTenantRoleInput,
): Promise<void> {
  const existing = await repository.getByName(tenantId, input.name);
  if (existing) {
    const grantsMatch =
      stableJson([...existing.grants].sort()) ===
      stableJson([...input.grants].sort());
    const descriptionMatch =
      (existing.description ?? "") === (input.description ?? "");
    if (grantsMatch && descriptionMatch) {
      return;
    }

    await repository.update(tenantId, existing.id, {
      grants: [...input.grants],
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
    });
    return;
  }

  await repository.create(tenantId, input);
}
