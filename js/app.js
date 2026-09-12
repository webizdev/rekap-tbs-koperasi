// State
let masterPetani = [];
let rekapTab = 'akumulasi';
let chartInstance = null;

const fmt = new Intl.NumberFormat('id-ID');

// Auth & Navigation
function checkAuth() {
    const isAuth = localStorage.getItem('auth_tbs');
    if (isAuth === 'true') {
        document.getElementById('loginPage').classList.add('hidden-page');
        document.getElementById('authLayout').classList.remove('hidden-page');
        loadMasterData();
        navTo('dashboard');
    } else {
        document.getElementById('loginPage').classList.remove('hidden-page');
        document.getElementById('authLayout').classList.add('hidden-page');
    }
}

function handleLogin() {
    const user = document.getElementById('loginUser').value;
    const pass = document.getElementById('loginPass').value;
    if (user === 'admin' && pass === 'adminkop') {
        localStorage.setItem('auth_tbs', 'true');
        showToast('Login berhasil!');
        checkAuth();
    } else {
        showToast('Username atau password salah!');
    }
}

function handleLogout() {
    localStorage.removeItem('auth_tbs');
    checkAuth();
}

function navTo(page) {
    document.querySelectorAll('.app-page').forEach(p => p.classList.add('hidden-page'));
    document.querySelectorAll('.nav-btn').forEach(b => {
        b.classList.remove('bg-green-900');
        b.classList.add('hover:bg-green-700');
    });

    document.getElementById('page-' + page).classList.remove('hidden-page');
    const btn = document.getElementById('nav-' + page);
    btn.classList.add('bg-green-900');
    btn.classList.remove('hover:bg-green-700');

    if (page === 'dashboard') loadDashboard();
    if (page === 'upload') loadUploadData();
    if (page === 'rekap') loadRekapData();
    if (page === 'anggota') loadAnggota();
    if (page === 'settings') loadSettings();
    if (page === 'slip') loadSlipUI();
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.innerText = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Data Loaders
async function loadMasterData() {
    try {
        const res = await fetch('api/data.php?action=get_master&_=' + new Date().getTime());
        const json = await res.json();
        if (json.success) masterPetani = json.data;
    } catch (e) {
        if (window.location.protocol === 'file:') {
            alert('PERINGATAN: Anda membuka file index.html langsung (file:///). Aplikasi ini HARUS dijalankan melalui server Docker di http://localhost:8000 agar PHP dan Database berfungsi!');
        } else {
            console.error('Fetch error:', e);
            showToast('Gagal memuat data dari server!');
        }
    }
}

async function loadAnggota() {
    await loadMasterData();
    const tbody = document.getElementById('anggotaTableBody');
    tbody.innerHTML = '';
    
    if (masterPetani.length > 0) {
        masterPetani.forEach(p => {
            tbody.innerHTML += `
                <tr class="hover:bg-gray-50">
                    <td class="px-4 py-3 font-medium text-gray-500">${p.id_petani}</td>
                    <td class="px-4 py-3 font-bold text-gray-800">${p.nama_baku}</td>
                    <td class="px-4 py-3 text-center">
                        <button onclick="editAnggota(${p.id_petani}, '${p.nama_baku}')" class="bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1 rounded text-xs font-semibold">Edit</button>
                    </td>
                </tr>
            `;
        });
    } else {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center py-4">Belum ada data anggota.</td></tr>`;
    }
}

function formatRp(val) {
    if (!val) return 'Rp 0';
    return 'Rp ' + fmt.format(val);
}

function formatNum(val) {
    if (!val) return '0';
    return fmt.format(val);
}

function formatTanggal(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
}

function tambahAnggota() {
    document.getElementById('modalTitle').innerText = 'Tambah Anggota';
    document.getElementById('modalIdPetani').value = '';
    document.getElementById('modalNamaPetani').value = '';
    document.getElementById('anggotaModal').classList.remove('hidden-page');
}

function editAnggota(id, currentName) {
    document.getElementById('modalTitle').innerText = 'Edit Anggota';
    document.getElementById('modalIdPetani').value = id;
    document.getElementById('modalNamaPetani').value = currentName;
    document.getElementById('anggotaModal').classList.remove('hidden-page');
}

function closeModal() {
    document.getElementById('anggotaModal').classList.add('hidden-page');
}

async function saveAnggota() {
    const id = document.getElementById('modalIdPetani').value;
    const inputNama = document.getElementById('modalNamaPetani').value.trim();
    
    if (!inputNama) {
        showToast('Nama tidak boleh kosong!');
        return;
    }
    
    const btn = document.querySelector('#anggotaModal button.bg-green-600');
    const oldText = btn.innerText;
    btn.innerText = 'Menyimpan...';
    btn.disabled = true;

    try {
        let endpoint = 'api/data.php?action=add_petani';
        let bodyData = { nama_baku: inputNama };
        
        if (id !== '') {
            endpoint = 'api/data.php?action=edit_petani';
            bodyData = { id_petani: id, nama_baku: inputNama };
        }

        const req = await fetch(endpoint, {
            method: 'POST', 
            body: JSON.stringify(bodyData)
        });
        
        const res = await req.json();
        if (res.success) {
            showToast(id === '' ? 'Berhasil menambah anggota!' : 'Nama berhasil diubah!');
            closeModal();
            loadAnggota();
        } else {
            showToast('Gagal: ' + res.message);
        }
    } catch (e) { 
        showToast('Error jaringan server'); 
    } finally {
        btn.innerText = oldText;
        btn.disabled = false;
    }
}

async function loadSettings() {
    try {
        const res = await fetch('api/data.php?action=get_settings&_=' + new Date().getTime());
        const json = await res.json();
        if (json.success && json.data) {
            document.getElementById('setNama').value = json.data.nama_koperasi || '';
            document.getElementById('setWA').value = json.data.whatsapp || '';
            document.getElementById('setAlamat').value = json.data.alamat || '';
            document.getElementById('setKetua').value = json.data.ketua || '';
            document.getElementById('setSek').value = json.data.sekretaris || '';
            document.getElementById('setBend').value = json.data.bendahara || '';
            document.getElementById('setFeeType').value = json.data.fee_type || 'percent';
            document.getElementById('setFeeAmount').value = json.data.fee_amount || 0;
            document.getElementById('setTax').value = json.data.tax_percent || 0;
        }
    } catch (e) { console.error('Error memuat pengaturan'); }
}

async function saveSettings() {
    const data = {
        nama_koperasi: document.getElementById('setNama').value,
        whatsapp: document.getElementById('setWA').value,
        alamat: document.getElementById('setAlamat').value,
        ketua: document.getElementById('setKetua').value,
        sekretaris: document.getElementById('setSek').value,
        bendahara: document.getElementById('setBend').value,
        fee_type: document.getElementById('setFeeType').value,
        fee_amount: document.getElementById('setFeeAmount').value,
        tax_percent: document.getElementById('setTax').value
    };
    
    try {
        const res = await fetch('api/data.php?action=update_settings', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        const json = await res.json();
        if (json.success) {
            showToast('Pengaturan Profil berhasil disimpan!');
        } else {
            showToast('Gagal: ' + json.message);
        }
    } catch (e) {
        alert('Gagal menyimpan');
    }
}

async function processExtractPdf(input) {
    if (input.files.length === 0) return;
    const file = input.files[0];
    
    showToast('Memindai PDF, mohon tunggu...');
    
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let farmerNames = new Set();
        
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            let pageText = textContent.items.map(i => i.str).join(' ');
            
            const regex = /(\d{4}-\d{2}-\d{2})\s+((?:COM|POM)\d+)\s+([A-Z0-9]+)\s+(.+?)(?=\s+\d+\s+[\d,]+\s)/g;
            let match;
            while ((match = regex.exec(pageText)) !== null) {
                farmerNames.add(match[4].trim());
            }
        }
        
        if (farmerNames.size === 0) {
            input.value = '';
            return alert('Tidak ada nama anggota ditemukan dalam PDF ini.');
        }
        
        const namesArray = Array.from(farmerNames);
        const res = await fetch('api/data.php?action=extract_anggota', {
            method: 'POST',
            body: JSON.stringify({ names: namesArray })
        });
        const json = await res.json();
        
        if (json.success) {
            alert(`Selesai! Ditemukan ${namesArray.length} nama unik. ${json.inserted} nama baru berhasil ditambahkan.`);
            loadAnggota();
        } else {
            alert('Gagal: ' + json.message);
        }
    } catch (e) {
        alert('Error parsing PDF: ' + e.message);
    }
    input.value = '';
}

