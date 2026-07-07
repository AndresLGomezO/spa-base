export function readListQuerySearch(params: URLSearchParams): string {
  return params.get("q") ?? "";
}

export function writeListQuerySearch(
  params: URLSearchParams,
  search: string,
): void {
  if (search.trim().length === 0) {
    params.delete("q");
  } else {
    params.set("q", search);
  }
}
