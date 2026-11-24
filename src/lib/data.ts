import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import type { PublicMenu } from "@/lib/types";

const empty: PublicMenu = { categories: [], products: [], combos: [], comboItems: [], promotions: [], hours: [], gallery: [], settings: null, socials: [], payments: [] };
async function fetchMenu(): Promise<PublicMenu> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return empty;
  const supabase = createPublicClient();
  const visible = <T,>(table: string) => supabase.from(table).select("*").eq("active", true).eq("visible_publicly", true).is("deleted_at", null).order("sort_order") as unknown as Promise<{ data: T[] | null }>;
  const [categories, products, combos, comboItems, promotions, hours, gallery, settings, socials, payments] = await Promise.all([
    visible<PublicMenu["categories"][number]>("categories"), visible<PublicMenu["products"][number]>("products"), visible<PublicMenu["combos"][number]>("combos"), visible<PublicMenu["comboItems"][number]>("combo_items"), visible<PublicMenu["promotions"][number]>("promotions"),
    visible<PublicMenu["hours"][number]>("business_hours"), visible<PublicMenu["gallery"][number]>("gallery"), supabase.from("business_settings").select("*").eq("id", "main").eq("active", true).eq("visible_publicly", true).is("deleted_at", null).maybeSingle(),
    visible<PublicMenu["socials"][number]>("social_links"), visible<PublicMenu["payments"][number]>("payment_methods"),
  ]);
  const categoryIds = (categories.data ?? []).map((row) => row.id);
  const productRows = (products.data ?? []).filter((row) => row.category_id === null || categoryIds.includes(row.category_id));
  const productIds = productRows.map((row) => row.id);
  const options = productIds.length ? await supabase.from("options").select("*").in("product_id", productIds).eq("active", true).eq("visible_publicly", true).is("deleted_at", null).order("sort_order") : { data: [] };
  const publicPromos = (promotions.data ?? []).filter((p) => (!p.starts_at || new Date(p.starts_at) <= new Date()) && (!p.ends_at || new Date(p.ends_at) >= new Date()));
  const publicProducts=productRows.map((p) => ({ ...p, options: (options.data ?? []).filter((o) => o.product_id === p.id) }));
  const publicComboItems=(comboItems.data??[]).filter(i=>(combos.data??[]).some(c=>c.id===i.combo_id)).map(i=>({...i,product:publicProducts.find(p=>p.id===i.product_id)}));
  return { categories: categories.data ?? [], products: publicProducts, combos: (combos.data ?? []).map(c=>({...c,items:publicComboItems.filter(i=>i.combo_id===c.id)})), comboItems:publicComboItems, promotions: publicPromos, hours: hours.data ?? [], gallery: gallery.data ?? [], settings: settings.data, socials: socials.data ?? [], payments: payments.data ?? [] } as PublicMenu;
}
export const getPublicMenu = unstable_cache(fetchMenu, ["fiesta-brava-public-menu-v1"], { tags: ["public-menu"], revalidate: 60 });
export async function getAdminRows(table: string) {
  const supabase = await createClient();
  return supabase.from(table).select("*").is("deleted_at", null).order("sort_order");
}
