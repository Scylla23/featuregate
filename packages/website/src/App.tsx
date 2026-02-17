import { useState, useEffect, useRef, type ReactNode } from 'react';
import {
  Menu,
  X,
  Flag,
  Target,
  TrendingUp,
  Users,
  Clock,
  GitBranch,
  Check,
  Minus,
  ArrowRight,
  Code2,
  Sliders,
  Rocket,
  Github,
  Twitter,
  Star,
  Zap,
  Shield,
  BarChart3,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function Section({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  const { ref, inView } = useInView(0.08);
  return (
    <section
      ref={ref}
      id={id}
      className={cn(
        'transition-all duration-700 ease-out scroll-mt-20',
        inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
        className,
      )}
    >
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export default function App() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeProductTab, setActiveProductTab] = useState<'create' | 'targeting' | 'rollout'>(
    'create',
  );
  const [activeCodeTab, setActiveCodeTab] = useState<'javascript' | 'python' | 'go' | 'ruby'>(
    'javascript',
  );
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden">
      <Navbar
        scrolled={scrolled}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />
      <HeroSection />
      <LogosBar />
      <FeaturesGrid />
      <ProductDemo activeTab={activeProductTab} setActiveTab={setActiveProductTab} />
      <DeveloperExperience activeTab={activeCodeTab} setActiveTab={setActiveCodeTab} />
      <HowItWorks />
      <ComparisonTable />
      <Testimonials />
      <PricingSection billingPeriod={billingPeriod} setBillingPeriod={setBillingPeriod} />
      <CTASection />
      <Footer />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1. Navbar
// ---------------------------------------------------------------------------

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Docs', href: '#developers' },
];

function Navbar({
  scrolled,
  mobileMenuOpen,
  setMobileMenuOpen,
}: {
  scrolled: boolean;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (v: boolean) => void;
}) {
  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/60 shadow-lg shadow-slate-950/50'
          : 'bg-transparent',
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2.5 group">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 transition-transform group-hover:scale-105">
              <Flag className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">FeatureGate</span>
          </a>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-3.5 py-2 text-sm text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href="#"
              className="px-3.5 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Sign In
            </a>
            <a
              href="#"
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/25 hover:bg-blue-400 transition-all hover:shadow-blue-500/40"
            >
              Get Started Free
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-slate-400 hover:text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800/60 bg-slate-950/98 backdrop-blur-xl">
          <div className="px-4 py-3 space-y-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                {link.label}
              </a>
            ))}
            <div className="pt-3 border-t border-slate-800/60 mt-2 space-y-2">
              <a href="#" className="block px-3 py-2.5 text-sm text-slate-400 hover:text-white">
                Sign In
              </a>
              <a
                href="#"
                className="block w-full text-center rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white"
              >
                Get Started Free
              </a>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// 2. Hero
// ---------------------------------------------------------------------------

