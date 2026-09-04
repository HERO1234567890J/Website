import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma, SiteContent } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma as PrismaTypes } from '@prisma/client';

/**
 * §15 / §26 / §27 — DB-driven content + i18n store.
 *
 * Public reads are key + locale-aware: pass `locale=en` to get the
 * English copy, `locale=ar` to get Arabic, etc. If the requested
 * locale is missing, the service falls back to the default locale
 * (the row where `Language.isDefault=true`). The frontend always
 * renders whatever the locale returns; missing translations stay
 * visible rather than 404-ing the page.
 */
@Injectable()
export class SiteContentService implements OnModuleInit {
  private readonly logger = new Logger(SiteContentService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    // Idempotent seeding: upsert every (key, locale) pair from the
    // default seed so newly-added keys land without wiping admin
    // edits. Existing rows are left untouched on conflict.
    const enDefaults = this.defaultSeed('en');
    const arDefaults = this.defaultSeed('ar');
    let upserted = 0;
    for (const row of [...enDefaults, ...arDefaults]) {
      await this.prisma.siteContent.upsert({
        where: { key_locale: { key: row.key, locale: row.locale } },
        create: {
          key: row.key,
          locale: row.locale,
          content: row.content as PrismaTypes.InputJsonValue,
          updatedBy: null,
        },
        update: {}, // never overwrite admin-edited content
      });
      upserted += 1;
    }
    this.logger.log(`SiteContent seed upserted (${upserted} rows checked)`);
  }

  /**
   * Public read. Returns the row for (key, locale) OR the
   * default-locale fallback OR null when neither exists.
   */
  async get(key: string, locale: string): Promise<SiteContent | null> {
    const direct = await this.prisma.siteContent.findUnique({
      where: { key_locale: { key, locale } },
    });
    if (direct) return direct;

    // Fallback to the default language. Look up once and cache for
    // the lifetime of the call.
    const fallbackLocale = await this.defaultLocale();
    if (!fallbackLocale || fallbackLocale === locale) return null;
    return this.prisma.siteContent.findUnique({
      where: { key_locale: { key, locale: fallbackLocale } },
    });
  }

  async getMany(keys: string[], locale: string): Promise<Array<{ key: string; row: SiteContent | null }>> {
    return Promise.all(keys.map((k) => this.get(k, locale).then((row) => ({ key: k, row }))));
  }

  async listAllKeys(): Promise<string[]> {
    const rows = await this.prisma.siteContent.findMany({ select: { key: true }, distinct: ['key'] });
    return rows.map((r) => r.key).sort();
  }

  // ─── admin ─────────────────────────────────────────────────────

  async upsert(
    key: string,
    locale: string,
    content: Record<string, unknown>,
    updatedBy: string,
  ): Promise<SiteContent> {
    const data: Prisma.SiteContentUpdateInput = {
      content: content as Prisma.InputJsonValue,
      updatedBy,
    };
    return this.prisma.siteContent.upsert({
      where: { key_locale: { key, locale } },
      create: {
        key,
        locale,
        content: content as Prisma.InputJsonValue,
        updatedBy,
      },
      update: data,
    });
  }

  async requireByKeyLocale(key: string, locale: string): Promise<SiteContent> {
    const r = await this.prisma.siteContent.findUnique({
      where: { key_locale: { key, locale } },
    });
    if (!r) throw new NotFoundException(`SiteContent (${key}, ${locale}) not found.`);
    return r;
  }

  async deleteByKeyLocale(key: string, locale: string): Promise<{ ok: true }> {
    await this.requireByKeyLocale(key, locale);
    await this.prisma.siteContent.delete({
      where: { key_locale: { key, locale } },
    });
    return { ok: true };
  }

  // ─── private ───────────────────────────────────────────────────

  private async defaultLocale(): Promise<string | null> {
    const lang = await this.prisma.language.findFirst({
      where: { isDefault: true },
      select: { code: true },
    });
    return lang?.code ?? null;
  }

