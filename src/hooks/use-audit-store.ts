import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Finding, Activity } from "@/types/audit";
import {
  audits as initialAudits,
  findings as initialFindings,
  wbsCases as initialWbsCases,
  riskRegister as initialRiskRegister,
  activities as initialActivities,
  documents as initialDocuments,
} from "@/lib/mock-data";

export type Audit = {
  id: string;
  name: string;
  branch: string;
  lead: string;
  status: string;
  progress: number;
  risk: string;
  period: string;
  dueDate: string;
};

export type WBSCase = {
  id: string;
  title: string;
  category: string;
  score: number;
  status: string;
  reporter: string;
  age: string;
};

export type Risk = {
  id: string;
  name: string;
  category: string;
  likelihood: number;
  impact: number;
  owner: string;
  mitigation: number;
};

export type DocumentItem = {
  id: string;
  name: string;
  type: string;
  version: string;
  owner: string;
  modified: string;
  fileUrl?: string;
  fileSize?: string;
  fileType?: string;
  buScope?: string;
};

export type MonthlyReport = {
  id: string;
  reportMonth: string;
  buCode: string;
  status: string;
  submitter: string | null;
  submittedAt: string | null;
};

type AuditStore = {
  audits: Audit[];
  findings: Finding[];
  wbsCases: WBSCase[];
  riskRegister: Risk[];
  activities: Activity[];
  documents: DocumentItem[];
  reports: MonthlyReport[];

  fetchInitialData: () => Promise<void>;

  addAudit: (audit: Omit<Audit, "id" | "progress">) => Promise<void>;
  addFinding: (finding: Omit<Finding, "id" | "progress">) => Promise<void>;
  addWBSCase: (wbsCase: Omit<WBSCase, "id" | "age" | "score"> & { score?: number }) => Promise<void>;
  addRisk: (risk: Omit<Risk, "id" | "mitigation">) => Promise<void>;
  addDocument: (doc: DocumentItem) => Promise<void>;
  addActivity: (activity: Omit<Activity, "time">) => Promise<void>;
  
  deleteDocument: (id: string) => void;
  deleteAudit: (id: string) => Promise<void>;
  updateAudit: (id: string, updatedFields: Partial<Audit>) => Promise<void>;
  updateFindingProgress: (id: string, progress: number) => Promise<void>;
  updateFindingStatus: (id: string, status: Finding["status"]) => Promise<void>;
  approveFinding: (id: string) => Promise<void>;
  updateAuditStatus: (id: string, status: string) => void;
  updateAuditProgress: (id: string, progress: number) => void;
  resetAll: () => void;
  language: "en" | "id";
  setLanguage: (lang: "en" | "id") => void;
  isAiModeEnabled: boolean;
  toggleAiMode: () => void;
};

