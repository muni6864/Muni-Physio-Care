const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'munigowda6864@gmail.com',
        pass: 'gfngrgmglagokbvo'
    }
});

const sessionsModalHTML = `
<div id="sessionsModalOverlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:3000;">
    <div class="modal" style="background:white; padding:30px; border-radius:15px; width:80%; max-width:850px; position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); max-height:90vh; overflow-y:auto;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
            <h2 id="sess_patient_info" style="color:#8b5cf6; margin:0;">Session Tracker</h2>
            <button type="button" onclick="printSessions()" style="background:#6366f1; padding:10px 20px; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">
                Print Sessions Report
            </button>
        </div>
        
        <table style="width:100%; border-collapse: collapse;">
            <thead style="background:#f8fafc;">
                <tr>
                    <th style="padding:12px; border:1px solid #e2e8f0; width:10%;">No.</th>
                    <th style="padding:12px; border:1px solid #e2e8f0; width:20%;">Session Date</th>
                    <th style="padding:12px; border:1px solid #e2e8f0; width:55%;">Treatment/Progress Details</th>
                    <th style="padding:12px; border:1px solid #e2e8f0; width:15%;">Action</th>
                </tr>
            </thead>
            <tbody id="sessionsTableBody"></tbody>
        </table>
        
        <button type="button" onclick="addSessionRow()" style="background:#8b5cf6; margin-top:15px; width:100%; padding:12px; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">+ Add New Session</button>
        
        <div style="display:flex; gap:10px; margin-top:20px;">
            <button type="button" onclick="saveSessions()" style="background:#10b981; flex:2; padding:15px; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">SAVE ALL CHANGES</button>
            <button type="button" onclick="document.getElementById('sessionsModalOverlay').style.display='none'" style="background:#64748b; flex:1; padding:15px; color:white; border:none; border-radius:8px; cursor:pointer;">CLOSE</button>
        </div>
    </div>
</div>`;

const paymentHistoryModalHTML = `
<div id="payHistoryModalOverlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:3500;">
    <div class="modal" style="background:white; padding:30px; border-radius:15px; width:90%; max-width:900px; position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); max-height:85vh; overflow-y:auto;">
        <h2 id="pay_patient_name" style="color:#f59e0b; margin-top:0;">Payment History</h2>
        <table style="width:100%; border-collapse: collapse; margin-top:15px;">
            <thead>
                <tr style="background:#f8fafc;">
                    <th style="padding:10px; border:1px solid #ddd;">Billing Date</th>
                    <th style="padding:10px; border:1px solid #ddd;">Services</th>
                    <th style="padding:10px; border:1px solid #ddd;">Total</th>
                    <th style="padding:10px; border:1px solid #ddd;">Status</th>
                    <th style="padding:10px; border:1px solid #ddd;">Action</th>
                </tr>
            </thead>
            <tbody id="payHistoryTableBody"></tbody>
        </table>
        <div style="margin-top:20px; display:flex; gap:10px;">
            <button onclick="printPaymentHistory()" style="padding:10px 20px; background:#6366f1; color:white; border:none; border-radius:8px; cursor:pointer;">PRINT STATEMENT</button>
            <button onclick="document.getElementById('payHistoryModalOverlay').style.display='none'" style="padding:10px 20px; background:#64748b; color:white; border:none; border-radius:8px; cursor:pointer;">CLOSE</button>
        </div>
    </div>
</div>`;

