"""ROUTER KONFIGURASI TAMPILAN DOKUMEN (Fase 60) — prefix `/doc-layouts`.

Bukan menu baru: dipakai oleh tab **Master Data → Template Dokumen** yang sudah ada.
Prefix sendiri (bukan di bawah `/documents`) karena `documents_router` punya jalur
`/{doc_id}` yang akan menelan sub-jalur baru sebagai id dokumen.

Pemisahan tugas: MEMBACA konfigurasi = `documents:view`; MENGUBAH & PRATINJAU dengan
rancangan yang belum disimpan = `settings:update`. Kop surat & identitas perusahaan adalah
pengaturan ORGANISASI — sales yang boleh menerbitkan dokumen tidak boleh mengubah wajah
seluruh dokumen perusahaan.
"""
from fastapi import APIRouter, Depends, HTTPException, Response

import doc_layout as dl
import pdf_layout as pl
from core_utils import serialize_doc
from db import ORG_ID, db
from models_p60 import DocLayoutSave
from rbac import audit_log, require_permission

router = APIRouter(prefix="/doc-layouts", tags=["doc-layouts"])


def _org(user: dict) -> str:
    return user.get("org_id", ORG_ID)


@router.get("")
async def list_layouts(user: dict = Depends(require_permission("documents", "view"))):
    """Daftar dokumen yang bisa dikonfigurasi + mana yang sudah disesuaikan."""
    return {"data": await dl.list_targets(_org(user)),
            "money_rows_catalog": [{"code": c, "label": lbl} for c, lbl in dl.MONEY_ROWS],
            "sections_catalog": [{"key": k, "label": lbl} for k, lbl in dl.SECTIONS]}


@router.get("/{code}")
async def get_layout(code: str, user: dict = Depends(require_permission("documents", "view"))):
    if code not in dl.TARGETS:
        raise HTTPException(status_code=404, detail=f"Dokumen '{code}' tidak dikenal.")
    return {"data": serialize_doc(await dl.get_layout(_org(user), code))}


@router.put("/{code}")
async def save_layout(code: str, payload: DocLayoutSave,
                      user: dict = Depends(require_permission("settings", "update"))):
    if code not in dl.TARGETS:
        raise HTTPException(status_code=404, detail=f"Dokumen '{code}' tidak dikenal.")
    out = await dl.save_layout(_org(user), code, payload.model_dump(exclude_none=True),
                               user.get("email"))
    await audit_log(user, "update", "document_layouts", code,
                    {"sections": len(out.get("sections") or []),
                     "signatures": len(out.get("signatures") or [])})
    return {"data": serialize_doc(out)}


@router.delete("/{code}")
async def reset_layout(code: str,
                       user: dict = Depends(require_permission("settings", "update"))):
    """Kembalikan ke bawaan — dokumen yang sudah terbit tidak ikut berubah."""
    if code not in dl.TARGETS:
        raise HTTPException(status_code=404, detail=f"Dokumen '{code}' tidak dikenal.")
    out = await dl.reset_layout(_org(user), code)
    await audit_log(user, "delete", "document_layouts", code)
    return {"data": serialize_doc(out)}


@router.post("/{code}/preview")
async def preview(code: str, payload: DocLayoutSave, document_id: str = None,
                  user: dict = Depends(require_permission("settings", "update"))):
    """PDF pratinjau dari rancangan yang BELUM disimpan — mesin cetak yang sama.

    `document_id` opsional: pratinjau memakai DATA NYATA dokumen yang sudah terbit, supaya
    pemakai tidak menebak bagaimana konfigurasinya bekerja pada dokumen sungguhan.
    """
    if code not in dl.TARGETS:
        raise HTTPException(status_code=404, detail=f"Dokumen '{code}' tidak dikenal.")
    org = _org(user)
    layout = dl._merge(await dl.get_layout(org, code),
                       payload.model_dump(exclude_none=True))
    imgs = await dl.images(org, layout)
    contoh = dl.sample_document(layout)
    if (layout.get("kind") or "letter") == "table":
        pdf = pl.render_table(
            layout, imgs, title="LAPORAN CONTOH — Aging Piutang",
            subtitle="Pratinjau tampilan laporan tabel", columns=["Kategori umur", "Nilai"],
            rows=[["Lancar", "Rp 1.250.000.000"], ["1-30 hari", "Rp 212.500.000"],
                  ["31-60 hari", "Rp 0"]],
            total_row=["Total", "Rp 1.462.500.000"],
            note="Pratinjau dengan data contoh — bukan laporan sungguhan.")
        return Response(content=pdf, media_type="application/pdf")

    title, number, meta, content, clauses, note = (
        contoh["title"], contoh["doc_number"], contoh["meta"], "", contoh["clauses"],
        contoh["note"])
    amounts = contoh["amounts"]
    if document_id:
        doc = await db.documents.find_one({"id": document_id, "org_id": org}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Dokumen tidak ditemukan.")
        snap = doc.get("context_snapshot") or {}
        title, number, content = (doc.get("title") or title), doc.get("doc_number"), \
            doc.get("content") or ""
        meta = [("Pemesan", snap.get("customer_name") or "-"),
                ("Unit", snap.get("unit_block") or "-"),
                ("Proyek", snap.get("property_name") or "-")]
        amounts, clauses, note = {}, None, "Pratinjau memakai data dokumen nyata."
    rows = dl.money_rows_for(layout, amounts) if amounts else []
    sigs = dl.signatures_for(layout, issuer_name=user.get("name"),
                             issuer_position=user.get("role"))
    layout.setdefault("options", {})["doc_date"] = (layout["options"].get("doc_date")
                                                    or "26 Agustus 2026")
    pdf = pl.render_letter(layout, imgs, title=title, doc_number=number, content=content,
                           meta=meta if dl.section_visible(layout, "identitas") else None,
                           money_rows=rows if dl.section_visible(layout, "biaya") else None,
                           clauses=clauses if dl.section_visible(layout, "ketentuan") else None,
                           note=note, signatures_override=sigs)
    return Response(content=pdf, media_type="application/pdf", headers={
        "Content-Disposition": f'inline; filename="pratinjau-{code}.pdf"'})
