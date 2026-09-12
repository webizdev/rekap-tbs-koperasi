<?php
require_once '../config/database.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method']);
    exit;
}

$pdf_filename = null;
if (isset($_FILES['pdf_file']) && $_FILES['pdf_file']['error'] === UPLOAD_ERR_OK) {
    $uploadDir = '../arsip/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }
    $fileName = basename($_FILES['pdf_file']['name']);
    $fileName = preg_replace("/[^a-zA-Z0-9.\-_]/", "_", $fileName);
    $fileName = time() . '_' . $fileName;
    $targetPath = $uploadDir . $fileName;

    if (move_uploaded_file($_FILES['pdf_file']['tmp_name'], $targetPath)) {
        $pdf_filename = $fileName;
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to move uploaded file']);
        exit;
    }
}

$extracted_data = isset($_POST['data']) ? json_decode($_POST['data'], true) : [];

if (empty($extracted_data)) {
    echo json_encode(['success' => false, 'message' => 'No data to process', 'pdf' => $pdf_filename]);
    exit;
}

$successCount = 0;
$errorCount = 0;

foreach ($extracted_data as $row) {
    $wb_ticket = $row['wb_ticket'] ?? '';
    if (empty($wb_ticket)) continue;

    $weighing_date = $row['weighing_date'] ?? null;
    $vehicle_no = $row['vehicle_no'] ?? '';
    $farmer_name = $row['farmer_name'] ?? '';
    
    // Parse numeric fields (remove commas, handle hyphens if any got through)
    $parseNum = function($val) {
        if ($val === '-' || $val === '') return 0;
        return (float)str_replace(',', '', $val);
    };

    $graded = $parseNum($row['graded_bunches'] ?? 0);
    $m_kg = $parseNum($row['mill_weight_kg'] ?? 0);
    $d_kg = $parseNum($row['deduction_kg'] ?? 0);
    $i_kg = $parseNum($row['incentive_kg'] ?? 0);
    $n_kg = $parseNum($row['net_weight_kg'] ?? 0);
    
    $m_rp = $parseNum($row['mill_weight_rp'] ?? 0);
    $d_rp = $parseNum($row['deduction_rp'] ?? 0);
    $i_rp = $parseNum($row['incentive_rp'] ?? 0);
    $n_rp = $parseNum($row['net_weight_rp'] ?? 0);

    // Auto-mapping
    $id_petani = null;
    $stmt_alias = $pdo->prepare("SELECT id_petani FROM petani_alias WHERE nama_mentah = :nama LIMIT 1");
    $stmt_alias->execute(['nama' => $farmer_name]);
    $alias_row = $stmt_alias->fetch(PDO::FETCH_ASSOC);

    if ($alias_row) {
        $id_petani = $alias_row['id_petani'];
    } else {
        $stmt_master = $pdo->prepare("SELECT id_petani FROM master_petani WHERE nama_baku = :nama LIMIT 1");
        $stmt_master->execute(['nama' => $farmer_name]);
        $master_row = $stmt_master->fetch(PDO::FETCH_ASSOC);
        if ($master_row) {
            $id_petani = $master_row['id_petani'];
            $ins_alias = $pdo->prepare("INSERT INTO petani_alias (nama_mentah, id_petani) VALUES (:mentah, :id)");
            $ins_alias->execute(['mentah' => $farmer_name, 'id' => $id_petani]);
        }
    }

    try {
        $stmt_insert = $pdo->prepare("
            INSERT INTO rekap_tbs (
                wb_ticket, weighing_date, vehicle_no, nama_di_pdf, id_petani, 
                graded_bunches, mill_weight_kg, deduction_kg, incentive_kg, net_weight_kg,
                mill_weight_rp, deduction_rp, incentive_rp, net_weight_rp,
                file_pdf, status_data
            ) VALUES (
                :wb, :date, :veh, :nama, :id_pet,
                :gb, :m_kg, :d_kg, :i_kg, :n_kg,
                :m_rp, :d_rp, :i_rp, :n_rp,
                :pdf, 'Unverified'
            )
            ON DUPLICATE KEY UPDATE 
                weighing_date = VALUES(weighing_date),
                vehicle_no = VALUES(vehicle_no),
                nama_di_pdf = VALUES(nama_di_pdf),
                graded_bunches = VALUES(graded_bunches),
                mill_weight_kg = VALUES(mill_weight_kg),
                deduction_kg = VALUES(deduction_kg),
                incentive_kg = VALUES(incentive_kg),
                net_weight_kg = VALUES(net_weight_kg),
                mill_weight_rp = VALUES(mill_weight_rp),
                deduction_rp = VALUES(deduction_rp),
                incentive_rp = VALUES(incentive_rp),
                net_weight_rp = VALUES(net_weight_rp),
                file_pdf = VALUES(file_pdf)
        ");
        
        $stmt_insert->execute([
            'wb' => $wb_ticket, 'date' => $weighing_date, 'veh' => $vehicle_no, 
            'nama' => $farmer_name, 'id_pet' => $id_petani,
            'gb' => $graded, 'm_kg' => $m_kg, 'd_kg' => $d_kg, 'i_kg' => $i_kg, 'n_kg' => $n_kg,
            'm_rp' => $m_rp, 'd_rp' => $d_rp, 'i_rp' => $i_rp, 'n_rp' => $n_rp,
            'pdf' => $pdf_filename
        ]);
        $successCount++;
    } catch (PDOException $e) {
        $errorCount++;
    }
}

echo json_encode([
    'success' => true,
    'message' => "Processed $successCount rows. Errors: $errorCount.",
    'pdf_saved' => $pdf_filename
]);
?>