export const useAuditStore = create<AuditStore>()(
  persist(
    (set, get) => ({
      audits: initialAudits,
      findings: initialFindings,
      wbsCases: initialWbsCases,
      riskRegister: initialRiskRegister,
      activities: initialActivities,
      documents: initialDocuments,
      reports: [],
      language: "en",
      isAiModeEnabled: false,
      
      toggleAiMode: () => set((state) => ({ isAiModeEnabled: !state.isAiModeEnabled })),
      setLanguage: (language) => set({ language }),

      fetchInitialData: async () => {
        try {
          const [auditsRes, findingsRes, wbsRes, risksRes, activitiesRes, docsRes, reportsRes] = await Promise.all([
            fetch("/api/audits", { cache: 'no-store' }),
            fetch("/api/findings", { cache: 'no-store' }),
            fetch("/api/wbs", { cache: 'no-store' }),
            fetch("/api/risks", { cache: 'no-store' }),
            fetch("/api/activities", { cache: 'no-store' }),
            fetch("/api/documents", { cache: 'no-store' }),
            fetch("/api/reports", { cache: 'no-store' }).catch(() => ({ ok: false, json: () => [] })),
          ]);
          
          if (auditsRes.ok) set({ audits: await auditsRes.json() });
          if (findingsRes.ok) set({ findings: await findingsRes.json() });
          if (wbsRes.ok) set({ wbsCases: await wbsRes.json() });
          if (risksRes.ok) set({ riskRegister: await risksRes.json() });
          if (activitiesRes.ok) set({ activities: await activitiesRes.json() });
          if (docsRes.ok) set({ documents: await docsRes.json() });
          if (reportsRes && reportsRes.ok) set({ reports: await reportsRes.json() });
        } catch (error) {
          console.error("Error fetching initial data:", error);
        }
      },

      addAudit: async (audit) => {
        const id = `AUD-${audit.branch.split(" ").map((w) => w[0]).join("").toUpperCase()}-${Math.floor(10 + Math.random() * 90)}`;
        const newAudit = { ...audit, id, progress: 0 };
        
        try {
          await fetch("/api/audits", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newAudit),
          });
          
          const newActivity: Activity = {
            title: "New Audit Planned",
            detail: `Audit "${audit.name}" scheduled for ${audit.branch}.`,
            time: "Just now",
            tone: "cyan",
          };
          
          await get().addActivity(newActivity);
          set((state) => ({ audits: [newAudit, ...state.audits] }));
        } catch (error) {
          console.error("Failed to add audit:", error);
        }
      },

      addFinding: async (finding) => {
        const id = `FIN-2026-${Date.now().toString().slice(-4)}-${Math.floor(10 + Math.random() * 90)}`;
        const newFinding = { ...finding, id, progress: 0, sla: "30 days left" };
        
        // Optimistic UI update for the demo
        set((state) => ({ findings: [newFinding, ...state.findings] }));
        
        try {
          await fetch("/api/findings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...newFinding, risk: 0 }),
          });
          
          const newActivity: Activity = {
            title: "New Finding Logged",
            detail: `[${newFinding.id}] ${finding.severity} finding: "${finding.title}"`,
            time: "Just now",
            tone: finding.severity === "Critical" || finding.severity === "High" ? "red" : "amber",
          };
          
          await get().addActivity(newActivity);
        } catch (error) {
          console.error("Failed to post finding to API (demo mode continues):", error);
        }
      },

      addWBSCase: async (wbsCase) => {
        const score = wbsCase.score ?? Math.floor(40 + Math.random() * 55);
        const id = `WBS-${Math.floor(800 + Math.random() * 199)}`;
        const newCase = { ...wbsCase, id, score, age: "Just now" };
        
        try {
          await fetch("/api/wbs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newCase),
          });
          
          const newActivity: Activity = {
            title: "WBS Report Intake",
            detail: `Case [${newCase.id}] filed: "${wbsCase.title}" classified under ${wbsCase.category}.`,
            time: "Just now",
            tone: score >= 85 ? "red" : "indigo",
          };
          
          await get().addActivity(newActivity);
          set((state) => ({ wbsCases: [newCase, ...state.wbsCases] }));
        } catch (error) {
          console.error("Failed to add WBS case:", error);
        }
      },

      addRisk: async (risk) => {
        const id = `RSK-${Math.floor(10 + Math.random() * 89)}`;
        const newRisk = { ...risk, id, mitigation: 0 };
        
        try {
          await fetch("/api/risks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newRisk),
          });
          
          const newActivity: Activity = {
            title: "Risk Registered",
            detail: `Risk [${newRisk.id}] added to register: "${risk.name}" owned by ${risk.owner}.`,
            time: "Just now",
            tone: "amber",
          };
          
          await get().addActivity(newActivity);
          set((state) => ({ riskRegister: [newRisk, ...state.riskRegister] }));
        } catch (error) {
          console.error("Failed to add risk:", error);
        }
      },

      addDocument: async (doc) => {
        try {
          await fetch("/api/documents", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(doc),
          });
          
          const newActivity: Activity = {
            title: "Document Uploaded",
            detail: `File "${doc.name}" uploaded to Document Center.`,
            time: "Just now",
            tone: "emerald",
          };
          
          await get().addActivity(newActivity);
          set((state) => ({ documents: [doc, ...state.documents] }));
        } catch (error) {
          console.error("Failed to add document:", error);
        }
      },

      addActivity: async (act) => {
        const newActivity = { ...act, time: "Just now" };
        try {
          await fetch("/api/activities", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newActivity),
          });
          set((state) => ({
            activities: [newActivity, ...state.activities.slice(0, 9)],
          }));
        } catch (error) {
          console.error("Failed to add activity:", error);
        }
      },

      deleteDocument: (id) =>
        set((state) => ({
          documents: state.documents.filter((d) => d.id !== id),
        })),

      updateFindingProgress: async (id, progress) => {
        try {
          const status = progress === 100 ? "Resolved" : undefined;
          await fetch("/api/findings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, progress, status }),
          });
          
          set((state) => ({
            findings: state.findings.map((f) =>
              f.id === id ? { ...f, progress, status: status || f.status } : f
            ),
          }));
        } catch (error) {
          console.error("Failed to update finding progress:", error);
        }
      },

      updateFindingStatus: async (id, status) => {
        try {
          await fetch("/api/findings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, status }),
          });
          
          set((state) => ({
            findings: state.findings.map((f) => (f.id === id ? { ...f, status } : f)),
          }));
        } catch (error) {
          console.error("Failed to update finding status:", error);
        }
      },

      approveFinding: async (id) => {
        set((state) => ({
          findings: state.findings.map((f) =>
            f.id === id ? { ...f, status: "Open" } : f
          ),
        }));
      },

      updateAuditStatus: (id, status) =>
        set((state) => ({
          audits: state.audits.map((a) =>
            a.id === id ? { ...a, status } : a
          ),
        })),

      updateAuditProgress: (id, progress) =>
        set((state) => ({
          audits: state.audits.map((a) => (a.id === id ? { ...a, progress } : a)),
        })),

      deleteAudit: async (id) => {
        const auditToDelete = get().audits.find((a) => a.id === id);
        set((state) => ({
          audits: state.audits.filter((a) => a.id !== id),
        }));
        try {
          await fetch(`/api/audits?id=${encodeURIComponent(id)}`, {
            method: "DELETE",
          });
          const newActivity: Activity = {
            title: "Audit Assignment Deleted",
            detail: `Audit "${auditToDelete?.name || id}" has been removed.`,
            time: "Just now",
            tone: "red",
          };
          await get().addActivity(newActivity);
        } catch (error) {
          console.error("Failed to delete audit:", error);
        }
      },

      updateAudit: async (id, updatedFields) => {
        set((state) => ({
          audits: state.audits.map((a) => (a.id === id ? { ...a, ...updatedFields } : a)),
        }));
        try {
          await fetch("/api/audits", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, ...updatedFields }),
          });
        } catch (error) {
          console.error("Failed to update audit:", error);
        }
      },

      resetAll: () =>
        set({
          audits: initialAudits,
          findings: initialFindings,
          wbsCases: initialWbsCases,
          riskRegister: initialRiskRegister,
          activities: initialActivities,
          documents: initialDocuments,
        }),
    }),
    {
      name: "audit-storage-v8",
    }
  )
);