module.exports = (pool) => {
    router.get('/dashboard', async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM patients ORDER BY id DESC');
            const patients = result.rows;
            const today = new Date().toISOString().split("T")[0];

            let tableRows = patients.map((p, index) => {
                const safePatientData = encodeURIComponent(JSON.stringify(p));
                const safeName = p.name.replace(/'/g, "\\'");
                const issuesHtml = (p.issue || '').replace(/[{}"]/g, '').split(',').map(item => 
                    `<span style="background:#f1f5f9; padding:3px 10px; border-radius:15px; font-size:12px; margin:2px; display:inline-block; border: 1px solid #e2e8f0; color: #475569;">${item.trim()}</span>`
                ).join('');

                return `
                 <tr class="patient-row" id="row-${p.id}">
                    <td>${index + 1}</td>
                    <td class="search-id">${p.patient_id}</td>
                    <td class="search-name"><strong>${p.name}</strong></td>
                    <td>${p.mobile}</td>
                    <td>${issuesHtml}</td>
                    <td><span class="status-badge status-${(p.status || 'Patient Considered').replace(/\s+/g, '-').toLowerCase()}">${p.status || 'Patient Considered'}</span></td>
                    <td class="actions">
                         <button class="btn-detail" onclick='showDetails(${JSON.stringify(p)})'>Details</button>
                        <button class="btn-sessions" onclick="openSessionsModal('${safePatientData}')" style="background:#8b5cf6;">Sessions</button>
                      <button onclick='openBillingModal(${JSON.stringify(p)})' style="background:#10b981; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">Billing</button>
                        <button onclick="openPaymentHistoryModal('${p.patient_id}', '${safeName}')" style="background:#f59e0b; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">Payments</button>
                        <button class="btn-print" onclick='printPatient(${JSON.stringify(p)})'>Print</button>
                        <button class="btn-delete" onclick="deleteRecord(${p.id})">Delete</button>
                    </td>
                </tr>`;
            }).join('');



            res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Admin Dashboard</title>
    <style>
         :root {
            --primary: #0066cc;
            --success: #10b981;
            --danger: #ef4444;
            --secondary: #6366f1;
            --bg: #f8fafc;
            --text: #1e293b;
        }

@import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap');

.signature-text {
    font-family: 'Dancing Script', cursive;
    font-size: 32px; /* Large for the print area */
    color: #1e293b;
    font-style: italic;
}
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: var(--bg); color: var(--text); padding: 20px; margin: 0; }
        .container { max-width: 1300px; margin: auto; background: #fff; padding: 30px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
        
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; }
        .header h1 { margin: 0; color: var(--primary); font-size: 28px; }
        
        /* Controls Section */
        .controls { display: flex; gap: 15px; margin-bottom: 20px; background: #f1f5f9; padding: 15px; border-radius: 12px; }
        .search-box { flex: 2; position: relative; }
        #searchInput { width: 100%; padding: 12px 15px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 15px; outline: none; transition: 0.2s; }
        #searchInput:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(0,102,204,0.1); }
        
        .filter-box { flex: 1; }
        #statusFilter { width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; background: white; cursor: pointer; outline: none; }

        /* Table Styles */
        .table-wrapper { overflow-x: auto; border-radius: 8px; border: 1px solid #e2e8f0; }
        table { width: 100%; border-collapse: collapse; background: white; }
        th { background: var(--primary); color: white; padding: 15px; text-align: left; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; position: sticky; top: 0; }
        td { padding: 14px 15px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
        tr:hover { background-color: #f8fafc; transition: 0.2s; }
        
        /* Status Badges */
        .status-badge { padding: 5px 10px; border-radius: 20px; font-weight: 600; font-size: 11px; display: inline-block; }
        .status-new-register { background: #dcfce7; color: #166534; }
        .status-treatment-started { background: #dbeafe; color: #1e40af; }
        .status-completed-&-payment-pending { background: #fef9c3; color: #854d0e; }
        .status-completed-&-payment-received { background: #ccfbf1; color: #115e59; }
        .status-cancelled { background: #fee2e2; color: #991b1b; }

        /* Buttons */
        .actions { display: flex; gap: 8px; }
        button { border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; color: white; font-weight: 600; font-size: 12px; transition: 0.2s; }
        button:hover { opacity: 0.9; transform: translateY(-1px); }
        .btn-detail { background: var(--primary); }
        .btn-print { background: var(--secondary); }
        .btn-delete { background: var(--danger); }
        
        /* Modal Style */
        #modalOverlay { display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); z-index:100; }
        .modal { position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); background:white; padding:35px; border-radius:20px; width:90%; max-width:650px; z-index:101; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); }
        .modal h3 { margin-top: 0; color: var(--primary); font-size: 24px; }
        .modal input, .modal textarea, .modal select { width:100%; padding:12px; margin:10px 0; border: 1px solid #e2e8f0; border-radius:10px; font-size: 14px; }
        
        @media print {
            body * { visibility: hidden; }
            #printArea, #printArea * { visibility: visible; }
            #printArea { position: absolute; left: 0; top: 0; width: 100%; }
        }

.password-field-container {
    position: relative;
    width: 100%;
}
.toggle-password {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    cursor: pointer;
    color: #64748b;
    font-size: 18px;
    z-index: 10;
}

        body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); padding: 20px; margin: 0; }
        .container { max-width: 1300px; margin: auto; background: #fff; padding: 30px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
        
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; position: relative; }
        .header h1 { margin: 0; color: var(--primary); font-size: 28px; }

        /* Profile Dropdown Styles */
        .profile-container { position: relative; display: inline-block; }
        .profile-trigger { 
            width: 65px; height: 55px; background: var(--primary); color: white; 
            border-radius: 700%; display: flex; align-items: center; justify-content: center; 
            cursor: pointer; font-weight: bold; font-size: 18px; border: 2px solid #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }
        .profile-dropdown {
            display: none; position: absolute; right: 0; top: 55px; background: white; 
            min-width: 250px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.15); 
            z-index: 1000; border: 1px solid #eee; overflow: hidden;
        }
        .profile-dropdown.show { display: block; }
        .dropdown-header { padding: 15px; background: #f8fafc; border-bottom: 1px solid #eee; }
        .dropdown-header h4 { margin: 0; color: var(--text); }
        .dropdown-header p { margin: 5px 0 0; font-size: 12px; color: #64748b; }
        .dropdown-content { padding: 15px; }
        
        .btn-change-pw { width: 100%; background: var(--secondary); color: white; border: none; padding: 10px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold; }
        .btn-logout { 
            display: block; width: 100%; text-align: center; background: var(--danger); 
            color: white; text-decoration: none; padding: 10px; margin-top: 10px; 
            border-radius: 6px; font-size: 13px; font-weight: bold; box-sizing: border-box;
        }

        /* Password Modal Styling */
        #passwordModalOverlay { 
            display:none; position:fixed; top:0; left:0; width:100%; height:100%; 
            background:rgba(15, 23, 42, 0.7); backdrop-filter: blur(5px); z-index:2000; 
        }
        .pw-modal { 
            position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); 
            background:white; padding:30px; border-radius:15px; width:350px; 
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        }
        .pw-modal h3 { margin-top:0; color: var(--primary); border-bottom: 1px solid #eee; padding-bottom: 10px;}
        .pw-modal label { display: block; font-size: 12px; font-weight: bold; margin-bottom: 5px; color: #64748b; margin-top: 10px; }
        .pw-modal input { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; }
        .pw-modal .btn-submit { background: var(--success); width: 100%; padding: 12px; border:none; color:white; border-radius:8px; font-weight:bold; cursor:pointer; margin-top: 20px; }

        /* General UI Styles */
        .controls { display: flex; gap: 15px; margin-bottom: 20px; background: #f1f5f9; padding: 15px; border-radius: 12px; }
        .search-box { flex: 2; position: relative; }
        #searchInput { width: 100%; padding: 12px 15px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 15px; outline: none; }
        .filter-box { flex: 1; }
        #statusFilter { width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; background: white; }

        .table-wrapper { overflow-x: auto; border-radius: 8px; border: 1px solid #e2e8f0; }
        table { width: 100%; border-collapse: collapse; background: white; }
        th { background: var(--primary); color: white; padding: 15px; text-align: left; font-size: 13px; text-transform: uppercase; position: sticky; top: 0; }
        td { padding: 14px 15px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
        
        .status-badge { padding: 5px 10px; border-radius: 20px; font-weight: 600; font-size: 11px; display: inline-block; }
        .status-new-register { background: #dcfce7; color: #166534; }
        .status-treatment-started { background: #dbeafe; color: #1e40af; }
        .status-completed-&-payment-pending { background: #fef9c3; color: #854d0e; }
        .status-completed-&-payment-received { background: #ccfbf1; color: #115e59; }
        .status-cancelled { background: #fee2e2; color: #991b1b; }

        .actions { display: flex; gap: 8px; }
        button { border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; color: white; font-weight: 600; font-size: 12px; }
        .btn-detail { background: var(--primary); }
        .btn-print { background: var(--secondary); }
        .btn-delete { background: var(--danger); }
        
        #modalOverlay { display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); z-index:100; }
        .modal { position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); background:white; padding:35px; border-radius:20px; width:90%; max-width:650px; z-index:101; max-height: 90vh; overflow-y: auto; }
        
@media print {
    /* 1. Hide everything on the screen */
    body * { 
        visibility: hidden; 
    }
    
    /* 2. Show ONLY the print area */
    #printArea, #printArea * { 
        visibility: visible; 
    }
    
    /* 3. Position the print area at the very top-left of the paper */
    #printArea { 
        position: absolute; 
        left: 0; 
        top: 0; 
        width: 100%; 
        display: block !important; /* Forces it to show during print */
    }
}

@media print {
    /* Hide everything on the dashboard */
    body * { visibility: hidden; }
    
    /* Show ONLY the print area */
    #printArea, #printArea * { 
        visibility: visible; 
    }
    
    #printArea { 
        position: absolute; 
        left: 0; 
        top: 0; 
        width: 100%; 
        display: block !important; 
    }
}




    .logout-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 10px 24px;
        background-color: #ffffff; /* White background */
        color: #ef4444; /* Red text */
        text-decoration: none;
        font-weight: 600;
        font-size: 15px;
        border: 2px solid #fee2e2; /* Light red border */
        border-radius: 12px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }

    .logout-btn:hover {
        background-color: #ef4444; /* Switches to red on hover */
        color: #ffffff; /* Switches to white text */
        border-color: #ef4444;
        transform: translateY(-2px);
        box-shadow: 0 6px 15px rgba(239, 68, 68, 0.3);
    }

    .logout-btn:active {
        transform: translateY(0);
    }

    /* Optional: Adding a small logout icon using CSS */
    .logout-btn::before {
        content: '?'; 
        font-size: 18px;
    }



    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div>
                <h1>Muni Physio Care & Home Services</h1>
                <p style="margin:5px 0 0; color:#64748b;">Healthcare Administration Dashboard</p>
            </div>
            
       

        <div class="profile-container">
                <div class="profile-trigger" onclick="toggleProfile()">Profile</div>
                <div class="profile-dropdown" id="profileDropdown">
                    <div class="dropdown-header">
                        <h4>Dr.Munikrishna P</h4>
                        <p>BPT (Bachelor of Physiotherapy)</p>
                    </div>
                    <div class="dropdown-content">
                        <button type="button" class="btn-change-pw" onclick="openPasswordModal()">Change Password</button>
                     
                        <a href="/" class="btn-logout">Logout</a>

                    </div>
                </div>
            </div>
        </div>

        <div id="passwordModalOverlay">
            <div class="pw-modal">
                <h3>Update Credentials</h3>
                <form id="passwordForm" onsubmit="handlePasswordUpdate(event)">
                    <label>Admin Username (Email)</label>
<input type="text" value="munikrish6468@gmail.com" disabled style="background:#f1f5f9; color:#475569; cursor:not-allowed; font-weight:bold;">
                    
                    <label>Old Password</label>
<div style="position: relative; margin-bottom: 10px;">
    <input type="password" id="oldPw" placeholder="Current Password" required style="width:100%; padding:10px;">
    <button type="button" onclick="togglePw('oldPw')" style="position: absolute; right: 5px; top: 5px; background: #e2e8f0; border: none; padding: 5px 10px; cursor: pointer; border-radius: 4px;">Show</button>
</div>


<label>New Password</label>
<div style="position: relative; margin-bottom: 10px;">
    <input type="password" id="newPw" placeholder="Enter New Password" required style="width:100%; padding:10px;">
    <button type="button" onclick="togglePw('newPw')" style="position: absolute; right: 5px; top: 5px; background: #e2e8f0; border: none; padding: 5px 10px; cursor: pointer; border-radius: 4px;">Show</button>
</div>

<label>Confirm Password</label>
<div style="position: relative; margin-bottom: 10px;">
    <input type="password" id="confirmPw" placeholder="Repeat New Password" required style="width:100%; padding:10px;">
    <button type="button" onclick="togglePw('confirmPw')" style="position: absolute; right: 5px; top: 5px; background: #e2e8f0; border: none; padding: 5px 10px; cursor: pointer; border-radius: 4px;">Show</button>
</div>


                    
                    <button type="submit" class="btn-submit">UPDATE PASSWORD</button>
                    <button type="button" onclick="closePasswordModal()" style="width:100%; margin-top:10px; background:none; border:none; color:#64748b; cursor:pointer; font-size:12px;">Cancel</button>
                </form>
            </div>
        </div>

        <div class="controls">
            <div class="search-box">
                <input type="text" id="searchInput" onkeyup="combinedFilter()" placeholder="Search by Patient ID or Name...">
            </div>
            <div class="filter-box">
                <select id="statusFilter" onchange="combinedFilter()">
                    <option value="All">All Statuses</option>
                    <option value="New Register">New Register</option>
                    <option value="Patient Considered">Patient Considered</option>
                    <option value="Treatment Started">Treatment Started</option>
                    <option value="Completed & Payment Pending">Completed & Payment Pending</option>
                    <option value="Completed & Payment Received">Completed & Payment Received</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Closed">Closed</option>
                </select>
            </div>
        </div>

        <div class="table-wrapper">
            <table>
                <thead>
                    <tr><th>S.No</th><th>Patient ID</th><th>Name</th><th>Mobile</th><th>Issue</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                    ${tableRows || '<tr><td colspan="7" style="text-align:center;">No records found</td></tr>'}
                </tbody>
            </table>
        </div>
    </div>


<div id="modalOverlay"><div class="modal"><h3>Treatment Profile</h3><div id="modalContent" style="background:#f1f5f9; padding:20px; border-radius:12px; margin-bottom:20px; font-size:14px;"></div><form action="/admin/update-treatment" method="POST"><input type="hidden" name="id" id="m_id"><div style="display:flex; gap:15px;"><div style="flex:1;"><label>Start Date</label><input type="date" name="start_date" max="${today}" id="m_start"></div><div style="flex:1;"><label>End Date</label><input type="date" name="end_date" max="${today}" id="m_end"></div></div><label>Update Status</label><select name="status" id="m_status"><option value="Patient Considered">Patient Considered</option><option value="Treatment Started">Treatment Started</option><option value="Completed & Payment Pending">Completed & Payment Pending</option><option value="Completed & Payment Received">Completed & Payment Received</option><option value="Closed">Closed</option></option><option value="Cancelled">Cancelled</option></select><label>Notes</label><textarea name="t_details" id="m_details" rows="4"></textarea><button type="submit" style="background:var(--success); width:100%; padding:15px; font-size:16px;">SAVE RECORD</button></form><button class="btn-delete" style="width: 100%; margin-top: 10px; background: #64748b;" onclick="closeModal()">CLOSE</button></div></div>
    <div id="printArea" style="display:none; padding: 40px;"></div>
    
    <div id="billingModalOverlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:2000;">
    <div class="modal" style="background:white; padding:30px; border-radius:15px; width:600px; position:absolute; top:50%; left:50%; transform:translate(-50%, -50%);">
        <center><h2>Muni Physio Care & Home Services</h2><p>Billing Dashboard</p></center>
        <hr>
        <div id="billInfo" style="margin-bottom:20px; padding:15px; background:#f8fafc; border-radius:10px;"></div>

        <div style="margin-bottom: 20px;">

            <label><strong>Select Services Taken:</strong></label><br>
            <input type="checkbox" class="srv-check" value="Electro Theraphy" data-price="400" onchange="updateBillTable()"> Electro Theraphy
            <input type="checkbox" class="srv-check" value="Exercise Therapy" data-price="400" onchange="updateBillTable()"> Exercise Therapy
            <input type="checkbox" class="srv-check" value="Stroke Rehabilitation" data-price="800" onchange="updateBillTable()"> Stroke Rehabilitation
            <input type="checkbox" class="srv-check" value="Geriatric Rehabilitation" data-price="800" onchange="updateBillTable()"> Geriatric Rehabilitation
            <input type="checkbox" class="srv-check" value="Gait Training" data-price="500" onchange="updateBillTable()"> Gait Training
            <input type="checkbox" class="srv-check" value="Post Operation Rehab" data-price="800" onchange="updateBillTable()"> Post Operation Rehab
            <input type="checkbox" class="srv-check" value="Ergonomics" data-price="500" onchange="updateBillTable()">Ergonomics
           <input type="checkbox" class="srv-check" value="Pain Management"data-price="500"  onchange="updateBillTable()">Pain Management
           <input type="checkbox" class="srv-check" value="Injury Prevention" "data-price="500" onchange="updateBillTable()">Injury Prevention
            <input type="checkbox" class="srv-check" value="Others"  onchange="updateBillTable()">Others

        </div>

        <table border="1" style="width:100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
                <tr style="background:#f1f5f9;">
                    <th>Services Taken</th>
                    <th>Amount</th>
                    <th>No of sessions</th>
                    <th>Total Amount</th>
                </tr>
            </thead>
            <tbody id="billItemsBody"></tbody>
            <tfoot>
                <tr style="font-weight:bold;">
                    <td colspan="3" style="text-align:right;">Grand Total Amount:</td>
                    <td id="finalGrandTotal">0</td>
                </tr>
            </tfoot>
        </table>

        <label><strong>Payment Status:</strong></label>
        <select id="billPaymentStatus" style="width:100%; padding:10px; margin-bottom:20px;">
            <option value="Payment yet to receive">Payment yet to receive</option>
            <option value="Partial payment received">Partial payment received</option>
            <option value="Full payment Received">Full payment Received</option>
        </select>

        <div style="display:flex; gap:10px;">
             <button type="button" onclick="updatePaymentDetails()" style="background:#10b981; flex:2; padding:15px;">UPDATE & SAVE</button>
            <button onclick="closeBillingModal()" style="background:#64748b; flex:1; color:white; padding:10px; border:none; cursor:pointer;">PREVIOUS</button>
           <button onclick="printFinalBill()" style="flex: 1; background: #10b981; padding: 15px; border: none; color: white; border-radius: 8px; font-weight: bold; cursor: pointer;">PRINT</button>
        </div>
    </div>
</div>

    <div id="printArea" style="display:none;"></div>


    ${sessionsModalHTML}
    ${paymentHistoryModalHTML}

    <script>
        let currentHistoryPatient = { id: '', name: '' };

        async function openPaymentHistoryModal(patientId, patientName) {
            const modal = document.getElementById('payHistoryModalOverlay');
            const tbody = document.getElementById('payHistoryTableBody');
            document.getElementById('pay_patient_name').innerText = "Payment Statement for : " + patientName;
            
            currentHistoryPatient = { id: patientId, name: patientName };
            modal.style.display = 'block';

            try {
                const res = await fetch('/admin/api/payment-history/' + patientId);
                const history = await res.json();
                tbody.innerHTML = '';

                if (history.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">No records found.</td></tr>';
                    return;
                }

                history.forEach(row => {
                    const date = new Date(row.updated_at).toLocaleDateString();
                    tbody.innerHTML += \`
                        <tr>
                            <td>\${date}</td>
                            <td>\${row.services_taken || 'N/A'}</td>
                            <td style="font-weight:bold;">\${row.grand_total || 0}</td>
                            <td>\${row.payment_status}</td>
                            <td>
                                <button onclick="deletePaymentRecord(\${row.id}, '\${row.patient_id}')" style="background:#ef4444; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">Delete</button>
                            </td>
                        </tr>\`;
                });
            } catch (err) { alert("Error loading history"); }
        }

        async function deletePaymentRecord(paymentId, patientId) {
            if (!confirm("Do You Want To Delete this payment record?")) return;
            const res = await fetch('/admin/api/delete-payment/' + paymentId, { method: 'DELETE' });
            if (res.ok) {
                alert("Payment Record Deleted!");
                openPaymentHistoryModal(patientId, currentHistoryPatient.name);
            }
        }

        function printPaymentHistory() {
    var area = document.getElementById('printArea');
    var patientNameElement = document.getElementById('pay_patient_name');
    var patientName = patientNameElement ? patientNameElement.innerText.replace('History: ', '') : 'N/A';
    var tableBody = document.getElementById('payHistoryTableBody').innerHTML;

    // Build the print content with standard strings to avoid Node.js crashes
    area.innerHTML = 
        '<div style="padding:40px; font-family: sans-serif; color:#000;">' +
            '<center>' +
                '<h1 style="margin:0;">Muni Physio Care & Home Services</h1>' +
                '<p style="margin:5px 0;">Specialized Physiotherapy Rehabilitation</p>' +
                '<h2 style="margin:20px 0; border-bottom:2px solid #000; padding-bottom:10px;">PAYMENT ACCOUNT STATEMENT</h2>' +
            '</center>' +

            '<table style="width:100%; margin-bottom:20px;">' +
                '<tr>' +
                    '<td><strong></strong> ' + patientName + '</td>' +
                    '<td style="text-align:right;"><strong>Statement Date:</strong> ' + new Date().toLocaleDateString() + '</td>' +
                '</tr>' +
            '</table>' +

            '<table style="width:100%; border-collapse: collapse; margin-top:10px;" border="1">' +
                '<thead>' +
                    '<tr style="background:#f2f2f2;">' +
                        '<th style="padding:10px; text-align:left; border: 1px solid #000;">Billing DATE</th>' +
                        '<th style="padding:10px; text-align:left; border: 1px solid #000;">SERVICES RENDERED</th>' +
                        '<th style="padding:10px; text-align:center; border: 1px solid #000;">TOTAL (&#8377;)</th>' +
                        /* FIXED: Added STATUS header text below */
                        '<th style="padding:10px; text-align:center; border: 1px solid #000;">STATUS</th>' +
                    '</tr>' +
                '</thead>' +
                '<tbody id="printTableBody">' + 
                    tableBody + 
                '</tbody>' +
            '</table>' +

            '<div style="margin-top:80px; text-align:right; padding-right: 20px;">' +
                '<p style="margin-bottom:0; font-weight: bold;">Authorized Signatory,</p>' +
                '<p style="margin-top:5px; font-weight:bold; font-size:24px;">Munikrishna SN</p>' +
                '<p style="margin-top:-5px; font-size: 12px; color: #555;">(Consultant Physiotherapist)</p>' +
            '</div>' +
        '</div>';

    // Remove the "Action/Delete" column from the print data
    // It targets the last cell of every row in the newly created print table
    var rows = area.querySelectorAll('tr');
    rows.forEach(function(row) {
        if (row.cells.length > 4) { // If there's an Action column
            row.deleteCell(-1); 
        }
    });

    // EXECUTE PRINT
    area.style.display = 'block';
    window.print();
    area.style.display = 'none';
}


let currentBillPatient = null;

         function toggleProfile() { document.getElementById('profileDropdown').classList.toggle('show'); }

        function openBillingModal(p) {
    currentBillPatient = p;
    
    // Generate Bill No and Date
    const now = new Date();
    currentBillPatient.billNo = "BILL-" + now.getTime();
    currentBillPatient.invoiceDate = now.toLocaleDateString();

    // CLEANING LOGIC: Removes database symbols {} and "
    const registeredIssues = (p.issue || '').replace(/[{}"]/g, '').split(',').join(', ');

    document.getElementById('billingModalOverlay').style.display = 'block';
    
    // Note the backslashes before the dollar signs below
    document.getElementById('billInfo').innerHTML = \`
        <div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
            <span><strong>Bill No:</strong> \${currentBillPatient.billNo}</span>
            <span><strong>Date:</strong> \${currentBillPatient.invoiceDate}</span>
        </div>
        <div style="margin-bottom: 5px;"><strong>Patient ID:</strong> \${p.patient_id}</div>
        <div style="margin-bottom: 5px;"><strong>Patient Name:</strong> \${p.name}</div>
        <div style="margin-bottom: 5px;"><strong>Mobile:</strong> \${p.mobile}</div>
        
        <div style="margin-top: 10px; padding: 10px; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px;">
            <strong style="color: black; font-size: 16px;">Registered Medical Issues:</strong><br>
            <span style="color: #b45309; font-weight: bold; font-size: 14px;">\${registeredIssues || 'No issues recorded'}</span>
        </div>
    \`;
    
    document.querySelectorAll('.srv-check').forEach(cb => cb.checked = false);
    document.getElementById('billPaymentStatus').value = "Payment yet to receive";
    updateBillTable();
}


function updateBillTable() {
    const body = document.getElementById('billItemsBody');
    body.innerHTML = '';
    
    const selectedServices = document.querySelectorAll('.srv-check:checked');
    
    if (selectedServices.length === 0) {
        body.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:#94a3b8;">No services selected</td></tr>';
    }

    selectedServices.forEach(cb => {
        const price = parseInt(cb.getAttribute('data-price'));
        const row = document.createElement('tr');
        
        row.innerHTML = \`
            <td style="padding:10px;">\${cb.value}</td>
            <td style="padding:10px;">\${price}</td>
            <td style="padding:10px;"><input type="number" value="1" min="1" class="session-qty" onchange="calculateGrandTotal()" style="width:60px; padding:5px; border:1px solid #cbd5e1; border-radius:4px;"></td>
            <td class="row-total" style="padding:10px;">\${price}</td>
        \`;
        body.appendChild(row);
    });
    calculateGrandTotal();
}

function calculateGrandTotal() {
    let grandTotal = 0;
    const rows = document.querySelectorAll('#billItemsBody tr');
    
    rows.forEach(row => {
        const priceCell = row.cells[1];
        const qtyInput = row.querySelector('.session-qty');
        const totalCell = row.cells[3];
        
        if (priceCell && qtyInput) {
            const price = parseInt(priceCell.innerText);
            const qty = parseInt(qtyInput.value) || 0;
            const rowTotal = price * qty;
            totalCell.innerText = rowTotal;
            grandTotal += rowTotal;
        }
    });
    
    document.getElementById('finalGrandTotal').innerText = grandTotal;
}



        function closeBillingModal() { document.getElementById('billingModalOverlay').style.display = 'none'; }

        function updateBillTable() {
    const body = document.getElementById('billItemsBody');
    body.innerHTML = '';
    
    const selectedServices = document.querySelectorAll('.srv-check:checked');
    
    if (selectedServices.length === 0) {
        body.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:#94a3b8;">No services selected</td></tr>';
    }

    selectedServices.forEach(cb => {
        const defaultPrice = cb.getAttribute('data-price') || 0;
        const row = document.createElement('tr');
        
        // Use backslashes (\) before backticks and dollar signs if inside a res.send block
        row.innerHTML = \`
            <td style="padding:10px; border:1px solid #ddd;">\${cb.value}</td>
            <td style="padding:10px; border:1px solid #ddd;">
                <input type="number" 
                       value="\${defaultPrice}" 
                       class="service-price" 
                       oninput="calculateGrandTotal()" 
                       style="width:100px; padding:8px; border:2px solid #3b82f6; border-radius:4px; background:white; color:black; font-weight:bold;">
            </td>
            <td style="padding:10px; border:1px solid #ddd;">
                <input type="number" 
                       value="1" 
                       min="1" 
                       class="session-qty" 
                       oninput="calculateGrandTotal()" 
                       style="width:60px; padding:8px; border:1px solid #cbd5e1; border-radius:4px;">
            </td>
            <td class="row-total" style="padding:10px; border:1px solid #ddd; font-weight:bold;">\${defaultPrice}</td>
        \`;
        body.appendChild(row);
    });
    calculateGrandTotal();
}


        function calculateGrandTotal() {
    let grandTotal = 0;
    // Get all rows currently in the billing table
    const rows = document.querySelectorAll('#billItemsBody tr');
    
    rows.forEach(row => {
        const priceInput = row.querySelector('.service-price');
        const qtyInput = row.querySelector('.session-qty');
        const totalCell = row.querySelector('.row-total');
        
        if (priceInput && qtyInput && totalCell) {
            // Read the number currently typed in the input box
            const price = parseFloat(priceInput.value) || 0;
            const qty = parseInt(qtyInput.value) || 0;
            
            const rowTotal = price * qty;
            
            // Update the display for this specific row
            totalCell.innerText = rowTotal;
            grandTotal += rowTotal;
        }
    });
    
    // Update the final Grand Total display
    const grandTotalElement = document.getElementById('finalGrandTotal');
    if (grandTotalElement) {
        grandTotalElement.innerText = grandTotal;
    }
}


function printFinalBill() {
    if (!currentBillPatient) {
        alert("Error: No patient data found.");
        return;
    }

    var p = currentBillPatient;
    var rows = document.querySelectorAll('#billItemsBody tr');
    var tableRowsHtml = "";

    // Safely build table rows using standard strings
    rows.forEach(function(tr) {
        var service = tr.cells[0].innerText.trim();
        var rateInput = tr.cells[1].querySelector('input');
        var amount = rateInput ? rateInput.value : tr.cells[1].innerText.trim();
        var qtyInput = tr.cells[2].querySelector('input');
        var sessions = qtyInput ? qtyInput.value : tr.cells[2].innerText.trim();
        var totalInput = tr.cells[3].querySelector('input');
        var total = totalInput ? totalInput.value : tr.cells[3].innerText.trim();

        if (service) {
            tableRowsHtml += "<tr>";
            tableRowsHtml += "<td style='padding:10px; border:1px solid #ddd;'>" + service + "</td>";
            tableRowsHtml += "<td style='padding:10px; border:1px solid #ddd; text-align:center;'>" + amount + "</td>";
            tableRowsHtml += "<td style='padding:10px; border:1px solid #ddd; text-align:center;'>" + sessions + "</td>";
            tableRowsHtml += "<td style='padding:10px; border:1px solid #ddd; text-align:right;'>" + total + "</td>";
            tableRowsHtml += "</tr>";
        }
    });

    var grandTotal = document.getElementById('finalGrandTotal').innerText;
    var paymentStatus = document.getElementById('billPaymentStatus').value;
    var printArea = document.getElementById('printArea');
    
    // Building the HTML block bit-by-bit to avoid syntax crashes
    var htmlContent = "<div style='padding:40px; font-family:sans-serif; color:#333; line-height:1.5;'>";
    
    // Header
    htmlContent += "<center>";
    htmlContent += "<h1 style='margin:0; color:#1a365d;'>Muni Physio Care & Home Services</h1>";
    htmlContent += "<p style='margin:5px 0;'>Specialized Physiotherapy Rehabilitation</p>";
    htmlContent += "<h3 style='text-decoration:underline; margin-top:15px;'>Invoice</h3>";
    htmlContent += "</center>";

    // Patient and Bill Details
    htmlContent += "<div style='display:flex; justify-content:space-between; margin-top:30px; border-bottom:1px solid #eee; padding-bottom:15px;'>";
    htmlContent += "<div>";
    htmlContent += "<p><b>Patient Name:</b> " + p.name + "</p>";
    htmlContent += "<p><b>Patient ID:</b> " + (p.patient_id || 'N/A') + "</p>";
    htmlContent += "<p><b>Mobile Number:</b> " + (p.mobile || 'N/A') + "</p>";
    htmlContent += "</div>";
    htmlContent += "<div style='text-align:right;'>";
    htmlContent += "<p><b>Bill No:</b> " + (p.billNo || 'N/A') + "</p>";
    htmlContent += "<p><b>Date:</b> " + new Date().toLocaleDateString() + "</p>";
    htmlContent += "<p><b>Status:</b> " + paymentStatus.toUpperCase() + "</p>";
    htmlContent += "</div>";
    htmlContent += "</div>";

    // Table
    htmlContent += "<table style='width:100%; border-collapse:collapse; margin-top:25px;'>";
    htmlContent += "<thead><tr style='background:#f8fafc;'>";
    htmlContent += "<th style='padding:10px; border:1px solid #ddd; text-align:left;'>Services Rendered</th>";
    htmlContent += "<th style='padding:10px; border:1px solid #ddd;'>Rate</th>";
    htmlContent += "<th style='padding:10px; border:1px solid #ddd;'>Sessions</th>";
    htmlContent += "<th style='padding:10px; border:1px solid #ddd; text-align:right;'>Total (?)</th>";
    htmlContent += "</tr></thead>";
    htmlContent += "<tbody>" + tableRowsHtml + "</tbody>";
    htmlContent += "<tfoot><tr style='font-weight:bold; background:#fdfdfd;'>";
    htmlContent += "<td colspan='3' style='padding:12px; border:1px solid #ddd; text-align:right;'>Grand Total:</td>";
    htmlContent += "<td style='padding:12px; border:1px solid #ddd; text-align:right;'>"+grandTotal+"</td>";
    htmlContent += "</tr></tfoot>";
    htmlContent += "</table>";

    // Footer and Signature
    htmlContent += "<div style='margin-top:60px; display:flex; justify-content:space-between;'>";
    htmlContent += "<div style='font-size:12px; color:#666;'>";
    htmlContent += "<p><i>* Registered Physiotherapy Services</i></p>";
    htmlContent += "<p><i>Issued by: Muni Physio Care Administration</i></p>";
    htmlContent += "</div>";
    htmlContent += "<div style='text-align:center;'>";
    htmlContent += "<p style='margin-bottom:40px;'><b>Authorized Signatory</b></p>";
    htmlContent += "<p style='font-family:serif; font-size:22px; margin:0;'>Munikrishna SN</p>";
    htmlContent += "<p style='margin:0; font-size:14px;'>(Consultant Physiotherapist)</p>";
    htmlContent += "</div>";
    htmlContent += "</div>";

    htmlContent += "</div>";

    // Show, Print, Hide
    printArea.innerHTML = htmlContent;
    printArea.style.display = 'block';
    window.print();
    printArea.style.display = 'none';
}

        async function updatePaymentDetails() {
            if (!currentBillPatient) return;
            
            const selectedServices = Array.from(document.querySelectorAll('.srv-check:checked')).map(c => c.value).join(', ');
            const grandTotal = document.getElementById('finalGrandTotal').innerText;
            const status = document.getElementById('billPaymentStatus').value;
            
            // Calculate total session count across all rows
            let totalSessions = 0;
            document.querySelectorAll('.srv-qty').forEach(input => totalSessions += parseInt(input.value) || 0);

            const payload = {
                patient_id: currentBillPatient.patient_id,
                services_taken: selectedServices,
                amount_per_session: 0, 
                no_of_sessions: totalSessions,
                total_amount: grandTotal,
                grand_total: grandTotal,
                payment_status: status
            };

            try {
                const res = await fetch('/admin/api/update-payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (res.ok) {
                    alert("Payment saved to database!");
                    closeBillingModal();
                } else {
                    alert("Failed to save payment.");
                }
            } catch (err) { console.error(err); }
        }

   function showDetails(p) {
    var modalOverlay = document.getElementById('modalOverlay');
    modalOverlay.style.display = 'block';

    // 1. Map DOM Elements
    var m_id = document.getElementById('m_id');
    var startDateInput = document.getElementById('m_start');
    var endDateInput = document.getElementById('m_end');
    var statusSelect = document.getElementById('m_status');
    var detailsInput = document.getElementById('m_details');
    var saveButton = document.querySelector('#modalOverlay button[type="submit"]');

    // 2. Populate standard fields
    m_id.value = p.id;
    startDateInput.value = p.treatment_start ? p.treatment_start.split('T')[0] : '';
    endDateInput.value = p.treatment_end ? p.treatment_end.split('T')[0] : '';
    detailsInput.value = p.treatment_details || '';

    // 3. Dynamic Status Logic
    var currentStatus = p.status || 'New Register';
    statusSelect.innerHTML = ''; // Clear existing options

    var addOption = function(val) {
        var opt = document.createElement('option');
        opt.value = val;
        opt.text = val;
        statusSelect.appendChild(opt);
    };

    // Always add current status first
    addOption(currentStatus);

    // Reset requirements initially
    startDateInput.required = false;
    endDateInput.required = false;

    // Apply allowed transitions
    if (currentStatus === "New Register") {
        addOption("Patient Considered");
        addOption("Cancelled");
    } 
    else if (currentStatus === "Patient Considered") {
        addOption("Treatment started");
        // Force start date if they want to move to started
        statusSelect.onchange = function() {
            startDateInput.required = (this.value === "Treatment started");
        };
    } 
    else if (currentStatus === "Treatment started") {
        addOption("Completed & payment pending");
        addOption("Completed & payment Received");
        startDateInput.required = true; // Must already have a start date
        // Force end date if they want to move to completed
        statusSelect.onchange = function() {
            endDateInput.required = (this.value.indexOf("Completed") !== -1);
        };
    } 
    else if (currentStatus === "Completed & payment Received") {
        addOption("Closed");
    }

    // 4. Build Display HTML (Using standard quotes to avoid SyntaxError)
    var cleanedIssue = (p.issue || '').replace(/[{}"]/g, '').split(',').join(', ');
    var cleanedDetails = (p.details || '').replace(/[{}"]/g, '').split(',').join(', ');

    var htmlContent = "<div style='line-height: 1.8;'>";
    htmlContent += "<strong>Patient Name:</strong> " + p.name + "<br>";
    htmlContent += "<strong>Patient ID:</strong> " + p.patient_id + "<br>";
    htmlContent += "<strong>Mobile:</strong> " + p.mobile + "<br>";
    htmlContent += "<strong>Address:</strong> " + p.address + "<br>";
    htmlContent += "<hr style='border: 0; border-top: 1px solid #eee; margin: 10px 0;'>";
    htmlContent += "<strong>Medical Issue:</strong> <span style='color: #0066cc; font-weight: bold;'>" + cleanedIssue + "</span><br>";
    htmlContent += "<strong>Initial Complaints:</strong> " + (cleanedDetails || 'None');
    htmlContent += "</div>";

    document.getElementById('modalContent').innerHTML = htmlContent;

    // 5. Locking Logic
    var isLocked = (currentStatus === "Closed" || currentStatus === "Cancelled");
    var formInputs = document.querySelectorAll('#modalOverlay input, #modalOverlay select, #modalOverlay textarea');

    if (isLocked) {
        formInputs.forEach(function(el) {
            if (el.id !== "m_id") {
                el.disabled = true;
                el.style.backgroundColor = "#f1f5f9";
            }
        });
        saveButton.disabled = true;
        saveButton.style.opacity = "0.5";
        saveButton.innerText = "RECORD LOCKED (FINALIZED)";
    } else {
        formInputs.forEach(function(el) {
            el.disabled = false;
            el.style.backgroundColor = "#ffffff";
        });
        saveButton.disabled = false;
        saveButton.style.opacity = "1";
        saveButton.innerText = "SAVE RECORD";
    }
}

//print patient

 function printPatient(p) {
    const area = document.getElementById('printArea');
    
    // CLEAN THE ISSUE DATA
    const cleanedIssue = (p.issue || '').replace(/[{}"]/g, '').split(',').join(', ');

    area.innerHTML = \`
        <div style="padding:40px; font-family: sans-serif; color:#000;">
            <center>
                <h1 style="margin:0;">Muni Physio Care & Home Services</h1>
                <p style="margin:5px 0;">Specialized Physiotherapy Rehabilitation</p>
            </center>
            <center><p><strong>Medical Record:</strong> \${p.name}</p></center>
            <hr style="border:1px solid #000;">
            
            <table style="width:100%; margin-top:20px; border-collapse: collapse; line-height: 2;">
                <tr>
                    <td style="width:50%;"><strong>Patient ID:</strong> \${p.patient_id}</td>
                    <td style="width:50%; text-align:right;"><strong>Print Date:</strong> \${new Date().toLocaleDateString()}</td>
                </tr>
                <tr>
                    <td><strong>Name:</strong> \${p.name}</td>
                    <td><strong>Mobile:</strong> \${p.mobile}</td>
                </tr>
                <tr>
                    <td><strong>Age Group:</strong> \${p.age}</td>
                    <td><strong>DOB:</strong> \${p.dob ? new Date(p.dob).toLocaleDateString() : 'N/A'}</td>
                </tr>
                <tr>
                    <td colspan="2"><strong>Address:</strong> \${p.address}</td>
                </tr>
                <tr>
                    <td colspan="2"><strong>Primary Issue:</strong> <span style="text-decoration:">\${cleanedIssue}</span></td>
                </tr>
                <tr>
                    <td colspan="2"><strong>Treatment Status:</strong> \${p.status || 'Patient Considered'}</td>
                </tr>
            </table>

            <div style="margin-top:30px; padding:15px; border: 1px solid #eee; border-radius: 8px;">
                <h3 style="margin-top:0; border-bottom: 1px solid #eee; padding-bottom: 5px;">Treatment Progress & Notes</h3>
                <p style="white-space: pre-line;">\${p.treatment_details || 'No details recorded yet.'}</p>
            </div>
           
            <div style="margin-top:80px; text-align:right; padding-right: 20px;">
                <p style="margin-bottom:0; font-weight: bold;">Physiotherapist Signature,</p>
                <p class="signature-text" style="margin-top:5px; font-weight:bold; font-size:24px;">Munikrishna SN</p>
                <p style="margin-top:-5px; font-size: 12px; color: #555;">(Consultant Physiotherapist)</p>
            </div>
        </div>
    \`;

    // SHOW, PRINT, THEN HIDE
    area.style.display = 'block';
    window.print();
    area.style.display = 'none';
}
        function closeModal() { document.getElementById('modalOverlay').style.display = 'none'; }
        
       async function deleteRecord(id) {
    if(confirm("Confirm Delete: This will permanently remove the record.")) {
        try {
            const res = await fetch('/admin/delete/' + id, { method: 'DELETE' });
            
            if (res.ok) {
                alert("Record deleted successfully.");
                location.reload();
            } else if (res.status === 403) {
                const message = await res.text();
                alert("? " + message); // Shows "Status must be Closed or Cancelled"
            } else {
                alert("? Error: Could not delete record.");
            }
        } catch (err) {
            alert("? Network error. Check server connection.");
        }
    }
}

        function combinedFilter() {
            const searchVal = document.getElementById("searchInput").value.toLowerCase();
            const statusVal = document.getElementById("statusFilter").value;
            const rows = document.getElementsByClassName("patient-row");
            for (let i = 0; i < rows.length; i++) {
                const idText = rows[i].querySelector(".search-id").textContent.toLowerCase();
                const nameText = rows[i].querySelector(".search-name").textContent.toLowerCase();
                const statusText = rows[i].querySelector(".status-badge").textContent;
                const matchesSearch = idText.includes(searchVal) || nameText.includes(searchVal);
                const matchesStatus = (statusVal === "All" || statusText === statusVal);
                rows[i].style.display = (matchesSearch && matchesStatus) ? "" : "none";
            }
        }


/* --- Password Window Functions --- */
        function openPasswordModal() {
            document.getElementById('profileDropdown').classList.remove('show'); 
            document.getElementById('passwordModalOverlay').style.display = 'block';
        }

        function closePasswordModal() {
            document.getElementById('passwordModalOverlay').style.display = 'none';
            document.getElementById('passwordForm').reset();
        }



async function handlePasswordUpdate(e) {
    e.preventDefault();
    const oldPw = document.getElementById('oldPw').value;
    const newPw = document.getElementById('newPw').value;
    const confirmPw = document.getElementById('confirmPw').value;

    if (newPw !== confirmPw) {
        alert("New password and Confirm password do not match!");
        return;
    }

    try {
        const response = await fetch('/admin/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oldPw, newPw })
        });

        const resultText = await response.text();

        if (response.ok) {
            alert("? " + resultText);
            closePasswordModal();
            // Optional: Redirect to login or refresh
            location.reload();
        } else {
            alert("? Error: " + resultText);
        }
    } catch (err) {
        alert("Failed to connect to server.");
    }
}


function togglePw(id) {
    const input = document.getElementById(id);
    const btn = event.target;
    if (input.type === "password") {
        input.type = "text";
        btn.innerText = "Hide";
    } else {
        input.type = "password";
        btn.innerText = "Show";
    }
}

function toggleVisibility(id) {
    const input = document.getElementById(id);
    if (input.type === "password") {
        input.type = "text";
    } else {
        input.type = "password";
    }
}

        async function openSessionsModal(encodedData) {
            const p = JSON.parse(decodeURIComponent(encodedData));
            currentSessPatientId = p.patient_id;
            document.getElementById('sess_patient_info').innerText = "Sessions: " + p.name + " (" + p.patient_id + ")";
            document.getElementById('sessionsModalOverlay').style.display = 'block';
            
            const res = await fetch('/admin/api/sessions/' + p.patient_id);
            const sessions = await res.json();
            const tbody = document.getElementById('sessionsTableBody');
            tbody.innerHTML = '';
            
            if(sessions.length === 0) { addSessionRow(); } 
            else { sessions.forEach(s => addSessionRow(s.session_date, s.session_details)); }
        }

        function addSessionRow(date = '', details = '') {
            const tbody = document.getElementById('sessionsTableBody');
            const rowCount = tbody.rows.length + 1;
            const cleanDate = date ? new Date(date).toISOString().split('T')[0] : '';
            const row = \`<tr>
                <td style="padding:10px; border:1px solid #ddd; text-align:center;">\${rowCount}</td>
                <td style="padding:10px; border:1px solid #ddd;"><input type="date" class="sess-date" value="\${cleanDate}" style="width:90%"></td>
                <td style="padding:10px; border:1px solid #ddd;"><textarea class="sess-desc" style="width:95%; height:40px;">\${details}</textarea></td>
            </tr>\`;
            tbody.insertAdjacentHTML('beforeend', row);
        }


function removeSessionRow(btn) {
    if(confirm("Remove this session row?")) {
        btn.closest('tr').remove();
        updateRowNumbers();
    }
}




        async function saveSessions() {
            const rows = document.querySelectorAll('#sessionsTableBody tr');
            const sessions = Array.from(rows).map((tr, i) => ({
                session_number: i + 1,
                session_date: tr.querySelector('.sess-date').value,
                session_details: tr.querySelector('.sess-desc').value
            }));

            const res = await fetch('/admin/api/save-sessions', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ patient_id: currentSessPatientId, sessions })
            });
            if(res.ok) alert("Sessions Saved Successfully!");
        }

        function showDetails(p) {
    const modalOverlay = document.getElementById('modalOverlay');
    modalOverlay.style.display = 'block';

    // Populate standard fields
    document.getElementById('m_id').value = p.id;
    document.getElementById('m_start').value = p.treatment_start ? p.treatment_start.split('T')[0] : '';
    document.getElementById('m_end').value = p.treatment_end ? p.treatment_end.split('T')[0] : '';
    document.getElementById('m_status').value = p.status || 'New Register';
    document.getElementById('m_details').value = p.treatment_details || '';

    // CLEANING LOGIC: Removes database symbols { } and " and joins with a space
    const cleanedIssue = (p.issue || '').replace(/[{}"]/g, '').split(',').join(', ');
    const cleanedDetails = (p.details || '').replace(/[{}"]/g, '').split(',').join(', ');

    // Update the HTML content with cleaned variables
    document.getElementById('modalContent').innerHTML = \`
        <div style="line-height: 1.8;">
            <strong>Patient Name:</strong> \${p.name}<br>
            <strong>Patient ID:</strong> \${p.patient_id}<br>
            <strong>Mobile:</strong> \${p.mobile}<br>
            <strong>Address:</strong> \${p.address}<br>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 10px 0;">
            <strong>Medical Issue:</strong> <span style="color: #0066cc; font-weight: bold;">\${cleanedIssue}</span><br>
            <strong>Initial Complaints:</strong> \${cleanedDetails || 'None'}
        </div>
    \`;

    // --- LOCKING LOGIC FOR CLOSED/CANCELLED STATUS ---
    const status = p.status;
    const isLocked = (status === "Closed" || status === "Cancelled");
    
    const formInputs = document.querySelectorAll('#modalOverlay input, #modalOverlay select, #modalOverlay textarea');
    const saveButton = document.querySelector('#modalOverlay button[type="submit"]');

    if (isLocked) {
        formInputs.forEach(input => {
            if (input.id !== "m_id") { 
                input.disabled = true;
                input.style.backgroundColor = "#f1f5f9"; 
                input.style.cursor = "not-allowed";
            }
        });
        
        saveButton.disabled = true;
        saveButton.style.opacity = "0.5";
        saveButton.innerText = "RECORD LOCKED (FINALIZED)";
        
        if (!document.getElementById('lockWarning')) {
            const warning = document.createElement('p');
            warning.id = 'lockWarning';
            warning.style.color = 'red';
            warning.style.fontSize = '12px';
            warning.style.fontWeight = 'bold';
            warning.innerText = "This record is Closed/Cancelled and cannot be edited.";
            document.getElementById('modalContent').appendChild(warning);
        }
    } else {
        formInputs.forEach(input => {
            input.disabled = false;
            input.style.backgroundColor = "white";
            input.style.cursor = "auto";
        });
        saveButton.disabled = false;
        saveButton.style.opacity = "1";
        saveButton.innerText = "SAVE RECORD";
        
        const existingWarning = document.getElementById('lockWarning');
        if (existingWarning) existingWarning.remove();
    }
}




let currentSessPatient = null; 

        async function openSessionsModal(encodedData) {
            const p = JSON.parse(decodeURIComponent(encodedData));
            currentSessPatient = p; 
            document.getElementById('sess_patient_info').innerText = "Sessions For Patient : " + p.name;
            document.getElementById('sessionsModalOverlay').style.display = 'block';
            
            const res = await fetch('/admin/api/sessions/' + p.patient_id);
            const sessions = await res.json();
            const tbody = document.getElementById('sessionsTableBody');
            tbody.innerHTML = '';
            
            if(sessions.length === 0) { 
                addSessionRow(); 
            } else { 
                sessions.forEach(s => addSessionRow(s.session_date, s.session_details)); 
            }
        }

        function addSessionRow(date = '', details = '') {
            const tbody = document.getElementById('sessionsTableBody');
            const cleanDate = date ? new Date(date).toISOString().split('T')[0] : '';
            
            const row = document.createElement('tr');
            // We escape backticks and dollar signs so Node doesn't get confused
            row.innerHTML = \`
                <td class="row-number" style="padding:10px; border:1px solid #e2e8f0; text-align:center; font-weight:bold; background:#f8fafc;"></td>
                <td style="padding:10px; border:1px solid #e2e8f0;"><input type="date" class="sess-date" value="\${cleanDate}" style="width:90%; padding:8px; border:1px solid #cbd5e1; border-radius:4px;"></td>
                <td style="padding:10px; border:1px solid #e2e8f0;"><textarea class="sess-desc" style="width:95%; height:45px; padding:8px; border:1px solid #cbd5e1; border-radius:4px; font-family:inherit;">\${details}</textarea></td>
                <td style="padding:10px; border:1px solid #e2e8f0; text-align:center;">
                    <button type="button" onclick="removeSessionRow(this)" style="background:#ef4444; color:white; border:none; padding:8px 12px; border-radius:6px; cursor:pointer; font-size:12px;">Delete</button>
                </td>
            \`;
            tbody.appendChild(row);
            updateRowNumbers();
        }

        function removeSessionRow(btn) {
            if(confirm("Are you sure you want to delete this session entry?")) {
                btn.closest('tr').remove();
                updateRowNumbers();
            }
        }

        function updateRowNumbers() {
            const rows = document.querySelectorAll('#sessionsTableBody tr');
            rows.forEach((row, index) => {
                row.querySelector('.row-number').innerText = index + 1;
            });
        }

        function printSessions() {
            const p = currentSessPatient;
            const rows = document.querySelectorAll('#sessionsTableBody tr');
            const printArea = document.getElementById('printArea');
            
            let tableRowsHtml = '';
            rows.forEach((tr, i) => {
                const date = tr.querySelector('.sess-date').value;
                const desc = tr.querySelector('.sess-desc').value;
                // We use standard concatenation here to avoid nested backtick issues
                tableRowsHtml += '<tr>' +
                    '<td style="padding:10px; border:1px solid #000; text-align:center;">' + (i+1) + '</td>' +
                    '<td style="padding:10px; border:1px solid #000;">' + (date || 'N/A') + '</td>' +
                    '<td style="padding:10px; border:1px solid #000;">' + (desc || '') + '</td>' +
                '</tr>';
            });

            printArea.innerHTML = \`
                <div style="padding:40px; font-family:serif; color:#000;">
                    <center>
                        <h1 style="margin:0; font-size: 28px;">Muni Physio Care & Home Services</h1>
                        <p style="margin:5px 0;">Patient Session Progress Report</p>
                    </center>
                    <hr style="border:1px solid #000; margin: 20px 0;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:30px;">
                        <div>
                            <p><strong>Patient Name:</strong> \${p.name}</p>
                            <p><strong>Patient ID:</strong> \${p.patient_id}</p>
                        </div>
                        <div style="text-align:right;">
                            <p><strong>Mobile:</strong> \${p.mobile}</p>
                            <p><strong>Report Date:</strong> \${new Date().toLocaleDateString()}</p>
                        </div>
                    </div>
                    <table style="width:100%; border-collapse:collapse;">
                        <thead>
                            <tr style="background:#f2f2f2;">
                                <th style="padding:10px; border:1px solid #000; width:10%;">S.No</th>
                                <th style="padding:10px; border:1px solid #000; width:20%;">Date</th>
                                <th style="padding:10px; border:1px solid #000; width:70%;">Treatment & Progress Details</th>
                            </tr>
                        </thead>
                        <tbody>\${tableRowsHtml}</tbody>
                    </table>
                    <div style="margin-top:80px; text-align:right;">
                        <p style="margin-bottom:40px;">Authorized Signature,</p>
                        <p><strong>Dr. Munikrishna SN</strong></p>
                    </div>
                </div>
            \`;

            printArea.style.display = 'block';
            window.print();
            printArea.style.display = 'none';
        }


    </script>
</body>
</html>`);
        } catch (err) { res.status(500).send("Error"); }
    });

    // --- API ROUTES ---

    router.get('/api/payment-history/:patient_id', async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM patient_billing WHERE patient_id = $1 ORDER BY updated_at DESC', [req.params.patient_id]);
            res.json(result.rows);
        } catch (err) { res.status(500).json([]); }
    });

    router.delete('/api/delete-payment/:id', async (req, res) => {
        try {
            await pool.query('DELETE FROM patient_billing WHERE id = $1', [req.params.id]);
            res.sendStatus(200);
        } catch (err) { res.status(500).send(err.message); }
    });



router.get('/api/sessions/:patient_id', async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM patient_sessions WHERE patient_id = $1 ORDER BY session_number ASC', [req.params.patient_id]);
            res.json(result.rows);
        } catch (err) { res.status(500).json([]); }
    });

    router.post('/api/save-sessions', async (req, res) => {
        const { patient_id, sessions } = req.body;
        try {
            await pool.query('BEGIN');
            await pool.query('DELETE FROM patient_sessions WHERE patient_id = $1', [patient_id]);
            for (const s of sessions) {
                await pool.query('INSERT INTO patient_sessions (patient_id, session_number, session_date, session_details) VALUES ($1, $2, $3, $4)', 
                [patient_id, s.session_number, s.session_date || null, s.session_details]);
            }
            await pool.query('COMMIT');
            res.sendStatus(200);
        } catch (err) {
            await pool.query('ROLLBACK');
            res.status(500).send(err.message);
        }
    });



router.post('/update-treatment', async (req, res) => {
        const { id, start_date, end_date, status, t_details } = req.body;
        await pool.query("UPDATE patients SET treatment_start=$1, treatment_end=$2, status=$3, treatment_details=$4 WHERE id=$5", [start_date||null, end_date||null, status, t_details, id]);
        res.send('<script>alert("Successfully Updated Record!"); window.location.href="/admin/dashboard";</script>');
    });

   router.delete('/delete/:id', async (req, res) => {
    try {
        // 1. Fetch the status first
        const checkStatus = await pool.query("SELECT status FROM patients WHERE id = $1", [req.params.id]);
        
        if (checkStatus.rows.length === 0) {
            return res.status(404).send("Record not found.");
        }

        const status = checkStatus.rows[0].status;

        // 2. Only allow deletion if status is exactly "Closed" or "Cancelled"
        if (status === 'Closed' || status === 'Cancelled') {
            await pool.query("DELETE FROM patients WHERE id = $1", [req.params.id]);
            res.sendStatus(200);
        } else {
            // 3. Reject if the status is still active
            res.status(403).send("Cannot delete: Status must be 'Closed' or 'Cancelled' first.");
        }
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error during deletion.");
    }
});

// ADD THIS ROUTE AT THE BOTTOM OF module.exports
    router.post('/change-password', async (req, res) => {
    // If express.json() isn't active, req.body will be undefined, causing your crash
    if (!req.body) {
        return res.status(400).send("No data received");
    }

    const { oldPw, newPw } = req.body;
    const adminEmail = 'munikrish6468@gmail.com'; 

    try {
        const userRes = await pool.query("SELECT * FROM admins WHERE username = $1", [adminEmail]);
        
        if (userRes.rows.length === 0 || userRes.rows[0].password !== oldPw) {
            return res.status(401).send("Current password incorrect.");
        }

        await pool.query("UPDATE admins SET password = $1 WHERE username = $2", [newPw, adminEmail]);
        console.log(`Password updated for ${adminEmail}`);
        res.send("Password updated successfully!");
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
});


    // --- NEW PAYMENT ROUTE ---
    // ADD THIS AT THE BOTTOM OF module.exports inside Adminhomepage.js
router.post('/api/update-payment', async (req, res) => {
    const { 
        patient_id, 
        services_taken, 
        amount_per_session, 
        no_of_sessions, 
        total_amount, 
        grand_total, 
        payment_status 
    } = req.body;

    try {
        await pool.query(
            `INSERT INTO patient_billing 
            (patient_id, services_taken, amount_per_session, no_of_sessions, total_amount, grand_total, payment_status)
            VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [patient_id, services_taken, amount_per_session, no_of_sessions, total_amount, grand_total, payment_status]
        );
        res.sendStatus(200);
    } catch (err) {
        console.error("Database Error:", err);
        res.status(500).send(err.message);
    }
});
    


    return router;
};