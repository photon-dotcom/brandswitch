/**
 * lib/translations.ts — Category name translations for non-English markets.
 *
 * API category names are always in English. This dictionary maps them to
 * localized equivalents for display in DE/FR/ES/IT/PT page UI.
 */

const CATEGORY_TRANSLATIONS: Record<string, { de: string; fr: string; es: string; it: string; pt: string }> = {
  'Health & Beauty':              { de: 'Gesundheit & Schönheit',       fr: 'Santé & Beauté',                   es: 'Salud & Belleza',               it: 'Salute & Bellezza',              pt: 'Saúde & Beleza' },
  'Accessories':                  { de: 'Accessoires',                  fr: 'Accessoires',                      es: 'Accesorios',                    it: 'Accessori',                      pt: 'Acessórios' },
  'Home & Garden':                { de: 'Haus & Garten',                fr: 'Maison & Jardin',                  es: 'Hogar & Jardín',                it: 'Casa & Giardino',                pt: 'Casa & Jardim' },
  'Clothing':                     { de: 'Kleidung',                     fr: 'Vêtements',                        es: 'Ropa',                          it: 'Abbigliamento',                  pt: 'Roupas' },
  'Sports, Outdoors & Fitness':   { de: 'Sport, Outdoor & Fitness',     fr: 'Sports, Outdoor & Fitness',        es: 'Deporte, Outdoor & Fitness',    it: 'Sport, Outdoor & Fitness',       pt: 'Esporte, Outdoor & Fitness' },
  'Digital Services & Streaming': { de: 'Digitale Dienste & Streaming', fr: 'Services numériques & Streaming',  es: 'Servicios digitales & Streaming',it: 'Servizi digitali & Streaming',   pt: 'Serviços digitais & Streaming' },
  'Electronics':                  { de: 'Elektronik',                   fr: 'Électronique',                     es: 'Electrónica',                   it: 'Elettronica',                    pt: 'Eletrônicos' },
  'Food, Drinks & Restaurants':   { de: 'Essen, Getränke & Restaurants',fr: 'Alimentation, Boissons & Restaurants', es: 'Comida, Bebidas & Restaurantes', it: 'Cibo, Bevande & Ristoranti', pt: 'Comida, Bebidas & Restaurantes' },
  'Travel & Vacations':           { de: 'Reisen & Urlaub',              fr: 'Voyages & Vacances',               es: 'Viajes & Vacaciones',           it: 'Viaggi & Vacanze',               pt: 'Viagens & Férias' },
  'Gifts, Flowers & Parties':     { de: 'Geschenke, Blumen & Partys',   fr: 'Cadeaux, Fleurs & Fêtes',          es: 'Regalos, Flores & Fiestas',     it: 'Regali, Fiori & Feste',          pt: 'Presentes, Flores & Festas' },
  'Shoes':                        { de: 'Schuhe',                       fr: 'Chaussures',                       es: 'Zapatos',                       it: 'Scarpe',                         pt: 'Sapatos' },
  'Toys & Games':                 { de: 'Spielzeug & Spiele',           fr: 'Jouets & Jeux',                    es: 'Juguetes & Juegos',             it: 'Giocattoli & Giochi',            pt: 'Brinquedos & Jogos' },
  'Subscription Boxes & Services':{ de: 'Aboboxen & Dienste',           fr: 'Abonnements & Services',           es: 'Cajas de suscripción & Servicios',it: 'Box in abbonamento & Servizi', pt: 'Caixas de assinatura & Serviços' },
  'Events & Entertainment':       { de: 'Events & Unterhaltung',        fr: 'Événements & Divertissement',      es: 'Eventos & Entretenimiento',     it: 'Eventi & Intrattenimento',       pt: 'Eventos & Entretenimento' },
  'Auto & Tires':                 { de: 'Auto & Reifen',                fr: 'Auto & Pneus',                     es: 'Auto & Neumáticos',             it: 'Auto & Pneumatici',              pt: 'Auto & Pneus' },
  'Pets':                         { de: 'Haustiere',                    fr: 'Animaux',                          es: 'Mascotas',                      it: 'Animali',                        pt: 'Animais de estimação' },
  'Baby & Toddler':               { de: 'Baby & Kleinkind',             fr: 'Bébé & Tout-petit',                es: 'Bebé & Niño pequeño',           it: 'Neonati & Bambini',              pt: 'Bebê & Criança pequena' },
  'Office Supplies':              { de: 'Bürobedarf',                   fr: 'Fournitures de bureau',            es: 'Material de oficina',           it: 'Forniture per ufficio',          pt: 'Material de escritório' },
};

type TranslatedLocale = 'de' | 'fr' | 'es' | 'it' | 'pt';
const TRANSLATED_LOCALES = new Set<string>(['de', 'fr', 'es', 'it', 'pt', 'at', 'ch', 'be', 'mx']);

/** Return the translated category name for non-English locales, or the original English name. */
export function translateCategory(locale: string, englishName: string): string {
  // Map locale aliases to translation keys
  const langMap: Record<string, TranslatedLocale> = {
    de: 'de', at: 'de', ch: 'de',
    fr: 'fr', be: 'fr',
    es: 'es', mx: 'es',
    it: 'it',
    br: 'pt',
  };
  if (!TRANSLATED_LOCALES.has(locale) && locale !== 'br') return englishName;
  const lang = langMap[locale];
  if (!lang) return englishName;
  return CATEGORY_TRANSLATIONS[englishName]?.[lang] ?? englishName;
}
