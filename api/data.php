<?php
require_once '../config/database.php';

header('Content-Type: application/json');

$action = $_GET['action'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($action === 'get_master') {
        $stmt = $pdo->query("SELECT id_petani, nama_baku FROM master_petani ORDER BY nama_baku ASC");
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $data]);
        exit;
    }
    
    if ($action === 'get_settings') {
        $stmt = $pdo->query("SELECT * FROM app_settings WHERE id = 1");
        $data = $stmt->fetch(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $data]);
        exit;
    }
    
    // For antrean verifikasi or detailed transaction rekap
    if ($action === 'get_rekap') {
        $search = $_GET['search'] ?? '';
        $status = $_GET['status'] ?? 'Unverified';
        $bulan = $_GET['bulan'] ?? '';
        
        $params = ['status' => $status];
        
        $sql = "SELECT r.*, m.nama_baku 
                FROM rekap_tbs r
                LEFT JOIN master_petani m ON r.id_petani = m.id_petani
                WHERE r.status_data = :status";
        
        if ($search) {
            $sql .= " AND (r.wb_ticket LIKE :search OR m.nama_baku LIKE :search OR r.nama_di_pdf LIKE :search)";
            $params['search'] = "%$search%";
        }
        if ($bulan) {
            $sql .= " AND DATE_FORMAT(r.weighing_date, '%Y-%m') = :bulan";
            $params['bulan'] = $bulan;
        }
        
        $sql .= " ORDER BY r.weighing_date DESC, r.id_rekap DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $data]);
        exit;
    }
    
    // For Rekap Akumulasi
    if ($action === 'get_akumulasi') {
        $search = $_GET['search'] ?? '';
        $bulan = $_GET['bulan'] ?? '';
        $params = [];
        $sql = "SELECT m.nama_baku, 
                       COUNT(r.id_rekap) as total_transaksi,
                       SUM(r.graded_bunches) as jjg,
                       SUM(r.mill_weight_kg) as mill_kg,
                       SUM(r.deduction_kg) as deduc_kg,
                       SUM(r.incentive_kg) as incen_kg,
                       SUM(r.net_weight_kg) as net_kg,
                       SUM(r.mill_weight_rp) as mill_rp,
                       SUM(r.deduction_rp) as deduc_rp,
                       SUM(r.incentive_rp) as incen_rp,
                       SUM(r.net_weight_rp) as net_rp
                FROM rekap_tbs r
                JOIN master_petani m ON r.id_petani = m.id_petani
                WHERE r.status_data = 'Verified'";
        
        if ($search) {
            $sql .= " AND m.nama_baku LIKE :search";
            $params['search'] = "%$search%";
        }
        if ($bulan) {
            $sql .= " AND DATE_FORMAT(r.weighing_date, '%Y-%m') = :bulan";
            $params['bulan'] = $bulan;
        }
        
        $sql .= " GROUP BY m.id_petani, m.nama_baku ORDER BY m.nama_baku ASC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $data]);
        exit;
    }
    
    // For Dashboard Chart (Net KG per month)
    if ($action === 'get_chart') {
        $sql = "SELECT DATE_FORMAT(weighing_date, '%Y-%m') as bulan, 
                       SUM(net_weight_kg) as total_kg 
                FROM rekap_tbs 
                WHERE status_data = 'Verified'
                GROUP BY bulan 
                ORDER BY bulan ASC
                LIMIT 12";
        $stmt = $pdo->query($sql);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $data]);
        exit;
    }
    
    // For Slip Pembayaran Data
    if ($action === 'get_slip_data') {
        $id_petani = $_GET['id_petani'] ?? '';
        $bulan = $_GET['bulan'] ?? ''; // Format YYYY-MM
        $status_bayar = $_GET['status_bayar'] ?? 'Unpaid';
        
        if (!$id_petani || !$bulan) {
            echo json_encode(['success' => false, 'message' => 'Filter tidak lengkap']);
            exit;
        }
        
        $sql = "SELECT * FROM rekap_tbs 
                WHERE id_petani = :id 
                AND DATE_FORMAT(weighing_date, '%Y-%m') = :bulan
                AND status_data = 'Verified'
                AND payment_status = :status_bayar
                ORDER BY weighing_date ASC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['id' => $id_petani, 'bulan' => $bulan, 'status_bayar' => $status_bayar]);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $data]);
        exit;
    }
    
    // For Slip Pembayaran Summary List
    if ($action === 'get_slip_summary') {
        $bulan = $_GET['bulan'] ?? ''; // Format YYYY-MM
        $status_bayar = $_GET['status_bayar'] ?? 'Unpaid';
        if (!$bulan) {
            echo json_encode(['success' => false, 'message' => 'Bulan tidak valid']);
            exit;
        }
        
        $sql = "SELECT m.id_petani, m.nama_baku, 
                       COUNT(r.id_rekap) as total_transaksi,
                       SUM(r.graded_bunches) as jjg,
                       SUM(r.mill_weight_kg) as mill_kg,
                       SUM(r.deduction_kg) as deduc_kg,
                       SUM(r.incentive_kg) as incen_kg,
                       SUM(r.net_weight_kg) as net_kg,
                       SUM(r.mill_weight_rp) as mill_rp,
                       SUM(r.deduction_rp) as deduc_rp,
                       SUM(r.incentive_rp) as incen_rp,
                       SUM(r.net_weight_rp) as net_rp
                FROM rekap_tbs r
                JOIN master_petani m ON r.id_petani = m.id_petani
                WHERE DATE_FORMAT(r.weighing_date, '%Y-%m') = :bulan
                AND r.status_data = 'Verified'
                AND r.payment_status = :status_bayar
                GROUP BY m.id_petani, m.nama_baku
                ORDER BY m.nama_baku ASC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['bulan' => $bulan, 'status_bayar' => $status_bayar]);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $data]);
        exit;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if ($action === 'verify_row') {
        $wb_ticket = $input['wb_ticket'] ?? '';
        $id_petani = $input['id_petani'] ?? null;
        $nama_di_pdf = $input['nama_di_pdf'] ?? '';
        
        if (!$wb_ticket || !$id_petani) {
            echo json_encode(['success' => false, 'message' => 'Missing data']);
            exit;
        }

        try {
            $stmt = $pdo->prepare("UPDATE rekap_tbs SET id_petani = :id, status_data = 'Verified' WHERE wb_ticket = :wb");
            $stmt->execute(['id' => $id_petani, 'wb' => $wb_ticket]);

            $stmt_check = $pdo->prepare("SELECT id_alias FROM petani_alias WHERE nama_mentah = :nama LIMIT 1");
            $stmt_check->execute(['nama' => $nama_di_pdf]);
            if (!$stmt_check->fetch()) {
                $stmt_alias = $pdo->prepare("INSERT INTO petani_alias (nama_mentah, id_petani) VALUES (:nama, :id)");
                $stmt_alias->execute(['nama' => $nama_di_pdf, 'id' => $id_petani]);
            }

            echo json_encode(['success' => true, 'message' => 'Verified']);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'DB Error: ' . $e->getMessage()]);
        }
        exit;
    }
    
    if ($action === 'add_petani') {
        $nama_baku = $input['nama_baku'] ?? '';
        if ($nama_baku) {
            $stmt = $pdo->prepare("INSERT INTO master_petani (nama_baku) VALUES (:nama)");
            $stmt->execute(['nama' => $nama_baku]);
            $id = $pdo->lastInsertId();
            echo json_encode(['success' => true, 'id_petani' => $id]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Nama kosong']);
        }
        exit;
    }
    
    if ($action === 'edit_petani') {
        $id_petani = $input['id_petani'] ?? null;
        $nama_baku = $input['nama_baku'] ?? '';
        
        if ($id_petani && $nama_baku) {
            try {
                // Cek Duplikat
                $stmt_check = $pdo->prepare("SELECT COUNT(*) FROM master_petani WHERE nama_baku = :nama AND id_petani != :id");
                $stmt_check->execute(['nama' => $nama_baku, 'id' => $id_petani]);
                if ($stmt_check->fetchColumn() > 0) {
                    echo json_encode(['success' => false, 'message' => 'Nama anggota sudah terdaftar di Master Data.']);
                    exit;
                }

                $stmt = $pdo->prepare("UPDATE master_petani SET nama_baku = :nama WHERE id_petani = :id");
                $stmt->execute(['nama' => $nama_baku, 'id' => $id_petani]);
                echo json_encode(['success' => true, 'message' => 'Nama berhasil diupdate']);
            } catch (PDOException $e) {
                echo json_encode(['success' => false, 'message' => 'Gagal update: ' . $e->getMessage()]);
            }
        } else {
            echo json_encode(['success' => false, 'message' => 'Data tidak lengkap']);
        }
        exit;
    }
    
    if ($action === 'update_settings') {
        $nama = $input['nama_koperasi'] ?? '';
        $wa = $input['whatsapp'] ?? '';
        $alamat = $input['alamat'] ?? '';
        $ketua = $input['ketua'] ?? '';
        $sek = $input['sekretaris'] ?? '';
        $bend = $input['bendahara'] ?? '';
        $fee_type = $input['fee_type'] ?? 'percent';
        $fee_amount = $input['fee_amount'] ?? 0;
        $tax_percent = $input['tax_percent'] ?? 0;
        
        try {
            $sql = "UPDATE app_settings SET nama_koperasi=:nama, whatsapp=:wa, alamat=:alamat, ketua=:ketua, sekretaris=:sek, bendahara=:bend, fee_type=:ft, fee_amount=:fa, tax_percent=:tp WHERE id = 1";
            $stmt = $pdo->prepare($sql);
            $stmt->execute(['nama'=>$nama, 'wa'=>$wa, 'alamat'=>$alamat, 'ketua'=>$ketua, 'sek'=>$sek, 'bend'=>$bend, 'ft'=>$fee_type, 'fa'=>$fee_amount, 'tp'=>$tax_percent]);
            echo json_encode(['success' => true, 'message' => 'Pengaturan disimpan']);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'DB Error: ' . $e->getMessage()]);
        }
        exit;
    }
    
    if ($action === 'mark_as_paid') {
        $id_petani = $input['id_petani'] ?? '';
        $bulan = $input['bulan'] ?? '';
        if (!$id_petani || !$bulan) {
            echo json_encode(['success' => false, 'message' => 'Parameter tidak lengkap']);
            exit;
        }
        try {
            $sql = "UPDATE rekap_tbs SET payment_status = 'Paid' 
                    WHERE id_petani = :id AND DATE_FORMAT(weighing_date, '%Y-%m') = :bulan 
                    AND status_data = 'Verified' AND payment_status = 'Unpaid'";
            $stmt = $pdo->prepare($sql);
            $stmt->execute(['id' => $id_petani, 'bulan' => $bulan]);
            echo json_encode(['success' => true, 'message' => 'Berhasil ditandai sudah dibayar']);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
        }
        exit;
    }
    
    if ($action === 'reset_data') {
        try {
            // Nonaktifkan foreign key checks sebentar
            $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
            
            // Hapus isi tabel
            $pdo->exec("TRUNCATE TABLE rekap_tbs;");
            $pdo->exec("TRUNCATE TABLE petani_alias;");
            $pdo->exec("TRUNCATE TABLE master_petani;");
            
            // Reset Profil Koperasi
            $pdo->exec("UPDATE app_settings SET nama_koperasi='', whatsapp='', alamat='', ketua='', sekretaris='', bendahara='', fee_type='percent', fee_amount=0, tax_percent=0 WHERE id=1;");
            
            // Aktifkan kembali
            $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");
            
            // Hapus file-file PDF di server (jika ada)
            $files = glob('../uploads/*.pdf'); 
            foreach($files as $file){
                if(is_file($file)) {
                    unlink($file); 
                }
            }
            
            echo json_encode(['success' => true, 'message' => 'Seluruh data berhasil di-reset']);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'Reset Gagal: ' . $e->getMessage()]);
        }
        exit;
    }
    // Ekstrak Master Anggota dari PDF
    if ($action === 'extract_anggota') {
        $input = json_decode(file_get_contents('php://input'), true);
        $names = $input['names'] ?? [];
        
        if (empty($names)) {
            echo json_encode(['success' => false, 'message' => 'Tidak ada nama yang dikirim']);
            exit;
        }
        
        // Urutkan abjad A-Z agar pemberian ID (Auto Increment) teratur berurutan
        sort($names);
        
        $inserted = 0;
        $stmt_check = $pdo->prepare("SELECT COUNT(*) FROM master_petani WHERE nama_baku = :nama");
        $stmt_insert = $pdo->prepare("INSERT INTO master_petani (nama_baku) VALUES (:nama)");
        
        foreach ($names as $nama) {
            $stmt_check->execute(['nama' => $nama]);
            if ($stmt_check->fetchColumn() == 0) {
                $stmt_insert->execute(['nama' => $nama]);
                $inserted++;
            }
        }
        
        echo json_encode(['success' => true, 'inserted' => $inserted]);
        exit;
    }
}

echo json_encode(['success' => false, 'message' => 'Invalid action']);
?>
