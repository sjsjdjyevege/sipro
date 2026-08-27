// data-testid Fase 60 — Konfigurasi Tampilan Dokumen (kop, footer, tanda tangan, baris biaya).
//
// Dokumen yang keluar dari sistem ini dulu adalah teks polos tanpa kop/footer/tanda tangan.
// Panel konfigurasi + pratinjau berdampingan inilah yang membuatnya layak diserahkan kepada
// pembeli, bank, dan notaris. Tanpa testId, penguji tidak bisa membedakan pratinjau yang
// GAGAL dirender dari pratinjau yang memang belum diminta.
export const P60 = {
  panel: "doc-layout-panel",
  targetSelect: "doc-layout-target",
  tabBrand: "doc-layout-tab-brand",
  tabRows: "doc-layout-tab-rows",
  tabSign: "doc-layout-tab-sign",
  tabPage: "doc-layout-tab-page",

  companyName: "doc-layout-company-name",
  address: "doc-layout-address",
  phone: "doc-layout-phone",
  email: "doc-layout-email",
  website: "doc-layout-website",
  npwp: "doc-layout-npwp",
  headerMode: "doc-layout-header-mode",
  footerMode: "doc-layout-footer-mode",
  footerText: "doc-layout-footer-text",
  accent: "doc-layout-accent",
  logoUpload: "doc-layout-logo-upload",
  headerUpload: "doc-layout-header-upload",
  footerUpload: "doc-layout-footer-upload",
  watermarkText: "doc-layout-watermark-text",
  paper: "doc-layout-paper",
  marginTop: "doc-layout-margin-top",

  rowItem: "doc-layout-row-item",
  rowVisible: "doc-layout-row-visible",
  rowHideZero: "doc-layout-row-hide-zero",
  rowLabel: "doc-layout-row-label",
  rowUp: "doc-layout-row-up",
  rowDown: "doc-layout-row-down",
  rowAddManual: "doc-layout-row-add-manual",
  rowAmount: "doc-layout-row-amount",
  hideZeroGlobal: "doc-layout-hide-zero-global",
  sectionItem: "doc-layout-section-item",

  signItem: "doc-layout-sign-item",
  signTitle: "doc-layout-sign-title",
  signName: "doc-layout-sign-name",
  signPosition: "doc-layout-sign-position",
  signStamp: "doc-layout-sign-stamp",
  signAuto: "doc-layout-sign-auto",
  signUpload: "doc-layout-sign-upload",
  signAdd: "doc-layout-sign-add",
  signRemove: "doc-layout-sign-remove",
  materai: "doc-layout-materai",
  placeDate: "doc-layout-place-date",
  place: "doc-layout-place",

  preview: "doc-layout-preview",
  previewRefresh: "doc-layout-preview-refresh",
  previewReal: "doc-layout-preview-real",
  previewDownload: "doc-layout-preview-download",
  previewError: "doc-layout-preview-error",
  saveBtn: "doc-layout-save",
  resetBtn: "doc-layout-reset",
  denied: "doc-layout-denied",
};
