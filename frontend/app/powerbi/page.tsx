"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { LayoutDashboard, ExternalLink, AlertCircle } from "lucide-react";

export default function PowerBIPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi<any>("/api/powerbi/embed-config")
      .then(setConfig)
      .catch(() => setConfig({ configured: false }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-steeves-muted">Loading Power BI configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="vz-title">Power BI Dashboard</h1>
        <p className="vz-subtitle mt-1">
          Live operational dashboards from Steeves and Associates
        </p>
      </div>

      {config?.configured ? (
        /* Embedded Power BI report */
        <div className="vz-card overflow-hidden">
          <iframe
            src={config.embed_url}
            width="100%"
            height="700"
            frameBorder="0"
            allowFullScreen
            className="w-full"
          />
        </div>
      ) : (
        /* Setup guide when Power BI is not yet configured */
        <div className="vz-card p-8">
          <div className="max-w-lg mx-auto text-center">
            <AlertCircle className="mx-auto text-steeves-warning mb-4" size={40} />
            <h2 className="text-lg font-semibold text-steeves-ink mb-2">
              Power BI Not Configured Yet
            </h2>
            <p className="text-sm text-steeves-muted mb-6">
              Connect your Power BI workspace to see live dashboards here.
            </p>

            <div className="text-left bg-steeves-light rounded-lg p-5 text-sm space-y-3 border border-steeves-border">
              <p className="font-medium text-steeves-ink">Setup Steps:</p>
              <div className="space-y-2 text-steeves-muted">
                <p>
                  1. Register an app in Azure Entra ID (formerly Azure AD)
                </p>
                <p>
                  2. Grant the app Power BI Service permissions
                </p>
                <p>
                  3. Get the report embed URL from Power BI Service
                </p>
                <p>
                  4. Add credentials to <code className="bg-steeves-border px-1 rounded">backend/.env</code>:
                </p>
                <pre className="bg-[#1f2a4d] text-[#9de7d4] p-3 rounded text-xs overflow-x-auto">
{`POWERBI_TENANT_ID=your_tenant_id
POWERBI_CLIENT_ID=your_client_id
POWERBI_CLIENT_SECRET=your_secret
POWERBI_WORKSPACE_ID=your_workspace_id
POWERBI_EMBED_URL=your_report_url`}
                </pre>
                <p>5. Restart the backend server</p>
              </div>
            </div>

            <a
              href="https://learn.microsoft.com/en-us/power-bi/developer/embedded/embed-sample-for-customers"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-4 text-sm text-steeves-blue hover:underline"
            >
              <ExternalLink size={14} />
              Microsoft Embed Documentation
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
