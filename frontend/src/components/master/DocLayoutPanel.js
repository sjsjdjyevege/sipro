import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Eye, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ErrorState, LoadingCards } from "@/components/patterns/StateViews";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/apiClient";
import BrandForm from "@/components/master/docLayout/BrandForm";
import RowsForm from "@/components/master/docLayout/RowsForm";
import SignaturesForm from "@/components/master/docLayout/SignaturesForm";
import { P60 } from "@/constants/testIds";

/**
 * DocLayoutPanel — KONFIGURASI TAMPILAN DOKUMEN (Fase 60).
 *
 * Sampai Fase 59 dokumen yang keluar dari sistem ini adalah teks polos: tanpa kop, tanpa
 * footer identitas, tanpa kolom tanda tangan yang jelas, dan semua baris biaya tercetak
 * termasuk yang bernilai Rp 0. Panel ini memberi pemilik usaha kendali penuh — dengan
 * PRATINJAU BERDAMPINGAN yang dirender mesin cetak yang SAMA dengan dokumen sungguhan,
 * jadi apa yang dilihat di kanan adalah apa yang diterima pembeli.
 *
 * Kode `__default__` adalah identitas & gaya untuk SEMUA dokumen; kode lain hanya menyimpan
 * yang berbeda dari bawaan itu.
 */
