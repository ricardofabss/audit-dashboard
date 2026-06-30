"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { z } from "zod";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy, FileText, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { formatSuratTugasNumber, splitLines } from "@/lib/surat-tugas";
import { businessUnits } from "@/lib/business-units";
import { useAuditStore } from "@/hooks/use-audit-store";
import { useTranslation } from "@/hooks/use-translation";

const memberSchema = z.object({
  fullName: z.string().min(2, "Nama wajib diisi"),
  position: z.string().min(2, "Jabatan wajib diisi"),
});

const taskOrderSchema = z
  .object({
    businessUnit: z.string().min(2, "Business unit wajib diisi"),
    branch: z.string().min(2, "Cabang/area wajib diisi"),
    auditType: z.string().min(2, "Jenis penugasan wajib diisi"),
    periodStart: z.string().min(1, "Periode awal wajib diisi"),
    periodEnd: z.string().min(1, "Periode akhir wajib diisi"),
    coordinator: memberSchema,
    members: z.array(memberSchema).min(1, "Minimal ada 1 anggota"),
    objectives: z.string().optional(),
    notes: z.string().optional(),
    hasExternalTaskOrder: z.boolean().default(false),
    externalFileName: z.string().optional(),
  })
  .refine((value) => !value.hasExternalTaskOrder || (value.hasExternalTaskOrder && !!value.externalFileName), {
    path: ["externalFileName"],
    message: "Surat Tugas dari Business Unit wajib dilampirkan",
  })
  .refine((value) => value.periodEnd >= value.periodStart, {
    path: ["periodEnd"],
    message: "Periode akhir tidak boleh sebelum periode awal",
  });

type TaskOrderForm = z.infer<typeof taskOrderSchema>;
type SequenceByYear = Record<string, number>;
type AutoDraftMeta = {
  letterDate: string;
  sequenceNo: number;
  suratNumber: string;
};

const sequenceStorageKey = "auditsphere.suratTugas.sequenceByYear";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

function formatIdDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return dateFormatter.format(date);
}

function formatShortDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function toLocalIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getAutoDraftMeta(baseDate?: Date): AutoDraftMeta {
  const selectedDate = baseDate ?? new Date();
  const letterDate = toLocalIsoDate(selectedDate);
  const sequenceStore = readSequenceStore();
  const bucket = String(selectedDate.getFullYear());
  const sequenceNo = (sequenceStore[bucket] ?? 0) + 1;
  
  const suratNumber = formatSuratTugasNumber({
    sequenceNo,
    letterDate,
    suffix: "DIA"
  });

  return {
    letterDate,
    sequenceNo,
    suratNumber,
  };
}

function buildDraft(values: TaskOrderForm, nomorSurat: string, letterDate: string) {
  const objectiveLines = splitLines(values.objectives ?? "");
  const memberLines = [
    `1. Koordinator: ${values.coordinator.fullName} - ${values.coordinator.position}`,
    ...values.members.map(
      (member, index) =>
        `${index + 2}. Anggota: ${member.fullName} - ${member.position}`,
    ),
  ];

  const hasExternal = values.auditType === "Collaborative Audit" && values.hasExternalTaskOrder;

  return [
    "SURAT TUGAS PEMERIKSAAN",
    ...(hasExternal ? [] : [`Nomor: ${nomorSurat}`, "", `Tanggal Surat: ${formatIdDate(letterDate)}`]),
    `Business Unit: ${values.businessUnit}`,
    `Cabang/Area: ${values.branch}`,
    `Jenis Penugasan: ${values.auditType}`,
    `Periode Audit: ${formatIdDate(values.periodStart)} s.d. ${formatIdDate(values.periodEnd)}`,
    "",
    "Tim Pemeriksa:",
    ...memberLines,
    "",
    ...(values.objectives?.trim() ? [
      "Tujuan Pemeriksaan:",
      ...objectiveLines.map((line, index) => `${index + 1}. ${line}`),
      ""
    ] : []),
    "Catatan:",
    values.notes?.trim() ? values.notes : "-",
    "",
    "Mengetahui,",
    "Pimpinan Internal Audit",
    "",
    "(Tanda tangan manual)",
  ].join("\n");
}

function readSequenceStore(): SequenceByYear {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(sequenceStorageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as SequenceByYear;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

function writeSequenceStore(payload: SequenceByYear) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(sequenceStorageKey, JSON.stringify(payload));
  } catch {
    // noop
  }
}

function createEmptyMember() {
  return { fullName: "", position: "" };
}

