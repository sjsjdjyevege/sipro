# SIPRO — Property Development OS (PRD)

Aplikasi manajemen properti & konstruksi (React + FastAPI + MongoDB) dengan RBAC ketat,
keuangan/GL, konstruksi berbukti, portal pembeli, dan dokumen PDF ber-kop.
Bahasa produk & komunikasi: **Indonesia**.

## Aturan kerja yang tidak boleh dilanggar
- `bash scripts/run_all_gates.sh` adalah nyawa proyek. Semua gate harus PASS (sekarang **52 gate**).
- Batas ukuran berkas: Python < 800 baris, JS < 500 baris (`validate_compliance.py`).
- Form: tidak boleh `<Input>` bebas untuk nilai enum/relasi (`audit_forms_deep.py`); setiap
  `<Input>` wajib punya label/placeholder/aria-label.
- Kosakata enum hanya dari SSOT `/api/reference` (`reference_groups.py` + `reference_p<NN>.py`).
- Kredensial uji: `/app/memory/test_credentials.md` (sandi demo `Sipro#2026`).

## Riwayat implementasi (terbaru di atas)
### 27 Jun 2026 — Fase 61: cetak SPK & PO (SELESAI, gate 52 hijau)
- `backend/docgen_p61.py`: isi SPK (identitas pihak, nilai kontrak, retensi, masa
  pemeliharaan, rincian lingkup dari `spk_scope_items`, 5 ketentuan) & PO (penyedia, jenis,
  jatuh tempo, rincian item + total, 4 ketentuan). Dokumen berstatus `draft` DIPAKSA
  bertanda watermark DRAFT. Nama pihak kedua = subkontraktor/vendor (bukan "Pemesan").
- `pdf_layout.render_letter(..., item_table=...)` + helper `_grid` (dipakai bersama laporan).
- Endpoint: `GET /api/subcon/spk/{id}/pdf`, `GET /api/procurement/pos/{id}/pdf`.
- UI: `patterns/PrintDocButton.js` dipakai di `SPKDetailSheet` & `PODetailSheet`
  (testId `spk-print-pdf`, `po-print-pdf`).
- Target layout baru di Pusat Konfigurasi Dokumen: `SPK`, `PO`.
- Gate baru `scripts/verify_p61.py` (24 pemeriksaan). Uji UI: iteration_97 (bersih).
- PDF diperiksa visual (render PNG): kop, rincian, ketentuan, dua kolom tanda tangan OK.

### 27 Jun 2026 (lanjutan) — Fase 62: dokumen penagihan & lapangan (SELESAI, gate 53 hijau)
- **Surat Peringatan SP1/SP2/SP3** (`warning_letters.py` + `docgen_p62.sp_pdf`): angka & termin
  dari mesin denda (`late_fee_engine` via `arrears_engine.months_in_arrears`), tingkat TIDAK
  boleh melompat, SP3 hanya sah setelah tunggakan mencapai `payment.staged.arrears_months_to_cancel`,
  nomor atomik `SP{n}/TAHUN/URUT`, idempoten per (kontrak, tingkat, bulan) + indeks unik.
  Endpoint: `GET/POST /api/docs/warning-letters`, `GET /api/docs/warning-letters/state`,
  `GET /api/docs/warning-letters/{id}/pdf`. Terbit = `late_fee:create` (Keuangan); baca =
  `late_fee:view` (sales ber-scope hanya transaksinya). Surat MEMPERINGATKAN, tidak membatalkan.
- **Berita Acara Opname** (`GET /api/subcon/claims/{id}/pdf`): rincian dari BARIS TERMIN yang sama
  dengan tagihan AP, pekerjaan yang DIKELUARKAN opname tercetak beserta alasannya, retensi &
  netto disebut, termin yang belum di-opname dipaksa bertanda DRAFT.
- **Berita Acara Punch List** (`GET /api/field/punchlist/pdf`): lingkup = filter yang sedang
  dilihat (proyek/kavling/status), kolom bukti perbaikan, 3 ketentuan lapangan.