export default function DocLayoutPanel() {
  const { can } = useAuth();
  const mayEdit = can("settings", "update");
  const [targets, setTargets] = useState([]);
  const [code, setCode] = useState("__default__");
  const [layout, setLayout] = useState(null);
  const [state, setState] = useState({ loading: true, error: "" });
  const [preview, setPreview] = useState({ url: "", error: "", busy: false });
  const [dirty, setDirty] = useState(false);
  const timer = useRef(null);

  const load = useCallback(async () => {
    setState({ loading: true, error: "" });
    try {
      const [t, l] = await Promise.all([
        api.get("/doc-layouts"), api.get(`/doc-layouts/${code}`)]);
      setTargets(t.data.data || []);
      setLayout(l.data.data);
      setDirty(false);
      setState({ loading: false, error: "" });
    } catch (e) {
      setState({ loading: false,
        error: e?.response?.data?.detail || "Gagal memuat konfigurasi dokumen." });
    }
  }, [code]);

  useEffect(() => { if (mayEdit) load(); }, [mayEdit, load]);

  const draft = useMemo(() => (layout ? {
    brand: layout.brand, sections: layout.sections, money_rows: layout.money_rows,
    signatures: layout.signatures, options: layout.options,
  } : null), [layout]);

  const renderPreview = useCallback(async (withReal) => {
    if (!draft) return;
    setPreview((p) => ({ ...p, busy: true, error: "" }));
    try {
      const res = await api.post(`/doc-layouts/${code}/preview`, draft, {
        params: withReal ? { document_id: withReal } : {}, responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      setPreview((p) => {
        if (p.url) URL.revokeObjectURL(p.url);  // satu blob per pratinjau, bukan menumpuk
        return { url, error: "", busy: false };
      });
    } catch (e) {
      setPreview({ url: "", busy: false,
        error: "Pratinjau gagal dirender. Periksa nilai warna/margin, lalu coba lagi." });
    }
  }, [code, draft]);

  // Pratinjau ikut berubah saat pengaturan diubah (ditahan 700 ms supaya tidak merender
  // ulang pada setiap ketikan).
  useEffect(() => {
    if (!draft) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => renderPreview(null), 700);
    return () => clearTimeout(timer.current);
  }, [draft, renderPreview]);

  if (!mayEdit) {
    return (
      <p data-testid={P60.denied} className="rounded-lg border bg-secondary/40 px-3 py-2 text-[12px] text-muted-foreground">
        Konfigurasi tampilan dokumen hanya bisa diubah peran yang berwenang atas pengaturan
        organisasi (kop surat = identitas perusahaan).
        Ini soal HAK AKSES, bukan fitur yang belum ada.
      </p>
    );
  }
  if (state.loading) return <LoadingCards count={3} />;
  if (state.error) return <ErrorState message={state.error} onRetry={load} />;
  if (!layout) return null;

  const setPart = (part) => (key, value) => {
    setLayout((l) => ({ ...l, [part]: { ...(l[part] || {}), [key]: value } }));
    setDirty(true);
  };
  const setList = (part) => (value) => {
    setLayout((l) => ({ ...l, [part]: value }));
    setDirty(true);
  };

  const simpan = async () => {
    try {
      const res = await api.put(`/doc-layouts/${code}`, draft);
      setLayout(res.data.data);
      setDirty(false);
      toast.success("Konfigurasi dokumen disimpan — dokumen berikutnya memakai tampilan ini.");
      const t = await api.get("/doc-layouts");
      setTargets(t.data.data || []);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Gagal menyimpan konfigurasi.");
    }
  };

  const reset = async () => {
    try {
      const res = await api.delete(`/doc-layouts/${code}`);
      setLayout(res.data.data);
      setDirty(false);
      toast.success("Dikembalikan ke bawaan. Dokumen yang sudah terbit tidak berubah.");
    } catch (e) {
      toast.error("Gagal mengembalikan ke bawaan.");
    }
  };

  const unduh = () => {
    if (!preview.url) return;
    const a = document.createElement("a");
    a.href = preview.url;
    a.download = `contoh-${code}.pdf`;
    document.body.appendChild(a); a.click(); a.remove();
  };

  return (
    <div data-testid={P60.panel} className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-[320px]">
          <p className="mb-1 text-[11px] text-muted-foreground">Dokumen yang dikonfigurasi</p>
          <Select value={code} onValueChange={setCode}>
            <SelectTrigger data-testid={P60.targetSelect} className="bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {targets.map((t) => (
                <SelectItem key={t.code} value={t.code}>
                  {t.label}{t.customized ? " · disesuaikan" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="ghost" data-testid={P60.previewRefresh}
            onClick={() => renderPreview(null)} disabled={preview.busy}>
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            {preview.busy ? "Merender…" : "Segarkan pratinjau"}
          </Button>
          <Button size="sm" variant="outline" data-testid={P60.previewDownload}
            onClick={unduh} disabled={!preview.url}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> Unduh contoh
          </Button>
          <Button size="sm" variant="outline" data-testid={P60.resetBtn} onClick={reset}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Bawaan
          </Button>
          <Button size="sm" data-testid={P60.saveBtn} onClick={simpan} disabled={!dirty}>
            <Save className="mr-1.5 h-3.5 w-3.5" /> {dirty ? "Simpan" : "Tersimpan"}
          </Button>
        </div>
      </div>

      <p className="text-[12px] text-muted-foreground">
        {code === "__default__"
          ? "Identitas & gaya di sini dipakai SEMUA dokumen. Pilih dokumen tertentu di atas bila ingin menimpanya (mis. kolom tanda tangan BAST berbeda dari SPR)."
          : `Yang diubah di sini hanya berlaku untuk "${layout.label}" dan menimpa bawaan organisasi.`}
      </p>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-3">
          <Tabs defaultValue="brand">
            <TabsList className="flex-wrap">
              <TabsTrigger data-testid={P60.tabBrand} value="brand">Kop, footer &amp; kertas</TabsTrigger>
              <TabsTrigger data-testid={P60.tabRows} value="rows">Baris &amp; biaya</TabsTrigger>
              <TabsTrigger data-testid={P60.tabSign} value="sign">Tanda tangan</TabsTrigger>
            </TabsList>
            <TabsContent value="brand" className="mt-3">
              <BrandForm brand={layout.brand || {}} options={layout.options || {}}
                setBrand={setPart("brand")} setOptions={setPart("options")} />
            </TabsContent>
            <TabsContent value="rows" className="mt-3">
              <RowsForm rows={layout.money_rows || []} sections={layout.sections || []}
                options={layout.options || {}} setRows={setList("money_rows")}
                setSections={setList("sections")} setOptions={setPart("options")} />
            </TabsContent>
            <TabsContent value="sign" className="mt-3">
              <SignaturesForm signatures={layout.signatures || []}
                options={layout.options || {}} setSignatures={setList("signatures")}
                setOptions={setPart("options")} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-2">
          <p className="text-[12px] font-medium">
            Pratinjau langsung (data contoh, mesin cetak yang sama dengan dokumen sungguhan)
          </p>
          {preview.error ? (
            <p data-testid={P60.previewError}
              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-800">
              {preview.error}
            </p>
          ) : null}
          <div className="overflow-hidden rounded-xl border bg-secondary/30">
            {preview.url ? (
              <iframe data-testid={P60.preview} title="Pratinjau dokumen" src={preview.url}
                className="h-[720px] w-full bg-white" />
            ) : (
              <div data-testid={P60.preview} className="flex h-[720px] items-center justify-center text-[12px] text-muted-foreground">
                {preview.busy ? "Merender pratinjau…" : "Pratinjau belum tersedia."}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
