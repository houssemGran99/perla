import Image from "next/image";
import Customizer from "@/components/Customizer";
import CopyPhone from "@/components/CopyPhone";
import Header from "@/components/Header";
import HeroPearls from "@/components/HeroPearls";
import Reveal from "@/components/Reveal";
import Strand from "@/components/Strand";
import { CREATOR, INSTAGRAM, INSTAGRAM_DM, MODELS, TIKTOK } from "@/lib/data";

export default function Home() {
  return (
    <>
      <Header />
      <Reveal />

      <main id="accueil">
        <div className="hero">
          <HeroPearls />
          <div className="wrap">
            <div className="hero-text">
              <span className="label rise" style={{ animationDelay: "0ms" }}>
                Marque tunisienne · Boutique en ligne
              </span>
              <h1 className="rise" style={{ animationDelay: "90ms" }}>
                PERLA
              </h1>
              <p className="tag rise" style={{ animationDelay: "180ms" }}>
                Des sacs en perles faits main, <em>perle après perle.</em>
              </p>
              <p className="lead muted rise" style={{ animationDelay: "260ms" }}>
                Une petite marque née en Tunisie. Blanc, doré, fuchsia ou noir : choisissez votre sac sur Instagram, on
                vous le livre à domicile, partout dans le pays.
              </p>
              <div className="cta rise" style={{ animationDelay: "340ms" }}>
                <a className="btn" href="#modeles">
                  Voir les modèles
                </a>
                <a className="btn ghost" href={INSTAGRAM} target="_blank" rel="noopener">
                  @perllaaa_7
                </a>
              </div>
            </div>
            <div className="stage hero-stage">
              <Image
                className="arch"
                src="/img/01.jpg"
                alt="Sac à rabat PERLA en perles blanches, anse en perles et plaque dorée"
                width={720}
                height={960}
                priority
                sizes="(max-width: 780px) 300px, 440px"
              />
            </div>
          </div>
        </div>

        <div className="wrap">
          <Strand />
        </div>

        <section id="modeles">
          <div className="wrap">
            <div className="head reveal">
              <span className="label">La collection</span>
              <h2>
                Neuf sacs, <em>neuf couleurs.</em>
              </h2>
              <p className="muted">
                Chaque pièce est montée à la main, entièrement en perles. Un modèle peut aussi être personnalisé à la
                demande.
              </p>
            </div>
            <div className="models">
              {MODELS.map((m, i) => (
                <article key={m.name} className="model reveal" style={{ transitionDelay: `${(i % 3) * 80}ms` }}>
                  <a
                    className="model-img"
                    href={INSTAGRAM_DM}
                    target="_blank"
                    rel="noopener"
                    aria-label={`Demander le modèle ${m.name} sur Instagram`}
                  >
                    <Image
                      src={m.image}
                      alt={`Sac PERLA en perles, coloris ${m.name.toLowerCase()} : ${m.detail.toLowerCase()}`}
                      width={720}
                      height={960}
                      sizes="(max-width: 780px) 50vw, 360px"
                    />
                  </a>
                  <h3>{m.name}</h3>
                  <div className="row">
                    <span className="muted">{m.detail}</span>
                    <span>Prix sur demande</span>
                  </div>
                </article>
              ))}
            </div>
            <p className="note">Les prix arrivent bientôt. En attendant, demandez-les par message ou par téléphone.</p>
          </div>
        </section>

        <Customizer />

        <section className="how" id="commander">
          <div className="wrap">
            <div className="head reveal">
              <span className="label">Commander</span>
              <h2>
                Du message <em>à votre porte.</em>
              </h2>
            </div>
            <Strand variant="thread" />
            <ol className="steps">
              <li className="reveal">
                <h3>Choisissez</h3>
                <p className="muted">
                  Parcourez les publications et les stories « NEW » et « sac en perle » sur Instagram.
                </p>
              </li>
              <li className="reveal" style={{ transitionDelay: "100ms" }}>
                <h3>Écrivez-nous</h3>
                <p className="muted">
                  Envoyez le modèle qui vous plaît en message privé, ou appelez le 50 994 459.
                </p>
              </li>
              <li className="reveal" style={{ transitionDelay: "200ms" }}>
                <h3>Recevez</h3>
                <p className="muted">Livraison à domicile sur toute la Tunisie.</p>
              </li>
            </ol>
          </div>
        </section>

        <section id="contact">
          <div className="wrap split">
            <div className="reveal">
              <span className="label">Contact</span>
              <h2>
                Une question ? <em>Appelez.</em>
              </h2>
              <CopyPhone>
                <a className="btn ghost" href={INSTAGRAM_DM} target="_blank" rel="noopener">
                  Message Instagram
                </a>
              </CopyPhone>
            </div>
            <div className="reveal">
              <span className="label">Nous suivre</span>
              <dl>
                <dt>Instagram</dt>
                <dd>
                  <a href={INSTAGRAM} target="_blank" rel="noopener">
                    @perllaaa_7
                  </a>
                </dd>
                <dt>TikTok</dt>
                <dd>
                  <a href={TIKTOK} target="_blank" rel="noopener">
                    @peeerlla
                  </a>
                </dd>
                <dt>Créatrice</dt>
                <dd>
                  <a href={CREATOR} target="_blank" rel="noopener">
                    @ryiihem
                  </a>
                </dd>
                <dt>Avis</dt>
                <dd>Les retours des clientes sont dans la story « avis cliente » sur Instagram.</dd>
                <dt>Livraison</dt>
                <dd>À domicile, toute la Tunisie</dd>
              </dl>
            </div>
          </div>
        </section>
      </main>

      <div className="wrap">
        <Strand />
      </div>

      <footer>
        <div className="wrap">
          <span>PERLA · Tunisie</span>
          <span>Sacs en perles · Boutique en ligne</span>
        </div>
      </footer>
    </>
  );
}