- **Lampiran SPK**: `spk_attachments` + `GET/POST/DELETE /api/subcon/spk/{id}/attachments`
  (`subcon:update`); gambar/spesifikasi tercetak sebagai HALAMAN LAMPIRAN pada PDF SPK
  (`pdf_layout._attachment_flow`, gambar dirender apa adanya; berkas hilang tidak menggagalkan
  cetak).
- **Kirim dokumen ke pihak luar** (`doc_share.py`): tautan berbatas waktu (14 hari, token acak,
  bisa dicabut, pembukaan tercatat) + pesan `wa.me` siap kirim. `POST /api/docs/share`,
  `GET /api/public/docs/{token}` (tanpa login, satu token = satu dokumen, dirender ULANG dari
  data terkini). TIDAK memakai API Meta — manusia yang menekan kirim. Hak berbagi = hak atas
  dokumennya (`doc_share.PERMISSION`).
- Target layout baru: `SP`, `BA_OPNAME`, `PUNCHLIST`. Kamus SSOT baru: `warning_level`,
  `spk_attachment_kind` (`reference_p62.py`).
- Gate baru `scripts/verify_p62.py` (59 pemeriksaan) → `run_all_gates.sh` **OVERALL PASS (53
  gates)**. Uji UI: iteration_98 (10/10 alur bersih). Keempat PDF diperiksa visual per halaman.

### 27 Jun 2026 — Fase 60: konfigurasi tampilan dokumen (SELESAI, gate 51 hijau)
- Panel `Master Data → Template Dokumen → Tampilan & kop surat` (`DocLayoutPanel`) dengan
  pratinjau PDF BERDAMPINGAN yang dirender mesin cetak yang sama (`pdf_layout.py`).
- Kop/footer 2 mode (dirakit sistem / gambar desain), watermark, kertas & margin, baris
  biaya (urut, sembunyikan, sembunyikan bila Rp 0, baris manual), tanda tangan dinamis.
- Hak akses ubah = `settings:update` (identitas perusahaan = pengaturan organisasi);
  baca = `documents:view`.
- Bidang usaha jadi dropdown SSOT (`reference_p60.business_field`).
- Jalur cetak yang memakai layout: dokumen staf, **portal pembeli** (diperbaiki), kwitansi,
  penawaran, BAST.
- Gate baru `scripts/verify_p61.py`→(60) `scripts/verify_p60.py` (38 pemeriksaan). UI: iteration_96.
- Perbaikan gate lain: `audit_forms_deep.py` (tagline → dropdown; aria-label RowsForm &
  CostsDialog) dan `verify_analytics.py` (`analytics_engine.rebuild_snapshots` sekarang
  MEMPERBAIKI seluruh riwayat snapshot, bukan hanya hari ini).

### Sebelumnya
- Fase 59: laporan keringanan denda, kandidat tunggakan (2 bulan → usulan pembatalan), utang refund.
- Fase 58: toleransi & keringanan denda keterlambatan.
- Fase ≤57: CRM, kontrak & skema pembayaran, konstruksi berbukti, pengadaan 3-way match,
  subkon/opname/retensi, GL & pajak, portal pembeli, WA/omnichannel, analitik BI.

## Backlog
### P1
- ~~Surat Peringatan Tunggakan (SP1/SP2/SP3)~~ — SELESAI Fase 62.
- ~~Berita Acara Opname / Punch List PDF~~ — SELESAI Fase 62.
- ~~Lampiran gambar/spesifikasi pada SPK~~ — SELESAI Fase 62.
- Mutasi Fase 62 (`scripts/mutasi_62.py`) belum ada — gate 53 menjaga, ketangguhannya belum
  diuji dengan mutan.
### P2
- Pengingat WhatsApp untuk pembeli menunggak (kirim SP1 otomatis sesudah H+N lewat toleransi).
- Riwayat pengiriman dokumen di layar (data `GET /api/docs/share` sudah ada, panelnya belum).
- Peringatan dini tunggakan 1 bulan sebelum batas pembatalan kontrak.
- Ringkasan direksi: email digest laporan keringanan & utang refund setiap awal bulan.
