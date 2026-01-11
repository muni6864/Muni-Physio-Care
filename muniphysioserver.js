const express = require('express');
const { Pool } = require('pg'); 
const app = express();
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }))

const registrationRoutes = require('./patient_registration');
const adminRoutes = require('./Adminhomepage');
const PORT = process.env.PORT || 3001;


// 1. MIDDLEWARE SETUP
app.use(express.urlencoded({ extended: true })); 
app.use(express.static('public')); 

// 2. DATABASE SETUP (PostgreSQL)
const pool = new Pool({
    // Use environment variable 'DATABASE_URL' which you will set in Render
    connectionString: process.env.DATABASE_URL || "postgresql://muni_physio_care_db_rm0l_user:cItWlCZIEeN5HPzZZpoUQEC7DU4EN5m0@dpg-d5gb6qnfte5s73fh3l90-a/muni_physio_care_db_rm0l",
    ssl: {
        rejectUnauthorized: false 
    }
});

async function initDB() {
    try {
        await pool.query(`CREATE TABLE IF NOT EXISTS doctor (
            id SERIAL PRIMARY KEY,
            name TEXT,
            qualification TEXT,
            image_url TEXT,
            phone TEXT
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS feedbacks (
            id SERIAL PRIMARY KEY,
            patient_name TEXT,
            mobile TEXT,
            details TEXT,
            rating INTEGER
        )`);

    

await pool.query(`
    CREATE TABLE IF NOT EXISTS patients (
        id SERIAL PRIMARY KEY,
        patient_id VARCHAR(8) NOT NULL,
        name TEXT NOT NULL,
        mobile VARCHAR(10) NOT NULL,
        age TEXT NOT NULL,
        address TEXT NOT NULL,
        dob DATE NOT NULL,
        issue TEXT NOT NULL,
        details TEXT,
        status TEXT DEFAULT 'New Register',
        treatment_start DATE,
        treatment_end DATE,
        treatment_details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
`);


// --- Session Details ----

await pool.query(`
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(20) NOT NULL,
    session_number INT NOT NULL,
    session_date DATE DEFAULT CURRENT_DATE,
    session_details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`);

// --- ADMINS TABLE ---
        await pool.query(`CREATE TABLE IF NOT EXISTS admins (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )`);

 // Insert default admin
        await pool.query(`
            INSERT INTO admins (username, password)
            VALUES ('munikrish6468@gmail.com', 'Muni@6468')
            ON CONFLICT (username) DO NOTHING
        `);
    

        const res = await pool.query("SELECT * FROM doctor WHERE name = $1", ['Dr.Munikrishna SN PT']);
        if (res.rows.length === 0) {
            await pool.query(
                "INSERT INTO doctor (name, qualification, image_url, phone) VALUES ($1, $2, $3, $4)",
                ['Dr. Munikrishna SN PT', 'Bachelor of Physiotherapy', '/doctor.jpg', '9113602399']
            );
        }
        console.log('Connected to Render PostgreSQL and initialized tables.');
    } catch (err) {
        console.error('Database Init Error:', err);
    }
}
initDB();





// 3. ROUTES for fech reviews
app.get('/', async (req, res) => {
    try {
        const doctorRes = await pool.query("SELECT * FROM doctor LIMIT 1");
        
        // UPDATE THIS LINE: Added LIMIT 5 to ensure only the latest 5 show
        const feedbacksRes = await pool.query("SELECT * from feedbacks ORDER BY id DESC LIMIT 5");
        
        const statsRes = await pool.query("SELECT AVG(rating) as avg_rating, COUNT(id) as count FROM feedbacks");

        const doctor = doctorRes.rows[0];
        const feedbacks = feedbacksRes.rows;
        const stats = statsRes.rows[0];

        stats.avg_rating = parseFloat(stats.avg_rating) || 0;
        stats.count = parseInt(stats.count) || 0;

        res.send(renderHTML(doctor, feedbacks, stats));
    } catch (err) {
        console.error(err);
        res.status(500).send("Database error occurred.");
    }
});



