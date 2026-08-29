import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Check, CheckCircle2, ChevronRight, Clock3, FileText, History, LockKeyhole, LogIn, Mail, Menu, Send, ShieldCheck, Sparkles, UserCheck, X, XCircle } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const samples = [
  {
    label: "Duplicate charge",
    subject: "Charged twice for my subscription",
    body: "Hi team, I was charged twice for my subscription this month ($49). Please help refund the extra charge. I am frustrated because this has happened again.",
  },
  {
    label: "Login issue",
    subject: "I cannot access my account",
    body: "Hello, I have been trying to sign in since this morning but my password reset link is not working. Can you help me get back into my account?",
  },
  {
    label: "Product question",
    subject: "Question about exporting reports",
    body: "Hi support, does the professional plan include report exports? I would like to understand the available options before upgrading.",
  },
];

type AnalysisResult = {
  category: string;
  sentiment: string;
  urgency: string;
  confidence: number;
  draftText: string;
  rationale: string;
  knowledgeContext: string[];
  needsHumanReview: boolean;
};

type ReviewStatus = "in_review" | "approved" | "rejected" | "escalated" | "sent_simulated";

function statusLabel(status: ReviewStatus) {
  return status === "sent_simulated" ? "Sent (simulation)" : status.replace("_", " ");
}

function StatusPill({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "green" | "amber" | "red" }) {
  return <span className={`status-pill status-${tone}`}><span className="status-dot" />{label}</span>;
}

