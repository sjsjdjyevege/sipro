import React from "react";
import { useNavigate } from "react-router-dom";
import {
  AlarmClock, ArrowUpRight, AtSign, Banknote, Bell, CheckCheck, HardHat,
  Info, LifeBuoy, Users, X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import EmptyState from "@/components/patterns/EmptyState";
import { fromNow } from "@/utils/formatters";
import { cn } from "@/lib/utils";
import { NOTIF } from "@/constants/testIds";

export const CATEGORY_ICON = {
  tugas: AlarmClock, keuangan: Banknote, penjualan: Users, proyek: HardHat,
  layanan: LifeBuoy, sebutan: AtSign, sistem: Info,
};

/**
 * NotificationRows — daftar notifikasi RINGKAS (Fase 64).
 *
 * Bentuk lamanya: satu kartu tinggi per notifikasi (judul + isi + waktu, tiga baris) tanpa
 * kategori dan tanpa tautan, sehingga 40 notifikasi = layar sepanjang lima kali lipat yang
 * tidak menolong siapa pun. Di sini satu notifikasi = SATU baris padat: ikon kategori,
 * judul, isi terpangkas satu baris, waktu, dan tombol yang benar-benar membawa pemakai ke
 * pekerjaannya. Notifikasi yang tindakannya sudah dilakukan tampil dengan keterangan
 * "sudah ditangani" — bukan tetap berdiri seperti tugas yang belum selesai.
 */
export default function NotificationRows({ rows = [], onRead, onDismiss, emptyState }) {
  const navigate = useNavigate();

  if (!rows.length) {
    return (
      <EmptyState testId={NOTIF.empty} icon={Bell} title={emptyState?.title || "Bersih"}
        description={emptyState?.description
          || "Tidak ada notifikasi pada tampilan ini."} />
    );
  }

  const open = async (n) => {
    if (!n.read) await onRead(n, { silent: true });
    if (n.link) navigate(n.link);
  };

  return (
    <ul className="divide-y rounded-xl border bg-card">
      {rows.map((n) => {
        const Icon = CATEGORY_ICON[n.category] || Info;
        return (
          <li key={n.id} data-testid={NOTIF.item} data-category={n.category}
            data-read={n.read ? "1" : "0"}
            className={cn("group flex items-center gap-3 px-3 py-2 transition-colors hover:bg-secondary/60",
              !n.read && "bg-accent/30")}>
            <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
              n.read ? "bg-secondary text-muted-foreground" : "bg-primary/10 text-primary")}>
              <Icon className="h-3.5 w-3.5" />
            </span>

            <button type="button" onClick={() => open(n)}
              className="min-w-0 flex-1 text-left">
              <span className="flex items-center gap-1.5">
                {!n.read ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /> : null}
                <span className={cn("truncate text-sm", !n.read && "font-semibold")}>
                  {n.title}
                </span>
                {n.needs_action && !n.resolved_at ? (
                  <span data-testid={NOTIF.actionBadge}
                    className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-amber-900">
                    perlu tindakan
                  </span>
                ) : null}
                {n.resolved_at ? (
                  <span data-testid={NOTIF.resolvedNote}
                    className="shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-800">
                    sudah ditangani
                  </span>
                ) : null}
              </span>
              <span className="flex items-baseline gap-2">
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                  {n.body || "—"}
                </span>
                <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                  {fromNow(n.created_at)}
                </span>
              </span>
            </button>

            <div className="flex shrink-0 items-center gap-0.5">
              {n.link ? (
                <Button size="icon" variant="ghost" data-testid={NOTIF.openBtn}
                  aria-label={`Buka ${n.title}`} onClick={() => open(n)}
                  className="h-7 w-7 opacity-60 group-hover:opacity-100">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              ) : null}
              {!n.read ? (
                <Button size="icon" variant="ghost" aria-label={`Tandai dibaca ${n.title}`}
                  onClick={() => onRead(n)}
                  className="h-7 w-7 opacity-60 group-hover:opacity-100">
                  <CheckCheck className="h-3.5 w-3.5" />
                </Button>
              ) : null}
              <Button size="icon" variant="ghost" data-testid={NOTIF.dismissBtn}
                aria-label={`Sembunyikan ${n.title}`} onClick={() => onDismiss(n)}
                className="h-7 w-7 opacity-60 group-hover:opacity-100">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
