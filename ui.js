// Sidebar logic
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
}

function kirimLaporanAdmin() {
    const selectEl = document.getElementById('keluhan_kategori');
    let kategori = selectEl ? selectEl.value : 'Lainnya';
    const emailAdmin = 'admin@example.com'; // ganti dengan email admin sebenarnya jika ada
    const subject = encodeURIComponent(`Laporan Kendala Aplikasi: ${kategori}`);
    const body = encodeURIComponent(`Halo Admin,\n\nSaya menemukan kendala pada bagian: ${kategori}.\n\nDetail Keluhan:\n[Silakan jelaskan keluhan atau error yang Anda alami di sini...]\n\nTerima kasih.`);
    
    window.location.href = `mailto:${emailAdmin}?subject=${subject}&body=${body}`;
}

// Tab logic
function showTab(tab, btn) {
    document.querySelectorAll('.tab-content').forEach((el) => el.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach((el) => el.classList.remove('active'));
    document.querySelectorAll('.bottom-tab').forEach((el) => el.classList.remove('active'));
    
    const targetTab = document.getElementById(tab);
    if (targetTab) targetTab.classList.add('active');
    
    const topBtn = document.querySelector(`.nav-tab[data-tab="${tab}"]`);
    if (topBtn) topBtn.classList.add('active');
    
    const bottomTabs = document.querySelectorAll('.bottom-tab');
    bottomTabs.forEach((bt) => {
        const onClickAttr = bt.getAttribute('onclick');
        if (onClickAttr && onClickAttr.includes(`'${tab}'`)) {
            bt.classList.add('active');
        }
    });

    if (tab === 'database' && typeof loadDatabase === 'function') {
        loadDatabase();
    }
}

function resetForm() {
    if (!confirm('Reset semua input?')) return;
    document.querySelectorAll('#antropometri input, #antropometri select').forEach((input) => {
        if (input.type !== 'button') input.value = '';
    });
    const today = new Date();
    document.getElementById('tanggal_ukur').valueAsDate = today;
    const calcMode = document.getElementById('calculation_mode');
    if (calcMode) calcMode.value = 'auto_split';
    document.getElementById('hasil-antropometri').style.display = 'none';
    
    window.hasilSementara = null;
    window.lastParsedAgeParts = null;
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-tab').forEach((btn) => {
        btn.addEventListener('click', function () {
            showTab(this.getAttribute('data-tab'), this);
        });
    });

    const today = new Date();
    if (!document.getElementById('tanggal_ukur').value) {
        document.getElementById('tanggal_ukur').valueAsDate = today;
    }

    if (typeof loadDatabase === 'function') {
        loadDatabase();
    } else {
        setTimeout(() => {
            if (typeof loadDatabase === 'function') loadDatabase();
        }, 50);
    }
});

// ============================================================================
// DARK MODE TOGGLE
// ============================================================================
function applyTheme(isDark) {
    const body = document.body;
    const btn = document.getElementById('theme-toggle');
    if (isDark) {
        body.classList.add('dark-mode');
        if (btn) btn.innerHTML = '☀️';
    } else {
        body.classList.remove('dark-mode');
        if (btn) btn.innerHTML = '🌙';
    }
    try { localStorage.setItem('antro_theme', isDark ? 'dark' : 'light'); } catch (e) {}
}

function toggleTheme() {
    applyTheme(!document.body.classList.contains('dark-mode'));
}

window.applyTheme = applyTheme;
window.toggleTheme = toggleTheme;

document.addEventListener('DOMContentLoaded', () => {
    let pref = 'light';
    try { pref = localStorage.getItem('antro_theme') || 'light'; } catch (e) {}
    applyTheme(pref === 'dark');
});

function syncCalculationModeUI() {
    // Mode is updated silently, just keep it here for compatibility with index.html calls
}
window.syncCalculationModeUI = syncCalculationModeUI;
