import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { Plus, Minus, HelpCircle } from 'lucide-react';

const faqs = [
  {
    question: 'How does music distribution work?',
    answer:
      'Once you upload your music to MIXXEA, we deliver it to 70+ digital streaming platforms and stores worldwide — including Spotify, Apple Music, YouTube Music, TikTok, Amazon Music, and more. You keep 100% of your royalties and rights. Releases typically go live within 24–72 hours, with the option to schedule ahead for pre-save campaigns.',
  },
  {
    question: 'What are promotion credits?',
    answer:
      'Promotion credits are the currency for activating campaigns on the MIXXEA platform. Each campaign type (playlist pitching, TikTok UGC, Spotify growth, etc.) consumes a set number of credits based on scale and reach. Credits are refreshed monthly with your plan and can be topped up at any time. Unused credits do not roll over.',
  },
  {
    question: 'Do you take any royalties or ownership of my music?',
    answer:
      'Absolutely not. MIXXEA operates on a SaaS subscription model — we charge a flat monthly fee and you retain 100% of your royalties, master rights, and publishing ownership. We are paid by you, not by your music. Your creative work remains entirely yours.',
  },
  {
    question: 'How does the access approval process work?',
    answer:
      'We review all new applications within 24 business hours. This allows us to match artists and labels with the right plan and campaign strategy from day one. Approval is not a rejection filter — it\'s a quick onboarding check to ensure your account is set up for success. You\'ll receive a welcome call after approval.',
  },
  {
    question: 'Can labels manage multiple artists under one account?',
    answer:
      'Yes — the Pro plan is built for labels, management companies, and music groups with multiple artists. You can manage separate artist profiles, releases, campaigns, and royalty splits from one unified dashboard. A dedicated account manager is included to help coordinate across your roster.',
  },
  {
    question: 'What\'s included in a promotion campaign?',
    answer:
      'Every campaign is scoped in a brief call and tailored to your goals. Depending on your plan and credits, campaigns can include: Spotify editorial & curator pitching, TikTok/IG creator seeding, YouTube pre-roll ads, Meta/Google Ads, and PR outreach. All campaigns include a strategy doc, execution, and a full KPI report at completion.',
  },
  {
    question: 'Does MIXXEA handle publishing administration?',
    answer:
      'Yes. MIXXEA includes publishing split tools so you can assign and automate royalty splits among collaborators, producers, and songwriters. We also support copyright registration and can assist with PRO registration for broadcast royalties. Full publishing administration services are available on Growth and Pro plans.',
  },
  {
    question: 'What support and onboarding is included?',
    answer:
      'All plans include access to our help center, video guides, and email support. Growth plan members get priority email and live chat. Pro plan members receive a dedicated account manager, onboarding strategy session, and access to our 24/7 priority support line. We\'re committed to ensuring your campaigns and releases run flawlessly.',
  },
];

function FAQItem({ faq, index }: { faq: typeof faqs[0]; index: number }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.06 }}
      className="rounded-2xl border transition-all duration-300 overflow-hidden"
      style={isOpen ? {
        borderColor: 'rgba(123,95,255,0.4)',
        background: '#0e0a1f',
      } : {
        borderColor: 'rgba(255,255,255,0.08)',
        background: '#111',
      }}
    >
      <button
        className="w-full text-left p-7 flex items-center justify-between gap-6 group"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={`text-lg font-semibold transition-colors duration-200 ${isOpen ? 'text-white' : 'text-[#ccc] group-hover:text-white'}`}>
          {faq.question}
        </span>
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300"
          style={isOpen ? {
            background: 'linear-gradient(135deg, #7B5FFF, #FF5252)',
            borderColor: 'transparent',
          } : {
            borderColor: 'rgba(255,255,255,0.2)',
            color: '#B5B5B5',
          }}
        >
          {isOpen ? (
            <Minus className="h-4 w-4 text-white" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="px-7 pb-7">
              <div className="border-t border-white/5 pt-5">
                <p className="text-[#B5B5B5] leading-relaxed">{faq.answer}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function FAQ() {
  return (
    <section className="relative py-40 bg-[#0a0a0a]">
      <div className="max-w-[900px] mx-auto px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
            <HelpCircle className="h-4 w-4" style={{ color: '#7B5FFF' }} />
            <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#7B5FFF' }}>FAQ</span>
          </div>
          <h2 className="text-[56px] leading-[1.1] font-bold text-white mb-6">
            Frequently asked
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #7B5FFF, #FF5252)' }}
            >
              questions
            </span>
          </h2>
          <p className="text-xl text-[#B5B5B5] leading-relaxed">
            Everything you need to know about MIXXEA platform, distribution, campaigns, and billing.
          </p>
        </motion.div>

        {/* FAQ items */}
        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <FAQItem key={index} faq={faq} index={index} />
          ))}
        </div>

        {/* Bottom note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center mt-12"
        >
          <p className="text-[#B5B5B5]">
            Still have questions?{' '}
            <a
              href="#contact"
              className="font-semibold underline underline-offset-4 transition-colors"
              style={{ color: '#D63DF6' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#7B5FFF')}
              onMouseLeave={e => (e.currentTarget.style.color = '#D63DF6')}
            >
              Talk to our team
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
