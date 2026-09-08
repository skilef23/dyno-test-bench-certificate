# Cara memasukkan perbaikan melalui browser GitHub

Repository: https://github.com/skilef23/dyno-test-bench-certificate
Dasar revisi: commit 251a022aaf2bf852d34193b19b51ec54edad2a80.

Paket ini berisi file yang berubah atau ditambahkan, bukan repository lengkap. Pertahankan seluruh file lain di repository. Tidak perlu menginstal aplikasi GitHub.

1. Ekstrak ZIP di komputer.
2. Buka repository pada browser dan login.
3. Dari pemilih branch, buat branch baru bernama `fix/test-validation-approval` berdasarkan main. Jangan langsung mengganti main.
4. Pilih **Add file → Upload files** pada root repository.
5. Seret seluruh ISI folder hasil ekstrak, termasuk folder `src` dan `tests`, serta file di root seperti package.json dan package-lock.json. Pertahankan struktur folder. Jangan mengunggah ZIP sebagai satu file dan jangan mengunggah folder pembungkusnya.
6. Periksa daftar file: file kode harus muncul sebagai `src/...`, bukan `nama-folder/src/...`.
7. Commit perubahan ke branch tersebut dengan pesan `Fix DynPro validation and certificate approval`.
8. Buat pull request ke main dan tinjau perubahan sebelum merge.

Alternatif editor: buka https://github.dev/skilef23/dyno-test-bench-certificate lalu buat branch dan ganti/tambahkan file dengan isi paket ini.

GitHub web editor tidak menjalankan build. Gunakan Codespaces atau proses CI untuk menjalankan `npm ci`, `npm run lint`, `npm test`, dan `npm run build` bila ingin memverifikasi di lingkungan Anda. Merge tidak otomatis memastikan aplikasi AI Studio yang sedang tayang menggunakan versi ini; deployment harus mengikuti konfigurasi proyek Anda.

## Cakupan tahap ini

- Import invalid ditolak tanpa data simulasi; PDF worker dibundel.
- Evaluasi numerik, NG/NOT GOOD, parameter wajib/opsional dan RH/LH diperbaiki.
- Hasil aktual dievaluasi ulang saat save dan approval.
- Submission lengkap berstatus FAIL boleh direview tetapi tidak dapat diapprove.
- APPROVED dan WAITING_APPROVAL terkunci dari edit; delete hanya Draft sesuai role.
- Konfirmasi performa dibatalkan saat sumber, faktor, produk atau nilai power/torque berubah.
- Laporan PENDING tidak dilabeli FAILED; laporan belum sah memakai status/watermark pada kedua halaman.
- Data lama tidak direset atau dimigrasi. Approved lama yang tidak memenuhi verifikasi ditandai untuk review.
- TypeScript dan pemanggilan komponen RH/LH serta signature diperbaiki.

## Batas verifikasi

34 pengujian otomatis, pemeriksaan TypeScript dan build dijalankan pada salinan repository. HTML sertifikat diuji; tampilan browser live, cetak/PDF aktual dan file DynPro milik pengguna belum diuji. Import mendukung tiga kolom RPM/Power/Torque atau empat kolom dengan nomor baris; format lain ditolak sampai pemetaan kolomnya ditambahkan.

Firebase, login produksi, penyimpanan PDF permanen, backup/restore penuh, dan validasi batas deviasi RPM per produk belum diselesaikan. Restore yang sebelumnya memanggil fungsi tidak tersedia sekarang berhenti dengan pesan jelas sebelum mengubah data. Lihat README.md.

Perubahan ini belum di-push atau di-merge oleh asisten. Paket adalah hasil yang siap ditinjau dan dimasukkan melalui browser.
