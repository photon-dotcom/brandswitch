import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/Breadcrumbs';

interface Props {
  params: { locale: string };
}

export const revalidate = 604800;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Privacy Policy | Brandswitch',
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
    title: 'Datenschutzerklärung',
    breadcrumb: 'Datenschutz',
    updated: 'Zuletzt aktualisiert: Februar 2026',
    intro: 'Der Schutz Ihrer persönlichen Daten ist uns wichtig. Diese Datenschutzerklärung erläutert, wie Brandswitch Informationen erhebt, verwendet und schützt.',
    sections: [
      { heading: 'Erhobene Daten', body: 'Wir erheben minimale Daten: anonyme Nutzungsstatistiken (Seitenaufrufe, Suchanfragen) über unseren Analysedienst. Wir erheben keine persönlich identifizierbaren Informationen, es sei denn, Sie kontaktieren uns direkt.' },
      { heading: 'Cookies', body: 'Wir verwenden funktionale Cookies, um Ihre Präferenzen (z.B. Cookie-Einwilligung) zu speichern. Analytische Cookies werden nur mit Ihrer Zustimmung aktiviert. Sie können Cookies jederzeit in Ihrem Browser ablehnen.' },
      { heading: 'Affiliate-Links & Dritte', body: 'Einige Links auf dieser Website sind Affiliate-Links. Wenn Sie auf diese Links klicken, verlassen Sie unsere Website. Die Datenschutzpraktiken unserer Partnerwebsites unterliegen deren eigenen Datenschutzrichtlinien.' },
      { heading: 'DSGVO-Rechte', body: 'Als EU-Nutzer haben Sie das Recht auf Auskunft, Berichtigung, Löschung und Datenübertragbarkeit. Für Anfragen kontaktieren Sie uns unter privacy@brandswitch.com.' },
      { heading: 'Datensicherheit', body: 'Wir verwenden branchenübliche Sicherheitsmaßnahmen. Da wir keine persönlichen Daten speichern, ist das Risiko einer Datenverletzung minimal.' },
      { heading: 'Kontakt', body: 'Bei Fragen zum Datenschutz kontaktieren Sie uns unter privacy@brandswitch.com.' },
    ],
  };

  if (locale === 'fr' || locale === 'be') return {
    title: 'Politique de confidentialité',
    breadcrumb: 'Confidentialité',
    updated: 'Dernière mise à jour : février 2026',
    intro: 'La protection de vos données personnelles est importante pour nous. Cette politique de confidentialité explique comment Brandswitch collecte, utilise et protège les informations.',
    sections: [
      { heading: 'Données collectées', body: 'Nous collectons des données minimales : des statistiques d\'utilisation anonymes (pages vues, recherches) via notre service d\'analyse. Nous ne collectons pas d\'informations personnellement identifiables, sauf si vous nous contactez directement.' },
      { heading: 'Cookies', body: 'Nous utilisons des cookies fonctionnels pour stocker vos préférences (ex. consentement aux cookies). Les cookies analytiques ne sont activés qu\'avec votre consentement. Vous pouvez refuser les cookies dans votre navigateur à tout moment.' },
      { heading: 'Liens affiliés & tiers', body: 'Certains liens sur ce site sont des liens affiliés. Lorsque vous cliquez sur ces liens, vous quittez notre site. Les pratiques de confidentialité de nos sites partenaires sont régies par leurs propres politiques de confidentialité.' },
      { heading: 'Droits RGPD', body: 'En tant qu\'utilisateur européen, vous avez le droit d\'accès, de rectification, d\'effacement et de portabilité de vos données. Pour toute demande, contactez-nous à privacy@brandswitch.com.' },
      { heading: 'Sécurité des données', body: 'Nous utilisons des mesures de sécurité standard du secteur. Puisque nous ne stockons pas de données personnelles, le risque de violation est minimal.' },
      { heading: 'Contact', body: 'Pour toute question relative à la confidentialité, contactez-nous à privacy@brandswitch.com.' },
    ],
  };

  if (locale === 'es' || locale === 'mx') return {
    title: 'Política de privacidad',
    breadcrumb: 'Privacidad',
    updated: 'Última actualización: febrero de 2026',
    intro: 'La protección de tus datos personales es importante para nosotros. Esta política de privacidad explica cómo Brandswitch recopila, usa y protege la información.',
    sections: [
      { heading: 'Datos que recopilamos', body: 'Recopilamos datos mínimos: estadísticas de uso anónimas (páginas vistas, búsquedas) a través de nuestro servicio de análisis. No recopilamos información de identificación personal a menos que nos contactes directamente.' },
      { heading: 'Cookies', body: 'Usamos cookies funcionales para guardar tus preferencias (p. ej., consentimiento de cookies). Las cookies analíticas solo se activan con tu consentimiento. Puedes rechazar las cookies en la configuración de tu navegador en cualquier momento.' },
      { heading: 'Enlaces de afiliados y terceros', body: 'Algunos enlaces en este sitio son de afiliados. Al hacer clic en ellos, abandonas nuestro sitio web. Las prácticas de privacidad de nuestros sitios asociados se rigen por sus propias políticas de privacidad.' },
      { heading: 'Tus derechos', body: 'Tienes derechos de acceso, rectificación, eliminación y portabilidad de datos. Para cualquier solicitud, contáctanos en privacy@brandswitch.com.' },
      { heading: 'Seguridad de datos', body: 'Usamos medidas de seguridad estándar del sector. Como no almacenamos datos personales, el riesgo de una violación de datos es mínimo.' },
      { heading: 'Contacto', body: 'Para preguntas sobre privacidad, contáctanos en privacy@brandswitch.com.' },
    ],
  };

  if (locale === 'it') return {
    title: 'Informativa sulla privacy',
    breadcrumb: 'Privacy',
    updated: 'Ultimo aggiornamento: febbraio 2026',
    intro: 'La protezione dei tuoi dati personali è importante per noi. Questa informativa sulla privacy spiega come Brandswitch raccoglie, utilizza e protegge le informazioni.',
    sections: [
      { heading: 'Dati che raccogliamo', body: 'Raccogliamo dati minimi: statistiche di utilizzo anonime (visualizzazioni di pagina, ricerche) tramite il nostro servizio di analisi. Non raccogliamo informazioni personalmente identificabili a meno che tu non ci contatti direttamente.' },
      { heading: 'Cookie', body: 'Utilizziamo cookie funzionali per memorizzare le tue preferenze (ad es. consenso ai cookie). I cookie analitici vengono attivati solo con il tuo consenso. Puoi rifiutare i cookie nelle impostazioni del browser in qualsiasi momento.' },
      { heading: 'Link affiliati e terze parti', body: 'Alcuni link su questo sito sono link di affiliazione. Quando li clicchi, lasci il nostro sito web. Le pratiche sulla privacy dei nostri siti partner sono regolate dalle loro politiche sulla privacy.' },
      { heading: 'I tuoi diritti', body: 'Hai diritti di accesso, rettifica, cancellazione e portabilità dei dati. Per qualsiasi richiesta, contattaci all\'indirizzo privacy@brandswitch.com.' },
      { heading: 'Sicurezza dei dati', body: 'Utilizziamo misure di sicurezza standard del settore. Poiché non memorizziamo dati personali, il rischio di violazione dei dati è minimo.' },
      { heading: 'Contatto', body: 'Per domande sulla privacy, contattaci all\'indirizzo privacy@brandswitch.com.' },
    ],
  };

  if (locale === 'br') return {
    title: 'Política de privacidade',
    breadcrumb: 'Privacidade',
    updated: 'Última atualização: fevereiro de 2026',
    intro: 'A proteção dos seus dados pessoais é importante para nós. Esta política de privacidade explica como o Brandswitch coleta, usa e protege as informações.',
    sections: [
      { heading: 'Dados que coletamos', body: 'Coletamos dados mínimos: estatísticas de uso anônimas (visualizações de página, pesquisas) por meio do nosso serviço de análise. Não coletamos informações de identificação pessoal, a menos que você nos contate diretamente.' },
      { heading: 'Cookies', body: 'Usamos cookies funcionais para armazenar suas preferências (p. ex., consentimento de cookies). Os cookies analíticos são ativados apenas com seu consentimento. Você pode recusar cookies nas configurações do seu navegador a qualquer momento.' },
      { heading: 'Links de afiliados e terceiros', body: 'Alguns links neste site são links de afiliados. Ao clicar neles, você sai do nosso site. As práticas de privacidade dos nossos sites parceiros são regidas por suas próprias políticas de privacidade.' },
      { heading: 'Seus direitos (LGPD)', body: 'Você tem direitos de acesso, retificação, exclusão e portabilidade de dados. Para qualquer solicitação, entre em contato conosco em privacy@brandswitch.com.' },
      { heading: 'Segurança de dados', body: 'Usamos medidas de segurança padrão do setor. Como não armazenamos dados pessoais, o risco de violação de dados é mínimo.' },
      { heading: 'Contato', body: 'Para dúvidas sobre privacidade, entre em contato conosco em privacy@brandswitch.com.' },
    ],
  };

  return {
    title: 'Privacy Policy',
    breadcrumb: 'Privacy',
    updated: 'Last updated: February 2026',
    intro: 'Protecting your personal data matters to us. This privacy policy explains how Brandswitch collects, uses, and safeguards information.',
    sections: [
      { heading: 'Data we collect', body: 'We collect minimal data: anonymous usage statistics (page views, search queries) through our analytics service. We do not collect personally identifiable information unless you contact us directly.' },
      { heading: 'Cookies', body: 'We use functional cookies to store your preferences (e.g. cookie consent). Analytics cookies are only activated with your consent. You can decline cookies in your browser settings at any time.' },
      { heading: 'Affiliate links & third parties', body: 'Some links on this site are affiliate links. When you click them, you leave our website. The privacy practices of our partner websites are governed by their own privacy policies.' },
      { heading: 'Your rights (GDPR)', body: 'If you are in the EU, you have rights of access, rectification, erasure, and data portability. For any request, contact us at privacy@brandswitch.com.' },
      { heading: 'Data security', body: 'We use industry-standard security measures. Since we do not store personal data, the risk of a data breach is minimal.' },
      { heading: 'Contact', body: 'For privacy questions, contact us at privacy@brandswitch.com.' },
    ],
  };
}

export default function PrivacyPage({ params: { locale } }: Props) {
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
