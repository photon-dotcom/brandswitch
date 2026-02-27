import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/Breadcrumbs';

interface Props {
  params: { locale: string };
}

export const revalidate = 604800;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'About Brandswitch — Find Brands Like the Ones You Love',
    description:
      'Learn how Brandswitch helps you discover brand alternatives. We analyse thousands of brands across categories and match them by similarity.',
  };
}

const CONTENT: Record<string, {
  title: string;
  breadcrumb: string;
  paras: string[];
  howTitle: string;
  howItems: string[];
  dataTitle: string;
  dataPara: string;
}> = {
  de: {
    title: 'Über Brandswitch',
    breadcrumb: 'Über uns',
    paras: [
      'Brandswitch hilft dir, neue Marken zu entdecken, die du lieben wirst. Gib einfach eine Marke ein, die du kennst, und wir zeigen dir ähnliche Alternativen — geordnet danach, wie nah sie deiner ursprünglichen Marke sind.',
      'Wir haben über 40.000 Marken aus vier Märkten analysiert und nach Kategorie, Produkttyp und Kundensegment verglichen. Unser Ziel: dir die besten Alternativen zu zeigen, nicht nur irgendetwas aus der gleichen Produktkategorie.',
      'Brandswitch richtet sich an Einkäufer, die neue Marken entdecken möchten, Alternativen vergleichen wollen oder einfach neugierig auf den Markt sind.',
    ],
    howTitle: 'So funktioniert es',
    howItems: [
      'Wir laden täglich Marken aus unserem Partnernetzwerk',
      'Jede Marke wird Kategorien und Tags zugeordnet',
      'Unser Ähnlichkeitsalgorithmus berechnet, welche Marken sich am nächsten sind',
      'Wir sortieren die Ergebnisse nach Ähnlichkeitsscore — die nächste Alternative kommt zuerst',
    ],
    dataTitle: 'Datensaktualität',
    dataPara: 'Unser Datensatz wird täglich aktualisiert. Neue Marken und Ähnlichkeitsbewertungen werden automatisch verarbeitet.',
  },
  fr: {
    title: 'À propos de Brandswitch',
    breadcrumb: 'À propos',
    paras: [
      'Brandswitch vous aide à découvrir de nouvelles marques que vous allez adorer. Entrez simplement une marque que vous connaissez, et nous vous montrons des alternatives similaires — classées par proximité avec votre marque d\'origine.',
      'Nous avons analysé plus de 40 000 marques sur quatre marchés, comparées par catégorie, type de produit et segment de clientèle. Notre objectif : vous montrer les meilleures alternatives, pas simplement n\'importe quoi dans la même catégorie.',
      'Brandswitch s\'adresse aux acheteurs qui souhaitent découvrir de nouvelles marques, comparer des alternatives ou simplement explorer le marché.',
    ],
    howTitle: 'Comment ça marche',
    howItems: [
      'Nous importons des marques quotidiennement depuis notre réseau partenaire',
      'Chaque marque est associée à des catégories et des tags',
      'Notre algorithme de similarité calcule quelles marques sont les plus proches',
      'Les résultats sont triés par score de similarité — l\'alternative la plus proche apparaît en premier',
    ],
    dataTitle: 'Fraîcheur des données',
    dataPara: 'Notre ensemble de données est mis à jour quotidiennement. Les nouvelles marques et les scores de similarité sont traités automatiquement.',
  },
  es: {
    title: 'Acerca de Brandswitch',
    breadcrumb: 'Acerca de',
    paras: [
      'Brandswitch te ayuda a descubrir nuevas marcas que vas a amar. Escribe cualquier marca que conozcas y te mostraremos alternativas similares — clasificadas por similitud con tu marca original.',
      'Hemos analizado más de 40.000 marcas en múltiples mercados, comparadas por categoría, tipo de producto y segmento de cliente. Nuestro objetivo: mostrarte las mejores alternativas, no simplemente cualquier cosa de la misma categoría.',
      'Brandswitch es para compradores que quieren descubrir nuevas marcas, comparar alternativas o simplemente explorar lo que hay en el mercado.',
    ],
    howTitle: 'Cómo funciona',
    howItems: [
      'Importamos marcas diariamente desde nuestra red de socios',
      'Cada marca se asigna a categorías y etiquetas de producto',
      'Nuestro algoritmo de similitud calcula qué marcas son más cercanas entre sí',
      'Los resultados se ordenan por puntuación de similitud — la alternativa más cercana aparece primero',
    ],
    dataTitle: 'Actualización de datos',
    dataPara: 'Nuestro conjunto de datos se actualiza diariamente. Las nuevas marcas y puntuaciones de similitud se procesan automáticamente.',
  },
  it: {
    title: 'Chi siamo — Brandswitch',
    breadcrumb: 'Chi siamo',
    paras: [
      'Brandswitch ti aiuta a scoprire nuovi brand che amerai. Inserisci qualsiasi brand che conosci e ti mostreremo alternative simili — classificate per quanto si avvicinano al brand originale.',
      'Abbiamo analizzato oltre 40.000 brand in più mercati, confrontati per categoria, tipo di prodotto e segmento di clientela. Il nostro obiettivo: mostrarti le migliori alternative, non solo qualcosa nella stessa categoria.',
      'Brandswitch è per chi vuole scoprire nuovi brand, confrontare alternative o semplicemente esplorare il mercato.',
    ],
    howTitle: 'Come funziona',
    howItems: [
      'Importiamo brand quotidianamente dalla nostra rete di partner',
      'Ogni brand viene associato a categorie e tag di prodotto',
      'Il nostro algoritmo di somiglianza calcola quali brand sono più simili tra loro',
      'I risultati sono ordinati per punteggio di somiglianza — l\'alternativa più vicina appare per prima',
    ],
    dataTitle: 'Aggiornamento dei dati',
    dataPara: 'Il nostro database viene aggiornato quotidianamente. I nuovi brand e i punteggi di somiglianza vengono elaborati automaticamente.',
  },
  pt: {
    title: 'Sobre o Brandswitch',
    breadcrumb: 'Sobre',
    paras: [
      'O Brandswitch ajuda você a descobrir novas marcas que vai amar. Digite qualquer marca que você conhece e mostraremos alternativas similares — classificadas por proximidade com a sua marca original.',
      'Analisamos mais de 40.000 marcas em múltiplos mercados, comparadas por categoria, tipo de produto e segmento de clientes. Nosso objetivo: mostrar as melhores alternativas, não apenas qualquer coisa na mesma categoria.',
      'O Brandswitch é para compradores que querem descobrir novas marcas, comparar alternativas ou simplesmente explorar o que existe no mercado.',
    ],
    howTitle: 'Como funciona',
    howItems: [
      'Importamos marcas diariamente da nossa rede de parceiros',
      'Cada marca é mapeada para categorias e tags de produto',
      'Nosso algoritmo de similaridade calcula quais marcas são mais próximas entre si',
      'Os resultados são ordenados por pontuação de similaridade — a alternativa mais próxima aparece primeiro',
    ],
    dataTitle: 'Atualização dos dados',
    dataPara: 'Nosso banco de dados é atualizado diariamente. Novas marcas e pontuações de similaridade são processadas automaticamente.',
  },
};