function triggerResetData() {
    document.getElementById('inputResetConfirm').value = '';
    document.getElementById('resetModal').classList.remove('hidden-page');
}

function closeResetModal() {
    document.getElementById('resetModal').classList.add('hidden-page');
}

async function confirmResetData() {
    const confirmText = document.getElementById('inputResetConfirm').value;
    
    if (confirmText !== 'hapus data') {
        showToast('Reset dibatalkan: Konfirmasi salah.');
        return;
    }
    
    try {
        const res = await fetch('api/data.php?action=reset_data', { method: 'POST' });
        const json = await res.json();
        if (json.success) {
            alert('Semua data berhasil dihapus!');
            location.reload(); // Refresh total untuk memuat ulang tabel yang kosong
        } else {
            alert('Gagal Reset: ' + json.message);
        }
    } catch (e) {
        alert('Error saat mereset data!');
    }
}

let appSettings = null;

async function loadSlipUI() {
    await loadMasterData();
    document.getElementById('printArea').classList.add('hidden-page');
    document.getElementById('slipListContainer').classList.remove('hidden-page');
    
    // Set default month if empty
    if (!document.getElementById('slipMonth').value) {
        const today = new Date();
        document.getElementById('slipMonth').value = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0');
    }
    
    // Cache settings for print
    try {
        const res = await fetch('api/data.php?action=get_settings');
        const json = await res.json();
        if (json.success) appSettings = json.data;
    } catch (e) {}
    
    loadSlipSummary();
}

