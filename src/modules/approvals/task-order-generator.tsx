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

const memberSchema = z.object({
  fullName: z.string().min(2, "Nama wajib diisi"),
  employeeId: z.string().min(3, "NIP/NIK wajib diisi"),
  position: z.string().min(2, "Jabatan wajib diisi"),
});

const taskOrderSchema = z
  .object({
    businessUnit: z.string().min(2, "Business unit wajib diisi"),
    branch: z.string().min(2, "Cabang/area wajib diisi"),
    auditType: z.string().min(2, "Jenis penugasan wajib diisi"),
    assignmentStart: z.string().min(1, "Tanggal mulai wajib diisi"),
    assignmentEnd: z.string().min(1, "Tanggal selesai wajib diisi"),
    periodStart: z.string().min(1, "Periode awal wajib diisi"),
    periodEnd: z.string().min(1, "Periode akhir wajib diisi"),
    coordinator: memberSchema,
    members: z.array(memberSchema).min(1, "Minimal ada 1 anggota"),
    objectives: z.string().min(12, "Tujuan pemeriksaan minimal 12 karakter"),
    notes: z.string().optional(),
    signatoryName: z.string().min(2, "Nama pejabat penandatangan wajib diisi"),
    signatoryTitle: z.string().min(2, "Jabatan penandatangan wajib diisi"),
  })
  .refine((value) => value.assignmentEnd >= value.assignmentStart, {
    path: ["assignmentEnd"],
    message: "Tanggal selesai tidak boleh sebelum tanggal mulai",
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
  });

  return {
    letterDate,
    sequenceNo,
    suratNumber,
  };
}

