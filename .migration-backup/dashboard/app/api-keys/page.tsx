"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Key, RefreshCw, AlertCircle, Copy, Check } from "lucide-react";

type ApiKey = {
  id: string;
  key_value: string;
  tier: string;
  status: string;
  actor_code?: string;
  rate_limit: number;
  created_at: string;
  expires_at?: string;
  last_used_at?: string;
};

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function fetchApiKeys() {
    setLoading(true);
    setError(null);

    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!url || !key) {
        throw new Error("Supabase environment variables not configured");
      }

      const supabase = createClient(url, key);

      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setApiKeys(data || []);
    } catch (err) {
      console.error("[API Keys] Error:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch API keys");
    } finally {
      setLoading(false);
    }
  }

  async function toggleKeyStatus(keyId: string, currentStatus: string) {
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!url || !key) return;

      const supabase = createClient(url, key);

      const newStatus = currentStatus === "active" ? "inactive" : "active";

      const { error } = await supabase
        .from("api_keys")
        .update({ status: newStatus })
        .eq("id", keyId);

      if (error) throw error;

      await fetchApiKeys();
    } catch (err) {
      console.error("[API Keys] Toggle error:", err);
    }
  }

  function copyToClipboard(keyValue: string, id: string) {
    navigator.clipboard.writeText(keyValue);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function maskKey(key: string): string {
    if (key.length <= 12) return key;
    return `${key.substring(0, 8)}...${key.substring(key.length - 4)}`;
  }

  useEffect(() => {
    fetchApiKeys();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const activeKeys = apiKeys.filter((k) => k.status === "active").length;
  const inactiveKeys = apiKeys.filter((k) => k.status === "inactive").length;
  const expiredKeys = apiKeys.filter((k) => {
    if (!k.expires_at) return false;
    return new Date(k.expires_at) < new Date();
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
          <p className="text-muted-foreground">
            Manage API access keys and their permissions
          </p>
        </div>
        <Button onClick={fetchApiKeys} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Keys</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apiKeys.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <div className="w-2 h-2 rounded-full bg-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{activeKeys}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{inactiveKeys}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <div className="w-2 h-2 rounded-full bg-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{expiredKeys}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API Key Management</CardTitle>
        </CardHeader>
        <CardContent>
          {apiKeys.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No API keys found. Keys are generated automatically upon payment.
            </p>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-sm bg-muted px-2 py-1 rounded">
                        {maskKey(key.key_value)}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(key.key_value, key.id)}
                      >
                        {copiedId === key.id ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Badge
                        variant={key.status === "active" ? "default" : "secondary"}
                        className={
                          key.status === "active"
                            ? "bg-green-500/10 text-green-500"
                            : ""
                        }
                      >
                        {key.status}
                      </Badge>
                      <Badge variant="outline">{key.tier}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Actor: {key.actor_code || "N/A"} • Rate: {key.rate_limit}/min
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Created: {new Date(key.created_at).toLocaleDateString('pt-BR')}
                      {key.expires_at && (
                        <> • Expires: {new Date(key.expires_at).toLocaleDateString('pt-BR')}</>
                      )}
                    </p>
                  </div>
                  <Button
                    variant={key.status === "active" ? "destructive" : "default"}
                    size="sm"
                    onClick={() => toggleKeyStatus(key.id, key.status)}
                  >
                    {key.status === "active" ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