  /**
   * Seed values for the keys the front-end already needs at
   * boot (homepage, about, legal pages, company details).
   * Arabic values are short placeholders — the business fills in
   * the real Arabic copy via the admin editor.
   */
  private defaultSeed(locale: 'en' | 'ar'): Array<Omit<SiteContent, 'id' | 'createdAt' | 'updatedAt'>> {
    const isAr = locale === 'ar';
    const pick = <T>(en: T, ar: T): T => (isAr ? ar : en);
    return [
      {
        key: 'homepage.hero',
        locale,
        content: {
          eyebrow: pick('D-Trips Presents', 'D-Trips تقدّم'),
          title: pick(
            'Bespoke Trips, Unforgettable Premieres.',
            'رحلات مخصصة، افتتاحات لا تُنسى.',
          ),
          sub: pick(
            'A small team of travel directors who believe the best trips are scouted, cast, and directed — never templated.',
            'فريق صغير من مخرجي السفر يعتقد أن أفضل الرحلات تُختار وتُخطط وتُخرج — لا تُسحب من قالب.',
          ),
        },
        updatedBy: null,
      },
      {
        key: 'about.body',
        locale,
        content: {
          html: pick(
            '<p>Behind every D-Trips trip is a director — never an algorithm, never a template. We scout locations in person, cast local guides who know the story behind every street, and pace every itinerary so you linger where it matters.</p>',
            '<p>خلف كل رحلة D-Trips يوجد مخرج — ليس خوارزمية ولا قالباً. نزور المواقع شخصياً، ونختار مرشدين محليين يعرفون قصة كل زقاق.</p>',
          ),
        },
        updatedBy: null,
      },
      {
        key: 'about.founder',
        locale,
        content: {
          quote: pick(
            'I spent a decade behind the camera, chasing light across fifty countries. D-Trips is what happens when a filmmaker stops chasing the shot — and starts building the whole scene, for you.',
            'قضيت عقداً خلف الكاميرا، أطارد الضوء في خمسين بلداً. D-Trips هو ما يحدث عندما يتوقف صانع أفلام عن مطاردة اللقطة — ويبدأ في بناء المشهد بأكمله من أجلك.',
          ),
          body: pick(
            [
              'Before D-Trips, David built sets, scouted locations, and ran productions for a living — the kind of work where a single missed detail can unravel an entire shoot. Somewhere between a sunrise call sheet in the desert and a wrap party on a rooftop in Lisbon, he noticed the trips he loved most weren\'t the ones people booked. They were the ones someone had directed.',
              'So he built an agency the way he\'d build a film: real locations, scouted in person. A cast of local guides who know the story behind every street. A pace that knows when to linger and when to move on. D-Trips exists so that your holiday reads less like an itinerary, and more like a scene worth remembering.',
            ],
            [
              'قبل D-Trips، كان ديفيد يبني الديكورات ويستكشف المواقع ويدير الإنتاجات — العمل الذي يمكن فيه لتفصيل واحد فائت أن يفكك تصويراً كاملاً. بين ورقة استدعاء شروق في الصحراء وحفلة انتهاء تصوير على سطح في لشبونة، لاحظ أن الرحلات التي أحبها لم تكن تلك التي حجزها الناس. بل تلك التي أخرجها أحد.',
              'لذا بنى وكالة كما يبني فيلماً: مواقع حقيقية، يستكشفها شخصياً. طاقم من المرشدين المحليين يعرفون قصة كل زقاق. إيقاع يعرف متى يتأنى ومتى ينتقل. D-Trips موجودة ليكون عطلتك أقرب إلى مشهد يستحق التذكر منها إلى جدول رحلات.',
            ],
          ),
          name: pick('David Fakher', 'ديفيد فخر'),
          role: pick('Founder & Film Producer', 'مؤسس ومنتج سينمائي'),
          sig: pick('D. Fakher', 'د. فخر'),
          photoAlt: pick(
            'David Fakher, founder of D-Trips',
            'ديفيد فخر، مؤسس D-Trips',
          ),
        },
        updatedBy: null,
      },
      {
        key: 'about.gallery',
        locale,
        content: {
          items: [
            { src: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=900&q=80', caption: pick('WADI RUM, JORDAN — Golden Hour', 'وادي رمز، الأردن — الساعة الذهبية') },
            { src: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=900&q=80', caption: pick('CAPPADOCIA, TÜRKİYE — Sunrise Ascent', 'كابادوكيا، تركيا — صعود عند الشروق') },
            { src: 'https://images.unsplash.com/photo-1502602898536-47ad22581b52?auto=format&fit=crop&w=900&q=80', caption: pick('RAS MOHAMMED, EGYPT — Reef Line', 'رأس محمد، مصر — خط الشعاب') },
            { src: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=900&q=80', caption: pick('DOLOMITES, ITALY — First Light', 'دولوميت، إيطاليا — أول ضوء') },
            { src: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=900&q=80', caption: pick('PACIFIC COAST — The Long Way', 'ساحل المحيط الهادئ — الطريق الطويل') },
            { src: 'https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=900&q=80', caption: pick('SANTORINI, GREECE — Blue Hour', 'سانتوريني، اليونان — الساعة الزرقاء') },
            { src: 'https://images.unsplash.com/photo-1494783367193-149034c05e8f?auto=format&fit=crop&w=900&q=80', caption: pick('ANNAPURNA, NEPAL — The Overlook', 'أنابورنا، نيبال — المطل') },
            { src: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=900&q=80', caption: pick('DAHAB, EGYPT — Blue Hole', 'دهب، مصر — البلو هول') },
            { src: 'https://images.unsplash.com/photo-1533130061792-64b345e4a833?auto=format&fit=crop&w=900&q=80', caption: pick('DOLOMITES, ITALY — The Ridge Line', 'دولوميت، إيطاليا — خط القمة') },
            { src: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=900&q=80', caption: pick('NILE RIVER, EGYPT — Local Crew', 'نهر النيل، مصر — الطاقم المحلي') },
            { src: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=900&q=80', caption: pick('PATAGONIA, CHILE — Still Water', 'باتاغونيا، تشيلي — الماء الساكن') },
            { src: 'https://images.unsplash.com/photo-1495954380655-01ffdb4ea616?auto=format&fit=crop&w=900&q=80', caption: pick('TRANSFĂGĂRĂȘAN, ROMANIA — The Drive', 'ترانسفاغاراسان، رومانيا — القيادة') },
          ],
        },
        updatedBy: null,
      },
      {
        key: 'about.pillars',
        locale,
        content: {
          items: [
            { num: '01 / Pre-Production', title: pick('The Script', 'السيناريو'), body: pick('Every trip starts as a story, written around who you are — never pulled off a shelf.', 'كل رحلة تبدأ كقصة، تُكتب حول هويتك — لا تُسحب من رف.'), iconKey: 'script' },
            { num: '02 / Scouting', title: pick('The Location', 'الموقع'), body: pick("We scout before we send. If we haven't stood there ourselves, it doesn't make the cut.", 'نستكشف قبل أن نرسل. إن لم نقف هناك بأنفسنا، فلن يدخل في التشكيلة.'), iconKey: 'location' },
            { num: '03 / Casting', title: pick('The Cast', 'الطاقم'), body: pick('Local guides, drivers, and hosts chosen like a cast — the people who make the place.', 'مرشدون محليون وسائقون ومضيفون مختارون كطاقم — الأشخاص الذين يصنعون المكان.'), iconKey: 'cast' },
            { num: '04 / Premiere', title: pick('The Premiere', 'الافتتاحية'), body: pick('The trip itself. Directed pace, no wasted scenes, an ending worth applauding.', 'الرحلة نفسها. إيقاع مُخرج، بلا مشاهد مهدورة، ونهاية تستحق التصفيق.'), iconKey: 'premiere' },
          ],
        },
        updatedBy: null,
      },
      {
        key: 'privacy_policy.body',
        locale,
        content: {
          markdown: pick(
            '# Privacy Policy\n\n_DRAFT. Pending legal review._',
            '# سياسة الخصوصية\n\n_مسودة. في انتظار المراجعة القانونية._',
          ),
        },
        updatedBy: null,
      },
      {
        key: 'terms_conditions.body',
        locale,
        content: {
          markdown: pick(
            '# Terms & Conditions\n\n_DRAFT. Pending legal review._',
            '# الشروط والأحكام\n\n_مسودة. في انتظار المراجعة القانونية._',
          ),
        },
        updatedBy: null,
      },
      {
        key: 'company.contact',
        locale,
        content: {
          phone: '+20 109 287 8580',
          email: 'hello@d-trips.com',
          whatsapp: '+201092878580',
          address: pick('Cairo, Egypt', 'القاهرة، مصر'),
        },
        updatedBy: null,
      },
      {
        key: 'company.social',
        locale,
        content: {
          instagram: 'https://instagram.com/dtrips',
          facebook: 'https://facebook.com/dtrips',
        },
        updatedBy: null,
      },
      {
        key: 'footer.contact',
        locale,
        content: {
          phone: '010 9287 8580',
          email: 'hello@d-trips.com',
        },
        updatedBy: null,
      },
    ];
  }
}