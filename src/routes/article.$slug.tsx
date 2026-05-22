import { createFileRoute, redirect } from "@tanstack/react-router";
import { articlesStore } from "@/lib/articles";

// Legacy slug URLs redirect to the canonical /p/$id URL.
export const Route = createFileRoute("/article/$slug")({
  beforeLoad: ({ params }) => {
    const a = articlesStore.get(params.slug);
    if (a) throw redirect({ to: "/p/$id", params: { id: String(a.createdAt) } });
    throw redirect({ to: "/" });
  },
  component: () => null,
});
