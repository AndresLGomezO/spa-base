import { Spinner } from "../spinner/Spinner";

export interface PageLoaderProps {
  readonly ariaLabel: string;
}

export function PageLoader({ ariaLabel }: PageLoaderProps) {
  return (
    <div
      aria-busy="true"
      className="bg-background flex min-h-dvh w-full items-center justify-center"
    >
      <Spinner size="lg" ariaLabel={ariaLabel} />
    </div>
  );
}
