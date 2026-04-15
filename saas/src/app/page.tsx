import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <span className="font-mono font-semibold text-gray-900 tracking-tight">
          AgentTrace
        </span>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Sign in
          </Link>
          <Link
            href="/register"
            className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Get started free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 text-xs font-medium px-3 py-1.5 rounded-full mb-6 border border-green-200">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
          Open standard · v0.2.0
        </div>
        <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6 tracking-tight">
          See exactly what your
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">
            AI agents are doing
          </span>
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
          Upload <code className="font-mono text-sm bg-gray-100 px-1.5 py-0.5 rounded">.atrace</code> files from any agent framework.
          Visualize reasoning chains, tool calls, and handoffs in one place.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            href="/register"
            className="bg-gray-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-700 transition-colors"
          >
            Start for free
          </Link>
          <Link
            href="https://github.com/shailesh2790/Agenttraceshailesh"
            target="_blank"
            className="text-gray-500 px-6 py-3 rounded-xl font-medium border border-gray-200 hover:border-gray-400 transition-colors"
          >
            View on GitHub →
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: "◎",
              title: "Upload & Store",
              desc: "Drag and drop .atrace files or push directly from your agent via API key.",
              color: "text-green-600 bg-green-50",
            },
            {
              icon: "◌",
              title: "Visualize Steps",
              desc: "See every think step, tool call, handoff, and error in a timeline view.",
              color: "text-indigo-600 bg-indigo-50",
            },
            {
              icon: "⬡",
              title: "SDK Integration",
              desc: "One-line wrappers for Anthropic, LangChain, and CrewAI. More coming.",
              color: "text-amber-600 bg-amber-50",
            },
            {
              icon: "↗",
              title: "Framework Agnostic",
              desc: "The .atrace format is an open standard. Works with any AI framework.",
              color: "text-purple-600 bg-purple-50",
            },
            {
              icon: "≋",
              title: "Token Tracking",
              desc: "Monitor token consumption across runs to optimize cost and performance.",
              color: "text-blue-600 bg-blue-50",
            },
            {
              icon: "⊕",
              title: "Projects",
              desc: "Organize traces by project or agent to keep your workspace tidy.",
              color: "text-rose-600 bg-rose-50",
            },
          ].map((f) => (
            <div key={f.title} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg font-mono mb-3 ${f.color}`}>
                {f.icon}
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-lg mx-auto px-6 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Simple pricing</h2>
        <p className="text-gray-500 mb-8">Free while in beta.</p>
        <div className="bg-white border-2 border-gray-900 rounded-2xl p-8">
          <div className="text-4xl font-bold text-gray-900 mb-1">Free</div>
          <div className="text-gray-500 text-sm mb-6">No credit card required</div>
          <ul className="text-sm text-gray-600 space-y-3 mb-8 text-left">
            {[
              "Unlimited trace uploads",
              "Full trace viewer",
              "API key access",
              "Project organization",
              "Open standard — export anytime",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <span className="text-green-500 font-bold">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <Link
            href="/register"
            className="w-full block bg-gray-900 text-white py-3 rounded-xl font-medium hover:bg-gray-700 transition-colors"
          >
            Create free account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-6 py-8 text-center">
        <p className="text-xs text-gray-400">
          AgentTrace open standard ·{" "}
          <a
            href="https://github.com/shailesh2790/Agenttraceshailesh"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-600 transition-colors"
          >
            GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}
