const express = require('express');
const router = express.Router();
const twilio = require('twilio'); 

// --- TWILIO CONFIGURATION ---
const accountSid = 'ACc8ab5dd7558d9757940b136fc934210a';
const authToken = 'd9d16a13cfd09f0150475aeb3f94c41b';
const twilioPhone = '+15706846633';
const adminPhone = '+919113602399';
const client = new twilio(accountSid, authToken);

async function sendTwilioSMS(patientName, patientId, patientMobile) {
    try {
        let cleanMobile = patientMobile.replace(/[\s-]/g, '');
        if (!cleanMobile.startsWith('+')) {
            cleanMobile = cleanMobile.startsWith('91') ? '+' + cleanMobile : '+91' + cleanMobile;
        }

        // 1. Send SMS to Admin
        await client.messages.create({
            body: `ALERT: New Patient Registered!\nPatient Name: ${patientName}\nPatient ID: ${patientId}\nMob: ${cleanMobile}`,
            from: twilioPhone,
            to: adminPhone
        });

        // 2. Send SMS to Patient
        await client.messages.create({
            body: `Welcome ${patientName}! Registration successful at Muni Physio Care. Patient ID: ${patientId}.`,
            from: twilioPhone,
            to: cleanMobile
        });

        console.log(`? Twilio SMS sent to Admin and Patient: ${cleanMobile}`);
    } catch (error) {
        console.error("? Twilio Error:", error.message);
    }
}

function renderPage() {
    const today = new Date().toISOString().split("T")[0];
    const commonIssues = ["Joint Pains", "Frozen Shoulde", "Balance Issues", "Back Pain", "Rotator Cuff Tear", "Nerve Related Issues", "Stroke Rehab", "Post Operation Rehab", "IVDP", "OA Knee"];

    return `
<!DOCTYPE html>
<html>
<head>
    <title>Registration</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f3f6f9; padding: 10px; margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
        .container { width: 100%; max-width: 500px; margin: auto; background: #fff; padding: 20px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); box-sizing: border-box; }
        .toggle { display: flex; gap: 8px; margin-bottom: 20px; }
        .toggle button { flex: 1; padding: 14px; cursor: pointer; border: none; border-radius: 12px; font-weight: 700; background: #e2e8f0; font-size: 14px; transition: all 0.2s ease; }
        .active { background: #0066cc !important; color: #fff; }
        input[type="text"], input[type="date"], select, textarea { width: 100%; padding: 14px; margin: 8px 0 16px 0; border: 1px solid #cbd5e1; border-radius: 10px; box-sizing: border-box; font-size: 16px; background: #fff; }
        .checkbox-group { margin: 15px 0; padding: 12px; border: 1px solid #e2e8f0; border-radius: 10px; background: #fafafa; }
        .checkbox-item { display: flex; align-items: center; padding: 10px 0; cursor: pointer; color: #1e293b; font-weight: 500; }
        .checkbox-item input { margin-right: 12px; height: 20px; width: 20px; }
        .btn { width: 100%; padding: 16px; background: #10b981; color: #fff; border: none; border-radius: 12px; font-weight: 700; font-size: 16px; cursor: pointer; margin-top: 10px; }
        .readonly-field { background-color: #f1f5f9; color: #64748b; cursor: not-allowed; }
        .hidden { display: none; }
        label { font-size: 0.9rem; color: #475569; font-weight: 700; display: block; }
        @media (min-width: 480px) { body { padding: 20px; } .container { padding: 30px; } }
    </style>
</head>
<body>
    <div class="container">
        <div class="toggle">
            <button id="nB" class="active" onclick="t('n')">New Registration</button>
            <button id="eB" onclick="t('e')">Existing Patient</button>
        </div>
        <form id="nF" action="/api/register-patient" method="POST">
            <input type="text" name="name" placeholder="Full Name" required>
            <input type="text" name="mobile" placeholder="Mobile (10 digits)" pattern="\\d{10}" maxlength="10" required>
            <div style="margin:10px 0; color: #000; font-weight:bold;">
                Age: <input type="radio" name="age" value="Child" required style="width:auto"> Child 
                <input type="radio" name="age" value="Adult" style="width:auto"> Adult 
                <input type="radio" name="age" value="Senior" style="width:auto"> Senior
            </div>
            <input type="text" name="address" placeholder="Address" required>
            <label>Date of Birth:</label>
            <input type="date" name="dob" max="${today}" required>
            <label>Select Issues:</label>
            <div class="checkbox-group">
                ${commonIssues.map(issue => `
                    <label class="checkbox-item">
                        <input type="checkbox" name="issue" value="${issue}"> ${issue}
                    </label>
                `).join('')}
                <label class="checkbox-item">
                    <input type="checkbox" id="otherCheckN" onchange="document.getElementById('oIN').style.display=(this.checked?'block':'none')"> Other
                </label>
                <input type="text" id="oIN" name="otherIssue" placeholder="Please specify other issue" style="display:none">
            </div>
            <textarea name="details" placeholder="Additional Medical Details"></textarea>
            <button type="submit" class="btn">REGISTER PATIENT</button>
        </form>
        <div id="eF" class="hidden">
            <input type="text" id="sI" placeholder="Enter 8-digit Patient ID" maxlength="8">
            <button onclick="s()" class="btn" style="background:#0066cc">SEARCH RECORDS</button>
            <div id="res" style="margin-top:20px;"></div>
        </div>
    </div>
    <script>
        function t(m){
            document.getElementById('nF').className=(m=='n'?'':'hidden');
            document.getElementById('eF').className=(m=='e'?'':'hidden');
            document.getElementById('nB').className=(m=='n'?'active':'');
            document.getElementById('eB').className=(m=='e'?'active':'');
        }
        async function s(){
            const id = document.getElementById('sI').value;
            const resDiv = document.getElementById('res');
            if(id.length !== 8) return alert("Please enter exactly 8 digits");
            resDiv.innerHTML = "Searching...";
            try {
                const response = await fetch('/api/patient/' + id); 
                if(response.status === 404) {
                    resDiv.innerHTML = '<p style="color:red">No record found.</p>';
                    return;
                }
                const d = await response.json();
                resDiv.innerHTML = \`
                    <div>
                        <h4>Patient Profile Found</h4>
                        <input type="text" value="\${d.name}" class="readonly-field" readonly>
                        <form action="/api/register-patient" method="POST">
                            <input type="hidden" name="patient_id" value="\${d.patient_id}">
                            <input type="hidden" name="name" value="\${d.name}">
                            <input type="hidden" name="mobile" value="\${d.mobile}">
                            <input type="hidden" name="age" value="\${d.age}">
                            <input type="hidden" name="address" value="\${d.address}">
                            <input type="hidden" name="dob" value="\${d.dob}">
                            <textarea name="details" placeholder="Enter new visit details..." required></textarea>
                            <button type="submit" class="btn">SUBMIT NEW VISIT</button>
                        </form>
                    </div>\`;
            } catch (err) { resDiv.innerHTML = "Error."; }
        }
    </script>
</body>
</html>`;
}

