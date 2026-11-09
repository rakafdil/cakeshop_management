import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, Pencil } from "lucide-react";
import { AppShell, Badge, Card, Row, SectionTitle, meta } from "@/components/app-shell";
import { qtyFmt, rupiah } from "@/lib/db/labels";
import { recipeCost, recommendedPrice, targetMargin } from "@/lib/db/logic";
import { useDb } from "@/lib/db/store";

export const Route = createFileRoute("/recipes/$id")({
  head: () => meta("Resep — Cakeshop Manager", "Bahan, langkah, alat, dan rincian HPP resep."),
  component: RecipeDetail,
});

function RecipeDetail() {
  const { id } = Route.useParams();
  const db = useDb();
  const r = db.recipe.find((x) => x.id === id);
  if (!r) return <AppShell back title="Tidak ditemukan">{() => null}</AppShell>;
  const product = db.product.find((p) => p.id === r.productId);
  const ings = db.recipeIngredient.filter((x) => x.recipeId === id);
  const tools = db.recipeTool.filter((x) => x.recipeId === id);
  const steps = r.preparationSteps.split("\n").filter((s) => s.trim());
  const uom = (u: string) => db.uom.find((x) => x.id === u)?.symbol ?? "";

  return (
    <AppShell back>
      {(user) => {
        const isAdmin = user.role === "admin";
        const cost = isAdmin ? recipeCost(db, id) : null;
        const margin = targetMargin(db, r.productId);
        return (
          <div className="pb-6">
            <div className="flex h-36 items-end rounded-3xl bg-hero p-5 text-primary-foreground">
              <div>
                <p className="text-xs opacity-80">Versi {r.version}</p>
                <h1 className="font-display text-3xl font-semibold">{product?.name}</h1>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{r.estimatedLaborMinutes} menit</span>
              <span>· Kesulitan {"●".repeat(r.difficultyLevel)}{"○".repeat(5 - r.difficultyLevel)}</span>
              {!r.isComplete && <Badge tone="bg-warning/25 text-foreground">Draf</Badge>}
              {isAdmin && <Link to="/recipes/form" search={{ id }} className="ml-auto inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium text-foreground"><Pencil className="h-3 w-3" />Edit</Link>}
            </div>

            <SectionTitle>Bahan</SectionTitle>
            <Card className="divide-y p-0">
              {ings.length === 0 && <p className="p-4 text-sm text-muted-foreground">Belum ada bahan.</p>}
              {ings.map((ri) => {
                const line = cost?.lines.find((l) => l.id === ri.id);
                return (
                  <div key={ri.id} className="flex justify-between gap-3 p-3.5 text-sm">
                    <div><p>{db.ingredient.find((i) => i.id === ri.ingredientId)?.name}</p>{ri.notes && <p className="text-xs text-muted-foreground">{ri.notes}</p>}</div>
                    <span className="text-right text-muted-foreground">{qtyFmt(ri.quantity)} {uom(ri.uomId)}{line && <span className="block text-foreground">{rupiah(line.cost)}</span>}</span>
                  </div>
                );
              })}
            </Card>

            <SectionTitle>Langkah</SectionTitle>
            {steps.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada langkah.</p> : (
              <ol className="space-y-3">
                {steps.map((s, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{i + 1}</span>
                    <span className="pt-0.5">{s}</span>
                  </li>
                ))}
              </ol>
            )}

            <SectionTitle>Alat</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {tools.map((t) => <span key={t.id} className="rounded-full bg-secondary px-3 py-1 text-sm">{db.tool.find((x) => x.id === t.toolId)?.name}{t.quantity > 1 && ` ×${t.quantity}`}</span>)}
              {tools.length === 0 && <span className="text-sm text-muted-foreground">-</span>}
            </div>

            {cost && (
              <>
                <SectionTitle>Rincian HPP</SectionTitle>
                <Card className="space-y-2">
                  <Row l="Bahan baku" v={rupiah(cost.materialCost)} />
                  <Row l={`Tenaga kerja (${r.estimatedLaborMinutes} mnt)`} v={rupiah(cost.laborCost)} />
                  <Row l="Penyusutan alat" v={rupiah(cost.toolDepreciation)} />
                  <Row l="Pengali kompleksitas" v={`×${cost.complexityMultiplier.toFixed(1)}`} />
                  <Row l={`Buffer risiko ${Math.round(db.riskBufferPercentage * 100)}%`} v={rupiah(cost.riskBuffer)} />
                  <div className="border-t pt-2"><Row l="HPP" v={rupiah(cost.hpp)} bold /></div>
                  <Row l={`Harga min. (margin ${Math.round(margin * 100)}%)`} v={rupiah(recommendedPrice(cost.hpp, margin))} bold />
                  {product && <Row l="Harga jual saat ini" v={rupiah(product.basePrice)} />}
                </Card>
              </>
            )}
          </div>
        );
      }}
    </AppShell>
  );
}
