import { useQuery } from "@tanstack/react-query";
import { resolveMedia } from "@/lib/floword";

export function Media({
  path,
  alt,
  className = "",
  fallback = null,
}: {
  path: string | null | undefined;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
}) {
  const { data } = useQuery({
    queryKey: ["media", path],
    queryFn: () => resolveMedia(path),
    enabled: Boolean(path),
    staleTime: 30 * 60 * 1000,
  });

  if (!path || !data) return <>{fallback}</>;
  return <img src={data} alt={alt} className={className} loading="lazy" />;
}
