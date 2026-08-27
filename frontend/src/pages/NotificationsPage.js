import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Bell, CheckCheck, Eraser, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingCards, ErrorState } from "@/components/patterns/StateViews";
import NotificationRows, { CATEGORY_ICON } from "@/components/notifications/NotificationRows";
import { useReference } from "@/context/ReferenceContext";
import useListQuery from "@/hooks/useListQuery";
import api from "@/services/apiClient";
import { cn } from "@/lib/utils";
import { NOTIF } from "@/constants/testIds";

// Keadaan notifikasi: NILAI-nya milik registry SSOT (`notification_state`), yang di sini
// hanya pemetaan nilai → angka ringkasan mana yang ditampilkan pada tabnya. Labelnya tetap
// diambil dari registry (`labelOf`), jadi tidak ada daftar label kedua di layar.
const STATE_COUNT = { action: "needs_action", unread: "unread", read: "read", all: "total" };
const STATE_ORDER = ["action", "unread", "read", "all"];

/**
 * NotificationsPage — pusat notifikasi berkategori (Fase 64).
 *
 * Keluhan yang diperbaiki: kartu terlalu besar, daftar memanjang tanpa akhir, tidak ada
 * kategori, tidak ada jalan ke pekerjaannya, dan notifikasi tetap berdiri walaupun
 * tindakannya sudah dilakukan.
 *
 * Yang dikerjakan sekarang:
 *   * **Keadaan** dipisah: Perlu tindakan · Belum dibaca · Sudah dilihat · Semua — jadi
 *     yang menuntut keputusan tidak lagi tenggelam di antara kabar informatif;
 *   * **kategori** (tugas, keuangan, penjualan, proyek, layanan, sebutan, sistem) sebagai
 *     saringan sekali klik dengan jumlahnya;
 *   * satu notifikasi = **satu baris padat** yang bisa diklik untuk LANGSUNG membuka
 *     halaman yang bersangkutan;
 *   * notifikasi yang tindakannya sudah dilakukan **dicabut server** (`resolve_done`), dan
 *     yang sudah dilihat bisa **dibersihkan** sekaligus.
 */
