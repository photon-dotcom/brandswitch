import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/Breadcrumbs';

interface Props {
  params: { locale: string };
}

export const revalidate = 86400;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Terms of Service | Brandswitch',
    robots: { index: false, follow: false },
  };
}

interface Section { heading: string; body: string }
interface PolicyContent {
  title: string;
  breadcrumb: string;
  updated: string;
  intro: string;
  sections: Section[];
}

function getContent(locale: string): PolicyContent {
  if (locale === 'de' || locale === 'at' || locale === 'ch') return {
    title: 'Nutzungsbedingungen',
    breadcrumb: 'Nutzungsbedingungen',
    updated: 'Zuletzt aktualisiert: Februar 2026',
    intro: 'Durch die Nutzung von Brandswitch stimmen Sie diesen Nutzungsbedingungen zu. Bitte lesen Sie sie sorgfältig durch.',
    sections: [
      { heading: 'Affiliate-Offenlegung', body: 'Brandswitch nimmt an Partnerprogrammen teil. Einige Links auf dieser Website sind Affiliate-Links — wir erhalten eine kleine Provision, wenn Sie über diese Links einkaufen, ohne dass Ihnen zusätzliche Kosten entstehen. Dies beeinflusst unsere Bewertungen nicht.' },
      { heading: 'Genauigkeit der Informationen', body: 'Wir bemühen uns, genaue und aktuelle Informationen bereitzustellen. Wir übernehmen jedoch keine Garantie für die Vollständigkeit oder Richtigkeit der Inhalte. Preise, Verfügbarkeit und Produktdetails können sich ändern.' },
      { heading: 'Haftungsbeschränkung', body: 'Brandswitch haftet nicht für direkte, indirekte oder Folgeschäden, die aus der Nutzung dieser Website entstehen. Alle Kaufentscheidungen liegen in Ihrer Verantwortung.' },
      { heading: 'Geistiges Eigentum', body: 'Alle Inhalte auf Brandswitch — Texte, Logos, Daten und Designelemente — sind Eigentum von Brandswitch oder werden mit Genehmigung verwendet. Die unerlaubte Nutzung ist untersagt.' },
      { heading: 'Änderungen', body: 'Wir behalten uns das Recht vor, diese Bedingungen jederzeit zu ändern. Die Fortsetzung der Nutzung der Website gilt als Zustimmung zu den geänderten Bedingungen.' },
      { heading: 'Geltendes Recht', body: 'Diese Bedingungen unterliegen dem anwendbaren Recht. Bei Fragen kontaktieren Sie uns unter legal@brandswitch.com.' },
    ],
  };

  if (locale === 'fr' || locale === 'be') return {
    title: 'Conditions d\'utilisation',
    breadcrumb: 'Conditions',
    updated: 'Dernière mise à jour : février 2026',
    intro: 'En utilisant Brandswitch, vous acceptez ces conditions d\'utilisation. Veuillez les lire attentivement.',
    sections: [
      { heading: 'Divulgation d\'affiliation', body: 'Brandswitch participe à des programmes d\'affiliation. Certains liens sur ce site sont des liens affiliés — nous recevons une petite commission si vous effectuez un achat via ces liens, sans coût supplémentaire pour vous. Cela n\'influence pas nos classements.' },
      { heading: 'Exactitude des informations', body: 'Nous nous efforçons de fournir des informations exactes et à jour. Cependant, nous ne garantissons pas l\'exhaustivité ou l\'exactitude du contenu. Les prix, la disponibilité et les détails des produits peuvent changer.' },
      { heading: 'Limitation de responsabilité', body: 'Brandswitch n\'est pas responsable des dommages directs, indirects ou consécutifs résultant de l\'utilisation de ce site. Toutes les décisions d\'achat sont de votre responsabilité.' },
      { heading: 'Propriété intellectuelle', body: 'Tout le contenu de Brandswitch — textes, logos, données et éléments de design — est la propriété de Brandswitch ou est utilisé avec permission. Toute utilisation non autorisée est interdite.' },
      { heading: 'Modifications', body: 'Nous nous réservons le droit de modifier ces conditions à tout moment. La poursuite de l\'utilisation du site vaut acceptation des conditions modifiées.' },
      { heading: 'Droit applicable', body: 'Ces conditions sont régies par le droit applicable. Pour toute question, contactez-nous à legal@brandswitch.com.' },
    ],
  };

  if (locale === 'es' || locale === 'mx') return {
    title: 'Términos de servicio',
    breadcrumb: 'Términos',
    updated: 'Última actualización: febrero de 2026',
    intro: 'Al usar Brandswitch, aceptas estos términos de servicio. Por favor léelos detenidamente.',
    sections: [
      { heading: 'Divulgación de afiliados', body: 'Brandswitch participa en programas de afiliados. Algunos enlaces son de afiliados — ganamos una pequeña comisión si realizas una compra a través de ellos, sin costo adicional para ti. Esto no influye en nuestras clasificaciones.' },
      { heading: 'Exactitud de la información', body: 'Nos esforzamos por proporcionar información precisa y actualizada. Sin embargo, no garantizamos la integridad o exactitud del contenido. Los precios, disponibilidad y detalles de productos pueden cambiar.' },
      { heading: 'Limitación de responsabilidad', body: 'Brandswitch no es responsable de daños directos, indirectos o consecuentes que surjan del uso de este sitio web. Todas las decisiones de compra son tu responsabilidad.' },
      { heading: 'Propiedad intelectual', body: 'Todo el contenido de Brandswitch — texto, logos, datos y elementos de diseño — es propiedad de Brandswitch o se usa con permiso. El uso no autorizado está prohibido.' },
      { heading: 'Cambios en los términos', body: 'Nos reservamos el derecho de modificar estos términos en cualquier momento. El uso continuado del sitio constituye la aceptación de los términos actualizados.' },
      { heading: 'Ley aplicable', body: 'Estos términos se rigen por la ley aplicable. Para preguntas, contáctanos en legal@brandswitch.com.' },
    ],
  };

  if (locale === 'it') return {
    title: 'Termini di servizio',
    breadcrumb: 'Termini',
    updated: 'Ultimo aggiornamento: febbraio 2026',
    intro: 'Utilizzando Brandswitch, accetti questi termini di servizio. Ti preghiamo di leggerli attentamente.',
    sections: [
      { heading: 'Informativa sugli affiliati', body: 'Brandswitch partecipa a programmi di affiliazione. Alcuni link sono link di affiliazione — guadagniamo una piccola commissione se effettui un acquisto tramite di essi, senza costi aggiuntivi per te. Questo non influenza le nostre classifiche.' },
      { heading: 'Accuratezza delle informazioni', body: 'Ci impegniamo a fornire informazioni accurate e aggiornate. Tuttavia, non garantiamo la completezza o l\'accuratezza dei contenuti. Prezzi, disponibilità e dettagli dei prodotti possono cambiare.' },
      { heading: 'Limitazione di responsabilità', body: 'Brandswitch non è responsabile per danni diretti, indiretti o conseguenti derivanti dall\'utilizzo di questo sito web. Tutte le decisioni di acquisto sono di tua responsabilità.' },
      { heading: 'Proprietà intellettuale', body: 'Tutti i contenuti di Brandswitch — testi, loghi, dati ed elementi di design — sono di proprietà di Brandswitch o utilizzati con autorizzazione. L\'uso non autorizzato è vietato.' },
      { heading: 'Modifiche ai termini', body: 'Ci riserviamo il diritto di modificare questi termini in qualsiasi momento. Il proseguimento dell\'utilizzo del sito costituisce accettazione dei termini aggiornati.' },
      { heading: 'Legge applicabile', body: 'Questi termini sono regolati dalla legge applicabile. Per domande, contattaci all\'indirizzo legal@brandswitch.com.' },
    ],
  };

  if (locale === 'br') return {
    title: 'Termos de serviço',
    breadcrumb: 'Termos',
    updated: 'Última atualização: fevereiro de 2026',
    intro: 'Ao usar o Brandswitch, você concorda com estes termos de serviço. Por favor, leia-os com atenção.',
    sections: [
      { heading: 'Divulgação de afiliados', body: 'O Brandswitch participa de programas de afiliados. Alguns links são links de afiliados — ganhamos uma pequena comissão se você fizer uma compra através deles, sem custo adicional para você. Isso não influencia nossas classificações.' },
      { heading: 'Precisão das informações', body: 'Nos esforçamos para fornecer informações precisas e atualizadas. No entanto, não garantimos a integridade ou precisão do conteúdo. Preços, disponibilidade e detalhes dos produtos podem mudar.' },
      { heading: 'Limitação de responsabilidade', body: 'O Brandswitch não é responsável por danos diretos, indiretos ou consequentes decorrentes do uso deste site. Todas as decisões de compra são de sua responsabilidade.' },
      { heading: 'Propriedade intelectual', body: 'Todo o conteúdo do Brandswitch — texto, logos, dados e elementos de design — é de propriedade do Brandswitch ou usado com permissão. O uso não autorizado é proibido.' },
      { heading: 'Alterações nos termos', body: 'Reservamo-nos o direito de modificar estes termos a qualquer momento. O uso continuado do site constitui a aceitação dos termos atualizados.' },
      { heading: 'Lei aplicável', body: 'Estes termos são regidos pela lei aplicável. Para dúvidas, entre em contato conosco em legal@brandswitch.com.' },
    ],
  };

  return {
    title: 'Terms of Service',
    breadcrumb: 'Terms',
    updated: 'Last updated: February 2026',
    intro: 'By using Brandswitch, you agree to these terms of service. Please read them carefully.',
    sections: [
      { heading: 'Affiliate disclosure', body: 'Brandswitch participates in affiliate programmes. Some links on this site are affiliate links — we earn a small commission if you make a purchase through them, at no extra cost to you. This does not influence our rankings or recommendations.' },
      { heading: 'Accuracy of information', body: 'We strive to provide accurate, up-to-date information. However, we make no guarantees about the completeness or accuracy of content. Prices, availability, and product details may change.' },
      { heading: 'Limitation of liability', body: 'Brandswitch is not liable for any direct, indirect, or consequential damages arising from your use of this website. All purchasing decisions are your responsibility.' },
      { heading: 'Intellectual property', body: 'All content on Brandswitch — text, logos, data, and design elements — is owned by Brandswitch or used with permission. Unauthorised use is prohibited.' },
      { heading: 'Changes to terms', body: 'We reserve the right to modify these terms at any time. Continued use of the site constitutes acceptance of the updated terms.' },
      { heading: 'Governing law', body: 'These terms are governed by applicable law. For questions, contact us at legal@brandswitch.com.' },
    ],
  };
}

export default function TermsPage({ params: { locale } }: Props) {
  const c = getContent(locale);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <Breadcrumbs
        items={[
          { label: 'Home', href: `/${locale}` },
          { label: c.breadcrumb },
        ]}
      />

      <h1 className="text-3xl font-bold text-bs-dark mb-2">{c.title}</h1>
      <p className="text-xs text-bs-gray mb-8">{c.updated}</p>
      <p className="text-bs-gray leading-relaxed mb-8">{c.intro}</p>

      <div className="space-y-6">
        {c.sections.map(s => (
          <div key={s.heading} className="border-b border-bs-border pb-6 last:border-0">
            <h2 className="font-semibold text-bs-dark mb-2">{s.heading}</h2>
            <p className="text-sm text-bs-gray leading-relaxed">{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
