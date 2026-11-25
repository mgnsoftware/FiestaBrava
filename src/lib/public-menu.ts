import { createClient } from "@supabase/supabase-js";
import type { PublicMenu } from "@/lib/types";

const empty: PublicMenu = {
  categories: [], products: [], combos: [], comboItems: [], promotions: [],
  hours: [], gallery: [], settings: null, socials: [], payments: [],
};

/** Browser-safe, read-only public menu query. RLS remains the access boundary. */
export async function fetchPublicMenu(): Promise<PublicMenu> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Falta configurar la conexión pública de Supabase.");

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  async function visible<T>(table: string): Promise<T[]> {
    const { data, error } = await supabase.from(table).select("*")
      .eq("active", true).eq("visible_publicly", true).is("deleted_at", null).order("sort_order");
    if (error) throw error;
    return (data ?? []) as T[];
  }

  const [categories, allProducts, combos, comboItems, promotions, hours, gallery, socials, payments] = await Promise.all([
    visible<PublicMenu["categories"][number]>("categories"),
    visible<PublicMenu["products"][number]>("products"),
    visible<PublicMenu["combos"][number]>("combos"),
    visible<PublicMenu["comboItems"][number]>("combo_items"),
    visible<PublicMenu["promotions"][number]>("promotions"),
    visible<PublicMenu["hours"][number]>("business_hours"),
    visible<PublicMenu["gallery"][number]>("gallery"),
    visible<PublicMenu["socials"][number]>("social_links"),
    visible<PublicMenu["payments"][number]>("payment_methods"),
  ]);
  const { data: settings, error: settingsError } = await supabase.from("business_settings").select("*")
    .eq("id", "main").eq("active", true).eq("visible_publicly", true).is("deleted_at", null).maybeSingle();
  if (settingsError) throw settingsError;

  const categoryIds = categories.map((row) => row.id);
  const products = allProducts.filter((row) => row.category_id === null || categoryIds.includes(row.category_id));
  const productIds = products.map((row) => row.id);
  let options: PublicMenu["products"][number]["options"] = [];
  if (productIds.length) {
    const { data, error } = await supabase.from("options").select("*").in("product_id", productIds)
      .eq("active", true).eq("visible_publicly", true).is("deleted_at", null).order("sort_order");
    if (error) throw error;
    options = (data ?? []) as NonNullable<typeof options>;
  }
  const now = Date.now();
  const activePromotions = promotions.filter((promotion) =>
    (!promotion.starts_at || new Date(promotion.starts_at).getTime() <= now) &&
    (!promotion.ends_at || new Date(promotion.ends_at).getTime() >= now));
  const publicProducts = products.map((product) => ({
    ...product, options: options.filter((option) => option.product_id === product.id),
  }));
  const publicComboItems = comboItems.filter((item) => combos.some((combo) => combo.id === item.combo_id))
    .map((item) => ({ ...item, product: publicProducts.find((product) => product.id === item.product_id) }));

  return {
    ...empty,
    categories,
    products: publicProducts,
    combos: combos.map((combo) => ({ ...combo, items: publicComboItems.filter((item) => item.combo_id === combo.id) })),
    comboItems: publicComboItems,
    promotions: activePromotions,
    hours,
    gallery,
    settings,
    socials,
    payments,
  } as PublicMenu;
}