export default function Home() {
  const { user, loading: authLoading, isAuthenticated, logout } = useAuth();
  const [subject, setSubject] = useState(samples[0].subject);
  const [emailText, setEmailText] = useState(samples[0].body);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [draft, setDraft] = useState("");
  const [reviewId, setReviewId] = useState<number | null>(null);
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>("in_review");
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const analyze = trpc.emailAgent.analyze.useMutation();
  const saveReview = trpc.emailAgent.saveReview.useMutation();
  const updateStatus = trpc.emailAgent.updateStatus.useMutation();
  const historyQuery = trpc.emailAgent.history.useQuery(undefined, { enabled: isAuthenticated });
  const utils = trpc.useUtils();

  const selectedSample = useMemo(() => samples.find((sample) => sample.subject === subject), [subject]);

  const handleSample = (sample: typeof samples[number]) => {
    setSubject(sample.subject);
    setEmailText(sample.body);
    setAnalysis(null);
    setDraft("");
    setReviewId(null);
    setReviewStatus("in_review");
  };

  const handleAnalyze = async () => {
    if (emailText.trim().length < 10) {
      toast.error("Paste a little more of the customer email to begin.");
      return;
    }
    try {
      const result = await analyze.mutateAsync({ subject, emailText });
      setAnalysis(result);
      setDraft(result.draftText);
      setReviewStatus("in_review");
      if (isAuthenticated) {
        const saved = await saveReview.mutateAsync({
          subject,
          emailText,
          category: result.category,
          sentiment: result.sentiment,
          urgency: result.urgency,
          confidence: result.confidence,
          draftText: result.draftText,
          knowledgeContext: result.knowledgeContext,
          status: "in_review",
        });
        setReviewId(saved.id);
        await utils.emailAgent.history.invalidate();
      }
      toast.success("Analysis complete — review the suggested draft before approving.");
    } catch {
      toast.error("The agent could not complete this analysis. Please try again or review manually.");
    }
  };

  const handleDecision = async (nextStatus: Exclude<ReviewStatus, "in_review">, message: string) => {
    setReviewStatus(nextStatus);
    if (isAuthenticated && reviewId) {
      try {
        await updateStatus.mutateAsync({ id: reviewId, status: nextStatus, draftText: draft });
        await utils.emailAgent.history.invalidate();
      } catch {
        toast.error("We could not save this review action. Please try again.");
        return;
      }
    }
    toast.success(message);
  };

  const confidence = analysis ? Math.round(analysis.confidence * 100) : 0;
  const isBusy = analyze.isPending || saveReview.isPending || updateStatus.isPending;

  return (
    <div className="min-h-screen bg-[#f7f8fb] text-[#102033]">
      <header className="site-header">
        <div className="shell header-inner">
          <a href="#top" className="brand" aria-label="Email Support Agent home">
            <span className="brand-mark"><Mail size={17} strokeWidth={2.5} /></span>
            <span>Email Support Agent</span>
          </a>
          <button className="mobile-menu" aria-label="Open navigation" onClick={() => setShowMobileNav((open) => !open)}><Menu size={22} /></button>
          <nav className={`main-nav ${showMobileNav ? "nav-open" : ""}`} aria-label="Main navigation">
            <a href="#how-it-works" onClick={() => setShowMobileNav(false)}>How it works</a>
            <a href="#trust" onClick={() => setShowMobileNav(false)}>Trust by design</a>
            <a href="#workspace" onClick={() => setShowMobileNav(false)}>Demo</a>
            {authLoading ? <span className="nav-loading" /> : isAuthenticated ? (
              <button className="account-chip" onClick={logout} title="Sign out">
                <span className="avatar">{(user?.name || user?.email || "U").charAt(0).toUpperCase()}</span>
                <span>{user?.name?.split(" ")[0] || "Account"}</span>
              </button>
            ) : <Button variant="outline" className="nav-login" onClick={() => startLogin()}><LogIn size={15} /> Sign in</Button>}
          </nav>
        </div>
      </header>

      <main id="top">
        <section className="hero-section">
          <div className="shell hero-grid">
            <div className="hero-copy">
              <div className="eyebrow"><span className="eyebrow-line" /> AI support, with a human at the helm</div>
              <h1>Move from crowded inboxes to <em>confident replies.</em></h1>
              <p className="hero-lede">Email Support Agent reads the signal in every message, grounds the next step in policy, and gives support teams an editable first draft — never an unchecked send.</p>
              <div className="hero-actions">
                <a className="primary-cta" href="#workspace">Try the demo <ArrowRight size={17} /></a>
                <a className="text-link" href="#how-it-works">See how it works <ChevronRight size={15} /></a>
              </div>
              <div className="hero-proof"><ShieldCheck size={17} /> <span>Human approval is a product feature, not a footnote.</span></div>
            </div>
            <div className="hero-visual" aria-label="Illustration of an email moving through analysis, policy context, and human approval">
              <div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" />
              <div className="visual-card email-card">
                <div className="visual-card-head"><span className="tiny-icon pink"><Mail size={13} /></span><span>INCOMING EMAIL</span><span className="visual-time">09:42</span></div>
                <strong>Charged twice for my subscription</strong>
                <p>“Please help refund the extra charge. I am frustrated…”</p>
              </div>
              <div className="visual-card analysis-card">
                <div className="visual-card-head"><span className="tiny-icon blue"><Sparkles size={13} /></span><span>AGENT ANALYSIS</span></div>
                <div className="mini-metrics"><span><b>Billing</b><small>intent</small></span><span><b>Medium</b><small>urgency</small></span><span><b>78%</b><small>confidence</small></span></div>
              </div>
              <div className="visual-card approval-card"><span className="approval-check"><Check size={15} /></span><span><b>Human approved</b><small>ready for simulation</small></span></div>
              <span className="sparkle sparkle-a">✦</span><span className="sparkle sparkle-b">✦</span>
            </div>
          </div>
        </section>

        <section className="signal-strip" id="trust">
          <div className="shell signal-grid">
            <div className="signal-intro"><span className="eyebrow-line" /><p>Designed for support teams who need speed <em>and</em> accountability.</p></div>
            <div className="signal-item"><span className="signal-number">01</span><div><b>Grounded</b><span>Relevant policy context is visible before review.</span></div></div>
            <div className="signal-item"><span className="signal-number">02</span><div><b>Editable</b><span>Agents stay in the loop and own the final words.</span></div></div>
            <div className="signal-item"><span className="signal-number">03</span><div><b>Auditable</b><span>Every signed-in demo review keeps a clear status trail.</span></div></div>
          </div>
        </section>

        <section className="how-section" id="how-it-works">
          <div className="shell">
            <div className="section-heading"><div><div className="eyebrow">A calm workflow for a busy inbox</div><h2>Make the next response <em>obvious.</em></h2></div><p>Three moves turn an unstructured email into a reviewable support decision.</p></div>
            <div className="steps-grid">
              <article className="step-card"><span className="step-index">01</span><div className="step-icon"><FileText size={21} /></div><h3>Read the message</h3><p>Paste an email and the agent identifies intent, emotional signal, urgency, and its confidence in the read.</p></article>
              <article className="step-card"><span className="step-index">02</span><div className="step-icon"><Sparkles size={21} /></div><h3>Ground the draft</h3><p>Relevant support context appears beside a concise, professional reply that is ready for a human edit.</p></article>
              <article className="step-card"><span className="step-index">03</span><div className="step-icon"><UserCheck size={21} /></div><h3>Keep the decision</h3><p>Approve, reject, or escalate. In this public demo, sending is always a clearly labeled simulation.</p></article>
            </div>
          </div>
        </section>

        <section className="workspace-section" id="workspace">
          <div className="shell">
            <div className="workspace-intro"><div><div className="eyebrow">Interactive workspace</div><h2>See the agent <em>think.</em></h2></div><div className="demo-badge"><span className="live-dot" /> Public demo <span className="divider-dot" /> Sending simulated</div></div>
            <div className="workspace-grid">
              <section className="workspace-panel input-panel" aria-labelledby="email-input-title">
                <div className="panel-topline"><div><span className="panel-kicker">01 / INTAKE</span><h3 id="email-input-title">Customer email</h3></div><span className="panel-count">{emailText.length.toLocaleString()} chars</span></div>
                <div className="sample-row"><span>Try a sample</span>{samples.map((sample) => <button key={sample.label} className={`sample-chip ${selectedSample?.label === sample.label ? "sample-selected" : ""}`} onClick={() => handleSample(sample)}>{sample.label}</button>)}</div>
                <label className="field-label" htmlFor="subject">Subject</label><Input id="subject" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Customer email subject" />
                <label className="field-label" htmlFor="email-body">Message</label><Textarea id="email-body" value={emailText} onChange={(event) => setEmailText(event.target.value)} placeholder="Paste the customer email here…" className="email-textarea" aria-describedby="email-help" />
                <div className="panel-footer"><span id="email-help"><LockKeyhole size={13} /> Your demo text is used only for this analysis.</span><Button className="analyze-button" onClick={handleAnalyze} disabled={isBusy}>{isBusy ? <><span className="button-spinner" /> Analyzing…</> : <><Sparkles size={16} /> Analyze email</>}</Button></div>
              </section>

              <section className="workspace-panel output-panel" aria-labelledby="agent-output-title">
                <div className="panel-topline"><div><span className="panel-kicker">02 / REVIEW</span><h3 id="agent-output-title">Agent recommendation</h3></div><StatusPill label={reviewStatus === "in_review" ? "Awaiting review" : statusLabel(reviewStatus)} tone={reviewStatus === "rejected" ? "red" : reviewStatus === "escalated" ? "amber" : reviewStatus === "sent_simulated" ? "green" : "neutral"} /></div>
                {!analysis ? <div className="empty-state"><div className="empty-icon"><Sparkles size={22} /></div><h4>Your review surface is ready.</h4><p>Analyze a customer email to see the structured read, policy context, and editable reply appear here.</p><div className="empty-rule"><span /> <small>human-reviewed by design</small> <span /></div></div> : <div className="result-content">
                  <div className="metric-row"><div className="metric-cell"><span>Intent</span><b>{analysis.category}</b></div><div className="metric-cell"><span>Sentiment</span><b>{analysis.sentiment}</b></div><div className="metric-cell"><span>Urgency</span><b className={analysis.urgency === "High" ? "text-red" : analysis.urgency === "Medium" ? "text-amber" : ""}>{analysis.urgency}</b></div><div className="metric-cell"><span>Confidence</span><b>{confidence}%</b></div></div>
                  {analysis.needsHumanReview && <div className="review-alert"><AlertTriangle size={16} /><span><b>Priority human review suggested.</b> This case may be uncertain or emotionally escalated.</span></div>}
                  <div className="context-block"><div className="block-label"><span>Knowledge context</span><span className="source-count">{analysis.knowledgeContext.length} source{analysis.knowledgeContext.length === 1 ? "" : "s"}</span></div>{analysis.knowledgeContext.length ? <div className="context-tags">{analysis.knowledgeContext.map((source) => <span key={source}><CheckCircle2 size={13} />{source}</span>)}</div> : <p className="muted-copy">No matching approved context was found. Keep the case with a human.</p>}</div>
                  <Separator />
                  <div className="draft-block"><div className="block-label"><span>Suggested reply <small>editable</small></span><span className="draft-status"><span className="status-dot" /> Draft</span></div><Textarea value={draft} onChange={(event) => setDraft(event.target.value)} className="draft-textarea" aria-label="Editable suggested reply" /><p className="rationale"><Sparkles size={13} /> {analysis.rationale}</p></div>
                  <div className="decision-row"><Button className="decision-approve" onClick={() => handleDecision("sent_simulated", "Approved — send simulation recorded.")} disabled={isBusy || reviewStatus === "sent_simulated"}><Send size={15} /> Approve & simulate send</Button><Button variant="outline" className="decision-reject" onClick={() => handleDecision("rejected", "Draft rejected — no message was sent.")} disabled={isBusy}><XCircle size={15} /> Reject</Button><Button variant="outline" className="decision-escalate" onClick={() => handleDecision("escalated", "Case escalated — no message was sent.")} disabled={isBusy}><AlertTriangle size={15} /> Escalate</Button></div>
                  <div className="simulation-note"><ShieldCheck size={14} /><span><b>Simulation only.</b> This demo never delivers a real email.</span></div>
                </div>}
              </section>
            </div>
          </div>
        </section>

        <section className="history-section">
          <div className="shell history-shell">
            <div className="history-copy"><div className="eyebrow">Private by default</div><h2>Your review trail, <em>when you need it.</em></h2><p>Sign in to keep a protected history of demo analyses, edited drafts, decisions, and timestamps. Visitors can explore the workspace without an account; only signed-in users can save and view history.</p>{isAuthenticated ? <Button variant="outline" className="history-toggle" onClick={() => setShowHistory((open) => !open)}><History size={16} /> {showHistory ? "Hide history" : "View my review history"}</Button> : <Button variant="outline" className="history-toggle" onClick={() => startLogin()}><LogIn size={16} /> Sign in to save history</Button>}</div>
            <div className="history-visual"><div className="history-lock"><LockKeyhole size={20} /></div><div className="history-line" /><div className="history-event"><span className="event-marker green" /><div><b>Approved — simulation</b><small>Review action recorded</small></div><time>now</time></div><div className="history-line" /><div className="history-event"><span className="event-marker" /><div><b>Draft created</b><small>Policy context attached</small></div><time>09:42</time></div></div>
          </div>
          {isAuthenticated && showHistory && <div className="shell history-list-wrap"><div className="history-list-head"><h3>Signed-in review history</h3><span>{historyQuery.data?.length ?? 0} saved review{historyQuery.data?.length === 1 ? "" : "s"}</span></div>{historyQuery.isLoading ? <div className="history-loading">Loading your protected review history…</div> : historyQuery.data?.length ? <div className="history-list">{historyQuery.data.map((item) => <div className="history-row" key={item.id}><div className="history-row-icon"><Mail size={15} /></div><div className="history-row-main"><b>{item.subject || "Untitled customer email"}</b><span>{item.category} · {item.sentiment} · {item.urgency}</span></div><StatusPill label={statusLabel(item.status as ReviewStatus)} tone={item.status === "sent_simulated" || item.status === "approved" ? "green" : item.status === "rejected" ? "red" : item.status === "escalated" ? "amber" : "neutral"} /><time>{new Date(item.createdAt).toLocaleString()}</time></div>)}</div> : <div className="history-empty"><History size={18} /> Analyze a demo email while signed in and it will appear here.</div>}</div>}
        </section>
      </main>

      <footer className="site-footer"><div className="shell footer-inner"><div className="brand"><span className="brand-mark"><Mail size={16} /></span><span>Email Support Agent</span></div><span>AI copilot · human decision · simulated send</span><span>Built as an internship project</span></div></footer>
    </div>
  );
}
