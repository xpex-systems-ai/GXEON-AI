import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { buildGxeonPlaceholderPath, getGxeonModuleById, titleFromGxeonSlug } from "@/data/gxeon-os";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, FileText, Lock, MousePointerClick, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react";

type GxeonPlaceholderPageProps = {
  moduleId?: string;
  blockTitle?: string;
};

const statusCards: Array<{ label: string; description: string; icon: LucideIcon }> = [
  { label: "UX pronta", description: "Layout validável", icon: Sparkles },
  { label: "Integração travada", description: "Nenhuma chamada real", icon: ShieldCheck },
  { label: "Ação navegável", description: "Fluxo conectado", icon: MousePointerClick },
];

function readRouteContext(pathname: string) {
  const [, root, moduleId, blockSlug] = pathname.split("/");

  if (root === "placeholder" && moduleId) {
    return {
      moduleId,
      blockTitle: blockSlug ? titleFromGxeonSlug(blockSlug) : "Professional Placeholder",
    };
  }

  return {
    moduleId: "command_center",
    blockTitle: "Professional Placeholder",
  };
}

export default function GxeonPlaceholderPage({ moduleId, blockTitle }: GxeonPlaceholderPageProps) {
  const [location] = useLocation();
  const routeContext = readRouteContext(location);
  const activeModule = getGxeonModuleById(moduleId ?? routeContext.moduleId);
  const title = blockTitle ?? routeContext.blockTitle;
  const Icon = activeModule.icon;
  const relatedWidgets = activeModule.widgets.slice(0, 4);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-cyan-300/20 bg-slate-950/85 p-6 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(34,211,238,0.2),transparent_34%),radial-gradient(circle_at_80%_5%,rgba(168,85,247,0.16),transparent_34%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-cyan-300/40 bg-cyan-400/10 text-cyan-100">Placeholder profissional</Badge>
              <Badge variant="outline" className="border-emerald-300/40 text-emerald-200">100% navegável</Badge>
              <Badge variant="outline" className="border-amber-300/40 text-amber-200">Sem APIs externas</Badge>
            </div>
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-2xl border border-cyan-300/25 bg-cyan-400/10 text-cyan-100">
                <Icon className="h-8 w-8" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-cyan-200/70">{activeModule.name}</p>
                <h1 className="text-3xl font-black text-white md:text-5xl">{title}</h1>
              </div>
            </div>
            <p className="text-base text-slate-300 md:text-lg">
              Esta área já está conectada à navegação do GXEON OS como placeholder executivo. A tela mostra estrutura, estados, próximos passos e pontos de conexão, mas não aciona bancos, webhooks, pagamentos, IA ou APIs externas.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/30 p-4 lg:min-w-80">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Activation guard</p>
                <p className="font-semibold text-white">Visual-only mode</p>
              </div>
              <Lock className="h-7 w-7 text-emerald-300" />
            </div>
            <Progress value={82} className="mt-4 h-2" />
            <p className="mt-3 text-sm text-slate-300">Pronto para validação visual e aguardando autorização de conexão real.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {statusCards.map(({ label, description, icon: StatusIcon }) => (
          <Card key={label} className="border-white/10 bg-slate-950/70 backdrop-blur-xl">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="grid h-12 w-12 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-100">
                <StatusIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-white">{label}</p>
                <p className="text-sm text-slate-400">{description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.75fr]">
        <Card className="border-cyan-300/20 bg-slate-950/75 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><FileText className="h-5 w-5 text-cyan-200" /> Estrutura do bloco</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {[
              "Resumo executivo do bloco",
              "Estado vazio profissional",
              "Métricas simuladas",
              "Botão de conexão futura",
              "Checklist de ativação",
              "Área reservada para dados reais",
            ].map((item, index) => (
              <Link key={item} href={buildGxeonPlaceholderPath(activeModule.id, `${title} ${item}`)}>
                <div className="group rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-cyan-300/40 hover:bg-cyan-400/10">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{item}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">Placeholder layer {index + 1}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-cyan-200 transition group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="border-emerald-300/20 bg-slate-950/75 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><Clock3 className="h-5 w-5 text-emerald-200" /> Próximas fases</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              "Aprovar experiência visual",
              "Definir dados reais necessários",
              "Criar contratos de API",
              "Conectar serviço em staging",
              "Promover para produção com monitoramento",
            ].map((step, index) => (
              <div key={step} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                {index === 0 ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <Clock3 className="h-4 w-4 text-amber-300" />}
                <span className="text-sm text-slate-200">{step}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="rounded-[2rem] border border-violet-300/20 bg-violet-500/10 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-violet-200/70">Contexto relacionado</p>
            <h2 className="text-2xl font-bold text-white">Blocos do módulo {activeModule.name}</h2>
          </div>
          <Link href={activeModule.route}>
            <Button variant="outline" className="border-violet-200/30 bg-transparent text-violet-100 hover:bg-violet-200/10">
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao módulo
            </Button>
          </Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {relatedWidgets.map((widget) => (
            <Link key={widget} href={buildGxeonPlaceholderPath(activeModule.id, widget)}>
              <div className="group rounded-2xl border border-violet-200/15 bg-black/25 p-4 transition hover:border-violet-200/40 hover:bg-violet-400/10">
                <p className="font-semibold text-white">{widget}</p>
                <p className="mt-2 text-sm text-violet-100/75">Abrir placeholder navegável</p>
                <ArrowRight className="mt-4 h-4 w-4 text-violet-200 transition group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
