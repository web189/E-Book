# UI 32 — tampilan PC modern (ui32.css)
- Hanya aktif di layar >= 1101px. HP & tablet tidak berubah.
- >= 1280px: header dua baris (merek + aksi di atas, semua menu sebagai tab di bawah) sehingga seluruh menu terlihat di laptop 1366px. 1101-1279px memakai menu laci seperti sebelumnya.
- Tanpa backdrop-filter / blur / filter / :has / color-mix; aman Windows 7 (Chrome 109). Ukuran ui32.css sekitar 20 KB.
- Kembali ke tampilan lama: hapus baris `ui32.css` di index.html dan sw.js (dan pwa.js bila mau), lalu naikkan VERSION di sw.js.