function buildDraft(values: TaskOrderForm, nomorSurat: string, letterDate: string) {
  const objectiveLines = splitLines(values.objectives);
  const memberLines = [
    `1. Koordinator: ${values.coordinator.fullName} (${values.coordinator.employeeId}) - ${values.coordinator.position}`,
    ...values.members.map(
      (member, index) =>
        `${index + 2}. Anggota: ${member.fullName} (${member.employeeId}) - ${member.position}`,
    ),
  ];

  return [
    "SURAT TUGAS PEMERIKSAAN",
    `Nomor: ${nomorSurat}`,
    "",
    `Tanggal Surat: ${formatIdDate(letterDate)}`,
    `Business Unit: ${values.businessUnit}`,
    `Cabang/Area: ${values.branch}`,
    `Jenis Penugasan: ${values.auditType}`,
    `Periode Audit: ${formatIdDate(values.periodStart)} s.d. ${formatIdDate(values.periodEnd)}`,
    `Pelaksanaan: ${formatIdDate(values.assignmentStart)} s.d. ${formatIdDate(values.assignmentEnd)}`,
    "",
    "Tim Pemeriksa:",
    ...memberLines,
    "",
    "Tujuan Pemeriksaan:",
    ...objectiveLines.map((line, index) => `${index + 1}. ${line}`),
    "",
    "Catatan:",
    values.notes?.trim() ? values.notes : "-",
    "",
    "Mengetahui,",
    values.signatoryTitle,
    "",
    "(Tanda tangan manual oleh owner)",
    "",
    values.signatoryName,
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
  return { fullName: "", employeeId: "", position: "" };
}

export function TaskOrderGenerator() {
  const [draft, setDraft] = useState("");
  const [autoMeta, setAutoMeta] = useState<AutoDraftMeta>(() => getAutoDraftMeta());
  const [copyState, setCopyState] = useState<"idle" | "done">("idle");
  const form = useForm<TaskOrderForm>({
    resolver: zodResolver(taskOrderSchema),
    defaultValues: {
      businessUnit: "Pergadaian",
      branch: "",
      auditType: "Pemeriksaan Operasional Cabang",
      assignmentStart: "",
      assignmentEnd: "",
      periodStart: "",
      periodEnd: "",
      coordinator: createEmptyMember(),
      members: [createEmptyMember()],
      objectives:
        "Verifikasi kepatuhan proses transaksi booking dan pelunasan.\nEvaluasi risiko operasional dan kualitas dokumen pendukung.",
      notes: "",
      signatoryName: "",
      signatoryTitle: "General Manager Internal Audit",
    },
  });

  const members = useFieldArray({
    control: form.control,
    name: "members",
  });

  const onSubmit = form.handleSubmit((values) => {
    const activeMeta = autoMeta;

    const date = new Date(`${activeMeta.letterDate}T00:00:00`);
    const year = Number.isNaN(date.getTime()) ? new Date().getFullYear() : date.getFullYear();
    const bucket = String(year);
    const sequenceStore = readSequenceStore();
    sequenceStore[bucket] = (sequenceStore[bucket] ?? 0) + 1;
    writeSequenceStore(sequenceStore);
    setDraft(buildDraft(values, activeMeta.suratNumber, activeMeta.letterDate));
    setCopyState("idle");
    setAutoMeta(getAutoDraftMeta());
  });

  const handleCopy = async () => {
    if (!draft) return;
    await navigator.clipboard.writeText(draft);
    setCopyState("done");
    window.setTimeout(() => setCopyState("idle"), 2000);
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>Generator Surat Tugas</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Tanggal Surat (Auto)">
                <Input readOnly value={formatIdDate(autoMeta.letterDate)} />
              </Field>
              <Field label="Nomor Surat (Auto)">
                <Input readOnly value={autoMeta.suratNumber} />
              </Field>
              <Field label="Business Unit">
                <Input placeholder="Contoh: Pergadaian" {...form.register("businessUnit")} />
                <ErrorText>{form.formState.errors.businessUnit?.message}</ErrorText>
              </Field>
              <Field label="Cabang/Area">
                <Input placeholder="Contoh: NTT" {...form.register("branch")} />
                <ErrorText>{form.formState.errors.branch?.message}</ErrorText>
              </Field>
              <Field label="Jenis Penugasan">
                <Input placeholder="Contoh: Pemeriksaan Operasional Cabang" {...form.register("auditType")} />
                <ErrorText>{form.formState.errors.auditType?.message}</ErrorText>
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Tanggal Mulai Tugas">
                <Input type="date" {...form.register("assignmentStart")} />
                <ErrorText>{form.formState.errors.assignmentStart?.message}</ErrorText>
              </Field>
              <Field label="Tanggal Selesai Tugas">
                <Input type="date" {...form.register("assignmentEnd")} />
                <ErrorText>{form.formState.errors.assignmentEnd?.message}</ErrorText>
              </Field>
              <Field label="Periode Audit Awal">
                <Input type="date" {...form.register("periodStart")} />
                <ErrorText>{form.formState.errors.periodStart?.message}</ErrorText>
              </Field>
              <Field label="Periode Audit Akhir">
                <Input type="date" {...form.register("periodEnd")} />
                <ErrorText>{form.formState.errors.periodEnd?.message}</ErrorText>
              </Field>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-cyan-200">Koordinator (wajib 1 orang)</div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Field label="Nama Koordinator">
                  <Input placeholder="Nama lengkap" {...form.register("coordinator.fullName")} />
                  <ErrorText>{form.formState.errors.coordinator?.fullName?.message}</ErrorText>
                </Field>
                <Field label="NIP/NIK">
                  <Input placeholder="ID pegawai" {...form.register("coordinator.employeeId")} />
                  <ErrorText>{form.formState.errors.coordinator?.employeeId?.message}</ErrorText>
                </Field>
                <Field label="Jabatan">
                  <Input placeholder="Contoh: Supervisor Audit" {...form.register("coordinator.position")} />
                  <ErrorText>{form.formState.errors.coordinator?.position?.message}</ErrorText>
                </Field>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-xs font-semibold uppercase tracking-[0.08em] text-cyan-200">Anggota Tim (minimal 1 orang)</div>
                <Button type="button" size="sm" variant="secondary" onClick={() => members.append(createEmptyMember())}>
                  <Plus className="h-3.5 w-3.5" />
                  Tambah Anggota
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
                        Hapus
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <Field label="Nama">
                        <Input placeholder="Nama lengkap" {...form.register(`members.${index}.fullName`)} />
                        <ErrorText>{form.formState.errors.members?.[index]?.fullName?.message}</ErrorText>
                      </Field>
                      <Field label="NIP/NIK">
                        <Input placeholder="ID pegawai" {...form.register(`members.${index}.employeeId`)} />
                        <ErrorText>{form.formState.errors.members?.[index]?.employeeId?.message}</ErrorText>
                      </Field>
                      <Field label="Jabatan">
                        <Input placeholder="Contoh: Auditor Madya" {...form.register(`members.${index}.position`)} />
                        <ErrorText>{form.formState.errors.members?.[index]?.position?.message}</ErrorText>
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Field label="Tujuan Pemeriksaan (satu poin per baris)">
              <Textarea {...form.register("objectives")} />
              <ErrorText>{form.formState.errors.objectives?.message}</ErrorText>
            </Field>

            <Field label="Catatan Tambahan">
              <Textarea placeholder="Opsional" {...form.register("notes")} />
            </Field>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Nama Penandatangan">
                <Input placeholder="Nama owner" {...form.register("signatoryName")} />
                <ErrorText>{form.formState.errors.signatoryName?.message}</ErrorText>
              </Field>
              <Field label="Jabatan Penandatangan">
                <Input placeholder="Contoh: General Manager Internal Audit" {...form.register("signatoryTitle")} />
                <ErrorText>{form.formState.errors.signatoryTitle?.message}</ErrorText>
              </Field>
            </div>

            <div className="rounded-lg border border-amber-300/20 bg-amber-300/10 p-3 text-xs text-amber-100">
              Tanda tangan tidak dibuat otomatis. Draft surat tetap menampilkan area tanda tangan manual untuk owner.
            </div>

            <Button type="submit" className="w-full md:w-auto">
              <FileText className="h-4 w-4" />
              Generate Draft Surat Tugas
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview Draft</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-slate-400">Setelah form diisi, draft siap disalin untuk proses review dan finalisasi resmi.</p>
          <div className="max-h-[560px] overflow-auto rounded-lg border border-white/10 bg-black/30 p-3 text-xs leading-relaxed text-slate-200">
            <pre className="whitespace-pre-wrap font-sans">{draft || "Belum ada draft. Isi form lalu klik Generate Draft Surat Tugas."}</pre>
          </div>
          <Button type="button" variant="outline" className="w-full" onClick={handleCopy} disabled={!draft}>
            {copyState === "done" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copyState === "done" ? "Draft Tersalin" : "Salin Draft"}
          </Button>
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
