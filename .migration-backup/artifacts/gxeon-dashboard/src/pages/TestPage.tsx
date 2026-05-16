import { useEffect, useState } from "react";
import { Link } from "wouter";

export default function TestPage() {
  const [envStatus, setEnvStatus] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setEnvStatus({
      VITE_SUPABASE_URL: !!import.meta.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
      VITE_API_BASE: !!import.meta.env.VITE_API_BASE,
    });
  }, []);

  if (!mounted) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen p-8 bg-background text-foreground">
      <h1 className="text-2xl font-bold mb-6">GXEON Dashboard — Diagnostics</h1>

      <div className="space-y-4 max-w-md">
        <h2 className="text-lg font-semibold">Environment Variables</h2>
        {Object.entries(envStatus).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between p-3 bg-card rounded border">
            <span className="text-sm font-mono">{key}</span>
            <span
              className={`px-2 py-1 rounded text-xs ${
                value ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
              }`}
            >
              {value ? "SET" : "MISSING"}
            </span>
          </div>
        ))}

        <div className="mt-8 p-4 bg-card rounded border">
          <h3 className="font-semibold mb-2">Next Steps</h3>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>1. Check if all env vars are marked as SET</li>
            <li>2. If any are MISSING, add them in Replit Secrets</li>
            <li>3. Restart the workflow after adding variables</li>
          </ul>
        </div>

        <Link href="/" className="inline-block mt-4 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
