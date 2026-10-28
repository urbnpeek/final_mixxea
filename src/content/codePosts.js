/**
 * News posts kept in code (not in Redis) so they ship only with a merge.
 * They are scheduled: production shows them from publishedAt onward.
 * Preview deployments show them right away for review.
 * Copy source: ARIA, MIXXEA_WEB_CONTENT_30Oct_2026 (Google Doc 1NJ91GFSmg62WDXZcPYQx7KLG8TMe0C1nlV496SFClB0).
 */

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
    image: '',
    cover: null,
    seo: {
      title: 'Mixxea Records Is Listening: Demo Submissions Are Open',
      description: 'Mixxea Records A&R is open for demos. Send electronic club music as a private download link with a short note through the submission form.',
    },
    relatedReleaseIds: [],
    createdAt: '2026-10-28T00:00:00.000Z',
    updatedAt: '2026-10-30T10:00:00.000Z',
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
