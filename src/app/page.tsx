"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowRight, Clock3, MapPin, Phone, Sparkles, Utensils } from "lucide-react";
import { fetchPublicMenu } from "@/lib/public-menu";
import { money, weekdays } from "@/lib/format";
import type { Combo, Product, PublicMenu } from "@/lib/types";

const brandLogo = "https://mgnsoftware.github.io/FiestaBrava/assets/fiesta-brava-logo.png";

export default function Home() {
  const [data, setData] = useState<PublicMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try {
      setData(await fetchPublicMenu());
      setLoadError(null);
    } catch {
      setLoadError("No pudimos cargar el menú. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 30_000);
    const onFocus = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refresh]);

  if (!data) return (
    <main className="loading-screen">
      <section className="loading-card">
        <div className="loading-mark">FB</div>
        <p className="eyebrow">LA FIESTA BRAVA · TAQUERÍA</p>
        <h1>{loading ? "Cargando nuestro menú…" : "No pudimos conectar"}</h1>
        <p className="muted">{loadError || "El sabor que embiste tu antojo."}</p>
        {!loading && <button className="button" onClick={() => { setLoading(true); void refresh(); }}>Volver a intentar</button>}
      </section>
    </main>
  );

  const settings = data.settings;
  const phone = settings?.phone || "";
  const wa = (settings?.whatsapp || phone).replace(/\D/g, "");
  const waUrl = wa ? `https://wa.me/${wa}` : "#menu";
  const hours = [...data.hours].sort((a, b) => a.day_of_week - b.day_of_week);

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#inicio" aria-label="La Fiesta Brava, inicio">
          <img src={brandLogo} alt="" />
          <span><b>LA FIESTA</b><strong>BRAVA</strong><small>TAQUERÍA</small></span>
        </a>
        <nav className="site-nav" aria-label="Navegación principal">
          <a href="#inicio">Inicio</a><a href="#menu">Menú</a><a href="#combos">Combos</a>
          {data.promotions.length > 0 && <a href="#promociones">Promociones</a>}
          <a href="#ubicacion">Ubicación</a>
        </nav>
        <a className="order-button" href={waUrl} target="_blank" rel="noreferrer">
          <span>Pedir ahora</span><span className="whatsapp-mark" aria-hidden="true">◉</span>
        </a>
      </header>

      <section id="inicio" className="hero">
        <div className="hero-copy">
          <p className="eyebrow">EL SABOR QUE</p>
          <h1><span>EMBISTE</span><em>TU ANTOJO</em></h1>
          <p className="hero-tagline">{settings?.tagline || "Tacos hechos con pasión, sabor y tradición"}</p>
          <a href="#menu" className="button">Ver menú <ArrowDown size={17} /></a>
          <div className="hero-stamp"><span>★</span> SABOR · CALIDAD · TRADICIÓN <span>★</span></div>
        </div>
        <div className="hero-art" role="img" aria-label="Logotipo de La Fiesta Brava">
          <img src={brandLogo} alt="La Fiesta Brava Taquería" />
          <div className="hero-art-caption">TACOS HECHOS CON PASIÓN</div>
        </div>
      </section>

      <section id="menu" className="content-section">
        <SectionTitle eyebrow="TAQUERÍA · ANTOJITOS · MUCHO SABOR" title="Nuestro menú" />
        {data.categories.length === 0 && data.products.length === 0 ? (
          <div className="empty-state">Muy pronto encontrarás aquí nuestro menú.</div>
        ) : (
          <div className="menu-groups">
            {data.categories.map((category) => {
              const products = data.products.filter((product) => product.category_id === category.id);
              if (!products.length) return null;
              return (
                <section className="menu-group" key={category.id}>
                  <div className="group-heading"><span>★</span><h3>{category.name}</h3><span>★</span></div>
                  {category.description && <p className="group-description">{category.description}</p>}
                  <div className="product-grid">
                    {products.map((product) => <ProductCard key={product.id} item={product} currency={settings?.currency} />)}
                  </div>
                </section>
              );
            })}
            {data.products.filter((product) => !product.category_id || !data.categories.some((category) => category.id === product.category_id)).length > 0 && (
              <div className="product-grid">
                {data.products.filter((product) => !product.category_id || !data.categories.some((category) => category.id === product.category_id))
                  .map((product) => <ProductCard key={product.id} item={product} currency={settings?.currency} />)}
              </div>
            )}
          </div>
        )}
      </section>

      {data.combos.length > 0 && <section id="combos" className="content-section combos-section">
        <SectionTitle eyebrow="PARA COMPARTIR" title="Combos" />
        <div className="combo-grid">{data.combos.map((combo) => <ComboCard key={combo.id} item={combo} currency={settings?.currency} />)}</div>
      </section>}

      {data.promotions.length > 0 && <section id="promociones" className="content-section promotions-section">
        <SectionTitle eyebrow="APROVECHA" title="Promociones" />
        <div className="promotion-grid">{data.promotions.map((promotion) => (
          <article className="promotion-card" key={promotion.id}>
            <Sparkles size={20} aria-hidden="true" />
            <div><h3>{promotion.title}</h3><p>{promotion.description}</p></div>
          </article>
        ))}</div>
      </section>}

      <section className="contact-band">
        <div className="contact-copy"><p className="eyebrow">¿ANTOJO?</p><h2>¡Nosotros llevamos!</h2><p>El sabor que embiste tu antojo.</p></div>
        <div className="contact-actions">
          {phone && <a href={`tel:${phone.replace(/[^+\d]/g, "")}`} className="contact-phone"><Phone size={19} />{phone}</a>}
          <a className="button button-green" href={waUrl} target="_blank" rel="noreferrer">Pide por WhatsApp <ArrowRight size={17} /></a>
        </div>
      </section>

      <footer id="ubicacion" className="site-footer">
        <div className="footer-brand"><img src={brandLogo} alt="" /><div><b>LA FIESTA BRAVA</b><small>EL SABOR QUE EMBISTE TU ANTOJO</small></div></div>
        <div className="footer-detail"><MapPin size={19} /><span>{settings?.address || "Ubicación por confirmar"}</span></div>
        {hours.length > 0 && <div className="footer-detail"><Clock3 size={19} /><span>{hours.map((hour) => `${weekdays[hour.day_of_week]}: ${hour.is_closed ? "Cerrado" : `${hour.open_time?.slice(0, 5)} – ${hour.close_time?.slice(0, 5)}`}`).join(" · ")}</span></div>}
        {data.payments.length > 0 && <div className="footer-detail"><Utensils size={19} /><span>{data.payments.map((payment) => payment.name).join(" · ")}</span></div>}
        <div className="footer-bottom"><span>© {new Date().getFullYear()} {settings?.business_name || "La Fiesta Brava Taquería"}</span><span>Tlalnepantla, Estado de México</span></div>
      </footer>
    </main>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return <div className="section-title"><span>★</span><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div><span>★</span></div>;
}

function ProductCard({ item, currency }: { item: Product; currency?: string | null }) {
  return <article className="product-card">
    <div className="product-image-wrap">
      {item.image_url ? <img className="product-image" src={item.image_url} alt={item.name} loading="lazy" /> : <div className="product-placeholder"><Utensils size={34} /><span>LA FIESTA BRAVA</span></div>}
    </div>
    <div className="product-info"><h3>{item.name}</h3><p>{item.description || "Preparado al momento."}</p></div>
    <div className="price-ribbon"><strong>{money(item.price, currency || "MXN")}</strong><span>{item.slug.startsWith("tacos-") ? "C/U" : ""}</span></div>
  </article>;
}

function ComboCard({ item, currency }: { item: Combo; currency?: string | null }) {
  return <article className="combo-card">
    <div className="combo-emblem"><span>FB</span><small>COMBO</small></div>
    <div className="combo-info"><h3>{item.name}</h3><p>{item.description || item.items?.map((entry) => `${entry.quantity} × ${entry.product?.name || "Producto"}`).join(" · ")}</p></div>
    <strong className="combo-price">{money(item.price, currency || "MXN")}</strong>
  </article>;
}