function HeroSection() {
  return (
    <section className="relative pt-28 pb-16 md:pt-36 md:pb-24 overflow-hidden">
      {/* Background atmosphere */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-500/[0.07] rounded-full blur-[120px]" />
        <div className="absolute top-40 right-0 w-[400px] h-[400px] bg-emerald-500/[0.05] rounded-full blur-[100px]" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left — copy */}
          <div className="flex-1 text-center lg:text-left max-w-2xl lg:max-w-none">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-800/40 px-3.5 py-1.5 text-xs font-medium text-slate-300 mb-6 backdrop-blur-sm">
              <div className="flex items-center gap-1 text-emerald-400">
                <Star className="h-3 w-3 fill-emerald-400" />
                <span>Open Source</span>
              </div>
              <span className="text-slate-600">|</span>
              <span>Self-hosted feature flags</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
              Ship features{' '}
              <span className="bg-gradient-to-r from-blue-400 via-blue-300 to-emerald-400 bg-clip-text text-transparent">
                fearlessly.
              </span>
              <br />
              Control everything.
            </h1>

            <p className="text-lg text-slate-400 leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0">
              Release, test, and roll back features instantly — without redeploying. Feature flags
              for engineering teams who ship fast.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start">
              <a
                href="#"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-400 hover:shadow-blue-500/40 transition-all w-full sm:w-auto justify-center"
              >
                Start for Free
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#developers"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/40 px-6 py-3 text-sm font-medium text-slate-300 hover:text-white hover:border-slate-600 hover:bg-slate-800/60 transition-all w-full sm:w-auto justify-center"
              >
                View Documentation
              </a>
            </div>

            <p className="mt-5 text-xs text-slate-500">
              Free forever for small teams &middot; No credit card required
            </p>
          </div>

          {/* Right — dashboard mockup */}
          <div className="flex-1 w-full max-w-lg lg:max-w-xl">
            <DashboardMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

function DashboardMockup() {
  const flags = [
    { name: 'dark-mode', enabled: true, env: 'prod', tag: 'UI', pct: 100 },
    { name: 'new-checkout', enabled: true, env: 'prod', tag: 'Revenue', pct: 65 },
    { name: 'beta-search', enabled: false, env: 'staging', tag: 'Beta', pct: 0 },
    { name: 'onboarding-v2', enabled: true, env: 'prod', tag: 'Growth', pct: 30 },
  ];

  return (
    <div className="relative animate-float">
      {/* Glow */}
      <div className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-blue-500/20 via-transparent to-emerald-500/10 blur-2xl animate-pulse-glow" />

      {/* Browser chrome */}
      <div className="relative rounded-xl border border-slate-700/50 bg-slate-900 shadow-2xl shadow-black/40 overflow-hidden">
        {/* Title bar */}
        <div className="flex items-center gap-2 border-b border-slate-800/80 px-4 py-3 bg-slate-900/80">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
          </div>
          <div className="ml-3 flex-1 flex justify-center">
            <div className="flex items-center gap-1.5 rounded-md bg-slate-800/60 px-3 py-1 text-[10px] text-slate-500">
              <Shield className="h-2.5 w-2.5" />
              app.featuregate.dev/flags
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex min-h-[280px]">
          {/* Mini sidebar */}
          <div className="w-11 border-r border-slate-800/60 bg-slate-900/60 flex flex-col items-center py-3 gap-3">
            <div className="h-5 w-5 rounded bg-blue-500/20 flex items-center justify-center">
              <Flag className="h-3 w-3 text-blue-400" />
            </div>
            <div className="h-5 w-5 rounded bg-slate-800/60 flex items-center justify-center">
              <Users className="h-3 w-3 text-slate-600" />
            </div>
            <div className="h-5 w-5 rounded bg-slate-800/60 flex items-center justify-center">
              <Clock className="h-3 w-3 text-slate-600" />
            </div>
            <div className="h-5 w-5 rounded bg-slate-800/60 flex items-center justify-center">
              <Sliders className="h-3 w-3 text-slate-600" />
            </div>
          </div>

          {/* Main */}
          <div className="flex-1 p-4 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-200">Feature Flags</span>
                <span className="text-[9px] rounded bg-slate-800 px-1.5 py-0.5 text-slate-500 font-medium">
                  4 flags
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-5 w-20 rounded bg-slate-800/60 border border-slate-700/40 flex items-center px-1.5">
                  <span className="text-[9px] text-slate-600">Search...</span>
                </div>
                <div className="h-5 rounded bg-blue-500 px-2 text-[9px] text-white font-medium flex items-center gap-0.5">
                  <span>+</span> Create
                </div>
              </div>
            </div>

            {/* Flag rows */}
            <div className="space-y-2">
              {flags.map((flag) => (
                <div
                  key={flag.name}
                  className="flex items-center justify-between rounded-lg border border-slate-800/60 bg-slate-800/20 px-3 py-2 hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        flag.enabled ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-slate-600',
                      )}
                    />
                    <span className="text-[11px] text-slate-300 font-mono">{flag.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {flag.pct > 0 && flag.pct < 100 && (
                      <div className="flex items-center gap-1">
                        <div className="h-1.5 w-10 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-500/60"
                            style={{ width: `${flag.pct}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-slate-600 tabular-nums">{flag.pct}%</span>
                      </div>
                    )}
                    <span
                      className={cn(
                        'text-[8px] font-medium rounded px-1.5 py-0.5 uppercase tracking-wider',
                        flag.env === 'prod'
                          ? 'bg-emerald-500/10 text-emerald-400/80'
                          : 'bg-yellow-500/10 text-yellow-400/80',
                      )}
                    >
                      {flag.env}
                    </span>
                    <span className="text-[9px] rounded bg-slate-800/80 px-1.5 py-0.5 text-slate-500">
                      {flag.tag}
                    </span>
                    {/* Toggle */}
                    <div
                      className={cn(
                        'h-3.5 w-6 rounded-full transition-colors flex items-center',
                        flag.enabled ? 'bg-emerald-500' : 'bg-slate-700',
                      )}
                    >
                      <div
                        className={cn(
                          'h-2.5 w-2.5 rounded-full bg-white shadow-sm transition-transform mx-0.5',
                          flag.enabled ? 'translate-x-2' : 'translate-x-0',
                        )}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. Logos Bar
// ---------------------------------------------------------------------------

const LOGOS = ['Acme Corp', 'Velocity', 'NovaTech', 'BuildCo', 'StackOps', 'CloudNine'];

function LogosBar() {
  return (
    <Section className="py-12 md:py-16 border-y border-slate-800/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-xs uppercase tracking-widest text-slate-600 mb-8">
          Trusted by engineering teams everywhere
        </p>
        <div className="relative overflow-hidden">
          <div className="flex animate-marquee gap-16 items-center w-max">
            {[...LOGOS, ...LOGOS].map((name, i) => (
              <span
                key={i}
                className="text-slate-600 text-sm font-semibold tracking-wide whitespace-nowrap select-none"
              >
                {name}
              </span>
            ))}
          </div>
          {/* Fade edges */}
          <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-slate-950 to-transparent pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-slate-950 to-transparent pointer-events-none" />
        </div>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// 4. Features Bento Grid
// ---------------------------------------------------------------------------

function FeaturesGrid() {
  const features = [
    {
      icon: Zap,
      title: 'Feature Flags with Instant Toggle',
      description:
        'Create boolean or multivariate flags. Toggle features on or off for any environment in one click. No deploys, no waiting.',
      span: true,
      visual: (
        <div className="mt-4 flex items-center gap-3">
          <code className="text-[11px] text-slate-400 bg-slate-800/60 rounded-md px-3 py-2 font-mono">
            <span className="text-purple-400">if</span> (client.
            <span className="text-blue-400">isEnabled</span>(
            <span className="text-emerald-400">&apos;dark-mode&apos;</span>)){' {'}
          </code>
          <div className="flex items-center gap-1.5">
            <div className="h-4 w-7 rounded-full bg-emerald-500 flex items-center">
              <div className="h-3 w-3 rounded-full bg-white ml-3.5 shadow-sm" />
            </div>
            <span className="text-[10px] text-emerald-400 font-medium">ON</span>
          </div>
        </div>
      ),
    },
    {
      icon: Target,
      title: 'Precise User Targeting',
      description:
        'Target users by attributes, segments, or percentage. Build complex rules with our visual rule builder.',
      visual: (
        <div className="mt-4 space-y-1.5">
          {['email ends with @company.com', 'country is US, CA'].map((rule) => (
            <div
              key={rule}
              className="flex items-center gap-2 text-[10px] rounded bg-slate-800/60 px-2.5 py-1.5"
            >
              <div className="h-1 w-1 rounded-full bg-blue-400" />
              <span className="text-slate-400">{rule}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      icon: BarChart3,
      title: 'Gradual Percentage Rollouts',
      description:
        'Release to 1% of users and scale to 100%. Control the pace of every release with granular rollout percentages.',
      visual: (
        <div className="mt-4">
          <div className="h-3 w-full rounded-full overflow-hidden flex bg-slate-800">
            <div className="h-full bg-blue-500/80 rounded-l-full" style={{ width: '25%' }} />
            <div className="h-full bg-emerald-500/60" style={{ width: '50%' }} />
            <div className="h-full bg-slate-700" style={{ width: '25%' }} />
          </div>
          <div className="flex justify-between mt-1.5 text-[9px] text-slate-600">
            <span>Variation A — 25%</span>
            <span>Variation B — 50%</span>
            <span>Control — 25%</span>
          </div>
        </div>
      ),
    },
    {
      icon: Users,
      title: 'User Segments',
      description:
        'Group users by attributes or manual lists. Target entire segments across multiple flags — update once, apply everywhere.',
      span: true,
      visual: (
        <div className="mt-4 flex gap-2">
          {['Beta Testers', 'Enterprise', 'Internal'].map((seg) => (
            <div
              key={seg}
              className="flex items-center gap-1.5 rounded-full border border-slate-700/60 bg-slate-800/40 px-2.5 py-1 text-[10px] text-slate-400"
            >
              <Users className="h-2.5 w-2.5" />
              {seg}
            </div>
          ))}
        </div>
      ),
    },
    {
      icon: Clock,
      title: 'Full Change History',
      description:
        'Every toggle, every rule change, every deployment — tracked with who, when, and exactly what changed.',
      visual: (
        <div className="mt-4 space-y-1.5">
          {[
            { action: 'Toggled ON', who: 'sarah@co.io', time: '2m ago', color: 'text-emerald-400' },
            { action: 'Rule updated', who: 'marcus@co.io', time: '1h ago', color: 'text-blue-400' },
          ].map((entry) => (
            <div
              key={entry.action}
              className="flex items-center gap-2 text-[10px] rounded bg-slate-800/60 px-2.5 py-1.5"
            >
              <span className={entry.color}>&bull;</span>
              <span className="text-slate-300">{entry.action}</span>
              <span className="text-slate-600 ml-auto">
                {entry.who} &middot; {entry.time}
              </span>
            </div>
          ))}
        </div>
      ),
    },
    {
      icon: GitBranch,
      title: 'Multi-Environment Support',
      description:
        'Manage separate configurations for Development, Staging, and Production. Test safely, ship confidently.',
      visual: (
        <div className="mt-4 flex gap-2">
          {[
            { name: 'dev', color: 'bg-yellow-400/20 text-yellow-400' },
            { name: 'staging', color: 'bg-blue-400/20 text-blue-400' },
            { name: 'prod', color: 'bg-emerald-400/20 text-emerald-400' },
          ].map((env) => (
            <div
              key={env.name}
              className={cn('rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider', env.color)}
            >
              {env.name}
            </div>
          ))}
        </div>
      ),
    },
  ];

  return (
    <Section id="features" className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Everything you need to control your releases
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            From simple toggles to complex targeting rules — FeatureGate scales with your team.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <div
              key={i}
              className={cn(
                'group rounded-xl border border-slate-800/60 bg-slate-900/40 p-6 hover:border-slate-700/80 hover:bg-slate-900/60 transition-all duration-300',
                f.span && 'md:col-span-2',
              )}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/15 transition-colors">
                  <f.icon className="h-4.5 w-4.5" />
                </div>
                <h3 className="text-sm font-semibold text-slate-100">{f.title}</h3>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">{f.description}</p>
              {f.visual}
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// 5. Product Demo
// ---------------------------------------------------------------------------

function ProductDemo({
  activeTab,
  setActiveTab,
}: {
  activeTab: string;
  setActiveTab: (t: 'create' | 'targeting' | 'rollout') => void;
}) {
  const tabs = [
    { id: 'create' as const, label: 'Create a Flag', icon: Flag },
    { id: 'targeting' as const, label: 'Set Targeting Rules', icon: Target },
    { id: 'rollout' as const, label: 'Gradual Rollout', icon: TrendingUp },
  ];

  return (
    <Section id="demo" className="py-20 md:py-28 bg-slate-900/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">See it in action</h2>
          <p className="text-slate-400 text-lg">
            From creation to rollout — everything in one clean interface.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all',
                activeTab === tab.id
                  ? 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/30 shadow-lg shadow-blue-500/5'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50',
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="max-w-3xl mx-auto">
          <div key={activeTab} className="animate-fade-in-up">
            {activeTab === 'create' && <CreateFlagDemo />}
            {activeTab === 'targeting' && <TargetingDemo />}
            {activeTab === 'rollout' && <RolloutDemo />}
          </div>
        </div>
      </div>
    </Section>
  );
}

function CreateFlagDemo() {
  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/80 overflow-hidden">
      <div className="border-b border-slate-800/60 px-6 py-4">
        <h3 className="text-sm font-semibold text-slate-200">Create New Flag</h3>
        <p className="text-xs text-slate-500 mt-0.5">Define a feature flag with variations</p>
      </div>
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Flag Key</label>
            <div className="rounded-lg border border-slate-700/60 bg-slate-800/40 px-3 py-2 text-sm text-slate-300 font-mono">
              new-checkout-flow
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Name</label>
            <div className="rounded-lg border border-slate-700/60 bg-slate-800/40 px-3 py-2 text-sm text-slate-300">
              New Checkout Flow
            </div>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Variation Type</label>
          <div className="flex gap-2">
            {['Boolean', 'String', 'Number', 'JSON'].map((t, i) => (
              <div
                key={t}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border',
                  i === 0
                    ? 'border-blue-500/40 bg-blue-500/10 text-blue-400'
                    : 'border-slate-700/40 bg-slate-800/40 text-slate-500',
                )}
              >
                {t}
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 block">Variation A</span>
              <span className="text-sm font-mono text-emerald-400">true</span>
            </div>
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
          </div>
          <div className="rounded-lg border border-slate-700/40 bg-slate-800/30 px-3 py-2.5 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 block">Variation B</span>
              <span className="text-sm font-mono text-slate-400">false</span>
            </div>
            <div className="h-2 w-2 rounded-full bg-slate-600" />
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Initial state:</span>
            <div className="h-4 w-7 rounded-full bg-emerald-500 flex items-center">
              <div className="h-3 w-3 rounded-full bg-white ml-3.5 shadow-sm" />
            </div>
            <span className="text-xs text-emerald-400 font-medium">Enabled</span>
          </div>
          <div className="rounded-lg bg-blue-500 px-4 py-2 text-xs font-medium text-white">
            Create Flag
          </div>
        </div>
      </div>
    </div>
  );
}

function TargetingDemo() {
  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/80 overflow-hidden">
      <div className="border-b border-slate-800/60 px-6 py-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Targeting Rules</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            <span className="font-mono text-blue-400">new-checkout-flow</span> &middot; Production
          </p>
        </div>
        <span className="text-[10px] rounded-full bg-emerald-500/10 text-emerald-400 px-2.5 py-1 font-medium uppercase tracking-wider">
          Live
        </span>
      </div>
      <div className="p-6 space-y-4">
        {/* Rule 1 */}
        <div className="rounded-lg border border-slate-700/40 bg-slate-800/20 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-300">Rule 1 — Internal Testers</span>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 rounded px-2 py-0.5 font-medium">
              Serve: true
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded bg-slate-800 px-2 py-1 text-blue-400 font-medium">
                email
              </span>
              <span className="text-slate-600">ends with</span>
              <span className="rounded bg-slate-800 px-2 py-1 text-emerald-400 font-mono">
                @featuregate.dev
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-600 pl-1">
              <span className="rounded bg-blue-500/20 text-blue-400 px-1.5 py-0.5 font-bold">
                AND
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded bg-slate-800 px-2 py-1 text-blue-400 font-medium">
                role
              </span>
              <span className="text-slate-600">is in</span>
              <span className="rounded bg-slate-800 px-2 py-1 text-emerald-400 font-mono">
                admin, developer
              </span>
            </div>
          </div>
        </div>

        {/* Rule 2 */}
        <div className="rounded-lg border border-slate-700/40 bg-slate-800/20 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-300">
              Rule 2 — Enterprise Customers
            </span>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 rounded px-2 py-0.5 font-medium">
              Serve: true
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded bg-slate-800 px-2 py-1 text-blue-400 font-medium">plan</span>
            <span className="text-slate-600">equals</span>
            <span className="rounded bg-slate-800 px-2 py-1 text-emerald-400 font-mono">
              enterprise
            </span>
          </div>
        </div>

        {/* Default */}
        <div className="flex items-center justify-between rounded-lg border border-dashed border-slate-700/40 bg-slate-800/10 px-4 py-3">
          <span className="text-xs text-slate-500">Default Rule (Fallthrough)</span>
          <span className="text-[10px] text-slate-400 bg-slate-800 rounded px-2 py-0.5 font-medium">
            Serve: false
          </span>
        </div>
      </div>
    </div>
  );
}

function RolloutDemo() {
  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/80 overflow-hidden">
      <div className="border-b border-slate-800/60 px-6 py-4">
        <h3 className="text-sm font-semibold text-slate-200">Gradual Rollout</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          <span className="font-mono text-blue-400">new-checkout-flow</span> &middot; Roll out to
          users over time
        </p>
      </div>
      <div className="p-6 space-y-6">
        {/* Progress visualization */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Current rollout</span>
            <span className="text-sm font-bold text-blue-400 tabular-nums">50%</span>
          </div>
          <div className="h-4 w-full rounded-full overflow-hidden flex bg-slate-800 border border-slate-700/40">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-l-full transition-all duration-1000 relative"
              style={{ width: '50%' }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10 rounded-l-full" />
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { pct: '10%', date: 'Jan 15', status: 'done' },
            { pct: '25%', date: 'Jan 22', status: 'done' },
            { pct: '50%', date: 'Feb 1', status: 'current' },
            { pct: '100%', date: 'Feb 15', status: 'pending' },
          ].map((step) => (
            <div
              key={step.pct}
              className={cn(
                'rounded-lg border px-3 py-2.5 text-center',
                step.status === 'done'
                  ? 'border-emerald-500/20 bg-emerald-500/5'
                  : step.status === 'current'
                    ? 'border-blue-500/40 bg-blue-500/10 ring-1 ring-blue-500/20'
                    : 'border-slate-700/40 bg-slate-800/20',
              )}
            >
              <div
                className={cn(
                  'text-sm font-bold tabular-nums',
                  step.status === 'done'
                    ? 'text-emerald-400'
                    : step.status === 'current'
                      ? 'text-blue-400'
                      : 'text-slate-500',
                )}
              >
                {step.pct}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">{step.date}</div>
              {step.status === 'done' && (
                <Check className="h-3 w-3 text-emerald-400 mx-auto mt-1" />
              )}
              {step.status === 'current' && (
                <div className="h-1.5 w-1.5 rounded-full bg-blue-400 mx-auto mt-1.5 animate-pulse" />
              )}
            </div>
          ))}
        </div>

        {/* Variation split */}
        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-500">Variations:</span>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-blue-500" />
            <span className="text-slate-400">true — 50%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-slate-700" />
            <span className="text-slate-400">false — 50%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 6. Developer Experience
// ---------------------------------------------------------------------------

function DeveloperExperience({
  activeTab,
  setActiveTab,
}: {
  activeTab: string;
  setActiveTab: (t: 'javascript' | 'python' | 'go' | 'ruby') => void;
}) {
  const languages = [
    { id: 'javascript' as const, label: 'JavaScript' },
    { id: 'python' as const, label: 'Python' },
    { id: 'go' as const, label: 'Go' },
    { id: 'ruby' as const, label: 'Ruby' },
  ];

  const sdks = ['JavaScript', 'Python', 'Go', 'Ruby', 'Java', 'React', 'iOS', 'Android'];

  return (
    <Section id="developers" className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Built for developers. Loved by teams.
          </h2>
          <p className="text-slate-400 text-lg">
            Integrate in minutes with SDKs for every major platform.
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          {/* Language tabs */}
          <div className="flex border-b border-slate-800">
            {languages.map((lang) => (
              <button
                key={lang.id}
                onClick={() => setActiveTab(lang.id)}
                className={cn(
                  'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
                  activeTab === lang.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-300',
                )}
              >
                {lang.label}
              </button>
            ))}
          </div>

          {/* Code block */}
          <div className="rounded-b-xl bg-slate-900/80 border border-t-0 border-slate-800 p-6 font-mono text-[13px] leading-relaxed overflow-x-auto">
            {activeTab === 'javascript' && <JSSnippet />}
            {activeTab === 'python' && <PythonSnippet />}
            {activeTab === 'go' && <GoSnippet />}
            {activeTab === 'ruby' && <RubySnippet />}
          </div>

          {/* SDK badges */}
          <div className="flex flex-wrap justify-center gap-2 mt-8">
            {sdks.map((sdk) => (
              <span
                key={sdk}
                className="rounded-full border border-slate-700/50 bg-slate-800/30 px-3 py-1 text-xs text-slate-400"
              >
                {sdk}
              </span>
            ))}
          </div>

          <p className="text-center mt-6 text-sm text-slate-400">
            Get up and running in under 5 minutes.{' '}
            <a href="#" className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1">
              Read the docs <ChevronRight className="h-3 w-3" />
            </a>
          </p>
        </div>
      </div>
    </Section>
  );
}

function JSSnippet() {
  return (
    <pre className="text-slate-300">
      <code>
        <span className="text-purple-400">import</span>{' '}
        {'{ FeatureGateClient }'}{' '}
        <span className="text-purple-400">from</span>{' '}
        <span className="text-emerald-400">&apos;@featuregate/node-sdk&apos;</span>;{'\n\n'}
        <span className="text-purple-400">const</span> client ={' '}
        <span className="text-purple-400">new</span>{' '}
        <span className="text-blue-400">FeatureGateClient</span>({'{'}
        {'\n'}
        {'  '}sdkKey: <span className="text-emerald-400">&apos;sdk-prod-abc123&apos;</span>,{'\n'}
        {'}'});{'\n'}
        <span className="text-purple-400">await</span> client.
        <span className="text-blue-400">waitForInitialization</span>();{'\n\n'}
        <span className="text-slate-500 italic">{'// Evaluate a flag for a user'}</span>{'\n'}
        <span className="text-purple-400">if</span> (client.
        <span className="text-blue-400">isEnabled</span>(
        <span className="text-emerald-400">&apos;new-checkout&apos;</span>, {'{'}
        {'\n'}
        {'  '}key: <span className="text-emerald-400">&apos;user-123&apos;</span>,{'\n'}
        {'  '}plan: <span className="text-emerald-400">&apos;enterprise&apos;</span>,{'\n'}
        {'}'})) {'{'}
        {'\n'}
        {'  '}
        <span className="text-blue-400">showNewCheckout</span>();{'\n'}
        {'}'}
      </code>
    </pre>
  );
}

function PythonSnippet() {
  return (
    <pre className="text-slate-300">
      <code>
        <span className="text-purple-400">from</span> featuregate{' '}
        <span className="text-purple-400">import</span> FeatureGateClient{'\n\n'}
        client = <span className="text-blue-400">FeatureGateClient</span>(
        {'\n'}
        {'  '}sdk_key=<span className="text-emerald-400">&apos;sdk-prod-abc123&apos;</span>
        {'\n'}){'\n'}
        client.<span className="text-blue-400">wait_for_initialization</span>(){'\n\n'}
        <span className="text-slate-500 italic"># Evaluate a flag for a user</span>{'\n'}
        <span className="text-purple-400">if</span> client.
        <span className="text-blue-400">is_enabled</span>(
        <span className="text-emerald-400">&apos;new-checkout&apos;</span>, {'{'}
        {'\n'}
        {'  '}<span className="text-emerald-400">&apos;key&apos;</span>:{' '}
        <span className="text-emerald-400">&apos;user-123&apos;</span>,{'\n'}
        {'  '}<span className="text-emerald-400">&apos;plan&apos;</span>:{' '}
        <span className="text-emerald-400">&apos;enterprise&apos;</span>,{'\n'}
        {'}'}):{'\n'}
        {'  '}<span className="text-blue-400">show_new_checkout</span>()
      </code>
    </pre>
  );
}

function GoSnippet() {
  return (
    <pre className="text-slate-300">
      <code>
        <span className="text-purple-400">import</span>{' '}
        <span className="text-emerald-400">&quot;github.com/featuregate/go-sdk&quot;</span>{'\n\n'}
        client := featuregate.<span className="text-blue-400">NewClient</span>(
        <span className="text-emerald-400">&quot;sdk-prod-abc123&quot;</span>){'\n'}
        client.<span className="text-blue-400">WaitForInitialization</span>(){'\n\n'}
        <span className="text-slate-500 italic">{'// Evaluate a flag for a user'}</span>{'\n'}
        <span className="text-purple-400">if</span> client.
        <span className="text-blue-400">IsEnabled</span>(
        <span className="text-emerald-400">&quot;new-checkout&quot;</span>, featuregate.Context{'{'}
        {'\n'}
        {'  '}Key:{'  '}
        <span className="text-emerald-400">&quot;user-123&quot;</span>,{'\n'}
        {'  '}Plan: <span className="text-emerald-400">&quot;enterprise&quot;</span>,{'\n'}
        {'}'}) {'{'}
        {'\n'}
        {'  '}<span className="text-blue-400">showNewCheckout</span>(){'\n'}
        {'}'}
      </code>
    </pre>
  );
}

function RubySnippet() {
  return (
    <pre className="text-slate-300">
      <code>
        <span className="text-purple-400">require</span>{' '}
        <span className="text-emerald-400">&apos;featuregate&apos;</span>{'\n\n'}
        client = <span className="text-blue-400">FeatureGate::Client</span>.new(
        {'\n'}
        {'  '}sdk_key: <span className="text-emerald-400">&apos;sdk-prod-abc123&apos;</span>
        {'\n'}){'\n'}
        client.<span className="text-blue-400">wait_for_initialization</span>{'\n\n'}
        <span className="text-slate-500 italic"># Evaluate a flag for a user</span>{'\n'}
        <span className="text-purple-400">if</span> client.
        <span className="text-blue-400">enabled?</span>(
        <span className="text-emerald-400">&apos;new-checkout&apos;</span>, {'{'}
        {'\n'}
        {'  '}key: <span className="text-emerald-400">&apos;user-123&apos;</span>,{'\n'}
        {'  '}plan: <span className="text-emerald-400">&apos;enterprise&apos;</span>,{'\n'}
        {'}'}){'\n'}
        {'  '}<span className="text-blue-400">show_new_checkout</span>{'\n'}
        <span className="text-purple-400">end</span>
      </code>
    </pre>
  );
}

// ---------------------------------------------------------------------------
// 7. How It Works
// ---------------------------------------------------------------------------

function HowItWorks() {
  const steps = [
    {
      num: '01',
      icon: Code2,
      title: 'Wrap your feature',
      description:
        'Wrap any code path in a feature flag using our lightweight SDK. One line of code, zero performance overhead.',
    },
    {
      num: '02',
      icon: Sliders,
      title: 'Configure targeting',
      description:
        'Use the dashboard to set who gets the feature: everyone, a percentage, specific users, or complex rules.',
    },
    {
      num: '03',
      icon: Rocket,
      title: 'Ship and iterate',
      description:
        'Deploy your code with confidence. Toggle features instantly, roll out to more users, or roll back in seconds.',
    },
  ];

  return (
    <Section id="how-it-works" className="py-20 md:py-28 bg-slate-900/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Three steps to safer releases
          </h2>
          <p className="text-slate-400 text-lg">
            Go from code to controlled rollout in minutes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 relative">
          {/* Connecting line (desktop) */}
          <div className="hidden md:block absolute top-14 left-[20%] right-[20%] h-px border-t-2 border-dashed border-slate-800" />

          {steps.map((step) => (
            <div key={step.num} className="relative text-center">
              <div className="relative z-10 inline-flex flex-col items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-5">
                  <step.icon className="h-5 w-5 text-blue-400" />
                </div>
                <span className="text-xs font-bold text-blue-500/60 tracking-widest uppercase mb-2">
                  Step {step.num}
                </span>
                <h3 className="text-lg font-semibold text-slate-100 mb-2">{step.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// 8. Comparison Table
// ---------------------------------------------------------------------------

function ComparisonTable() {
  const rows = [
    { feature: 'Visual rule builder', fg: true, other: 'partial' as const },
    { feature: 'Percentage rollouts', fg: true, other: 'partial' as const },
    { feature: 'Real-time flag evaluation (SSE)', fg: true, other: false },
    { feature: 'Built-in context tester', fg: true, other: false },
    { feature: 'Full audit log with diffs', fg: true, other: 'partial' as const },
    { feature: 'Segment management', fg: true, other: 'partial' as const },
    { feature: 'Free tier with full features', fg: true, other: false },
    { feature: 'Multi-environment support', fg: true, other: true },
    { feature: 'Open source & self-hosted', fg: true, other: false },
  ];

  return (
    <Section className="py-20 md:py-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Why FeatureGate?
          </h2>
          <p className="text-slate-400 text-lg">
            Full-featured from day one. No artificial limitations.
          </p>
        </div>

        <div className="rounded-xl border border-slate-800/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800/60">
                  <th className="text-left py-4 px-5 font-medium text-slate-400">Feature</th>
                  <th className="py-4 px-5 font-semibold text-blue-400 text-center bg-blue-500/5">
                    FeatureGate
                  </th>
                  <th className="py-4 px-5 font-medium text-slate-500 text-center">Others</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={row.feature}
                    className={cn(
                      'border-b border-slate-800/40',
                      i === rows.length - 1 && 'border-b-0',
                    )}
                  >
                    <td className="py-3.5 px-5 text-slate-300">{row.feature}</td>
                    <td className="py-3.5 px-5 text-center bg-blue-500/5">
                      <Check className="h-4 w-4 text-emerald-400 mx-auto" />
                    </td>
                    <td className="py-3.5 px-5 text-center">
                      {row.other === true ? (
                        <Check className="h-4 w-4 text-slate-500 mx-auto" />
                      ) : row.other === 'partial' ? (
                        <Minus className="h-4 w-4 text-yellow-500/60 mx-auto" />
                      ) : (
                        <X className="h-4 w-4 text-red-500/50 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// 9. Testimonials
// ---------------------------------------------------------------------------

function Testimonials() {
  const testimonials = [
    {
      quote:
        "FeatureGate's rule builder replaced our homegrown flag system in a day. The percentage rollout UI is something our PM team actually understands.",
      name: 'Sarah Chen',
      role: 'Staff Engineer',
      company: 'BuildCo',
      initials: 'SC',
    },
    {
      quote:
        "We went from 'deploy and pray' to controlled rollouts for every release. The audit log alone has saved us hours of debugging.",
      name: 'Marcus Rodriguez',
      role: 'VP Engineering',
      company: 'NovaTech',
      initials: 'MR',
    },
    {
      quote:
        'The context tester is incredible. I can simulate exactly what any user will see before pushing a rule live. No more surprises.',
      name: 'Aisha Patel',
      role: 'Senior Developer',
      company: 'StackOps',
      initials: 'AP',
    },
  ];

  return (
    <Section className="py-20 md:py-28 bg-slate-900/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Teams love FeatureGate
          </h2>
          <p className="text-slate-400 text-lg">
            Hear from engineers who ship with confidence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-6 flex flex-col"
            >
              {/* Stars */}
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-yellow-500/80 text-yellow-500/80" />
                ))}
              </div>

              <p className="text-sm text-slate-300 leading-relaxed flex-1 mb-5">
                &ldquo;{t.quote}&rdquo;
              </p>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-800/60">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/30 to-emerald-500/30 text-xs font-bold text-slate-200 border border-slate-700/40">
                  {t.initials}
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-200">{t.name}</div>
                  <div className="text-xs text-slate-500">
                    {t.role}, {t.company}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// 10. Pricing
// ---------------------------------------------------------------------------

function PricingSection({
  billingPeriod,
  setBillingPeriod,
}: {
  billingPeriod: 'monthly' | 'annual';
  setBillingPeriod: (p: 'monthly' | 'annual') => void;
}) {
  const plans = [
    {
      name: 'Free',
      description: 'For hobby projects and small teams',
      monthly: 0,
      annual: 0,
      features: [
        'Up to 5 team members',
        '10 feature flags',
        '2 environments',
        '1,000 evaluations/day',
        'Community support',
      ],
      cta: 'Get Started',
      highlighted: false,
    },
    {
      name: 'Pro',
      description: 'For growing teams shipping fast',
      monthly: 49,
      annual: 39,
      features: [
        'Unlimited team members',
        'Unlimited feature flags',
        'Unlimited environments',
        '1M evaluations/day',
        'Percentage rollouts',
        'Segments & targeting rules',
        'Audit log',
        'Email support',
      ],
      cta: 'Start Free Trial',
      highlighted: true,
    },
    {
      name: 'Enterprise',
      description: 'For organizations at scale',
      monthly: null,
      annual: null,
      features: [
        'Everything in Pro',
        'Unlimited evaluations',
        'SSO / SAML',
        'SLA guarantee',
        'Dedicated support',
        'On-premise option',
      ],
      cta: 'Contact Sales',
      highlighted: false,
    },
  ];

  return (
    <Section id="pricing" className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-slate-400 text-lg">Start free. Scale as you grow.</p>
        </div>

        {/* Toggle */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <span
            className={cn(
              'text-sm transition-colors',
              billingPeriod === 'monthly' ? 'text-slate-200' : 'text-slate-500',
            )}
          >
            Monthly
          </span>
          <button
            onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'annual' : 'monthly')}
            className={cn(
              'relative h-6 w-11 rounded-full transition-colors',
              billingPeriod === 'annual' ? 'bg-blue-500' : 'bg-slate-700',
            )}
          >
            <div
              className={cn(
                'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
                billingPeriod === 'annual' ? 'translate-x-5' : '',
              )}
            />
          </button>
          <span
            className={cn(
              'text-sm transition-colors',
              billingPeriod === 'annual' ? 'text-slate-200' : 'text-slate-500',
            )}
          >
            Annual{' '}
            <span className="text-emerald-400 text-xs font-medium ml-1">Save 20%</span>
          </span>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                'rounded-2xl border p-7 flex flex-col relative',
                plan.highlighted
                  ? 'border-blue-500/40 bg-blue-500/[0.03] ring-1 ring-blue-500/20 shadow-lg shadow-blue-500/5 md:-mt-2 md:mb-[-8px]'
                  : 'border-slate-800/60 bg-slate-900/40',
              )}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-500 px-3 py-0.5 text-[10px] font-semibold text-white tracking-wide uppercase">
                  Most Popular
                </div>
              )}

              <h3 className="text-lg font-semibold text-slate-100">{plan.name}</h3>
              <p className="text-xs text-slate-500 mt-1 mb-5">{plan.description}</p>

              <div className="mb-6">
                {plan.monthly !== null ? (
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-slate-100 tabular-nums">
                      ${billingPeriod === 'monthly' ? plan.monthly : plan.annual}
                    </span>
                    <span className="text-sm text-slate-500">/month</span>
                  </div>
                ) : (
                  <div className="text-4xl font-bold text-slate-100">Custom</div>
                )}
              </div>

              <ul className="space-y-3 flex-1 mb-7">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-slate-400">
                    <Check className="h-4 w-4 text-emerald-400/70 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href="#"
                className={cn(
                  'block w-full text-center rounded-lg px-4 py-2.5 text-sm font-medium transition-all',
                  plan.highlighted
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25 hover:bg-blue-400 hover:shadow-blue-500/40'
                    : 'border border-slate-700 bg-slate-800/40 text-slate-300 hover:text-white hover:border-slate-600',
                )}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// 11. CTA
// ---------------------------------------------------------------------------

function CTASection() {
  return (
    <Section className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-2xl overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-500 to-emerald-500" />
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />

          <div className="relative px-8 py-16 md:py-20 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
              Start shipping features with confidence
            </h2>
            <p className="text-blue-100/80 text-lg mb-8 max-w-xl mx-auto">
              Free forever for small teams. Set up in under 5 minutes.
            </p>
            <a
              href="#"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg hover:bg-slate-100 transition-colors"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </a>
            <p className="mt-4 text-xs text-blue-200/60">No credit card required</p>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// 12. Footer
// ---------------------------------------------------------------------------

const FOOTER_LINKS = {
  Product: ['Features', 'Pricing', 'Docs', 'Changelog', 'Status'],
  Resources: ['Blog', 'Guides', 'API Reference', 'SDK Downloads'],
  Company: ['About', 'Careers', 'Contact', 'Security'],
  Legal: ['Privacy Policy', 'Terms of Service', 'Cookie Policy'],
};

function Footer() {
  return (
    <footer className="border-t border-slate-800/60 pt-14 pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <a href="#" className="flex items-center gap-2 mb-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-500">
                <Flag className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-bold text-white">FeatureGate</span>
            </a>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Open-source feature flag platform for engineering teams.
            </p>
            {/* Social icons */}
            <div className="flex gap-3">
              {[Github, Twitter].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/40 text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
            <div key={heading}>
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
                {heading}
              </h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter */}
        <div className="border-t border-slate-800/60 pt-8 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-1">Stay up to date</h4>
              <p className="text-xs text-slate-500">
                Product updates and engineering tips. No spam.
              </p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <input
                type="email"
                placeholder="you@company.com"
                className="flex-1 sm:w-56 rounded-lg border border-slate-700/60 bg-slate-800/40 px-3 py-2 text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/40 focus:border-blue-500/40"
              />
              <button className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-400 transition-colors whitespace-nowrap">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="text-xs text-slate-600 text-center">
          &copy; {new Date().getFullYear()} FeatureGate. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