export default function NotificationsPage() {
  const { labelOf, options } = useReference();
  const { query, setQuery } = useListQuery({
    filters: { state: "action", category: [] }, sort: "", limit: 50,
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await api.get("/notifications", {
        params: {
          state: query.state || "action",
          category: query.category?.length ? query.category.join(",") : undefined,
          q: query.q || undefined, limit: 50,
        },
      });
      setData(res.data);
    } catch (e) {
      setError(e?.response?.data?.detail || "Gagal memuat notifikasi.");
    } finally { setLoading(false); }
  }, [query.state, query.category, query.q]);

  useEffect(() => { load(); }, [load]);

  const summary = data?.summary || {};
  const perCat = summary.per_category || {};

  const markRead = async (n, opts = {}) => {
    try {
      await api.post(`/notifications/${n.id}/read`);
      setData((d) => (d ? {
        ...d,
        data: d.data.map((r) => (r.id === n.id ? { ...r, read: true } : r)),
      } : d));
      if (!opts.silent) load();
    } catch { toast.error("Gagal menandai notifikasi."); }
  };

  const dismiss = async (n) => {
    try {
      await api.post(`/notifications/${n.id}/dismiss`);
      setData((d) => (d ? { ...d, data: d.data.filter((r) => r.id !== n.id) } : d));
    } catch { toast.error("Gagal menyembunyikan notifikasi."); }
  };

  const markAll = async () => {
    const kat = query.category?.length === 1 ? query.category[0] : undefined;
    const res = await api.post("/notifications/read-all", null, { params: { category: kat } });
    toast.success(`${res.data?.data?.marked ?? 0} notifikasi ditandai dibaca.`);
    load();
  };

  const clearRead = async () => {
    const res = await api.post("/notifications/clear-read");
    toast.success(`${res.data?.data?.cleared ?? 0} notifikasi yang sudah dilihat dibersihkan.`);
    load();
  };

  const toggleCat = (value) => {
    const cur = query.category || [];
    setQuery({ category: cur.includes(value) ? cur.filter((c) => c !== value) : [value] });
  };

  const categories = useMemo(() => Object.entries(perCat)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]), [perCat]);

  // Urutan tab ditentukan layar (yang menuntut tindakan lebih dulu), labelnya dari registry.
  const states = useMemo(() => {
    const dari = options("notification_state");
    return STATE_ORDER.map((v) => ({
      value: v,
      label: (dari.find((o) => o.value === v) || {}).label || labelOf("notification_state", v),
    }));
  }, [options, labelOf]);

  const emptyFor = {
    action: { title: "Tidak ada yang perlu ditindak",
      description: "Semua permintaan keputusan sudah dikerjakan. Notifikasi yang tindakannya selesai dicabut sendiri." },
    unread: { title: "Semua sudah dibaca", description: "Tidak ada notifikasi baru." },
    read: { title: "Belum ada yang dilihat", description: "Notifikasi yang Anda buka akan berpindah ke sini." },
    all: { title: "Belum ada notifikasi", description: "Sebutan, tenggat, dan kabar sistem akan muncul di sini." },
  }[query.state || "action"];

  return (
    <div data-testid={NOTIF.page} className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-heading text-2xl font-semibold tracking-tight">
            <Bell className="h-5 w-5 text-primary" /> Notifikasi
          </h1>
          <p className="text-sm text-muted-foreground">
            Yang perlu ditindak lebih dulu. Notifikasi yang pekerjaannya sudah selesai
            dicabut sendiri, jadi daftar ini bisa habis.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button data-testid={NOTIF.markAll} variant="outline" size="sm" onClick={markAll}>
            <CheckCheck className="mr-1.5 h-4 w-4" />
            {query.category?.length === 1 ? "Tandai kategori ini dibaca" : "Tandai semua dibaca"}
          </Button>
          <Button data-testid={NOTIF.clearReadBtn} variant="outline" size="sm"
            onClick={clearRead} disabled={!summary.read}>
            <Eraser className="mr-1.5 h-4 w-4" /> Bersihkan yang sudah dilihat
          </Button>
        </div>
      </div>

      {/* Keadaan: perlu tindakan / belum dibaca / sudah dilihat / semua */}
      <div data-testid={NOTIF.summary} className="flex flex-wrap gap-2">
        {states.map((s) => {
          const aktif = (query.state || "action") === s.value;
          return (
            <button key={s.value} data-testid={`${NOTIF.stateTab}-${s.value}`}
              onClick={() => setQuery({ state: s.value })}
              className={cn("rounded-lg border px-3 py-1.5 text-sm transition-colors",
                aktif ? "border-primary bg-primary/10 text-primary" : "bg-card hover:bg-secondary")}>
              {s.label}
              <span className="ml-1.5 text-xs tabular-nums text-muted-foreground">
                {summary[STATE_COUNT[s.value]] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* Kategori (hanya yang benar-benar ada isinya, supaya tidak jadi hutan tombol) */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input data-testid={NOTIF.search} className="h-9 bg-background pl-9"
            aria-label="Cari notifikasi" placeholder="Cari judul atau isi notifikasi…"
            value={query.q || ""} onChange={(e) => setQuery({ q: e.target.value })} />
        </div>
        {categories.map(([kat, jml]) => {
          const Icon = CATEGORY_ICON[kat] || Bell;
          const aktif = (query.category || []).includes(kat);
          return (
            <button key={kat} data-testid={`${NOTIF.categoryChip}-${kat}`}
              onClick={() => toggleCat(kat)}
              className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors",
                aktif ? "border-primary bg-primary/10 text-primary" : "bg-card hover:bg-secondary")}>
              <Icon className="h-3.5 w-3.5" />
              {labelOf("notification_category", kat)}
              <span className="tabular-nums text-muted-foreground">{jml}</span>
            </button>
          );
        })}
        {(query.category || []).length ? (
          <Button variant="ghost" size="sm" onClick={() => setQuery({ category: [] })}>
            Semua kategori
          </Button>
        ) : null}
      </div>

      {loading ? <LoadingCards count={3} />
        : error ? <ErrorState message={error} onRetry={load} />
          : (
            <>
              <NotificationRows rows={data?.data || []} onRead={markRead} onDismiss={dismiss}
                emptyState={emptyFor} />
              {data?.total > (data?.data || []).length ? (
                <p className="text-center text-[11px] text-muted-foreground">
                  Menampilkan {(data.data || []).length} dari {data.total} notifikasi —
                  persempit dengan kategori atau pencarian.
                </p>
              ) : null}
            </>
          )}
    </div>
  );
}