async function loadSlipSummary() {
    const bulan = document.getElementById('slipMonth').value;
    const statusBayar = document.getElementById('slipStatus').value;
    if (!bulan) return;
    
    const tbody = document.getElementById('slipSummaryBody');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4">Memuat data...</td></tr>';
    
    try {
        const res = await fetch(`api/data.php?action=get_slip_summary&bulan=${bulan}&status_bayar=${statusBayar}`);
        const json = await res.json();
        
        if (json.success && json.data.length > 0) {
            tbody.innerHTML = '';
            json.data.forEach(row => {
                tbody.innerHTML += `
                    <tr class="hover:bg-gray-50">
                        <td class="px-3 py-2 font-bold text-gray-800">${row.nama_baku}</td>
                        <td class="px-3 py-2 text-center text-xs text-gray-500">${row.total_transaksi} Trx</td>
                        <td class="px-3 py-2 text-right">${formatNum(row.jjg)}</td>
                        <td class="px-3 py-2 text-right">${formatNum(row.mill_kg)}</td>
                        <td class="px-3 py-2 text-right">${formatNum(row.deduc_kg)}</td>
                        <td class="px-3 py-2 text-right">${formatNum(row.incen_kg)}</td>
                        <td class="px-3 py-2 text-right bg-green-50 font-bold">${formatNum(row.net_kg)}</td>
                        <td class="px-3 py-2 text-right">${formatRp(row.mill_rp)}</td>
                        <td class="px-3 py-2 text-right text-red-600">${formatRp(row.deduc_rp)}</td>
                        <td class="px-3 py-2 text-right text-blue-600">${formatRp(row.incen_rp)}</td>
                        <td class="px-3 py-2 text-right bg-green-50 font-bold">${formatRp(row.net_rp)}</td>
                        <td class="px-3 py-2 text-center">
                            <button onclick="generateSlip(${row.id_petani})" class="bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1 rounded text-xs font-semibold whitespace-nowrap">Cetak Slip</button>
                        </td>
                    </tr>
                `;
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="12" class="text-center py-4 text-gray-500">Tidak ada data tagihan di bulan dan status ini.</td></tr>';
        }
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="12" class="text-center py-4 text-red-500">Gagal memuat data</td></tr>';
    }
}

function closePrintArea() {
    document.getElementById('printArea').classList.add('hidden-page');
    document.getElementById('slipListContainer').classList.remove('hidden-page');
}

function openEditTransaksiModal(wbTicket, currentIdPetani) {
    document.getElementById('editTransaksiWbTicket').value = wbTicket;
    document.getElementById('editTransaksiDropdownContainer').innerHTML = buildDropdown(currentIdPetani);
    document.getElementById('editTransaksiModal').classList.remove('hidden-page');
}

function closeEditTransaksiModal() {
    document.getElementById('editTransaksiModal').classList.add('hidden-page');
}

async function saveEditTransaksi() {
    const wbTicket = document.getElementById('editTransaksiWbTicket').value;
    const selectEl = document.querySelector('#editTransaksiDropdownContainer .petani-select');
    const idPetani = selectEl.value;
    
    if (!idPetani) return showToast('Pilih anggota baru terlebih dahulu!');
    
    try {
        const res = await fetch('api/data.php?action=verify_row', {
            method: 'POST',
            body: JSON.stringify({ wb_ticket: wbTicket, id_petani: idPetani, nama_di_pdf: '' })
        });
        const json = await res.json();
        if (json.success) {
            showToast('Nama valid berhasil diperbarui!');
            closeEditTransaksiModal();
            loadRekapData(); // Refresh list
        } else {
            alert('Gagal: ' + json.message);
        }
    } catch (e) {
        alert('Error jaringan saat menyimpan');
    }
}

let rekapTimeout;
function filterRekap() {
    clearTimeout(rekapTimeout);
    rekapTimeout = setTimeout(() => {
        loadRekapData();
    }, 500);
}

async function generateSlip(id_petani) {
    const bulan = document.getElementById('slipMonth').value;
    const statusBayar = document.getElementById('slipStatus').value;
    
    if (!id_petani || !bulan) {
        showToast('Pilih anggota dan bulan terlebih dahulu!');
        return;
    }
    
    try {
        const res = await fetch(`api/data.php?action=get_slip_data&id_petani=${id_petani}&bulan=${bulan}&status_bayar=${statusBayar}`);
        const json = await res.json();
        
        if (!json.success) {
            showToast(json.message);
            return;
        }
        
        if (json.data.length === 0) {
            alert('Tidak ada transaksi Verified & Unpaid untuk petani ini pada bulan tersebut.');
            document.getElementById('printArea').classList.add('hidden-page');
            return;
        }
        
        // Render Slip Header
        const petaniName = masterPetani.find(p => p.id_petani == id_petani)?.nama_baku || 'Unknown';
        document.getElementById('printNamaPetani').innerText = petaniName;
        document.getElementById('printBulan').innerText = bulan;
        
        if (appSettings) {
            document.getElementById('printKoperasi').innerText = appSettings.nama_koperasi || 'KOPERASI SAWIT';
            document.getElementById('printAlamat').innerText = appSettings.alamat || '-';
            document.getElementById('printWA').innerText = 'WhatsApp: ' + (appSettings.whatsapp || '-');
            document.getElementById('printSignPengurus').innerText = appSettings.bendahara || '.......................';
        }
        
        // Render Table & Calc
        let tbody = '';
        let sumKg = 0;
        let sumRp = 0;
        
        json.data.forEach((row, i) => {
            sumKg += parseFloat(row.net_weight_kg);
            sumRp += parseFloat(row.net_weight_rp);
            tbody += `
                <tr>
                    <td class="border border-gray-400 px-2 py-1 text-center">${i + 1}</td>
                    <td class="border border-gray-400 px-2 py-1 text-center">${formatTanggal(row.weighing_date)}</td>
                    <td class="border border-gray-400 px-2 py-1">${row.wb_ticket}</td>
                    <td class="border border-gray-400 px-2 py-1 text-right">${row.vehicle_no}</td>
                    <td class="border border-gray-400 px-2 py-1 text-right">${formatNum(row.net_weight_kg)}</td>
                    <td class="border border-gray-400 px-2 py-1 text-right">${formatRp(row.net_weight_rp)}</td>
                </tr>
            `;
        });
        document.getElementById('printTableBody').innerHTML = tbody;
        
        // Calc Potongan
        const taxPercent = parseFloat(appSettings?.tax_percent || 0);
        const taxVal = sumRp * (taxPercent / 100);
        
        const feeType = appSettings?.fee_type || 'percent';
        const feeAmount = parseFloat(appSettings?.fee_amount || 0);
        let feeVal = 0;
        let feeLabel = '';
        if (feeType === 'percent') {
            feeVal = sumRp * (feeAmount / 100);
            feeLabel = feeAmount + '%';
        } else {
            feeVal = sumKg * feeAmount;
            feeLabel = 'Rp ' + feeAmount + '/KG';
        }
        
        const grandTotal = sumRp - taxVal - feeVal;
        
        document.getElementById('printTotalKG').innerText = formatNum(sumKg) + ' KG';
        document.getElementById('printSubTotal').innerText = formatRp(sumRp);
        
        document.getElementById('printLabelTax').innerText = taxPercent;
        document.getElementById('printValTax').innerText = '- ' + formatRp(taxVal);
        
        document.getElementById('printLabelFee').innerText = feeLabel;
        document.getElementById('printValFee').innerText = '- ' + formatRp(feeVal);
        
        document.getElementById('printGrandTotal').innerText = formatRp(grandTotal);
        if (statusBayar === 'Paid') {
            document.getElementById('btnMarkPaid').classList.add('hidden-page');
            document.getElementById('printLunasWatermark').classList.remove('hidden-page');
        } else {
            document.getElementById('btnMarkPaid').classList.remove('hidden-page');
            document.getElementById('printLunasWatermark').classList.add('hidden-page');
        }
        
        document.getElementById('printArea').classList.remove('hidden-page');
        document.getElementById('slipListContainer').classList.add('hidden-page');
        document.getElementById('activeSlipPetaniId').value = id_petani;
        
    } catch (e) {
        showToast('Error saat mengambil data slip');
    }
}

function markSlipAsPaid() {
    const id_petani = document.getElementById('activeSlipPetaniId').value;
    const bulan = document.getElementById('slipMonth').value;
    if (!id_petani || !bulan) return;
    
    document.getElementById('confirmPaidModal').classList.remove('hidden-page');
}

function closeConfirmPaidModal() {
    document.getElementById('confirmPaidModal').classList.add('hidden-page');
}

async function executeMarkAsPaid() {
    closeConfirmPaidModal();
    const id_petani = document.getElementById('activeSlipPetaniId').value;
    const bulan = document.getElementById('slipMonth').value;
    
    if (!id_petani || !bulan) return;
    
    try {
        const res = await fetch('api/data.php?action=mark_as_paid', {
            method: 'POST',
            body: JSON.stringify({ id_petani, bulan })
        });
        const json = await res.json();
        if (json.success) {
            showToast('Berhasil ditandai sudah dibayar!');
            closePrintArea();
            loadSlipSummary();
        } else {
            alert('Gagal: ' + json.message);
        }
    } catch (e) {
        alert('Error jaringan');
    }
}

async function loadDashboard() {
    try {
        const res = await fetch('api/data.php?action=get_chart');
        const json = await res.json();
        if (json.success) {
            const labels = json.data.map(d => d.bulan);
            const values = json.data.map(d => d.total_kg);
            
            const ctx = document.getElementById('growthChart').getContext('2d');
            if (chartInstance) chartInstance.destroy();
            
            chartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Total Net KG per Bulan',
                        data: values,
                        borderColor: '#16a34a',
                        backgroundColor: 'rgba(22, 163, 74, 0.2)',
                        tension: 0.3,
                        fill: true,
                        pointBackgroundColor: '#16a34a'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        }
    } catch (e) { console.error(e); }
}

async function loadUploadData() {
    try {
        const res = await fetch(`api/data.php?action=get_rekap&status=Unverified`);
        const json = await res.json();
        const tbody = document.getElementById('uploadTableBody');
        tbody.innerHTML = '';

        if (json.success && json.data.length > 0) {
            json.data.forEach(row => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="px-3 py-2 whitespace-nowrap text-xs font-bold text-gray-700">${row.wb_ticket}</td>
                    <td class="px-3 py-2 whitespace-nowrap text-xs">${formatTanggal(row.weighing_date)}</td>
                    <td class="px-3 py-2 whitespace-nowrap text-xs">${row.vehicle_no}</td>
                    <td class="px-3 py-2 whitespace-nowrap text-xs ${row.id_petani ? 'text-green-600 font-bold' : 'text-red-500'}">${row.nama_di_pdf}</td>
                    <td class="px-3 py-2 whitespace-nowrap text-xs text-right">${fmt.format(row.graded_bunches)}</td>
                    <td class="px-3 py-2 whitespace-nowrap text-xs text-right font-semibold">${fmt.format(row.net_weight_kg)}</td>
                    <td class="px-3 py-2 whitespace-nowrap text-xs text-right text-green-700">${fmt.format(row.net_weight_rp)}</td>
                    <td class="px-3 py-2 whitespace-nowrap text-xs flex gap-2">
                        ${buildDropdown(row.id_petani)}
                        <button onclick="verifyRow('${row.wb_ticket}', '${row.nama_di_pdf}', this)" class="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded shadow">OK</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center py-6 text-gray-500">Tidak ada data antrean validasi.</td></tr>`;
        }
    } catch (e) { console.error(e); }
}

function switchRekapTab(tab) {
    rekapTab = tab;
    document.getElementById('tab-akumulasi').className = tab === 'akumulasi' ? 'px-4 py-2 font-medium bg-green-100 text-green-700 rounded-md' : 'px-4 py-2 font-medium text-gray-600 hover:bg-gray-100 rounded-md';
    document.getElementById('tab-transaksi').className = tab === 'transaksi' ? 'px-4 py-2 font-medium bg-green-100 text-green-700 rounded-md' : 'px-4 py-2 font-medium text-gray-600 hover:bg-gray-100 rounded-md';
    
    document.getElementById('view-akumulasi').classList.toggle('hidden-page', tab !== 'akumulasi');
    document.getElementById('view-transaksi').classList.toggle('hidden-page', tab !== 'transaksi');
    loadRekapData();
}

async function loadRekapData() {
    const search = document.getElementById('rekapSearch').value;
    const bulan = document.getElementById('rekapMonth') ? document.getElementById('rekapMonth').value : '';
    try {
        if (rekapTab === 'akumulasi') {
            const res = await fetch(`api/data.php?action=get_akumulasi&search=${encodeURIComponent(search)}&bulan=${bulan}`);
            const json = await res.json();
            const tbody = document.getElementById('akumulasiTableBody');
            tbody.innerHTML = '';
            if (json.success && json.data.length > 0) {
                json.data.forEach(row => {
                    tbody.innerHTML += `
                        <tr class="hover:bg-gray-50">
                            <td class="px-4 py-3 font-medium">${row.nama_baku}</td>
                            <td class="px-3 py-2 text-right">${row.total_transaksi}x</td>
                            <td class="px-3 py-2 text-right">${fmt.format(row.jjg)} JJG</td>
                            <td class="px-3 py-2 text-right whitespace-nowrap">${fmt.format(row.mill_kg)} KG</td>
                            <td class="px-3 py-2 text-right text-red-500 whitespace-nowrap">${fmt.format(row.deduc_kg)} KG</td>
                            <td class="px-3 py-2 text-right text-blue-500 whitespace-nowrap">${fmt.format(row.incen_kg)} KG</td>
                            <td class="px-3 py-2 text-right font-bold bg-green-50 whitespace-nowrap">${fmt.format(row.net_kg)} KG</td>
                            <td class="px-3 py-2 text-right whitespace-nowrap">Rp ${fmt.format(row.mill_rp)}</td>
                            <td class="px-3 py-2 text-right text-red-500 whitespace-nowrap">Rp ${fmt.format(row.deduc_rp)}</td>
                            <td class="px-3 py-2 text-right text-blue-500 whitespace-nowrap">Rp ${fmt.format(row.incen_rp)}</td>
                            <td class="px-3 py-2 text-right font-bold bg-green-50 text-green-700 whitespace-nowrap">Rp ${fmt.format(row.net_rp)}</td>
                        </tr>
                    `;
                });
            } else tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4">Data tidak ditemukan.</td></tr>`;
        } else {
            const res = await fetch(`api/data.php?action=get_rekap&status=Verified&search=${encodeURIComponent(search)}&bulan=${bulan}`);
            const json = await res.json();
            const tbody = document.getElementById('transaksiTableBody');
            tbody.innerHTML = '';
            if (json.success && json.data.length > 0) {
                json.data.forEach(row => {
                    tbody.innerHTML += `
                        <tr class="hover:bg-gray-50">
                            <td class="px-3 py-2 text-xs font-bold text-green-700 flex items-center gap-2">
                                <span>${row.nama_baku}</span>
                                <button onclick="openEditTransaksiModal('${row.wb_ticket}', '${row.id_petani}')" class="text-blue-500 hover:text-blue-700 p-1" title="Edit Nama Valid">✏️</button>
                            </td>
                            <td class="px-3 py-2 text-xs">${row.wb_ticket}</td>
                            <td class="px-3 py-2 text-xs">${formatTanggal(row.weighing_date)}</td>
                            <td class="px-3 py-2 text-xs text-right">${fmt.format(row.graded_bunches)} JJG</td>
                            <td class="px-3 py-2 text-xs text-right whitespace-nowrap">${fmt.format(row.mill_weight_kg)} KG</td>
                            <td class="px-3 py-2 text-xs text-right text-red-500 whitespace-nowrap">${fmt.format(row.deduction_kg)} KG</td>
                            <td class="px-3 py-2 text-xs text-right text-blue-500 whitespace-nowrap">${fmt.format(row.incentive_kg)} KG</td>
                            <td class="px-3 py-2 text-xs text-right font-bold bg-green-50 whitespace-nowrap">${fmt.format(row.net_weight_kg)} KG</td>
                            <td class="px-3 py-2 text-xs text-right whitespace-nowrap">Rp ${fmt.format(row.mill_weight_rp)}</td>
                            <td class="px-3 py-2 text-xs text-right text-red-500 whitespace-nowrap">Rp ${fmt.format(row.deduction_rp)}</td>
                            <td class="px-3 py-2 text-xs text-right text-blue-500 whitespace-nowrap">Rp ${fmt.format(row.incentive_rp)}</td>
                            <td class="px-3 py-2 text-xs text-right font-bold bg-green-50 text-green-700 whitespace-nowrap">Rp ${fmt.format(row.net_weight_rp)}</td>
                        </tr>
                    `;
                });
            } else tbody.innerHTML = `<tr><td colspan="12" class="text-center py-4">Data tidak ditemukan.</td></tr>`;
        }
    } catch (e) { console.error(e); }
}

function buildDropdown(selectedId) {
    let sel = `<select class="border border-gray-300 rounded px-1 py-1 text-xs focus:ring-green-500 w-32 petani-select">`;
    sel += `<option value="">-- Manual/Baru --</option>`;
    masterPetani.forEach(p => {
        const isSelected = (selectedId == p.id_petani) ? 'selected' : '';
        sel += `<option value="${p.id_petani}" ${isSelected}>${p.nama_baku}</option>`;
    });
    sel += `</select>`;
    return sel;
}

async function verifyRow(wbTicket, namaPdf, btnEl) {
    const tr = btnEl.closest('tr');
    const selectEl = tr.querySelector('.petani-select');
    let idPetani = selectEl.value;

    if (!idPetani) {
        let inputNama = prompt(`"${namaPdf}" belum ada di data Master.\nMasukkan NAMA BAKU untuk menambahkan ke master:`, namaPdf);
        if (!inputNama) return;
        
        try {
            const req = await fetch('api/data.php?action=add_petani', {
                method: 'POST', body: JSON.stringify({ nama_baku: inputNama })
            });
            const res = await req.json();
            if (res.success) {
                idPetani = res.id_petani;
                await loadMasterData();
            } else {
                showToast('Gagal tambah master petani.');
                return;
            }
        } catch (e) { return showToast('Error'); }
    }

    try {
        const res = await fetch('api/data.php?action=verify_row', {
            method: 'POST',
            body: JSON.stringify({ wb_ticket: wbTicket, id_petani: idPetani, nama_di_pdf: namaPdf })
        });
        const json = await res.json();
        if (json.success) {
            showToast('Sukses verifikasi!');
            loadUploadData(); // Refresh list
        } else {
            showToast('Gagal: ' + json.message);
        }
    } catch (e) { console.error(e); }
}

// PDF Extraction
async function processPDF() {
    const fileInput = document.getElementById('pdfFile');
    if (fileInput.files.length === 0) return showToast('Pilih PDF!');

    const file = fileInput.files[0];
    const statusEl = document.getElementById('uploadStatus');
    statusEl.innerHTML = '<span class="text-blue-600">Ekstraksi berjalan...</span>';

    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let extractedData = [];

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            let pageText = textContent.items.map(i => i.str).join(' ');
            
            // Format match: YYYY-MM-DD TICKET_NO VEHICLE_NO FARMER_NAME
            const regex = /(\d{4}-\d{2}-\d{2})\s+((?:COM|POM)\d+)\s+([A-Z0-9]+)\s+(.+?)(?=\s+\d+\s+[\d,]+\s)/g;
            let match;
            
            while ((match = regex.exec(pageText)) !== null) {
                const date = match[1];
                const ticket = match[2];
                const vehicle = match[3];
                const name = match[4].trim();

                const restOfString = pageText.substring(match.index + match[0].length).trim();
                const tokens = restOfString.split(/\s+/);
                
                if (tokens.length >= 9) {
                    extractedData.push({
                        weighing_date: date,
                        wb_ticket: ticket,
                        vehicle_no: vehicle,
                        farmer_name: name,
                        graded_bunches: tokens[0],
                        mill_weight_kg: tokens[1],
                        deduction_kg: tokens[2],
                        incentive_kg: tokens[3],
                        net_weight_kg: tokens[4],
                        mill_weight_rp: tokens[5],
                        deduction_rp: tokens[6],
                        incentive_rp: tokens[7],
                        net_weight_rp: tokens[8]
                    });
                }
            }
        }

        if (extractedData.length === 0) {
            statusEl.innerHTML = '<span class="text-red-600">Format PDF tidak dikenali.</span>';
            return;
        }

        statusEl.innerHTML = '<span class="text-blue-600">Mengupload ke server...</span>';
        const formData = new FormData();
        formData.append('pdf_file', file);
        formData.append('data', JSON.stringify(extractedData));

        const uploadRes = await fetch('api/upload.php', { method: 'POST', body: formData });
        const uploadJson = await uploadRes.json();

        if (uploadJson.success) {
            statusEl.innerHTML = `<span class="text-green-600 font-bold">${uploadJson.message}</span>`;
            showToast('Berhasil upload data!');
            loadUploadData();
        } else {
            statusEl.innerHTML = `<span class="text-red-600">Gagal: ${uploadJson.message}</span>`;
        }
    } catch (e) {
        console.error(e);
        statusEl.innerHTML = `<span class="text-red-600">Error memproses PDF.</span>`;
    }
}

// Init
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
checkAuth();
