import { Link } from "wouter";
import { ArrowRight, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";

export type OperationalEmptyStateProps = {
  title: string;
  description: string;
  nextManualAction: string;
  previousRoute: string;
  nextRoute: string;
};

export function OperationalEmptyState({ title, description, nextManualAction, previousRoute, nextRoute }: OperationalEmptyStateProps) {
  return (
    <div className="rounded-3xl border border-dashed border-cyan-300/30 bg-cyan-400/10 p-8 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-cyan-200/25 bg-cyan-300/10 text-cyan-100">
        <ClipboardList className="h-5 w-5" />
      </div>
      <p className="mt-4 text-xl font-bold lowercase text-white">{title}</p>
      <p className="mt-2 text-slate-300">{description}</p>
      <p className="mt-3 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-3 text-sm font-semibold text-emerald-50">Próxima ação manual: {nextManualAction}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Link href={previousRoute}>
          <Button variant="outline" className="border-cyan-200/30 bg-transparent text-cyan-100 hover:bg-cyan-200/10">Rota anterior</Button>
        </Link>
        <Link href={nextRoute}>
          <Button className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">Próxima rota <ArrowRight className="ml-2 h-4 w-4" /></Button>
        </Link>
      </div>
    </div>
  );
}
