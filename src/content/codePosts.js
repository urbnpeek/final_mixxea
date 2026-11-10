/**
 * News posts kept in code (not in Redis) so they ship only with a merge.
 * They are scheduled: production shows them from publishedAt onward.
 * Preview deployments show them right away for review.
 * Copy source: ARIA, MIXXEA_WEB_CONTENT_30Oct_2026 (Google Doc 1NJ91GFSmg62WDXZcPYQx7KLG8TMe0C1nlV496SFClB0).
 */

const AFTERGLOW_BODY = `AFTERGLOW by FUAD Vol. 1 is on the Mixxea Records YouTube channel.

The one-hour DJ mix moves through organic house, Afro house, indie dance and tech house. It opens with Paulor — Gerlach and closes with Soulfeed — Like You.

Tracks along the way include Kasmet, Calior — Higher; Trilucid, Thysma — Strings Of Light; Jerome Robins — Yeke Yeke; Italo Deviance — Purple Galaxy (Red Axes Remix); Craig Leo — After The Drum; and Andrea Govoni — RAW. The full tracklist with timestamps is in the YouTube description.

**Watch:** https://youtu.be/Q-rlLHOY9xQ

Credit: Mixxea Records.

Producers can send music through [mixxea.com/submit-demo](https://www.mixxea.com/submit-demo). For bookings, email [booking@mixxea.com](mailto:booking@mixxea.com).`;

const BODY = `Mixxea Records is open for demos.

Our A&R team listens for electronic club music: techno, house, ambient, bass and leftfield, the same ground as the Mixxea catalogue. Unreleased, exclusive music is preferred.

**How to send a demo**

Use the submission form at [www.mixxea.com/submit-demo](https://www.mixxea.com/submit-demo). It takes a few minutes:

1. Your artist name, email, country and a Spotify, SoundCloud or other profile link.
2. The track: title, genre, BPM and a private download link (WeTransfer, Dropbox or Google Drive). The form does not take file uploads.
3. Writers, samples and your confirmation, plus a short note on the track: the mood, where it sits, and what you want a listener to hear.

**What happens next**

Every submission goes to Mixxea A&R. Sending a demo does not promise a release, and no track is released or distributed without a signed agreement.

While you're here, browse the catalogue on our [Releases page](https://www.mixxea.com/releases).

Bookings, holds and management inquiries go through the agency, not the demo form: [booking@mixxea.com](mailto:booking@mixxea.com)

[**Submit a demo →**](https://www.mixxea.com/submit-demo)`;

const CODE_POSTS = [
  {
    id: 'post-code-mixxea-records-demo-submissions-open',
    slug: 'mixxea-records-demo-submissions-open',
    previousSlugs: [],
    title: 'Mixxea Records Is Listening: Demo Submissions Are Open',
    excerpt: '',
    body: BODY,
    category: 'label',
    tags: ['demos', 'A&R', 'Mixxea Records'],
    artistIds: [],
    artist: '',
    author: 'Mixxea Records',
    date: '2026-10-30',
    status: 'scheduled',
    publishedAt: '2026-10-30T10:00:00.000Z', // Fri 30 Oct 2026, 12:00 EET
    image: '/img/news/mixxea-demo-submissions-16x9.jpg',
    imageAlt: 'Mixxea Records Is Listening: Demo Submissions Are Open',
    cover: {
      url: '/img/news/mixxea-demo-submissions-16x9.webp',
      thumbUrl: '',
      alt: 'Mixxea Records Is Listening: Demo Submissions Are Open',
      w: 1920,
      h: 1080,
    },
    ogImage: 'https://www.mixxea.com/og/og-news-demo-submissions.jpg',
    seo: {
      ogImage: 'https://www.mixxea.com/og/og-news-demo-submissions.jpg',
      title: 'Mixxea Records Is Listening: Demo Submissions Are Open',
      description: 'Mixxea Records A&R is open for demos. Send electronic club music as a private download link with a short note through the submission form.',
    },
    relatedReleaseIds: [],
    createdAt: '2026-10-28T00:00:00.000Z',
    updatedAt: '2026-10-30T10:00:00.000Z',
    rev: 1,
  },
  {
    // Draft until Fuad's written EXECUTE. Preview deployments force published
    // via withCodePosts; production keeps this hidden as draft if merged early.
    id: 'post-code-afterglow-by-fuad-vol-1',
    slug: 'afterglow-by-fuad-vol-1',
    previousSlugs: [],
    title: 'AFTERGLOW by FUAD Vol. 1: a one-hour DJ mix on YouTube',
    excerpt: '',
    body: AFTERGLOW_BODY,
    category: 'label',
    tags: ['DJ mix', 'YouTube', 'Mixxea Records', 'FUAD'],
    artistIds: [],
    artist: '',
    author: 'Mixxea Records',
    date: '2026-11-10',
    status: 'draft',
    publishedAt: '2026-11-10T10:00:00.000Z', // intended Tue 10 Nov 2026, 12:00 EET; stays draft until EXECUTE
    image: '/img/news/afterglow-by-fuad-vol-1.jpg',
    imageAlt: 'AFTERGLOW by FUAD Vol. 1',
    cover: {
      url: '/img/news/afterglow-by-fuad-vol-1.webp',
      thumbUrl: '',
      alt: 'AFTERGLOW by FUAD Vol. 1',
      w: 1600,
      h: 1600,
    },
    ogImage: '/og/og-news-afterglow-by-fuad-vol-1.jpg',
    seo: {
      ogImage: '/og/og-news-afterglow-by-fuad-vol-1.jpg',
      title: 'AFTERGLOW by FUAD Vol. 1: a one-hour DJ mix on YouTube',
      description: 'AFTERGLOW by FUAD Vol. 1 is a one-hour DJ mix of organic house, Afro house, indie dance and tech house on the Mixxea Records YouTube channel.',
    },
    relatedReleaseIds: [],
    createdAt: '2026-11-09T00:00:00.000Z',
    updatedAt: '2026-11-10T07:59:00.000Z',
    rev: 1,
  },
];

function withCodePosts(news) {
  const list = Array.isArray(news) ? news.slice() : [];
  const preview = process.env.VERCEL_ENV === 'preview';
  for (const post of CODE_POSTS) {
    if (list.some((item) => item && (item.slug === post.slug || item.id === post.id))) continue;
    list.push(preview ? { ...post, status: 'published', publishedAt: '2026-10-28T00:00:00.000Z' } : { ...post });
  }
  return list;
}

module.exports = { CODE_POSTS, withCodePosts };