// Admin Login Page Route
app.get('/admin-login', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Admin Login</title>
        <style>
            body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #f1f5f9; margin:0; }
            .login-card { background: white; padding: 40px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); width: 320px; }
            input { width: 100%; padding: 12px; margin: 10px 0; border: 1px solid #ddd; border-radius: 8px; box-sizing: border-box; }
            .btn { width: 100%; padding: 12px; background: #334155; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; }
            .back-link { display: block; text-align: center; margin-top: 15px; color: #64748b; text-decoration: none; font-size: 0.9rem; }
            .forgot { display: block; text-align: right; font-size: 0.8rem; color: #ef4444; text-decoration: none; margin-bottom: 15px; }
        </style>
    </head>
    <body>
        <div class="login-card">
            <h2 style="text-align:center">Admin Login</h2>
            <form action="/api/admin-auth" method="POST">
                <label>User name:</label>
                <input type="email" name="username" required placeholder="username">
                <label>Password:</label>
                <input type="password" name="password" required placeholder="Password">
                <a href="/forgot-password" class="forgot">Forgot user or password</a>
                <button type="submit" class="btn">LOGIN</button>
            </form>
            <a href="/" class="back-link">Go Back To Home Page</a>
        </div>
    </body>
    </html>`);
});

//Admin home page

app.post('/api/admin-auth', async (req, res) => {
    const { username, password } = req.body;
    try {
        // Query the database to check if the admin exists
        const result = await pool.query(
            "SELECT * FROM admins WHERE username = $1 AND password = $2", 
            [username, password]
        );

        if (result.rows.length > 0) {
            // SUCCESS: This line sends the user to the new Dashboard page
            res.redirect('/admin/dashboard'); 
        } else {
            // FAILURE: Show an alert and go back to login
            res.send("<script>alert('Invalid Credentials'); window.history.back();</script>");
        }
    } catch (err) {
        console.error(err);
        res.status(500).send("Authentication Error");
    }
});
// --- Forgot Password Logic ----

const nodemailer = require('nodemailer');

app.get('/forgot-password', (req, res) => {
    res.send(`
        <div style="font-family: sans-serif; max-width: 400px; margin: 100px auto; padding: 25px; border: 1px solid #ddd; border-radius: 10px; text-align: center;">
            <h3>Reset Admin Credentials</h3>
            <p>A reset link will be sent to munigowda6864@gmail.com</p>
            <form action="/api/send-reset" method="POST">
                <button type="submit" style="padding: 10px 20px; background: #ef4444; color: white; border: none; border-radius: 5px; cursor: pointer;">Send Link to My Email</button>
            </form>
            <br><a href="/admin-login">Back to Login</a>
        </div>
    `);
});

app.post('/api/send-reset', async (req, res) => {
    // You will need a 'nodemailer' transporter set up here to send the actual email
    // For now, let's simulate it:
    res.send("<script>alert('A reset link has been sent to your registered email!'); window.location.href='/admin-login';</script>");
});



 app.get('/about-doctor', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dr. Munikrishna SN - Profile</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Poppins', sans-serif; line-height: 1.6; color: #1f2937; max-width: 900px; margin: 40px auto; padding: 20px; background: #f3f6f9; }
            .info-card { background: white; padding: 50px; border-radius: 30px; box-shadow: 0 15px 35px rgba(0,0,0,0.07); text-align: center; }
            
            .profile-large { width: 180px; height: 180px; border-radius: 50%; object-fit: cover; border: 5px solid #0066cc; margin-bottom: 20px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
            
            h1 { color: #111827; margin: 10px 0 5px 0; font-size: 2.2rem; }
            .credential { color: #0066cc; font-weight: 600; font-size: 1.1rem; margin-bottom: 30px; }
            
            .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 25px; text-align: left; margin-top: 30px; }
            
            .detail-item { background: #f8fafc; padding: 20px; border-radius: 15px; border-top: 4px solid #0066cc; }
            .detail-item h2 { font-size: 1rem; color: #64748b; margin-top: 0; text-transform: uppercase; letter-spacing: 1px; }
            .detail-item p { margin: 5px 0 0 0; color: #1e293b; font-weight: 500; }

            .full-width { grid-column: 1 / -1; }
            
            .languages-tag { display: inline-block; background: #e0f2fe; color: #0369a1; padding: 5px 15px; border-radius: 20px; margin-right: 8px; font-size: 0.9rem; font-weight: 600; }
            
            .btn-container { margin-top: 40px; display: flex; justify-content: center; gap: 15px; }
            .home-btn { padding: 12px 30px; background: #64748b; color: white; text-decoration: none; border-radius: 50px; font-weight: 600; transition: 0.3s; }
            .book-btn { padding: 12px 30px; background: #25D366; color: white; text-decoration: none; border-radius: 50px; font-weight: 600; transition: 0.3s; display: flex; align-items: center; gap: 8px; }
            
            @media (max-width: 600px) { .details-grid { grid-template-columns: 1fr; } }
        </style>
    </head>
    <body>
        <div class="info-card">
            <img src="/doctor.jpg" alt="Dr. Munikrishna SN PT" class="profile-large">
            <h1>Dr. Munikrishna SN</h1>
            <p class="credential">B.P.T (Bachelor of Physiotherapy)</p>
            
            <div class="details-grid">
                <div class="detail-item">
                    <h2>Experience</h2>
                    <p>Physiotherapist at <strong>Baptist Hospital </strong> since 2024</p>
                </div>

                <div class="detail-item">
                    <h2>Clinical Focus</h2>
                    <p>Post-Op Rehab, Geriatric Care, Pain Management & Chronic Pain </p>
                </div>

                <div class="detail-item full-width">
                    <h2>Specialisation</h2>
                    <p>Restoring basic mobility, managing chronic pain (back/neck), and complex rehabilitation after surgery or illness.</p>
                </div>

                <div class="detail-item full-width">
                    <h2>Languages Spoken</h2>
                    <div style="margin-top:10px;">
                        <span class="languages-tag">English</span>
                        <span class="languages-tag">Kannada</span>
                        <span class="languages-tag">Telugu</span>
                        <span class="languages-tag">Hindi</span>
                    </div>
                </div>
            </div>

            <div class="btn-container">
                <a href="/" class="home-btn">Back to Home</a>
                <a href="https://wa.me/9113602399" class="book-btn">Book Consultation</a>
            </div>
        </div>
    </body>
    </html>
    `);
});

app.get('/electro', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Electrotherapy - Muni Physio Care</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Poppins', sans-serif; line-height: 1.6; color: #1f2937; max-width: 800px; margin: 40px auto; padding: 20px; background: #f3f6f9; }
            .info-card { background: white; padding: 40px; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
            h1 { color: #1e40af; margin-top: 0; font-size: 2.5rem; border-bottom: 3px solid #1e40af; display: inline-block; margin-bottom: 20px; }
            h2 { color: #111827; margin-top: 30px; font-size: 1.4rem; border-left: 4px solid #3b82f6; padding-left: 15px; }
            ul { padding-left: 20px; }
            li { margin-bottom: 12px; }
            .home-btn { display: inline-block; margin-top: 30px; padding: 15px 30px; background: #1e40af; color: white; text-decoration: none; border-radius: 50px; font-weight: 700; transition: 0.3s; }
            .home-btn:hover { background: #1e3a8a; transform: translateY(-2px); }
            strong { color: #1e40af; }
            .tech-box { background: #f8fafc; border-radius: 15px; padding: 25px; margin-top: 25px; border: 1px solid #e2e8f0; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 10px; }
            @media (max-width: 600px) { .grid { grid-template-columns: 1fr; } }
        </style>
    </head>
    <body>
        <div class="info-card">
            <h1>Electrotherapy</h1>
            <p>Electrotherapy is a key pillar of modern physiotherapy, using controlled electrical energy to stimulate nerves and muscles. It is highly effective for <strong>pain management</strong>, reducing inflammation, and accelerating the body's natural healing response.</p>



            <h2>1. Primary Modalities</h2>
            <div class="grid">
                <div class="tech-box">
                    <strong>TENS:</strong> Transcutaneous Electrical Nerve Stimulation. Focuses on blocking pain signals to the brain (Gate Control).
                </div>
                <div class="tech-box">
                    <strong>IFT:</strong> Interferential Therapy. Uses medium-frequency currents to reach deep-seated pain and swelling.
                </div>
                <div class="tech-box">
                    <strong>EMS:</strong> Electrical Muscle Stimulation. Used to prevent muscle atrophy and re-educate weak muscles.
                </div>
                <div class="tech-box">
                    <strong>Ultrasound:</strong> Physiotherapy ultrasound uses high-frequency sound waves to create deep heat or vibrations in tissues, promoting healing by increasing blood flow, reducing inflammation, easing stiffness, and speeding up repair for injuries like sprains, strains, tendinitis, and osteoarthritis, working as either a thermal (continuous) or non-thermal (pulsed) treatment for pain and swelling.
                </div>
            </div>

            

            <h2>2. Clinical Benefits</h2>
            <ul>
                <li><strong>Pain Modulation:</strong> Immediate relief for acute and chronic conditions like sciatica, spondylosis, and arthritis.</li>
                <li><strong>Edema Reduction:</strong> Enhances local blood flow and lymphatic drainage to clear swelling from injuries.</li>
                <li><strong>Tissue Repair:</strong> Stimulates ATP production at the cellular level to speed up the healing of ligaments and tendons.</li>
                <li><strong>Muscle Re-education:</strong> Restores the neural connection between the brain and muscles after surgery or stroke.</li>
            </ul>

            <div class="tech-box" style="background: #eff6ff; border-color: #bfdbfe;">
                <h3>Why it works</h3>
                <p>By mimicking the body's natural electrical impulses, electrotherapy can "reset" the nervous system, lower the sensitivity of pain receptors, and stimulate the release of <strong>endorphins</strong>—your body's natural painkillers.</p>
            </div>

            <a href="/" class="home-btn">Back to Home Page</a>
        </div>
    </body>
    </html>
    `);
});







app.get('/exercise-therapy', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Exercise Therapy</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Poppins', sans-serif; line-height: 1.6; color: #1f2937; max-width: 800px; margin: 40px auto; padding: 20px; background: #f3f6f9; }
            .info-card { background: white; padding: 40px; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
            h1 { color: #10b981; margin-top: 0; font-size: 2.5rem; border-bottom: 3px solid #10b981; display: inline-block; margin-bottom: 20px; }
            h2 { color: #111827; margin-top: 30px; font-size: 1.4rem; border-left: 4px solid #0066cc; padding-left: 15px; }
            ul { padding-left: 20px; }
            li { margin-bottom: 12px; }
            .home-btn { display: inline-block; margin-top: 30px; padding: 15px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 50px; font-weight: 700; transition: 0.3s; }
            .home-btn:hover { background: #059669; transform: translateY(-2px); }
            strong { color: #0066cc; }
        </style>
    </head>
    <body>
        <div class="info-card">
            <h1>Exercise Therapy</h1>
            <p>Exercise therapy involves a plan of physical activities designed and prescribed to facilitate the recovery from specific injuries or to improve general physical health.</p>
            
            

            <h2>1. Short-Term Goals</h2>
            <ul>
                <li><strong>Joint Mobility:</strong> Performing Range of Motion (ROM) exercises to prevent stiffness and maintain joint lubrication after surgery or injury.</li>
                <li><strong>Neuromuscular Activation:</strong> Re-educating muscles that have "shut down" due to pain or inactivity to start firing correctly again.</li>
                <li><strong>Pain Management:</strong> Utilizing low-impact rhythmic movements to increase blood flow and release natural pain-relieving endorphins.</li>
                <li><strong>Correction of Posture:</strong> Implementing immediate stretching of tight muscles to relieve strain on the spine and joints.</li>
            </ul>

            <h2>2. Long-Term Goals</h2>
            <ul>
                <li><strong>Hypertrophy & Strength:</strong> Progressive resistance training to build muscle mass and support weakened skeletal structures.</li>
                <li><strong>Proprioception & Balance:</strong> Enhancing the body's ability to sense its position in space to prevent future falls and re-injury.</li>
                <li><strong>Cardiovascular Endurance:</strong> Improving heart and lung capacity to ensure the patient can return to daily activities without fatigue.</li>
                <li><strong>Functional Independence:</strong> Training specific movement patterns (squatting, lifting, reaching) to restore the patient's ability to live independently.</li>
            </ul>

            <a href="/" class="home-btn">Back to Home Page</a>
        </div>
    </body>
    </html>
    `);
});







app.get('/stroke-rehab', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Stroke Rehabilitation</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Poppins', sans-serif; line-height: 1.6; color: #1f2937; max-width: 800px; margin: 40px auto; padding: 20px; background: #f3f6f9; }
            .info-card { background: white; padding: 40px; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
            h1 { color: #4f46e5; margin-top: 0; font-size: 2.5rem; border-bottom: 3px solid #4f46e5; display: inline-block; margin-bottom: 20px; }
            h2 { color: #111827; margin-top: 30px; font-size: 1.4rem; border-left: 4px solid #f59e0b; padding-left: 15px; }
            ul { padding-left: 20px; }
            li { margin-bottom: 12px; }
            .home-btn { display: inline-block; margin-top: 30px; padding: 15px 30px; background: #4f46e5; color: white; text-decoration: none; border-radius: 50px; font-weight: 700; transition: 0.3s; }
            .home-btn:hover { background: #3730a3; transform: translateY(-2px); }
            strong { color: #4f46e5; }
            .highlight-box { background: #fdf2f2; border: 1px dashed #f87171; padding: 15px; border-radius: 12px; margin-top: 20px; font-size: 0.9rem; }
        </style>
    </head>
    <body>
        <div class="info-card">
            <h1>Stroke Rehabilitation</h1>
            <p>Stroke rehabilitation is a comprehensive program designed to help survivors relearn skills that were lost when part of the brain was damaged. Our focus is on <strong>Neuroplasticity</strong>—the brain's ability to rewire itself through repetitive, purposeful movement.</p>

            

            <h2>1. Short-Term Goals</h2>
            <ul>
                <li><strong>Spasticity Management:</strong> Reducing abnormal muscle tightness and preventing painful contractures through specialized stretching and positioning.</li>
                <li><strong>Safe Bed Mobility:</strong> Relearning how to roll, sit up at the edge of the bed, and move safely to a chair (transfers).</li>
                <li><strong>Sensation Stimulation:</strong> Providing sensory input to the affected side to "wake up" the neural pathways and reduce neglect.</li>
                <li><strong>Balance & Trunk Stability:</strong> Strengthening the core muscles to ensure the patient can sit or stand without falling.</li>
            </ul>

            

            <h2>2. Long-Term Goals</h2>
            <ul>
                <li><strong>Gait Re-education:</strong> Restoring the ability to walk safely, with or without assistive devices, focusing on weight-bearing and foot clearance.</li>
                <li><strong>Upper Limb Functionality:</strong> Improving fine motor skills in the hands and arms to perform Tasks of Daily Living (ADLs) like eating and dressing.</li>
                <li><strong>Cognitive & Speech Integration:</strong> Working alongside multidisciplinary teams to improve communication and mental processing during physical tasks.</li>
                <li><strong>Community Re-integration:</strong> Preparing the patient to return to their home environment with maximum confidence and reduced caregiver dependency.</li>
            </ul>

            <div class="highlight-box">
                <strong>Important Note:</strong> The "Golden Period" for stroke recovery is typically the first 3 to 6 months. Early and consistent intervention significantly improves the chances of a successful recovery.
            </div>

            <a href="/" class="home-btn">Back to Home Page</a>
        </div>
    </body>
    </html>
    `);
});




app.get('/geriatric-rehab', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Geriatric Rehabilitation</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Poppins', sans-serif; line-height: 1.6; color: #1f2937; max-width: 800px; margin: 40px auto; padding: 20px; background: #f3f6f9; }
            .info-card { background: white; padding: 40px; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
            h1 { color: #d97706; margin-top: 0; font-size: 2.5rem; border-bottom: 3px solid #d97706; display: inline-block; margin-bottom: 20px; }
            h2 { color: #111827; margin-top: 30px; font-size: 1.4rem; border-left: 4px solid #10b981; padding-left: 15px; }
            ul { padding-left: 20px; }
            li { margin-bottom: 12px; }
            .home-btn { display: inline-block; margin-top: 30px; padding: 15px 30px; background: #d97706; color: white; text-decoration: none; border-radius: 50px; font-weight: 700; transition: 0.3s; }
            .home-btn:hover { background: #b45309; transform: translateY(-2px); }
            strong { color: #d97706; }
            .stat-box { background: #fffbeb; border: 1px solid #fef3c7; padding: 20px; border-radius: 15px; margin-top: 25px; display: flex; align-items: center; gap: 15px; }
        </style>
    </head>
    <body>
        <div class="info-card">
            <h1>Geriatric Rehabilitation</h1>
            <p>Geriatric rehabilitation focuses on the unique physical needs of older adults. Our aim is to manage age-related conditions, restore mobility, and improve the <strong>Quality of Life</strong> for seniors, allowing them to remain active and independent.</p>
            
            

            <h2>1. Short-Term Goals</h2>
            <ul>
                <li><strong>Pain Management (Arthritis/OA):</strong> Using gentle mobilization and heat/cold therapies to reduce joint stiffness and chronic aches.</li>
                <li><strong>Fall Risk Assessment:</strong> Identifying balance deficits and environmental hazards to prevent dangerous fractures.</li>
                <li><strong>Safe Transfers:</strong> Training the patient to move safely from sitting to standing and in/out of bed without losing balance.</li>
                <li><strong>Respiratory Maintenance:</strong> Teaching deep breathing exercises to maintain lung capacity and prevent secondary infections like pneumonia.</li>
            </ul>

            <h2>2. Long-Term Goals</h2>
            <ul>
                <li><strong>Bone Density & Strength:</strong> Implementing weight-bearing exercises to combat osteoporosis and maintain muscle mass (sarcopenia prevention).</li>
                <li><strong>Endurance for Daily Tasks:</strong> Building the stamina required for independent grocery shopping, walking to the park, or climbing stairs.</li>
                <li><strong>Post-Surgical Recovery:</strong> Specialized protocols for recovery after Total Hip Replacement (THR) or Total Knee Replacement (TKR).</li>
                <li><strong>Cognitive Engagement:</strong> Coordinating movement with mental tasks to support brain health and slow the progression of dementia or Parkinson's.</li>
            </ul>

            

            <div class="stat-box">
                <span style="font-size: 2rem;"></span>
                <div>
                    <strong>Focus on Independence:</strong> The primary measure of success in geriatric rehab is not just "healing," but ensuring the patient can perform Activities of Daily Living (ADLs) with minimal assistance.
                </div>
            </div>

            <a href="/" class="home-btn">Back to Home Page</a>
        </div>
    </body>
    </html>
    `);
});






app.get('/gait-training', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Gait Training & Walking Rehab</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Poppins', sans-serif; line-height: 1.6; color: #1f2937; max-width: 800px; margin: 40px auto; padding: 20px; background: #f3f6f9; }
            .info-card { background: white; padding: 40px; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
            h1 { color: #0ea5e9; margin-top: 0; font-size: 2.5rem; border-bottom: 3px solid #0ea5e9; display: inline-block; margin-bottom: 20px; }
            h2 { color: #111827; margin-top: 30px; font-size: 1.4rem; border-left: 4px solid #0ea5e9; padding-left: 15px; }
            ul { padding-left: 20px; }
            li { margin-bottom: 12px; }
            .home-btn { display: inline-block; margin-top: 30px; padding: 15px 30px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 50px; font-weight: 700; transition: 0.3s; }
            .home-btn:hover { background: #0284c7; transform: translateY(-2px); }
            strong { color: #0369a1; }
            .tip-box { background: #f0f9ff; border-radius: 15px; padding: 20px; margin-top: 25px; border: 1px solid #bae6fd; }
        </style>
    </head>
    <body>
        <div class="info-card">
            <h1>Gait Training</h1>
            <p>Gait training is a type of physical therapy used to help people improve their ability to stand and walk. It is essential for patients recovering from injuries, surgeries, or neurological conditions that have affected their <strong>walking pattern</strong> and stability.</p>

            

            <h2>1. Short-Term Goals</h2>
            <ul>
                <li><strong>Weight-Bearing Tolerance:</strong> Gradually increasing the amount of weight the patient can comfortably put on an injured or surgical limb.</li>
                <li><strong>Static & Dynamic Balance:</strong> Improving the ability to stay upright while standing still (static) and while moving or shifting weight (dynamic).</li>
                <li><strong>Assistive Device Proficiency:</strong> Training the patient on the correct and safe use of walkers, crutches, or canes.</li>
                <li><strong>Posture Correction:</strong> Ensuring the head, shoulders, and hips are aligned correctly to prevent secondary back or hip pain.</li>
            </ul>

            

            <h2>2. Long-Term Goals</h2>
            <ul>
                <li><strong>Gait Symmetry:</strong> Correcting limping or "guarding" patterns to ensure both legs are working equally and efficiently.</li>
                <li><strong>Community Mobility:</strong> Training to walk on uneven surfaces, such as grass, gravel, or ramps, and navigating curbs and stairs.</li>
                <li><strong>Increased Walking Distance:</strong> Building cardiovascular and muscular endurance so the patient can walk longer distances without fatigue.</li>
                <li><strong>Return to Independence:</strong> Achieving a walking speed and stability level that allows for safe navigation of busy environments like shopping malls or streets.</li>
            </ul>

            <div class="tip-box">
                <strong>Why Gait Matters:</strong> An abnormal walking pattern doesn't just make walking difficult—it can lead to "compensation injuries" in the opposite hip, lower back, or knees. Proper training fixes the root cause before other problems start.
            </div>

            <a href="/" class="home-btn">Back to Home Page</a>
        </div>
    </body>
    </html>
    `);
});





app.get('/post-op-rehab', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Post-Operation Rehabilitation</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Poppins', sans-serif; line-height: 1.6; color: #1f2937; max-width: 800px; margin: 40px auto; padding: 20px; background: #f3f6f9; }
            .info-card { background: white; padding: 40px; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
            h1 { color: #dc2626; margin-top: 0; font-size: 2.5rem; border-bottom: 3px solid #dc2626; display: inline-block; margin-bottom: 20px; }
            h2 { color: #111827; margin-top: 30px; font-size: 1.4rem; border-left: 4px solid #dc2626; padding-left: 15px; }
            ul { padding-left: 20px; }
            li { margin-bottom: 12px; }
            .home-btn { display: inline-block; margin-top: 30px; padding: 15px 30px; background: #dc2626; color: white; text-decoration: none; border-radius: 50px; font-weight: 700; transition: 0.3s; }
            .home-btn:hover { background: #991b1b; transform: translateY(-2px); }
            strong { color: #dc2626; }
            .safety-box { background: #fff1f2; border: 1px solid #fecaca; padding: 20px; border-radius: 15px; margin-top: 25px; }
        </style>
    </head>
    <body>
        <div class="info-card">
            <h1>Post-Op Rehabilitation</h1>
            <p>Post-surgical rehabilitation is a structured program of physiotherapy designed to guide a patient through the critical stages of healing after surgery. Our priority is to protect the surgical site while restoring <strong>full movement</strong> and function.</p>

            

            <h2>1. Short-Term Goals (Phase I: Protection)</h2>
            <ul>
                <li><strong>Pain & Swelling Management:</strong> Using Cryotherapy (ice), compression, and gentle movement to reduce inflammation and manage post-surgical pain.</li>
                <li><strong>Circulation Support:</strong> Performing "Ankle Pumps" and basic limb movements to prevent Deep Vein Thrombosis (DVT) and improve blood flow.</li>
                <li><strong>Protection of Surgical Site:</strong> Teaching the patient how to move, sleep, and perform basic tasks without putting stress on the stitches or implants.</li>
                <li><strong>Scar Tissue Management:</strong> Gentle manual therapy to ensure the healing incision remains flexible and does not adhere to underlying tissues.</li>
            </ul>

            

            <h2>2. Long-Term Goals (Phase II & III: Restoration)</h2>
            <ul>
                <li><strong>Muscle Re-activation:</strong> Using isometric and progressive resistance exercises to wake up muscles that were inhibited during the surgical procedure.</li>
                <li><strong>Joint Flexibility:</strong> Gradually increasing the Range of Motion (ROM) to reach the "functional norm" required for the patient's specific joint.</li>
                <li><strong>Functional Strengthening:</strong> Re-building the strength necessary for movements like climbing stairs, squatting, or lifting, specific to the patient's lifestyle.</li>
                <li><strong>Full Return to Sport/Activity:</strong> Implementing advanced balance and agility drills once the surgeon has cleared the tissues for high-impact activity.</li>
            </ul>


            <a href="/" class="home-btn">Back to Home Page</a>
        </div>
    </body>
    </html>
    `);
});






app.get('/ergonomics', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Ergonomics & Posture</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Poppins', sans-serif; line-height: 1.6; color: #1f2937; max-width: 800px; margin: 40px auto; padding: 20px; background: #f3f6f9; }
            .info-card { background: white; padding: 40px; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
            h1 { color: #0d9488; margin-top: 0; font-size: 2.5rem; border-bottom: 3px solid #0d9488; display: inline-block; margin-bottom: 20px; }
            h2 { color: #111827; margin-top: 30px; font-size: 1.4rem; border-left: 4px solid #0d9488; padding-left: 15px; }
            ul { padding-left: 20px; }
            li { margin-bottom: 12px; }
            .home-btn { display: inline-block; margin-top: 30px; padding: 15px 30px; background: #0d9488; color: white; text-decoration: none; border-radius: 50px; font-weight: 700; transition: 0.3s; }
            .home-btn:hover { background: #0f766e; transform: translateY(-2px); }
            strong { color: #0d9488; }
            .setup-box { background: #f0fdfa; border-radius: 15px; padding: 25px; margin-top: 25px; border: 1px solid #ccfbf1; }
            .setup-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 15px; }
            @media (max-width: 600px) { .setup-grid { grid-template-columns: 1fr; } }
        </style>
    </head>
    <body>
        <div class="info-card">
            <h1>Ergonomics</h1>
            <p>Ergonomics is the science of designing the workplace to fit the user. In physiotherapy, we focus on <strong>Postural Correction</strong> to reduce muscle fatigue, increase productivity, and prevent chronic conditions like "Text Neck" or "Computer Back."</p>

            

            <h2>1. Common Issues Addressed</h2>
            <ul>
                <li><strong>Upper Cross Syndrome:</strong> Correcting rounded shoulders and forward head posture caused by prolonged desk work.</li>
                <li><strong>Repetitive Strain Injuries (RSI):</strong> Managing conditions like Carpal Tunnel Syndrome or Tennis Elbow caused by poor keyboard/mouse habits.</li>
                <li><strong>Sciatica & Lower Back Strain:</strong> Reducing pressure on the lumbar discs through proper seating and lumbar support.</li>
                <li><strong>Digital Eye Strain:</strong> Advice on screen distance and lighting to reduce headaches and neck tension.</li>
            </ul>

            <h2>2. Ergonomic Goals</h2>
            <ul>
                <li><strong>Neutral Spine Alignment:</strong> Training the body to maintain the natural "S-curve" of the spine during sitting and standing.</li>
                <li><strong>Core Muscle Endurance:</strong> Strengthening the deep stabilizers so the body can maintain good posture without conscious effort.</li>
                <li><strong>Workplace Modification:</strong> Professional advice on chair height, monitor placement, and footrests.</li>
                <li><strong>Active Micro-breaks:</strong> Implementing "Stretch-and-Move" protocols every 30-60 minutes to prevent muscle "creep" and stiffness.</li>
            </ul>

            

            <div class="setup-box">
                <h3>The 90-90-90 Rule</h3>
                <div class="setup-grid">
                    <div>
                        <strong>1. Elbows:</strong> Bent at 90° and close to your body.
                    </div>
                    <div>
                        <strong>2. Hips:</strong> Bent at 90° with a supported lower back.
                    </div>
                    <div>
                        <strong>3. Knees:</strong> Bent at 90° with feet flat on the floor or a footrest.
                    </div>
                    <div>
                        <strong>4. Eyes:</strong> Level with the top third of your monitor screen.
                    </div>
                </div>
            </div>

            <a href="/" class="home-btn">Back to Home Page</a>
        </div>
    </body>
    </html>
    `);
});




app.get('/pain-management', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Pain Management Therapy</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Poppins', sans-serif; line-height: 1.6; color: #1f2937; max-width: 800px; margin: 40px auto; padding: 20px; background: #f3f6f9; }
            .info-card { background: white; padding: 40px; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
            h1 { color: #1e40af; margin-top: 0; font-size: 2.5rem; border-bottom: 3px solid #1e40af; display: inline-block; margin-bottom: 20px; }
            h2 { color: #111827; margin-top: 30px; font-size: 1.4rem; border-left: 4px solid #3b82f6; padding-left: 15px; }
            ul { padding-left: 20px; }
            li { margin-bottom: 12px; }
            .home-btn { display: inline-block; margin-top: 30px; padding: 15px 30px; background: #1e40af; color: white; text-decoration: none; border-radius: 50px; font-weight: 700; transition: 0.3s; }
            .home-btn:hover { background: #1e3a8a; transform: translateY(-2px); }
            strong { color: #1e40af; }
            .relief-box { background: #eff6ff; border-radius: 15px; padding: 25px; margin-top: 25px; border: 1px solid #dbeafe; }
            .pain-scale { display: flex; justify-content: space-between; margin: 20px 0; padding: 10px; background: #f8fafc; border-radius: 10px; font-size: 0.8rem; text-align: center; }
        </style>
    </head>
    <body>
        <div class="info-card">
            <h1>Pain Management</h1>
            <p>Pain management in physiotherapy focuses on identifying the root cause of discomfort and using a combination of manual therapy, modalities, and movement to reduce <strong>pain intensity</strong> and improve function.</p>

           

            <h2>1. Our Approach to Pain Relief</h2>
            <ul>
                <li><strong>Manual Therapy:</strong> Joint mobilizations and soft tissue release to reduce mechanical pressure on nerves and sensitive tissues.</li>
                <li><strong>Electro-Modalities:</strong> Utilizing TENS, Ultrasound, and IFT to interfere with pain signals and stimulate natural healing.</li>
                <li><strong>Dry Needling & Trigger Point Therapy:</strong> Targeting specific "knots" in the muscle that cause referred pain and stiffness.</li>
                <li><strong>Therapeutic Exercise:</strong> Prescribing specific movements that desensitize the nervous system and build resilience.</li>
            </ul>

          

            <h2>2. Goals of Treatment</h2>
            <ul>
                <li><strong>Desensitization:</strong> Calming an overactive nervous system that has become "hypersensitive" to movement after chronic pain.</li>
                <li><strong>Break the Pain-Spasm Cycle:</strong> Preventing the body from tensing up in response to pain, which often leads to more pain.</li>
                <li><strong>Restoration of Sleep:</strong> Reducing nighttime discomfort so the body can enter the deep healing stages of sleep.</li>
                <li><strong>Self-Management Education:</strong> Empowering you with "First-Aid" techniques and ergonomic fixes to manage flare-ups at home.</li>
            </ul>

            <div class="relief-box">
                <h3>Acute vs. Chronic Pain</h3>
                <p><strong>Acute Pain:</strong> Acts as a warning signal for tissue damage (e.g., a fresh sprain). Focus is on protection and reducing inflammation.</p>
                <p style="margin-top:10px;"><strong>Chronic Pain:</strong> Often persists after tissues have healed. Focus is on retraining the brain and nervous system to movement without fear.</p>
            </div>

            <a href="/" class="home-btn">Back to Home Page</a>
        </div>
    </body>
    </html>
    `);
});


app.get('/injury-prevention', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Injury Prevention - Muni Physio Care</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Poppins', sans-serif; line-height: 1.6; color: #1f2937; max-width: 800px; margin: 40px auto; padding: 20px; background: #f3f6f9; }
            .info-card { background: white; padding: 40px; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
            h1 { color: #6d28d9; margin-top: 0; font-size: 2.5rem; border-bottom: 3px solid #6d28d9; display: inline-block; margin-bottom: 20px; }
            h2 { color: #111827; margin-top: 30px; font-size: 1.4rem; border-left: 4px solid #10b981; padding-left: 15px; }
            ul { padding-left: 20px; }
            li { margin-bottom: 12px; }
            .home-btn { display: inline-block; margin-top: 30px; padding: 15px 30px; background: #6d28d9; color: white; text-decoration: none; border-radius: 50px; font-weight: 700; transition: 0.3s; }
            .home-btn:hover { background: #5b21b6; transform: translateY(-2px); }
            strong { color: #6d28d9; }
            .prevention-box { background: #f5f3ff; border: 1px solid #ddd6fe; padding: 25px; border-radius: 15px; margin-top: 25px; }
        </style>
    </head>
    <body>
        <div class="info-card">
            <h1>Injury Prevention</h1>
            <p>Injury prevention is the proactive practice of strengthening the body and correcting movement patterns to stop injuries before they happen. Whether you are an athlete or a desk worker, <strong>prehabilitation</strong> ensures your body can handle the stresses of daily life.</p>

            

            <h2>1. Key Pillars of Prevention</h2>
            <ul>
                <li><strong>Dynamic Warm-ups:</strong> Preparing muscles and joints for activity by increasing blood flow and improving "functional" flexibility.</li>
                <li><strong>Muscle Balance:</strong> Identifying and strengthening "weak links" in the kinetic chain to prevent overcompensation by other muscles.</li>
                <li><strong>Load Management:</strong> Training the body to handle gradual increases in physical stress to prevent overuse injuries like stress fractures.</li>
                <li><strong>Proprioceptive Training:</strong> Enhancing the body's subconscious ability to stabilize joints, especially the ankles and knees, during sudden movements.</li>
            </ul>

            

            <h2>2. Our Preventive Approach</h2>
            <ul>
                <li><strong>Screening & Assessment:</strong> Using functional movement screens to find hidden imbalances or stiff joints.</li>
                <li><strong>Sport-Specific Conditioning:</strong> Tailoring exercises to the specific demands of your sport or hobby (e.g., rotator cuff stability for swimmers).</li>
                <li><strong>Technique Correction:</strong> Analyzing your lifting, running, or sitting form to ensure optimal biomechanics.</li>
                <li><strong>Recovery Strategies:</strong> Education on sleep, nutrition, and "active recovery" to allow tissues to repair efficiently.</li>
            </ul>

            <div class="prevention-box">
                <h3>The "Prehab" Mindset</h3>
                <p>Don't wait for the pain to start. Prehabilitation is 10 times more effective (and cheaper) than rehabilitation. A resilient body is built on <strong>consistency</strong> and <strong>proper form</strong>.</p>
            </div>

            <a href="/" class="home-btn">Back to Home Page</a>
        </div>
    </body>
    </html>
    `);
});


// GET existing sessions for a patient
app.get('/api/sessions/:id', async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM sessions WHERE patient_id = $1 ORDER BY session_number ASC", 
            [req.params.id]
        );
        res.json(result.rows);
    } catch (e) { 
        res.status(500).send(e.message); 
    }
});

// SAVE or UPDATE sessions
app.post('/api/save-sessions', async (req, res) => {
    const { patient_id, sessions } = req.body;
    try {
        // Delete old sessions and replace with the new updated list
        await pool.query("DELETE FROM sessions WHERE patient_id = $1", [patient_id]);
        for (const s of sessions) {
            await pool.query(
                "INSERT INTO sessions (patient_id, session_number, session_date, session_details) VALUES ($1, $2, $3, $4)",
                [patient_id, s.session_number, s.session_date, s.session_details]
            );
        }
        res.sendStatus(200);
    } catch (e) { 
        res.status(500).send(e.message); 
    }
});







// --- CONSOLIDATED FEEDBACK ROUTE WITH STRICT ID CHECK ---
app.post('/submit-feedback', async (req, res) => {
    // 1. Capture the data from the form
    const { patient_id, name, mobile, details, rating } = req.body;

    // Log for debugging (Check your terminal to see if ID is arriving)
    console.log(`Attempting feedback for Patient ID: ${patient_id}`);

    try {
        // 2. STRICT DATABASE VERIFICATION
        // We look for the exact string in the 'patient_id' column of 'patients' table
        const verifyPatient = await pool.query(
            "SELECT name FROM patients WHERE patient_id = $1", 
            [patient_id]
        );

        // 3. IF NO MATCH IS FOUND
        if (verifyPatient.rows.length === 0) {
            console.log("Verification Failed: ID not found in database.");
            return res.send(`
                <script>
                    alert("ERROR: Patient ID '${patient_id}' does not exist in our records.\\n\\nPlease check your ID and try again.");
                    window.history.back(); // Sends user back to the form with their data intact
                </script>
            `);
        }

        // 4. IF MATCH IS FOUND -> SAVE FEEDBACK
        const patientFoundName = verifyPatient.rows[0].name;
        console.log(`Verification Success: ID belongs to ${patientFoundName}`);

        await pool.query(
            "INSERT INTO feedbacks (patient_name, mobile, details, rating) VALUES ($1, $2, $3, $4)",
            [name, mobile, details, rating]
        );

        // 5. SUCCESS RESPONSE
        res.send(`
            <script>
                alert("Success! Feedback recorded for ${patientFoundName}.");
                window.location.href = "/";
            </script>
        `);

    } catch (err) {
        console.error('Database Error during feedback submission:', err);
        res.status(500).send("A server error occurred. Please try again later.");
    }
});


// NEW: API to fetch patient details by ID for feedback
app.get('/api/get-patient/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            "SELECT name, mobile FROM patients WHERE patient_id = $1", 
            [id]
        );

        if (result.rows.length > 0) {
            res.json({ success: true, patient: result.rows[0] });
        } else {
            res.json({ success: false, message: "Patient ID not found" });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: "Database error" });
    }
});

// 4. FRONTEND TEMPLATE

function renderHTML(doctor, feedbacks, stats) {

    const STAR_FULL = '\u2605';  

    const STAR_EMPTY = '\u2606'; 

    const PHONE_ICON = '\u260E'; 

    const PLAY_ICON = '\u25B6'; 

    const ARROW_ICON = '\u2192'; 

    const getStars = (count) => STAR_FULL.repeat(count) + STAR_EMPTY.repeat(5 - count);

    const avgRating = stats.avg_rating ? stats.avg_rating.toFixed(1) : "0.0"; 

    const totalReviews = stats.count || 0;

    const avgDisplay = `${STAR_FULL} ${avgRating}/5 (${totalReviews} Reviews)`;

    const feedbackListHtml = feedbacks.map(f => `
<div class="feedback-card">
<div class="feedback-header">
<div class="user-avatar">${f.patient_name.charAt(0).toUpperCase()}</div>
<div>
<strong style="display:block; color:#333;">${f.patient_name}</strong>
<span class="stars">${getStars(f.rating)}</span>
</div>
</div>
<p>"${f.details}"</p>
</div>

    `).join('');

    const docName = doctor ? doctor.name : "Dr. Munikrishna SN PT";

    const docQual = doctor ? doctor.qualification : "Physiotherapist";

    const docImg = (doctor && doctor.image_url) ? doctor.image_url : "/doctor.jpg";

    const docPhone = doctor ? doctor.phone : "9113602399";

    const whatsAppLink = `https://wa.me/91${docPhone}`;

    const callLink = `tel:+91${docPhone}`;



    const servicesContent = `
<div class="services-grid">
    <div class="service-card">
        <h3><a href="/electro">Electro Therapy</a></h3>
        <p>Advanced electrical stimulation to modulate pain and accelerate tissue repair.</p>
    </div>

    <div class="service-card">
        <h3><a href="/exercise-therapy">Exercise Therapy</a></h3>
        <p>Customized strengthening and mobility programs to restore full physical function.</p>
    </div>

    <div class="service-card">
        <h3><a href="/stroke-rehab">Stroke Rehabilitation</a></h3>
        <p>Neuroplasticity-focused training to regain motor control and daily independence.</p>
    </div>

    <div class="service-card">
        <h3><a href="/geriatric-rehab">Geriatric Rehabilitation</a></h3>
        <p>Gentle, effective care for seniors to improve balance and prevent fall-related injuries.</p>
    </div>

    <div class="service-card">
        <h3><a href="/gait-training">Gait Training</a></h3>
        <p>Comprehensive walking analysis and re-education for a smoother, safer stride.</p>
    </div>

    <div class="service-card">
        <h3><a href="/post-op-rehab">Post Operation Rehab</a></h3>
        <p>Phase-by-phase recovery protocols to protect surgical sites and restore joint range.</p>
    </div>

    <div class="service-card">
        <h3><a href="/ergonomics">Ergonomics</a></h3>
        <p>Professional workplace assessment and postural correction to eliminate strain.</p>
    </div>

    <div class="service-card">
        <h3><a href="/pain-management">Pain Management</a></h3>
        <p>A multi-modal approach to desensitize the nervous system and manage chronic pain.</p>
    </div>

    <div class="service-card">
        <h3><a href="/injury-prevention">Injury Prevention</a></h3>
        <p>Identifying weaknesses early, enhancing performance, and building resilience against strains, sprains, and overuse issues</p>
    </div>
</div>
`;

    // Header Background Image

    const headerBgImage = "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1350&q=80";

    return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Muni Physio Care</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">

<style>
 :root { 

                --primary: #0066cc; 

                --primary-dark: #004c99;

                --secondary: #10b981;

                --bg-body: #f3f6f9;

                --white: #ffffff; 

                --text-main: #1f2937;

                --text-light: #6b7280;

                --card-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.05);

                --radius: 24px;

            }

            body { 

                font-family: 'Poppins', sans-serif; 

                margin: 0; 

                background: var(--bg-body); 

                color: var(--text-main); 

            }

            /* HEADER */

            .header-section { 

                background: linear-gradient(rgba(15, 23, 42, 0.85), rgba(15, 23, 42, 0.9)), url('${headerBgImage}');

                background-size: cover;

                background-position: center;

                background-attachment: fixed; 

                text-align: center; 

                padding: 80px 20px; 

                color: var(--white);

                border-radius: 0 0 40px 40px;

                margin-bottom: -40px; /* Overlap effect */

                position: relative;

                z-index: 1;

            }

 /* --- SPECIFIC MOBILE OVERRIDES --- */
    @media (max-width: 900px) { 
        .container { 
            grid-template-columns: 1fr; 
            margin-top: -90px; 
            padding: 0 15px;
        } 

        .header-section { 
            padding: 50px 10px 110px 10px; 
        }

        .main-title { 
            font-size: 1.6rem !important; /* Fixed size for mobile clarity */
            letter-spacing: -0.5px;
        }

        .profile-img {
            width: 130px;
            height: 130px;
        }
    }





           /* 1. UPDATE THIS SECTION */
.header-section { 
    background: linear-gradient(rgba(15, 23, 42, 0.85), rgba(15, 23, 42, 0.9)), url('${headerBgImage}');
    background-size: cover;
    background-position: center;
    text-align: center; 
    padding: 60px 15px; /* Reduced padding for mobile safety */
    color: var(--white);
    border-radius: 0 0 30px 30px;
    margin-bottom: -40px;
    position: relative;
    z-index: 1;
    overflow: hidden; /* Prevents text from spilling out */
}

/* 2. UPDATE THIS SECTION - The 'Clamp' ensures it auto-shrinks */
.main-title { 
    margin: 0 auto; 
    font-size: clamp(1.5rem, 7vw, 3.5rem); /* Auto-scales based on screen width */
    font-weight: 700; 
    line-height: 1.2;
    width: 100%;
    max-width: 90vw; /* Keeps text away from screen edges */
    background: linear-gradient(to right, #fff, #cbd5e1);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    text-shadow: 0 4px 12px rgba(0,0,0,0.3);
    word-wrap: break-word;
    display: block;
}

/* 3. UPDATE YOUR MOBILE MEDIA QUERY AT THE BOTTOM */
@media (max-width: 600px) { 
    .container { 
        grid-template-columns: 1fr; 
        padding: 200 20px; 
    } 

    .main-title { 
        font-size: 1.8rem !important; /* Forces a safe size for small screens */
        letter-spacing: -0.5px;
    }

    .header-section {
        padding: 200px 10px 200px 10px; /* Gives more room for the overlap */
    }

    .profile-card {
        margin: 0 10px;
        width: auto;
    }

    /* Fix for the "half frame" issue - centers the layout */
    body {
        overflow-x: hidden; 
        width: 100%;
    }
}

            /* LAYOUT */

            .container { 

                display: grid; 

                grid-template-columns: 380px 1fr; 

                gap: 40px; 

                max-width: 1280px; 

                margin: 0 auto 60px auto; 

                padding: 0 30px; 

                position: relative;

                z-index: 2;

            }

            /* MAIN CONTENT ADJUSTMENT - FIXED VISIBILITY */

            .main-content {

                margin-top: 60px; /* Pushes content down to clear the dark header */

            }

            /* Add this to your CSS section */
             .profile-card a {
              text-decoration: none;
    display: inline-block;
}

.profile-img:hover {
    transform: translateY(-55px) scale(1.05) !important; /* Slight zoom on hover */
    box-shadow: 0 15px 30px rgba(0,0,0,0.2);
    cursor: pointer;
}

            /* CARDS */

            .card { 

                background: var(--white); 

                padding: 35px; 

                border-radius: var(--radius); 

                box-shadow: var(--card-shadow); 

                border: 1px solid rgba(255,255,255,0.8);

            }

            /* PROFILE CARD */

            .profile-card { text-align: center; position: sticky; top: 30px; }

            .profile-img { 

                width: 160px; height: 160px; object-fit: cover; 

                border-radius: 40px; border: 6px solid var(--white); 

                box-shadow: 0 10px 25px rgba(0,0,0,0.1); 

                margin-bottom: 20px; transform: translateY(-50px); margin-top: -15px; 

            }

            .profile-name { font-size: 2rem; color: var(--text-main); margin: -30px 0 5px 0; }

            .profile-qual { color: var(--primary); font-weight: 600; font-size: 0.9rem; margin-bottom: 15px; }

            .profile-expertise { background: #eff6ff; color: var(--primary); font-weight: 600; font-size: 0.9rem; padding: 8px 16px; border-radius: 100px; display: inline-block; margin-bottom: 15px; }

            .rating-badge { display: inline-flex; align-items: center; gap: 5px; background: #fffbeb; border: 1px solid #fcd34d; padding: 8px 16px; border-radius: 12px; color: #b45309; font-weight: 700; margin-bottom: 20px; }

            .contact-row { display: flex; align-items: center; justify-content: center; gap: 10px; color: var(--text-light); font-weight: 500; margin-bottom: 25px; }

            /* BUTTONS */

            .btn-group { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; }

            .btn { padding: 5px; border: none; border-radius: 16px; color: white; cursor: pointer; text-decoration: none; font-weight: 600; font-size: 1rem; text-align: center; transition: 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; }

            .call { background: var(--secondary); }

            .msg { background: #25D366; }

            .btn:hover { transform: translateY(-3px); }

            /* VIDEO SECTION */

            .video-section h3 { text-align: left; font-size: 1.1rem; margin-bottom: 15px; }

            .video-btn { display: flex; align-items: center; width: 100%; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; margin-bottom: 12px; border-radius: 16px; cursor: pointer; transition: 0.3s; text-align: left; }

            .video-btn:hover { background: white; border-color: var(--primary); transform: translateX(5px); }

            .vid-thumb { width: 70px; height: 50px; object-fit: cover; border-radius: 8px; margin-right: 15px; }

            .vid-info { flex: 1; }

            .vid-title { font-weight: 600; font-size: 0.9rem; color: var(--text-main); }

            .play-indicator { width: 30px; height: 30px; background: #e0f2fe; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--primary); font-size: 10px; }

            /* SERVICES */

            .services-container { margin-bottom: 40px; }

            /* FIXED SECTION HEADER STYLE */

            .section-header { 

                font-size: 1.5rem; 

                font-weight: 700; 

                margin-bottom: 20px; 

                display: flex; 

                align-items: center; 

                gap: 10px;

                color: var(--text-main); /* Ensure dark color */

                background: rgba(255,255,255,0.8); /* Slight background for readability */

                padding: 10px 15px;

                border-radius: 12px;

                backdrop-filter: blur(5px);

                width: fit-content;

            }

            .section-header::before { content: ''; width: 6px; height: 25px; background: var(--primary); border-radius: 4px; display: block; }

            .services-wrapper { background: white; padding: 40px 0; border-radius: var(--radius); box-shadow: var(--card-shadow); overflow: hidden; }

            .scroll-track { display: flex; width: max-content; animation: scroll 40s linear infinite; }

            .scroll-track:hover { animation-play-state: paused; }

            @keyframes scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }

            .service-card { width: 280px; background: #f8fafc; padding: 25px; margin: 0 20px; border-radius: 20px; flex-shrink: 0; border: 1px solid #f1f5f9; }

            .icon-box { font-size: 2rem; margin-bottom: 10px; }

            .service-card h3 { color: var(--text-main); margin: 0 0 10px 0; font-size: 1.1rem; }

            /* FORM */

            .form-section { margin-bottom: 40px; }

            .input-group { margin-bottom: 20px; }

            .input-group label { display: block; font-weight: 600; font-size: 0.9rem; margin-bottom: 8px; color: var(--text-main); }

            input, textarea, select { width: 100%; padding: 16px; border: 2px solid #f1f5f9; border-radius: 16px; background: #f8fafc; font-family: inherit; font-size: 1rem; box-sizing: border-box; transition: 0.3s; }

            input:focus, textarea:focus { outline: none; border-color: var(--primary); background: white; box-shadow: 0 0 0 4px rgba(0, 102, 204, 0.1); }

            button[type="submit"] { 

                background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); 

                color: white; border: none; padding: 18px 30px; border-radius: 100px; width: 100%; font-size: 1.1rem; font-weight: 700; cursor: pointer; transition: all 0.3s; 

                box-shadow: 0 10px 20px rgba(0, 102, 204, 0.3); text-transform: uppercase; letter-spacing: 1.5px; margin-top: 10px; 

                display: flex; justify-content: space-between; align-items: center; padding-left: 40px; padding-right: 40px; 

            }

            button[type="submit"]:hover { transform: translateY(-4px); box-shadow: 0 15px 30px rgba(0, 102, 204, 0.4); }

            button[type="submit"]::after { content: '${ARROW_ICON}'; font-size: 1.4rem; transition: transform 0.3s; }

            button[type="submit"]:hover::after { transform: translateX(5px); }

            /* Container for the reviews */
.reviews-section {
    padding: 5px;
}

/* Grid that switches from 1 column on mobile to 2 on desktop */
.feedback-grid {
    display: grid;
    grid-template-columns: 1fr; /* Mobile: 1 column */
    gap: 20px;
}

@media (min-width: 768px) {
    .feedback-grid {
        grid-template-columns: 1fr 1fr; /* Desktop: 2 columns */
    }
}

.feedback-card {
    background: #f8fafc;
    padding: 20px;
    border-radius: 5px;
    border: 1px solid #e2e8f0;
    transition: transform 0.2s;
}

.feedback-card:hover {
    transform: translateY(-5px);
    border-color: var(--primary);
}   
/* REVIEWS */

          .reviews-section { max-height: 600px; overflow-y: auto; padding-right: 10px; }

           .feedback-grid {display: grid;grid-template-columns: 1fr; /* Mobile: 1 column */gap: 5px;}

            .feedback-card { background: #f8fafc; padding: 25px; border-radius: 20px; border: 1px solid #f1f5f9; }

            .feedback-header { display: flex; align-items: center; gap: 5px; margin-bottom: 5px; }

            .user-avatar { width: 45px; height: 45px; background: #bfdbfe; color: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.2rem; }

            .stars { color: #f59e0b; letter-spacing: 2px; font-size: 0.9rem; 
@media (min-width: 30px) {
    .feedback-grid {
        grid-template-columns: 1fr 1fr; /* Desktop: 2 columns */
    }
}}

            /* MODAL */

            .modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.9); z-index: 1000; justify-content: center; align-items: center; backdrop-filter: blur(5px); }

            .modal-content { position: relative; width: 90%; max-width: 450px; background: #000; border-radius: 20px; overflow: hidden; }

            .close-modal-btn { position: absolute; top: 15px; right: 15px; background: rgba(255,255,255,0.2); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; cursor: pointer; z-index: 10; transition: 0.2s; }

            .close-modal-btn:hover { background: rgba(220, 38, 38, 0.8); }

            iframe { width: 100%; height: 80vh; border: none; display: block; }

            @media (max-width: 900px) { 

                .container { grid-template-columns: 1fr; } 

                .header-section { padding: 60px 20px; }

                .main-title { font-size: 2.2rem; }

                .profile-img { width: 140px; height: 140px; }

                .profile-card { position: static; }

                .main-content { margin-top: 30px; }

            }

/* Container for the static 3x3 grid */
.services-grid {
    display: grid;
    /* Desktop: exactly 3 columns */
    grid-template-columns: repeat(2, 1fr); 
    gap: 20px;
    margin: 20px 0;
}

.service-card {
    background: #ffffff;
    padding: 25px 20px;
    border-radius: 15px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    text-align: center;
    transition: all 0.3s ease;
    display: flex;
    flex-direction: column;
    height: 100%;
    justify-content: center;
}

.service-card:hover {
    transform: translateY(-5px);
    border-color: var(--primary); /* Highlights the card on hover */
    box-shadow: 0 12px 24px rgba(0,0,0,0.1);
}

.service-card h3 {
    margin: 0 0 10px 0;
    font-size: 1.15rem;
}

.service-card h3 a {
    color: var(--primary);
    text-decoration: underline;
}

.service-card p {
    font-size: 0.9rem;
    color: #64748b;
    margin: 0;
    line-height: 1.5;
}

/* Responsive: Adjust columns based on screen size */
@media (max-width: 992px) {
    .services-grid { grid-template-columns: repeat(2, 1fr); } /* 2 per row for tablets */
}

@media (max-width: 600px) {
    .services-grid { grid-template-columns: 1fr; } /* 1 per row for phones */
}
</style>
 
</head>
<body>
<div class="header-section">
<h1 class="main-title">Muni Physio Care & Home Services</h1>
<div class="sub-title">Advanced Physiotherapy & Rehabilitation Center</div>
</div>
<div class="container">
<div class="left-column">
<div class="card profile-card">
<a href="/about-doctor" title="Click to view full profile">
    <img src="${docImg}" alt="Dr. ${docName}" class="profile-img" style="transition: transform 0.3s ease;">
</a>
<h2 class="profile-name">${docName}</h2>
<div class="profile-qual">${docQual}</div>
<div class="rating-badge">${avgDisplay}</div>
<div class="contact-row"><span>${PHONE_ICON} +91 ${docPhone}</span></div>
<div class="btn-group">
<a href="${callLink}" class="btn call">Call Now</a>
<a href="${whatsAppLink}" target="_blank" class="btn msg">WhatsApp</a>
</div>


<div class="video-section">
<h3>Exercise Library</h3>
<button class="video-btn" onclick="openVideo('https://www.youtube.com/embed/ze3H9ZaGFVE')">
<img src="https://img.youtube.com/vi/ze3H9ZaGFVE/0.jpg" class="vid-thumb">
<div class="vid-info"><span class="vid-title">General Physiotherapy</span></div>
<div class="play-indicator">${PLAY_ICON}</div>
</button>
<button class="video-btn" onclick="openVideo('https://www.youtube.com/embed/LpRnOEdygFc')">
<img src="https://img.youtube.com/vi/LpRnOEdygFc/0.jpg" class="vid-thumb">
<div class="vid-info"><span class="vid-title">Lower Back Pain</span></div>
<div class="play-indicator">${PLAY_ICON}</div>
</button>
<button class="video-btn" onclick="openVideo('https://www.youtube.com/embed/dHk-RqehNc8')">
<img src="https://img.youtube.com/vi/dHk-RqehNc8/0.jpg" class="vid-thumb">
<div class="vid-info"><span class="vid-title">Neck Pain Relief</span></div>
<div class="play-indicator">${PLAY_ICON}</div>
</button>
<button class="video-btn" onclick="openVideo('https://www.youtube.com/embed/8euXMuNLRS4')">
<img src="https://img.youtube.com/vi/8euXMuNLRS4/0.jpg" class="vid-thumb">
<div class="vid-info"><span class="vid-title">Knee Pain Exercise</span></div>
<div class="play-indicator">${PLAY_ICON}</div>
</button>
</div>
</div>
</div>


<div class="main-content">
<div style="display: flex; gap: 5px; justify-content: left ; width: %;">
    <div class="service-card" style="flex: 1;">
        <a href="/registration" class="btn" style="background: #10b981; display: block; margin-top: 2px;">Patient Registration</a>
    </div>
    <div class="service-card" style="flex: 1;">
        <a href="/admin-login" class="btn" style="background: #10b981; display: block; margin-top: 2px;">Only For Admin</a>
    </div>
</div>

<div class="card">
    <div class="section-header">Our Specialized Services</div>
    ${servicesContent}
</div>

<style>
    /* Styling the container to create 3 side-by-side columns */
    .condition-grid-container {
        display: grid;
        grid-template-columns: repeat(3, 1fr); /* 3 equal columns */
        gap: 2px 4px; /* Space between rows and columns */
        padding: 2px 0;
        font-family: sans-serif;
    }

    .condition-item {
        font-size: 18px;
        line-height: 1.5;
        color: #333;
    }

    .section-header {
        font-size: 22px;
        font-weight: bold;
        border-bottom: 2px solid #eee;
        padding-bottom: 10px;
    }
</style>

<div class="card" style="margin-bottom: 4px;">
    <div class="section-header">Treatment Available For</div>
    
    <div>
        <div class="condition-item">1.<strong> All Joint Pains</strong></div>
        <div class="condition-item">2.<strong> Frozen Shoulder</strong></div>
        <div class="condition-item">3.<strong> Balance Issues</strong></div>     
        <div class="condition-item">4.<strong> Back Pain</strong></div>
        <div class="condition-item">5.<strong> Rotator Cuff Tear</strong></div>
        <div class="condition-item">6.<strong> Nerve Related Issues</strong></div>
        <div class="condition-item">7.<strong> ACL Tear</strong></div>
        <div class="condition-item">8.<strong> Stroke Rehab</strong></div>
        <div class="condition-item">9.<strong> Post-Op Rehab</strong></div>
        <div class="condition-item">10.<strong> IVDP</strong></div>
        <div class="condition-item">11.<strong> OA Knee</strong></div>
    <p style="text-align: left; color: var(--text-light); font-weight: 600; margin-top: 10px;">& many more etc...</p>
    </div>
</div>

</div>


<div class="card reviews-section">
<div class="section-header">Recent Patient Reviews </div>
<div class="feedback-grid">

                    ${feedbackListHtml.length > 0 ? feedbackListHtml : '<p style="color:#777; font-style:italic; text-align:center;">No reviews yet. Be the first to share your experience!</p>'}
</div>
</div>

<div class="card form-section">
    <div class="section-header">Submit Your Feedback</div>
    <form action="/submit-feedback" method="POST" id="feedbackForm">
        
        <div class="input-group">
            <label>Patient ID <span style="color:red">*</span></label> 
            <input type="text" id="patient_id" name="patient_id" pattern="[0-9]{8}" maxlength="8" required 
                   placeholder="Enter 8-digit ID" autocomplete="off">
            <small id="idStatus" style="display:block; margin-top:5px; font-weight:bold;"></small>
        </div>

        <div class="input-group">
            <label>Patient Name</label> 
            <input type="text" id="patient_name" name="name" required readonly 
                   placeholder="Auto-filled" style="background: #eef2f7; cursor: not-allowed;">
        </div>

        <div class="input-group">
            <label>Mobile Number</label> 
            <input type="tel" id="patient_mobile" name="mobile" required readonly 
                   placeholder="Auto-filled" style="background: #eef2f7; cursor: not-allowed;">
        </div>
<div class="input-group">
            <label>Rate Your Experience <span style="color:red">*</span></label>
            <select name="rating" required>
                <option value="" disabled selected>Select a rating</option>
                <option value="5">${STAR_FULL}${STAR_FULL}${STAR_FULL}${STAR_FULL}${STAR_FULL} (Excellent Service)</option>
                <option value="4">${STAR_FULL}${STAR_FULL}${STAR_FULL}${STAR_FULL}${STAR_EMPTY} (Good Service)</option>
                <option value="3">${STAR_FULL}${STAR_FULL}${STAR_FULL}${STAR_EMPTY}${STAR_EMPTY} (Average Service)</option>
                <option value="2">${STAR_FULL}${STAR_FULL}${STAR_EMPTY}${STAR_EMPTY}${STAR_EMPTY} (Improve In Service)</option>
                <option value="1">${STAR_FULL}${STAR_EMPTY}${STAR_EMPTY}${STAR_EMPTY}${STAR_EMPTY} (Poor Service)</option>
            </select>
        </div>

        <div class="input-group">
            <label>Your Experience Feedback Details <span style="color:red">*</span></label> 
            <textarea name="details" rows="3" required placeholder="Tell us about your treatment experience..."></textarea>
        </div>
        <button type="submit" id="submitBtn" disabled style="opacity:0.5; cursor:not-allowed;">SUBMIT FEEDBACK</button>
    </form>
</div>
</div>
</div>
</div>
<div id="videoModal" class="modal-overlay">
<div class="modal-content">
<div class="close-modal-btn" onclick="closeVideo()">&times;</div>
<iframe id="videoPlayer" src="" allowfullscreen></iframe>
</div>
</div>
<script>

        const modal = document.getElementById('videoModal');

        const player = document.getElementById('videoPlayer');

        function openVideo(url) {

            player.src = url + "?autoplay=1"; 

            modal.style.display = "flex";

        }

        function closeVideo() {

            modal.style.display = "none";

            player.src = "";

        }

        window.onclick = function(event) {

            if (event.target == modal) {

                closeVideo();

            }

        }


document.getElementById('patient_id').addEventListener('input', async function(e) {
    const id = e.target.value;
    const status = document.getElementById('idStatus');
    const nameInput = document.getElementById('patient_name');
    const mobileInput = document.getElementById('patient_mobile');
    const submitBtn = document.getElementById('submitBtn');

    // Only search when exactly 8 digits are entered
    if (id.length === 8) {
        status.innerText = "?? Verifying ID...";
        status.style.color = "blue";

        try {
            const response = await fetch('/api/get-patient/' + id);
            const data = await response.json();

            if (data.success) {
                // AUTO-FILL
                nameInput.value = data.patient.name;
                mobileInput.value = data.patient.mobile;
                
                status.innerText = "Verified: " + data.patient.name;
                status.style.color = "green";
                
                // Enable Submit
                submitBtn.disabled = false;
                submitBtn.style.opacity = "1";
                submitBtn.style.cursor = "pointer";
            } else {
                // RESET IF NOT FOUND
                nameInput.value = "";
                mobileInput.value = "";
                status.innerText = "Patient ID not found. Please take our services & then base on your experice submit feedback ";
                status.style.color = "red";
                submitBtn.disabled = true;
                submitBtn.style.opacity = "0.5";
            }
        } catch (err) {
            status.innerText = "?? Error connecting to server.";
        }
    } else {
        // Clear fields if ID is incomplete
        nameInput.value = "";
        mobileInput.value = "";
        status.innerText = "";
        submitBtn.disabled = true;
        submitBtn.style.opacity = "0.5";
    }
});

</script>
</body>
</html>

    `;

}


app.use('/', registrationRoutes(pool));
app.use('/admin', adminRoutes(pool));


app.listen(PORT, () => {

    console.log(`Server running at http://localhost:${PORT}`);

});

 