module.exports = (pool) => {
    router.get('/registration', (req, res) => res.send(renderPage()));

    router.post('/api/register-patient', async (req, res) => {
        try {
            let { patient_id, name, mobile, age, address, dob, issue, otherIssue, details } = req.body;
            const finalId = patient_id || Math.floor(10000000 + Math.random() * 90000000).toString();
            
            let issuesArray = Array.isArray(issue) ? issue : (issue ? [issue] : []);
            if (otherIssue) issuesArray.push(otherIssue);
            const finalIssueString = issuesArray.join(", ");

            // Save to DB
            await pool.query(
                "INSERT INTO patients (patient_id, name, mobile, age, address, dob, issue, details) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)", 
                [finalId, name, mobile, age, address, dob, finalIssueString, details]
            );

            // --- TRIGGER TWILIO SMS ONLY ---
            await sendTwilioSMS(name, finalId, mobile);

            res.send(`
                <script>
                    alert("Registration Successful! Patient ID: ${finalId}\\n\\nSMS Notifications sent.");
                    window.location.href = "/registration"; // Redirects back to registration page
                </script>
            `);

        } catch (e) { 
            console.error(e);
            res.send('<script>alert("Error."); window.history.back();</script>'); 
        }
    });

    router.get('/api/patient/:id', async (req, res) => {
        try {
            const result = await pool.query("SELECT * FROM patients WHERE patient_id = $1 ORDER BY id DESC LIMIT 1", [req.params.id]);
            if (result.rows.length > 0) res.json(result.rows[0]);
            else res.status(404).send("Not found");
        } catch (e) { res.status(500).send("DB Error"); }
    });

    return router; 
};