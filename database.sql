-- Script pembuatan tabel (Tanpa CREATE DATABASE untuk cPanel)

-- Tabel Master Petani
CREATE TABLE IF NOT EXISTS master_petani (
    id_petani INT AUTO_INCREMENT PRIMARY KEY,
    nama_baku VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Profil/Pengaturan Koperasi
CREATE TABLE IF NOT EXISTS app_settings (
    id INT PRIMARY KEY,
    nama_koperasi VARCHAR(255) DEFAULT '',
    whatsapp VARCHAR(50) DEFAULT '',
    alamat TEXT,
    ketua VARCHAR(100) DEFAULT '',
    sekretaris VARCHAR(100) DEFAULT '',
    bendahara VARCHAR(100) DEFAULT '',
    fee_type ENUM('percent', 'per_kg') DEFAULT 'percent',
    fee_amount DECIMAL(10,2) DEFAULT 0,
    tax_percent DECIMAL(5,2) DEFAULT 0
);

-- Inisialisasi Settings Default
INSERT IGNORE INTO app_settings (id, nama_koperasi) VALUES (1, 'Koperasi Sawit');

-- Tabel Petani Alias (Kamus)
CREATE TABLE IF NOT EXISTS petani_alias (
    id_alias INT AUTO_INCREMENT PRIMARY KEY,
    nama_mentah VARCHAR(100) NOT NULL,
    id_petani INT NOT NULL,
    FOREIGN KEY (id_petani) REFERENCES master_petani(id_petani) ON DELETE CASCADE
);

-- Tabel Rekap TBS (Menyimpan 9 Metrik)
CREATE TABLE IF NOT EXISTS rekap_tbs (
    id_rekap INT AUTO_INCREMENT PRIMARY KEY,
    wb_ticket VARCHAR(50) UNIQUE NOT NULL,
    weighing_date DATE,
    vehicle_no VARCHAR(50),
    nama_di_pdf VARCHAR(100),
    id_petani INT NULL,
    
    graded_bunches INT DEFAULT 0,
    mill_weight_kg INT DEFAULT 0,
    deduction_kg INT DEFAULT 0,
    incentive_kg INT DEFAULT 0,
    net_weight_kg INT DEFAULT 0,
    
    mill_weight_rp DECIMAL(15, 2) DEFAULT 0,
    deduction_rp DECIMAL(15, 2) DEFAULT 0,
    incentive_rp DECIMAL(15, 2) DEFAULT 0,
    net_weight_rp DECIMAL(15, 2) DEFAULT 0,
    
    status_data ENUM('Unverified', 'Verified') DEFAULT 'Unverified',
    payment_status ENUM('Unpaid', 'Paid') DEFAULT 'Unpaid',
    file_pdf VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_petani) REFERENCES master_petani(id_petani) ON DELETE SET NULL
);

-- Insert 5 data dummy (berdasarkan PDF yang pernah dibaca)
INSERT INTO master_petani (nama_baku) VALUES 
('Yudi'),
('Maria Tatende'),
('Ramliansyah'),
('Satiyem'),
('Wartijo');
