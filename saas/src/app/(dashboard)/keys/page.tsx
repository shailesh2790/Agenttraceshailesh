import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { KeysManager } from "@/components/keys/KeysManager";

export default async function KeysPage() {
  const session = await auth();
  const userId  = session!.user.id;

  const keys = await prisma.apiKey.findMany({
    where: { userId },
    select: {
      id: true, name: true, keyPrefix: true,
      createdAt: true, lastUsedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">API Keys</h1>
        <p className="text-sm text-gray-500">
          Use API keys to upload traces programmatically from your agent integrations.
        </p>
      </div>

      {/* Usage snippet */}
      <div className="bg-gray-900 text-gray-100 rounded-xl p-4 font-mono text-xs mb-8 overflow-x-auto">
        <div className="text-gray-400 mb-1"># Upload a trace from your agent</div>
        <div>
          <span className="text-green-400">curl</span>
          {" "}-X POST https://your-domain/api/traces{" "}
          <span className="text-yellow-300">\</span>
        </div>
        <div className="pl-4">
          -H <span className="text-orange-300">{'"Authorization: Bearer at_your_key_here"'}</span>
          {" "}<span className="text-yellow-300">\</span>
        </div>
        <div className="pl-4">
          -H <span className="text-orange-300">{'"Content-Type: application/json"'}</span>
          {" "}<span className="text-yellow-300">\</span>
        </div>
        <div className="pl-4">
          -d <span className="text-orange-300">{"'@run.atrace'"}</span>
        </div>
      </div>

      <KeysManager initialKeys={keys} />
    </div>
  );
}
