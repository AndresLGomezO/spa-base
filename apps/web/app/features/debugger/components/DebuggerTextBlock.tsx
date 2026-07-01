export function DebuggerTextBlock({ value }: { readonly value: string }) {
  return (
    <pre className="bg-muted/40 overflow-auto rounded-md p-3 text-xs whitespace-pre-wrap">
      {value}
    </pre>
  );
}