export function TaskOrderGenerator() {
  const { addAudit } = useAuditStore();
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "done">("idle");
  const form = useForm<TaskOrderForm>({
    resolver: zodResolver(taskOrderSchema),
    defaultValues: {
      businessUnit: businessUnits[0]?.name || "Pergadaian",
      branch: "",
      auditType: "Regular Audit",
      periodStart: "",
      periodEnd: "",
      coordinator: createEmptyMember(),
      members: [createEmptyMember()],
      objectives:
        "Verifikasi kepatuhan proses transaksi booking dan pelunasan.\nEvaluasi risiko operasional dan kualitas dokumen pendukung.",
      notes: "",
      hasExternalTaskOrder: false,
      externalFileName: "",
    },
  });

  const members = useFieldArray({
    control: form.control,
    name: "members",
  });

  const currentAuditType = form.watch("auditType");
  const hasExternalTaskOrder = form.watch("hasExternalTaskOrder");
  const externalFileName = form.watch("externalFileName");
  const hideLetterMeta = currentAuditType === "Collaborative Audit" && hasExternalTaskOrder;
  const [autoMeta, setAutoMeta] = useState<AutoDraftMeta>(() => getAutoDraftMeta());
  const [externalFileObj, setExternalFileObj] = useState<File | null>(null);

  const onSubmit = form.handleSubmit((values) => {
    const activeMeta = autoMeta;

    const date = new Date(`${activeMeta.letterDate}T00:00:00`);
    const year = Number.isNaN(date.getTime()) ? new Date().getFullYear() : date.getFullYear();
    const bucket = String(year);
    const sequenceStore = readSequenceStore();
    sequenceStore[bucket] = (sequenceStore[bucket] ?? 0) + 1;
    writeSequenceStore(sequenceStore);
    setDraft(buildDraft(values, activeMeta.suratNumber, activeMeta.letterDate));
    // Calculate due date (1 week after period end)
    const endDateObj = new Date(`${values.periodEnd}T00:00:00`);
    let dueDateStr = values.periodEnd;
    if (!Number.isNaN(endDateObj.getTime())) {
      endDateObj.setDate(endDateObj.getDate() + 7);
      dueDateStr = toLocalIsoDate(endDateObj);
    }

    // Add to audit execution tracking
    addAudit({
      name: `${values.auditType} - ${values.branch}`,
      branch: values.businessUnit,
      lead: values.coordinator.fullName,
      status: "Planning",
      risk: "Medium",
      period: `${formatShortDate(values.periodStart)} s/d ${formatShortDate(values.periodEnd)}`,
      dueDate: dueDateStr,
    });

    setCopyState("idle");
    setAutoMeta(getAutoDraftMeta());
  });

  const handleCopy = async () => {
    if (!draft) return;
    await navigator.clipboard.writeText(draft);
    setCopyState("done");
    window.setTimeout(() => setCopyState("idle"), 2000);
  };

  const showObjectives = currentAuditType === "Investigation Audit" || currentAuditType === "Special Audit";

  return (
    <div className="w-full">
      <Card>
        <CardHeader>
          <CardTitle>{t("gen.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 mb-4">
              <Field label={t("gen.type")}>
                <select
                  {...form.register("auditType")}
                  className="w-full rounded-lg border border-white/10 bg-black/20 p-2.5 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
                >
                  <option value="Regular Audit">Regular Audit</option>
                  <option value="General Audit">General Audit</option>
                  <option value="Investigation Audit">Investigation Audit</option>
                  <option value="Special Audit">Special Audit</option>
                  <option value="Collaborative Audit">Collaborative Audit</option>
                </select>
                <ErrorText>{form.formState.errors.auditType?.message}</ErrorText>
              </Field>
              {currentAuditType === "Collaborative Audit" && (
                <div className="space-y-4 pt-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="externalTaskOrder"
                      {...form.register("hasExternalTaskOrder")}
                      className="h-4 w-4 rounded border-white/20 bg-black/20 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900"
                    />
                    <label htmlFor="externalTaskOrder" className="text-sm font-medium text-slate-300 cursor-pointer">
                      {t("gen.useExternal")}
                    </label>
                  </div>

                  {hasExternalTaskOrder && (
                    <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                        {t("gen.uploadLabel")}
                      </label>
                      <input
                        type="file"
                        id="externalFileUpload"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setExternalFileObj(file);
                            form.setValue("externalFileName", file.name, { shouldValidate: true });
                          }
                        }}
                      />

                      <div className="flex items-center gap-3">
                        <label
                          htmlFor="externalFileUpload"
                          className="cursor-pointer rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-400 hover:bg-cyan-500/20"
                        >
                          {t("gen.chooseFile")}
                        </label>
                        <span className="text-sm text-slate-400 truncate max-w-[200px]">
                          {externalFileName || t("gen.noFile")}
                        </span>
                      </div>
                      <ErrorText>{form.formState.errors.externalFileName?.message}</ErrorText>
                    </div>
                  )}
                </div>
              )}
            </div>

            {!hideLetterMeta && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label={t("gen.letterDate")}>
                  <Input readOnly value={formatIdDate(autoMeta.letterDate)} />
                </Field>
                <Field label={t("gen.letterNumber")}>
                  <Input readOnly value={autoMeta.suratNumber} />
                </Field>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label={t("gen.bu")}>
                <select
                  {...form.register("businessUnit")}
                  className="w-full rounded-lg border border-white/10 bg-black/20 p-2.5 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
                >
                  <option value="">Pilih Business Unit...</option>
                  {businessUnits.map((bu) => (
                    <option key={bu.id} value={bu.name}>
                      {bu.name} ({bu.code})
                    </option>
                  ))}
                </select>
                <ErrorText>{form.formState.errors.businessUnit?.message}</ErrorText>
              </Field>
              <Field label={t("gen.branch")}>
                <Input placeholder="Contoh: Cabang NTT" {...form.register("branch")} />
                <ErrorText>{form.formState.errors.branch?.message}</ErrorText>
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label={t("gen.periodStart")}>
                <Input type="date" {...form.register("periodStart")} />
                <ErrorText>{form.formState.errors.periodStart?.message}</ErrorText>
              </Field>
              <Field label={t("gen.periodEnd")}>
                <Input type="date" {...form.register("periodEnd")} />
                <ErrorText>{form.formState.errors.periodEnd?.message}</ErrorText>
              </Field>
            </div>

            <div className="space-y-4 rounded-lg border border-white/10 bg-white/5 p-4">
              <h3 className="text-sm font-semibold text-slate-200">{t("gen.coord")}</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label={t("gen.fullName")}>
                  <Input placeholder="John Doe" {...form.register("coordinator.fullName")} />
                  <ErrorText>{form.formState.errors.coordinator?.fullName?.message}</ErrorText>
                </Field>
                <Field label={t("gen.position")}>
                  <Input placeholder="Auditor Utama" {...form.register("coordinator.position")} />
                  <ErrorText>{form.formState.errors.coordinator?.position?.message}</ErrorText>
                </Field>
              </div>
            </div>

            <div className="space-y-4 rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-200">{t("gen.members")}</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 border-dashed"
                  onClick={() => members.append(createEmptyMember())}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  {t("gen.addMember")}
                </Button>
              </div>
              <div className="space-y-3">
                {members.fields.map((field, index) => (
                  <div key={field.id} className="rounded-lg border border-white/10 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-xs text-slate-400">Anggota {index + 1}</div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => members.remove(index)}
                        disabled={members.fields.length <= 1}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t("gen.delete")}
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <Field label={t("gen.fullName")}>
                        <Input placeholder="Jane Doe" {...form.register(`members.${index}.fullName`)} />
                        <ErrorText>{form.formState.errors.members?.[index]?.fullName?.message}</ErrorText>
                      </Field>
                      <Field label={t("gen.position")}>
                        <Input placeholder="Auditor Pertama" {...form.register(`members.${index}.position`)} />
                        <ErrorText>{form.formState.errors.members?.[index]?.position?.message}</ErrorText>
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {showObjectives && (
              <div className="space-y-4 rounded-lg border border-white/10 bg-white/5 p-4">
                <Field label={t("gen.objectives")}>
                  <Textarea
                    rows={3}
                    placeholder="Contoh:&#10;1. Verifikasi kepatuhan transaksi.&#10;2. Evaluasi efisiensi operasional."
                    {...form.register("objectives")}
                  />
                  <ErrorText>{form.formState.errors.objectives?.message}</ErrorText>
                </Field>
              </div>
            )}

            <div className="space-y-3">
              <Field label={t("gen.notes")}>
                <Textarea
                  className="min-h-[60px]"
                  placeholder="Opsional"
                  {...form.register("notes")}
                />
                <ErrorText>{form.formState.errors.notes?.message}</ErrorText>
              </Field>
            </div>

            <div className="rounded-lg border border-amber-300/20 bg-amber-300/10 p-3 text-xs text-amber-100">
              Tanda tangan tidak dibuat otomatis. Draft surat tetap menampilkan area tanda tangan manual untuk owner.
            </div>

            <Button type="submit" className="w-full font-semibold bg-cyan-500 hover:bg-cyan-600 text-slate-900">
              <Check className="mr-2 h-4 w-4" />
              {t("gen.btnGenerate")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-slate-400">{label}</label>
      {children}
    </div>
  );
}

function ErrorText({ children }: { children?: string }) {
  if (!children) return null;
  return <p className="mt-1 text-xs text-rose-300">{children}</p>;
}
