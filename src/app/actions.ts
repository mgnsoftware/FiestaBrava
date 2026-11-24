"use server";
import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Entity } from "@/lib/types";

export async function signIn(form: FormData) {
  const email = String(form.get("email") || "").trim(); const password = String(form.get("password") || "");
  if (!z.string().email().safeParse(email).success || password.length < 8) redirect(`${adminRoot()}/login?error=invalid`);
  const supabase = await createClient(); const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`${adminRoot()}/login?error=credentials`);
  redirect(adminRoot());
}
export async function signOut() { const supabase = await createClient(); await supabase.auth.signOut(); redirect(`${adminRoot()}/login`); }
function adminRoot() { return `/${(process.env.ADMIN_PATH || "admin-la-fiesta").replace(/^\/+|\/+$/g, "")}`; }
function userMessage(message:string):never { redirect(`${adminRoot()}/users?message=${encodeURIComponent(message)}`); }
const tables: Record<Entity, string> = { products:"products", categories:"categories", options:"options", combos:"combos", combo_items:"combo_items", promotions:"promotions", business_hours:"business_hours", gallery:"gallery", business_settings:"business_settings", social_links:"social_links", payment_methods:"payment_methods" };
const shape = z.object({ name:z.string().max(120).optional(), title:z.string().max(160).optional(), description:z.string().max(2000).optional(), image_url:z.union([z.string().url(),z.literal("")]).optional(), price:z.coerce.number().min(0).max(100000).optional(), quantity:z.coerce.number().int().min(1).max(1000).optional(), sort_order:z.coerce.number().int().min(0).max(100000).optional(), active:z.boolean().optional(), visible_publicly:z.boolean().optional(), slug:z.string().max(160).regex(/^[a-z0-9-]*$/).optional(), platform:z.string().max(50).optional(), url:z.union([z.string().url(),z.literal("")]).optional(), details:z.string().max(500).optional(), caption:z.string().max(250).optional(), address:z.string().max(300).optional(), phone:z.string().max(50).optional(), whatsapp:z.string().max(50).optional(), business_name:z.string().max(150).optional(), tagline:z.string().max(250).optional(), currency:z.string().length(3).optional(), day_of_week:z.coerce.number().int().min(0).max(6).optional(), open_time:z.string().optional(), close_time:z.string().optional(), is_closed:z.boolean().optional(), starts_at:z.string().optional(), ends_at:z.string().optional(), category_id:z.string().uuid().optional(), product_id:z.string().uuid().optional(), combo_id:z.string().uuid().optional(), option_group:z.string().max(80).optional(), price_delta:z.coerce.number().min(0).optional(), featured:z.boolean().optional() }).strict();
const allowed: Record<Entity,string[]> = { products:["name","description","image_url","price","sort_order","active","visible_publicly","slug","category_id","featured"], categories:["name","description","image_url","sort_order","active","visible_publicly","slug"], options:["name","description","sort_order","active","visible_publicly","product_id","option_group","price_delta"], combos:["name","description","image_url","price","sort_order","active","visible_publicly","slug"], combo_items:["name","description","sort_order","active","visible_publicly","combo_id","product_id","quantity"], promotions:["title","description","image_url","sort_order","active","visible_publicly","starts_at","ends_at"], business_hours:["name","sort_order","active","visible_publicly","day_of_week","open_time","close_time","is_closed"], gallery:["name","caption","image_url","sort_order","active","visible_publicly"], business_settings:["business_name","tagline","description","address","phone","whatsapp","currency","active","visible_publicly","sort_order"], social_links:["name","platform","url","sort_order","active","visible_publicly"], payment_methods:["name","details","sort_order","active","visible_publicly"] };
function valueOf(form:FormData,key:string) { const values=form.getAll(key); if(!values.length) return undefined; const v=values.at(-1); if(["active","visible_publicly","featured","is_closed"].includes(key)) return v==="on"||v==="true"; return String(v); }
export async function saveEntity(entity:Entity, id:string, _state: {error?:string;success?:string}|undefined, form:FormData) {
  if (!(entity in tables)) return {error:"Tipo de contenido no permitido."};
  const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user) return {error:"Inicia sesión para guardar cambios."};
  const {data:profile}=await supabase.from("profiles").select("role,active").eq("id",user.id).maybeSingle(); if(!profile?.active||!(["admin","editor"].includes(profile.role))||(entity==="business_settings"&&profile.role!=="admin")) return {error:"No tienes permisos para guardar."};
  const raw:Record<string,unknown>={}; for(const key of allowed[entity]) raw[key]=valueOf(form,key);
  for(const key of ["category_id","product_id","combo_id","description","starts_at","ends_at","open_time","close_time","phone","whatsapp","address","tagline","caption","details","option_group"]) if(raw[key]==="") raw[key]=undefined;
  const required:Partial<Record<Entity,string[]>>={products:["name","slug","price"],categories:["name","slug"],options:["name","product_id"],combos:["name","slug","price"],combo_items:["combo_id","product_id","quantity"],promotions:["title"],business_hours:["day_of_week"],gallery:["name","image_url"],business_settings:["business_name"],social_links:["platform","url"],payment_methods:["name"]};
  for(const key of required[entity]||[]) if(raw[key]===undefined||raw[key]==="") return {error:`El campo ${key} es obligatorio.`};
  const parsed=shape.safeParse(raw); if(!parsed.success) return {error:parsed.error.issues[0]?.message||"Revisa los datos."};
  const values=Object.fromEntries(Object.entries(parsed.data).filter(([k,v])=>allowed[entity].includes(k)&&v!==undefined)); values.updated_by=user.id; values.updated_at=new Date().toISOString();
  values.active=values.active??true; values.visible_publicly=values.visible_publicly??false; values.sort_order=values.sort_order??0;
  const query=id==="new"?supabase.from(tables[entity]).insert({...values,created_by:user.id}):supabase.from(tables[entity]).update(values).eq("id",id);
  const {error}=await query; if(error) return {error:error.message}; revalidateTag("public-menu"); return {success:"Cambios guardados. El contenido público se actualizará enseguida."};
}
export async function archiveEntity(entity:Entity,id:string) {
  if(!(entity in tables)) return {error:"Tipo de contenido no permitido."}; const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user) return {error:"Inicia sesión primero."}; const {data:profile}=await supabase.from("profiles").select("role,active").eq("id",user.id).maybeSingle(); if(!profile?.active||!(["admin","editor"].includes(profile.role))||(entity==="business_settings"&&profile.role!=="admin"))return{error:"No tienes permisos para archivar."};
  const {error}=await supabase.from(tables[entity]).update({active:false,visible_publicly:false,deleted_at:new Date().toISOString(),updated_at:new Date().toISOString(),updated_by:user.id}).eq("id",id); if(error)return{error:error.message}; revalidateTag("public-menu"); return{success:"Contenido archivado."};
}
export async function setUserRole(form:FormData) {
  const supabase=await createClient();const{data:{user}}=await supabase.auth.getUser();if(!user)userMessage("Inicia sesión primero.");const{data:profile}=await supabase.from("profiles").select("role,active").eq("id",user.id).maybeSingle();if(profile?.role!=="admin"||!profile.active)userMessage("Solo un administrador activo puede cambiar permisos.");
  const id=String(form.get("id")||"");const role=String(form.get("role")||"");if(!z.string().uuid().safeParse(id).success||!(["admin","editor"].includes(role)))userMessage("Revisa el usuario y el rol.");if(id===user.id&&role!=="admin")userMessage("No puedes quitarte tu propio rol de administrador.");
  const active=form.get("active")==="on";if(id===user.id&&!active)userMessage("No puedes desactivar tu propio acceso.");
  const {error}=await supabase.from("profiles").update({role,active,updated_at:new Date().toISOString()}).eq("id",id);if(error)userMessage(error.message);userMessage("Permisos actualizados.");
}
export async function inviteUser(form:FormData) {
  const supabase=await createClient();const{data:{user}}=await supabase.auth.getUser();if(!user)userMessage("Inicia sesión primero.");const{data:profile}=await supabase.from("profiles").select("role,active").eq("id",user.id).maybeSingle();if(profile?.role!=="admin"||!profile.active)userMessage("Solo un administrador activo puede invitar usuarios.");
  const email=String(form.get("email")||"").trim();const role=String(form.get("role")||"editor");if(!z.string().email().safeParse(email).success||!(["admin","editor"].includes(role)))userMessage("Revisa el correo y el rol.");
  let admin;try{admin=createAdminClient();}catch{userMessage("Configura SUPABASE_SERVICE_ROLE_KEY para invitar usuarios desde el panel.");}
  const {data,error}=await admin.auth.admin.inviteUserByEmail(email);if(error)userMessage(error.message);if(data.user){const {error:saveError}=await admin.from("profiles").upsert({id:data.user.id,email,role,active:true,updated_at:new Date().toISOString()});if(saveError)userMessage(saveError.message);}userMessage(`Invitación enviada a ${email}.`);
}