function getContent(locale: string) {
  if (locale === 'de' || locale === 'at' || locale === 'ch') return CONTENT['de'];
  if (locale === 'fr' || locale === 'be') return CONTENT['fr'];
  if (locale === 'es' || locale === 'mx') return CONTENT['es'] ?? null;
  if (locale === 'it') return CONTENT['it'] ?? null;
  if (locale === 'br') return CONTENT['pt'] ?? null;
  const fallback = CONTENT[locale] ?? null;
  if (fallback) return fallback;
  return {
    title: 'About Brandswitch',
    breadcrumb: 'About',
    paras: [
      'Brandswitch helps you discover new brands you\'ll love. Enter any brand you know and we\'ll show you similar alternatives — ranked by how closely they match your original.',
      'We\'ve analysed over 40,000 brands across four markets, compared by category, product type, and customer segment. Our goal: show you the best alternatives, not just anything in the same broad space.',
      'Brandswitch is for shoppers who want to discover new brands, compare alternatives, or are simply curious about what\'s out there in the market.',
    ],
    howTitle: 'How it works',
    howItems: [
      'We import brands daily from our partner network',
      'Each brand is mapped to categories and product tags',
      'Our similarity algorithm computes which brands are closest to each other',
      'Results are sorted by similarity score — the closest match comes first',
    ],
    dataTitle: 'Data freshness',
    dataPara: 'Our dataset is updated daily. New brands and similarity scores are processed automatically.',
  };
}

export default function AboutPage({ params: { locale } }: Props) {
  const c = getContent(locale);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <Breadcrumbs
        items={[
          { label: 'Home', href: `/${locale}` },
          { label: c.breadcrumb },
        ]}
      />

      <h1 className="text-3xl sm:text-4xl font-bold text-bs-dark mb-8">{c.title}</h1>

      <div className="space-y-5 text-bs-gray leading-relaxed mb-10">
        {c.paras.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      <div className="bg-white border border-bs-border rounded-2xl p-6 mb-6">
        <h2 className="font-bold text-bs-dark mb-4">{c.howTitle}</h2>
        <ol className="space-y-3">
          {c.howItems.map((item, i) => (
            <li key={i} className="flex gap-3 text-sm text-bs-gray">
              <span className="shrink-0 w-6 h-6 rounded-full bg-bs-teal-light text-bs-teal text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              {item}
            </li>
          ))}
        </ol>
      </div>

      <div className="bg-bs-teal-light rounded-2xl p-6">
        <h2 className="font-bold text-bs-dark mb-2">{c.dataTitle}</h2>
        <p className="text-sm text-bs-gray">{c.dataPara}</p>
      </div>
    </div>
  );
}
