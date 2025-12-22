const express = require('express');
const { Pool } = require('pg'); 
const app = express();
const PORT = process.env.PORT || 3001;

// 1. MIDDLEWARE SETUP
app.use(express.urlencoded({ extended: true })); 
app.use(express.static('public')); 

// 2. DATABASE SETUP (PostgreSQL)
const pool = new Pool({
    // Use environment variable 'DATABASE_URL' which you will set in Render
    connectionString: process.env.DATABASE_URL || "postgresql://physio_care_user:ZncwJKq0nAQQYAdLAm0cnUP0wWTb7bmR@dpg-d54g4gbuibrs738fjn90-a.singapore-postgres.render.com/physio_care",
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

        const res = await pool.query("SELECT * FROM doctor WHERE name = $1", ['Dr. Muniraju SN PT']);
        if (res.rows.length === 0) {
            await pool.query(
                "INSERT INTO doctor (name, qualification, image_url, phone) VALUES ($1, $2, $3, $4)",
                ['Dr. Muniraju SN PT', 'Bachelor of Physiotherapy', '/doctor.jpg', '9113602399']
            );
        }
        console.log('Connected to Render PostgreSQL and initialized tables.');
    } catch (err) {
        console.error('Database Init Error:', err);
    }
}
initDB();



// 3. ROUTES

app.get('/', (req, res) => {

    db.get("SELECT * FROM doctor LIMIT 1", (err, doctor) => {

        if (err) return res.send("Database error");

        db.all("SELECT * FROM feedbacks ORDER BY id DESC", (err, feedbacks) => {

            if (err) return res.send("Database error");

            db.get("SELECT AVG(rating) as avg_rating, COUNT(id) as count FROM feedbacks", (err, stats) => {

                if (err) return res.send("Database error");

                res.send(renderHTML(doctor, feedbacks, stats));

            });

        });

    });

});

// --- ADD THIS ROUTE FOR THE DOCTOR'S PROFILE PAGE ---
app.get('/about-doctor', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Dr. Munikrishna SN - Profile</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Poppins', sans-serif; line-height: 1.6; color: #1f2937; max-width: 800px; margin: 40px auto; padding: 20px; background: #f3f6f9; }
            .info-card { background: white; padding: 40px; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); text-align: center; }
            .profile-large { width: 200px; height: 200px; border-radius: 50%; object-fit: cover; border: 5px solid #0066cc; margin-bottom: 20px; }
            h1 { color: #0066cc; margin-bottom: 10px; }
            .details-align { text-align: left; background: #f8fafc; padding: 25px; border-radius: 16px; margin-top: 20px; }
            h2 { font-size: 1.2rem; color: #111827; margin-top: 20px; border-left: 4px solid #10b981; padding-left: 15px; }
            p { margin: 10px 0; }
            .home-btn { display: inline-block; margin-top: 30px; padding: 15px 30px; background: #0066cc; color: white; text-decoration: none; border-radius: 50px; font-weight: 700; transition: 0.3s; }
            .home-btn:hover { background: #004c99; transform: translateY(-2px); }
        </style>
    </head>
    <body>
        <div class="info-card">
            <img src="/doctor.jpg" alt="Dr. Munikrishna SN" class="profile-large">
            <h1>Dr. Munikrishna</h1>
            <p><strong>Bachelor of Physiotherapy</strong></p>
            
            <div class="details-align">
                 
                <h2>Experience</h2>
                <p>Worked as a full time physio at <strong>Baptist Hospital</strong></p>

                <h2>Specialisation</h2>
                <p>Restoring basic mobility, managing chronic pain (like back or neck pain), and rehabilitating patients after surgery or illness.</p>
               

                <h2>Languages</h2>
                <p>English, Kannada, Telugu, Hindi</p>
            </div>

            <a href="/" class="home-btn">Back to Home Page</a>
        </div>
    </body>
    </html>
    `);
});


// --- ADD THIS NEW ROUTE FOR ULTRASOUND THERAPY ---
app.get('/ultrasound', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Ultrasound Therapy - Treatment Goals</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Poppins', sans-serif; line-height: 1.6; color: #1f2937; max-width: 800px; margin: 40px auto; padding: 20px; background: #f3f6f9; }
            .info-card { background: white; padding: 40px; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
            h1 { color: #0066cc; margin-top: 0; font-size: 2.5rem; border-bottom: 3px solid #0066cc; display: inline-block; margin-bottom: 20px; }
            h2 { color: #111827; margin-top: 30px; font-size: 1.4rem; border-left: 4px solid #10b981; padding-left: 15px; }
            ul { padding-left: 20px; }
            li { margin-bottom: 12px; }
            .home-btn { display: inline-block; margin-top: 30px; padding: 15px 30px; background: #0066cc; color: white; text-decoration: none; border-radius: 50px; font-weight: 700; transition: 0.3s; }
            .home-btn:hover { background: #004c99; transform: translateY(-2px); }
        </style>
    </head>
    <body>
        <div class="info-card">
            <h1>Ultrasound Therapy</h1>
            <p>The goals of this treatment shift as a patient moves from the initial injury toward full recovery.</p>
            
            <h2>1. Short-Term Goals (Immediate Response)</h2>
            <ul>
                <li><strong>Pain Modulation:</strong> Increasing pain threshold by stimulating the "gate control" mechanism.</li>
                <li><strong>Inflammation Control:</strong> Using pulsed ultrasound to increase cell permeability and reduce swelling.</li>
                <li><strong>Muscle Spasm Reduction:</strong> Gentle heating helps "reset" muscle spindles for immediate relaxation.</li>
                <li><strong>Improved Local Circulation:</strong> Thermal effects widen blood vessels to bring oxygen and nutrients to the site.</li>
            </ul>

            <h2>2. Long-Term Goals (Tissue Repair)</h2>
            <ul>
                <li><strong>Tissue Regeneration:</strong> Stimulating fibroblasts to produce collagen for tendon and ligament repair.</li>
                <li><strong>Scar Tissue Realignment:</strong> Making collagen fibers more "pliable" to massage them into functional alignment.</li>
                <li><strong>Accelerated Bone Healing:</strong> Stimulating osteoblasts to speed up the union of fractures.</li>
                <li><strong>Improved Extensibility:</strong> Increasing the "stretchiness" of joint capsules and tendons in chronic cases.</li>
            </ul>

            <a href="/" class="home-btn">Back to Home Page</a>
        </div>
    </body>
    </html>
    `);
});

// --- ADD THIS NEW ROUTE FOR TENS THERAPY ---
app.get('/tens', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>TENS Therapy - Treatment Goals</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Poppins', sans-serif; line-height: 1.6; color: #1f2937; max-width: 800px; margin: 40px auto; padding: 20px; background: #f3f6f9; }
            .info-card { background: white; padding: 40px; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
            h1 { color: #0066cc; margin-top: 0; font-size: 2.5rem; border-bottom: 3px solid #0066cc; display: inline-block; margin-bottom: 20px; }
            h2 { color: #111827; margin-top: 30px; font-size: 1.4rem; border-left: 4px solid #10b981; padding-left: 15px; }
            ul { padding-left: 20px; }
            li { margin-bottom: 12px; }
            .home-btn { display: inline-block; margin-top: 30px; padding: 15px 30px; background: #0066cc; color: white; text-decoration: none; border-radius: 50px; font-weight: 700; transition: 0.3s; }
            .home-btn:hover { background: #004c99; transform: translateY(-2px); }
        </style>
    </head>
    <body>
        <div class="info-card">
            <h1>TENS Therapy</h1>
            <p>TENS goals focus on neurological "distraction" in the short term and biochemical regulation in the long term.</p>
            
            <h2>1. Short-Term Goals (Immediate Management)</h2>
            <ul>
                <li><strong>Pain Signal Interruption:</strong> Stimulating large sensory nerve fibers to "close the gate" in the spinal cord, blocking pain signals to the brain.</li>
                <li><strong>Acute Muscle Relaxation:</strong> Interrupting the "pain-spasm-pain" cycle through gentle tingling sensations.</li>
                <li><strong>Functional Improvement:</strong> Lowering movement-evoked pain so patients can perform necessary stretches and exercises.</li>
                <li><strong>Edema Reduction:</strong> Using low-frequency settings to create a "muscle pump" effect that moves fluid out of injured areas.</li>
            </ul>

            <h2>2. Long-Term Goals (Systemic Changes)</h2>
            <ul>
                <li><strong>Endogenous Opioid Release:</strong> Stimulating the brain to release natural painkillers like endorphins for long-lasting relief.</li>
                <li><strong>Reduction of Central Sensitization:</strong> Retraining the nervous system to be less sensitive and dampening nerve hyperactivity.</li>
                <li><strong>Decreased Drug Dependency:</strong> Providing a non-pharmacological alternative to reduce reliance on opioids or NSAIDs.</li>
                <li><strong>Improved Micro-circulation:</strong> Influencing the nervous system to improve blood flow for long-term tissue health.</li>
            </ul>

            <a href="/" class="home-btn">Back to Home Page</a>
        </div>
    </body>
    </html>
    `);
});


// --- ADD THIS ROUTE FOR BACK PAIN HERE ---
app.get('/back-pain', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Back Pain Details</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Poppins', sans-serif; line-height: 1.6; color: #1f2937; max-width: 800px; margin: 40px auto; padding: 20px; background: #f3f6f9; }
            .info-card { background: white; padding: 40px; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
            h1 { color: #0066cc; border-bottom: 3px solid #0066cc; display: inline-block; margin-bottom: 20px; }
            h2 { color: #111827; margin-top: 30px; font-size: 1.4rem; border-left: 4px solid #10b981; padding-left: 15px; }
            ul { padding-left: 20px; }
            li { margin-bottom: 12px; }
            .home-btn { display: inline-block; margin-top: 30px; padding: 15px 30px; background: #0066cc; color: white; text-decoration: none; border-radius: 50px; font-weight: 700; transition: 0.3s; }
            .home-btn:hover { background: #004c99; transform: translateY(-2px); }
        </style>
    </head>
    <body>
        <div class="info-card">
            <h1>Back Pain</h1>
            <p>The goals are typically categorized into short-term relief and long-term functional recovery.</p>
            <h2>Immediate & Short-Term Goals</h2>
            <ul>
                <li><strong>Pain Reduction:</strong> Using "passive" therapies (like heat/ice, manual therapy, or TENS) to lower pain levels so you can begin to move.</li>
                <li><strong>Inflammation Control:</strong> Managing swelling and tissue irritation through guided rest and gentle movement.</li>
                <li><strong>Restoring Basic Mobility:</strong> Improving the range of motion in the spine and hips so simple tasks become less painful.</li>
                <li><strong>Nerve Decompression:</strong> Moving pain from the leg back toward the spine to relieve nerve pressure.</li>
            </ul>
            <h2>Long-Term & Functional Goals</h2>
            <ul>
                <li><strong>Core & Spinal Stabilization:</strong> Strengthening deep "stabilizer" muscles that act as a natural corset for your spine.</li>
                <li><strong>Postural Re-education:</strong> Correcting habits that put repetitive stress on your back.</li>
                <li><strong>Functional Independence:</strong> Returning to specific life activities like gardening or sports.</li>
                <li><strong>Prevention of Recurrence:</strong> Education on home exercise programs (HEP).</li>
            </ul>
            <a href="/" class="home-btn">Back to Home Page</a>
        </div>
    </body>
    </html>
    `);
});

// --- ADD THIS NEW ROUTE FOR IFT THERAPY ---
app.get('/ift', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>IFT Therapy - Treatment Goals</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Poppins', sans-serif; line-height: 1.6; color: #1f2937; max-width: 800px; margin: 40px auto; padding: 20px; background: #f3f6f9; }
            .info-card { background: white; padding: 40px; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
            h1 { color: #0066cc; margin-top: 0; font-size: 2.5rem; border-bottom: 3px solid #0066cc; display: inline-block; margin-bottom: 20px; }
            h2 { color: #111827; margin-top: 30px; font-size: 1.4rem; border-left: 4px solid #10b981; padding-left: 15px; }
            ul { padding-left: 20px; }
            li { margin-bottom: 12px; }
            .home-btn { display: inline-block; margin-top: 30px; padding: 15px 30px; background: #0066cc; color: white; text-decoration: none; border-radius: 50px; font-weight: 700; transition: 0.3s; }
            .home-btn:hover { background: #004c99; transform: translateY(-2px); }
        </style>
    </head>
    <body>
        <div class="info-card">
            <h1>IFT (Interferential Therapy)</h1>
            <p>The goals of IFT transition from immediate "crisis management" to long-term tissue rehabilitation.</p>
            
            <h2>1. Short-Term Goals (Acute Phase)</h2>
            <p>The aim is to manage "angry" tissues and provide immediate comfort.</p>
            <ul>
                <li><strong>Deep-Tissue Pain Relief:</strong> Targets deep-seated pain by blocking pain signals from reaching the brain.</li>
                <li><strong>Edema (Swelling) Management:</strong> Uses a frequency sweep to create a rhythmic "muscle-pump" that drains excess fluid.</li>
                <li><strong>Breaking the Muscle Spasm Cycle:</strong> Forces hyper-tense muscles to relax by fatiguing motor nerves and boosting blood flow.</li>
                <li><strong>Local Vasodilation:</strong> Widens blood vessels to increase oxygen delivery for cellular repair.</li>
            </ul>

            <h2>2. Long-Term Goals (Recovery & Repair)</h2>
            <p>Shifting toward permanent healing and restoring tissue strength.</p>
            <ul>
                <li><strong>Endogenous Opioid Release:</strong> Stimulates the brain to produce natural painkillers like endorphins for long-lasting relief.</li>
                <li><strong>Accelerated Tissue Healing:</strong> Ensures consistent delivery of repair "building blocks" (like collagen) to damaged areas.</li>
                <li><strong>Muscle Re-education:</strong> Helps "remind" weak or inhibited muscles how to contract properly.</li>
                <li><strong>Reduction of Chronic Inflammation:</strong> Flushes out inflammatory by-products in long-term conditions like osteoarthritis.</li>
                <li><strong>Improved Joint Mobility:</strong> Reducing deep guarding to allow for a full, natural range of motion.</li>
            </ul>

            <a href="/" class="home-btn">Back to Home Page</a>
        </div>
    </body>
    </html>
    `);
});


// --- ADD THIS ROUTE FOR NECK PAIN ---
app.get('/neck-pain', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Neck Pain - Recovery Goals</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Poppins', sans-serif; line-height: 1.6; color: #1f2937; max-width: 800px; margin: 40px auto; padding: 20px; background: #f3f6f9; }
            .info-card { background: white; padding: 40px; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
            h1 { color: #0066cc; margin-top: 0; font-size: 2.5rem; border-bottom: 3px solid #0066cc; display: inline-block; margin-bottom: 20px; }
            h2 { color: #111827; margin-top: 30px; font-size: 1.4rem; border-left: 4px solid #10b981; padding-left: 15px; }
            ul { padding-left: 20px; }
            li { margin-bottom: 12px; }
            .home-btn { display: inline-block; margin-top: 30px; padding: 15px 30px; background: #0066cc; color: white; text-decoration: none; border-radius: 50px; font-weight: 700; transition: 0.3s; }
            .home-btn:hover { background: #004c99; transform: translateY(-2px); }
        </style>
    </head>
    <body>
        <div class="info-card">
            <h1>Neck Pain</h1>
            <p>Goals are split into the Acute Phase (immediate relief) and the Maintenance/Functional Phase (long-term resilience).</p>
            
            <h2>1. Short-Term Goals (Days to Weeks)</h2>
            <p>In the initial "acute" phase, the primary aim is to calm down irritated tissues.</p>
            <ul>
                <li><strong>Pain & Inflammation Management:</strong> Utilizing ice/heat, gentle manual therapy, or TENS to reduce muscle guarding.</li>
                <li><strong>Restoring Range of Motion (ROM):</strong> Increasing the ability to look over your shoulder and tilt your head without sharp pain.</li>
                <li><strong>Decompression:</strong> If there is numbness in arms, we work to "centralize" symptoms back to the neck.</li>
                <li><strong>Postural Awareness:</strong> Identifying ergonomic triggers or "Text Neck" habits at your workstation.</li>
            </ul>

            <h2>2. Long-Term Goals (Months & Beyond)</h2>
            <p>Focusing on structural integrity and lifestyle integration.</p>
            <ul>
                <li><strong>Deep Neck Flexor Strengthening:</strong> Training the "core of the neck" (like longus colli) to support the cervical curve.</li>
                <li><strong>Scapular Stability:</strong> Strengthening the upper back and shoulder blade muscles (trapezius and rhomboids).</li>
                <li><strong>Neuromuscular Coordination:</strong> Improving proprioception, which is often diminished after whiplash.</li>
                <li><strong>Self-Management:</strong> Providing a "rescue" routine of stretches and chin tucks for daily use.</li>
            </ul>

            <a href="/" class="home-btn">Back to Home Page</a>
        </div>
    </body>
    </html>
    `);
});

// --- ADD THIS ROUTE FOR KNEE PAIN ---
app.get('/knee-pain', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Knee Pain - Recovery Goals</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Poppins', sans-serif; line-height: 1.6; color: #1f2937; max-width: 800px; margin: 40px auto; padding: 20px; background: #f3f6f9; }
            .info-card { background: white; padding: 40px; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
            h1 { color: #0066cc; margin-top: 0; font-size: 2.5rem; border-bottom: 3px solid #0066cc; display: inline-block; margin-bottom: 20px; }
            h2 { color: #111827; margin-top: 30px; font-size: 1.4rem; border-left: 4px solid #10b981; padding-left: 15px; }
            ul { padding-left: 20px; }
            li { margin-bottom: 12px; }
            .home-btn { display: inline-block; margin-top: 30px; padding: 15px 30px; background: #0066cc; color: white; text-decoration: none; border-radius: 50px; font-weight: 700; transition: 0.3s; }
            .home-btn:hover { background: #004c99; transform: translateY(-2px); }
        </style>
    </head>
    <body>
        <div class="info-card">
            <h1>Knee Pain</h1>
            <p>Effective knee rehabilitation focuses on immediate relief followed by long-term joint stability.</p>
            
            <h2>Primary Treatment Goals</h2>
            <ul>
                <li><strong>Reduce Pain and Swelling:</strong> Gentle movements and <strong>PRICE</strong> (Protection, Rest, Ice, Compression, Elevation) can help initially to manage acute symptoms.</li>
                <li><strong>Improve Range of Motion:</strong> Targeted exercises to restore flexibility and fluid movement within the knee joint.</li>
                <li><strong>Strengthen Muscles:</strong> Strengthening the supporting muscles around the knee—specifically the <strong>quadriceps, hamstrings, glutes, and calves</strong>—to provide better stability.</li>
                <li><strong>Improve Balance and Proprioception:</strong> Exercises to enhance your body's awareness of its position in space, which is crucial for preventing future re-injury.</li>
                <li><strong>Restore Function:</strong> A phased plan for gradually returning to your specific daily activities and sports.</li>
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
        <title>Knee Pain - Recovery Goals</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Poppins', sans-serif; line-height: 1.6; color: #1f2937; max-width: 800px; margin: 40px auto; padding: 20px; background: #f3f6f9; }
            .info-card { background: white; padding: 40px; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
            h1 { color: #0066cc; margin-top: 0; font-size: 2.5rem; border-bottom: 3px solid #0066cc; display: inline-block; margin-bottom: 20px; }
            h2 { color: #111827; margin-top: 30px; font-size: 1.4rem; border-left: 4px solid #10b981; padding-left: 15px; }
            ul { padding-left: 20px; }
            li { margin-bottom: 12px; }
            .home-btn { display: inline-block; margin-top: 30px; padding: 15px 30px; background: #0066cc; color: white; text-decoration: none; border-radius: 50px; font-weight: 700; transition: 0.3s; }
            .home-btn:hover { background: #004c99; transform: translateY(-2px); }
        </style>
    </head>
    <body>
        <div class="info-card">
            <h1>Knee Pain</h1>
            <p>Effective knee rehabilitation focuses on immediate relief followed by long-term joint stability.</p>
            
            <h2>Primary Treatment Goals</h2>
            <ul>
                <li><strong>Reduce Pain and Swelling:</strong> Gentle movements and <strong>PRICE</strong> (Protection, Rest, Ice, Compression, Elevation) can help initially to manage acute symptoms.</li>
                <li><strong>Improve Range of Motion:</strong> Targeted exercises to restore flexibility and fluid movement within the knee joint.</li>
                <li><strong>Strengthen Muscles:</strong> Strengthening the supporting muscles around the knee—specifically the <strong>quadriceps, hamstrings, glutes, and calves</strong>—to provide better stability.</li>
                <li><strong>Improve Balance and Proprioception:</strong> Exercises to enhance your body's awareness of its position in space, which is crucial for preventing future re-injury.</li>
                <li><strong>Restore Function:</strong> A phased plan for gradually returning to your specific daily activities and sports.</li>
            </ul>

            <a href="/" class="home-btn">Back to Home Page</a>
        </div>
    </body>
    </html>
    `);
});

app.get('/Pain-Management', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Knee Pain - Recovery Goals</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Poppins', sans-serif; line-height: 1.6; color: #1f2937; max-width: 800px; margin: 40px auto; padding: 20px; background: #f3f6f9; }
            .info-card { background: white; padding: 40px; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
            h1 { color: #0066cc; margin-top: 0; font-size: 2.5rem; border-bottom: 3px solid #0066cc; display: inline-block; margin-bottom: 20px; }
            h2 { color: #111827; margin-top: 30px; font-size: 1.4rem; border-left: 4px solid #10b981; padding-left: 15px; }
            ul { padding-left: 20px; }
            li { margin-bottom: 12px; }
            .home-btn { display: inline-block; margin-top: 30px; padding: 15px 30px; background: #0066cc; color: white; text-decoration: none; border-radius: 50px; font-weight: 700; transition: 0.3s; }
            .home-btn:hover { background: #004c99; transform: translateY(-2px); }
        </style>
    </head>
    <body>
        <div class="info-card">
            <h1>Knee Pain</h1>
            <p>Effective knee rehabilitation focuses on immediate relief followed by long-term joint stability.</p>
            
            <h2>Primary Treatment Goals</h2>
            <ul>
                <li><strong>Reduce Pain and Swelling:</strong> Gentle movements and <strong>PRICE</strong> (Protection, Rest, Ice, Compression, Elevation) can help initially to manage acute symptoms.</li>
                <li><strong>Improve Range of Motion:</strong> Targeted exercises to restore flexibility and fluid movement within the knee joint.</li>
                <li><strong>Strengthen Muscles:</strong> Strengthening the supporting muscles around the knee—specifically the <strong>quadriceps, hamstrings, glutes, and calves</strong>—to provide better stability.</li>
                <li><strong>Improve Balance and Proprioception:</strong> Exercises to enhance your body's awareness of its position in space, which is crucial for preventing future re-injury.</li>
                <li><strong>Restore Function:</strong> A phased plan for gradually returning to your specific daily activities and sports.</li>
            </ul>

            <a href="/" class="home-btn">Back to Home Page</a>
        </div>
    </body>
    </html>
    `);
});


app.post('/submit-feedback', (req, res) => {

    const { name, mobile, details, rating } = req.body;

    const stmt = db.prepare("INSERT INTO feedbacks (patient_name, mobile, details, rating) VALUES (?, ?, ?, ?)");

    stmt.run(name, mobile, details, rating, (err) => {

        if (err) return res.send("Error saving feedback");

        res.redirect('/');

    });

    stmt.finalize();

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

    const docName = doctor ? doctor.name : "Dr. Muniraju SN PT";

    const docQual = doctor ? doctor.qualification : "Specialist";

    const docImg = (doctor && doctor.image_url) ? doctor.image_url : "/doctor.jpg";

    const docPhone = doctor ? doctor.phone : "9019996573";

    const whatsAppLink = `https://wa.me/91${docPhone}`;

    const callLink = `tel:+91${docPhone}`;

    const servicesContent = `


<div class="service-card">
    <h3><a href="/ultrasound" style="color: var(--primary); text-decoration: underline;">Electro Therapy</a></h3>
    <p>Deep heat therapy for pain reduction and rapid healing. Click to view treatment goals.</p>
</div>


<div class="service-card">
    <h3><a href="/ift" style="color: var(--primary); text-decoration: underline;">Excersise Therapy</a></h3>
    <p>Interferential currents to relieve inflammation. Click to view treatment goals.</p>
</div>

<div class="service-card">
    <h3><a href="/tens" style="color: var(--primary); text-decoration: underline;">Stock Rehablitation</a></h3>
    <p>Nerve stimulation to block pain signals effectively. Click to view treatment goals.</p>
</div>

<div class="service-card">
    <h3><a href="/back-pain" style="color: var(--primary); text-decoration: underline;">Geriatric Rehablitation</a></h3>
    <p>Core strengthening and posture correction exercises. Click to view recovery goals.</p>
</div>


<div class="service-card">
    <h3><a href="/neck-pain" style="color: var(--primary); text-decoration: underline;">Git training</a></h3>
    <p>Manual therapy to improve mobility and reduce stiffness. Click to view recovery goals.</p>
</div>

<div class="service-card">
    <h3><a href="/knee-pain" style="color: var(--primary); text-decoration: underline;">Post Operation Rehablitation</a></h3>
    <p>Stability training for quads and hamstrings.Click to view recovery goals.</p>
</div>

<div class="service-card">
    <h3><a href="/Ergonomics" style="color: var(--primary); text-decoration: underline;">Ergonomics</a></h3>
    <p>Stability training for quads and hamstrings.Click to view recovery goals.</p>
</div>

<div class="service-card">
    <h3><a href="/Pain-Management" style="color: var(--primary); text-decoration: underline;">Pain Management</a></h3>
    <p>Stability training for quads and hamstrings.Click to view recovery goals.</p>
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

            .main-title { 

                margin: 0; 

                font-size: 3.5rem; 

                font-weight: 700; 

                background: linear-gradient(to right, #fff, #cbd5e1);

                -webkit-background-clip: text;

                -webkit-text-fill-color: transparent;

                text-shadow: 0 4px 12px rgba(0,0,0,0.3);

            }

            .sub-title { color: #e2e8f0; font-size: 1.25rem; margin-top: 15px; font-weight: 300; }

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

            .btn { padding: 16px; border: none; border-radius: 16px; color: white; cursor: pointer; text-decoration: none; font-weight: 600; font-size: 1rem; text-align: center; transition: 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; }

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

            /* REVIEWS */

            .reviews-section { max-height: 600px; overflow-y: auto; padding-right: 10px; }

            .feedback-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }

            .feedback-card { background: #f8fafc; padding: 25px; border-radius: 20px; border: 1px solid #f1f5f9; }

            .feedback-header { display: flex; align-items: center; gap: 15px; margin-bottom: 15px; }

            .user-avatar { width: 45px; height: 45px; background: #bfdbfe; color: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.2rem; }

            .stars { color: #f59e0b; letter-spacing: 2px; font-size: 0.9rem; }

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
</style>
</head>
<body>
<div class="header-section">
<h1 class="main-title">Muni Physio Care</h1>
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
<div class="services-container">
<div class="section-header">Our Specialized Services</div>
<div class="services-wrapper">
<div class="scroll-track">

                        ${servicesContent}

                        ${servicesContent}
</div>
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
        <div class="condition-item"><strong>1.</strong> All Joint Pains</div>
        <div class="condition-item"><strong>2.</strong> Frozen Shoulder</div>
        <div class="condition-item"><strong>3.</strong> Balance Issues</div>
        
        <div class="condition-item"><strong>4.</strong> Back Pain</div>
        <div class="condition-item"><strong>5.</strong> Rotator Cuff Tear</div>
        <div class="condition-item"><strong>6.</strong> Nerve Related Issues</div>
        
        <div class="condition-item"><strong>7.</strong> ACL Tear</div>
        <div class="condition-item"><strong>8.</strong> Stroke Rehab</div>
        <div class="condition-item"><strong>9.</strong> Post-Op Rehab</div>
    <p style="text-align: left; color: var(--text-light); font-weight: 600; margin-top: 10px;">& many more etc...</p>
    </div>
</div>

</div>


<div class="card reviews-section">
<div class="section-header">Patient Reviews</div>
<div class="feedback-grid">

                    ${feedbackListHtml.length > 0 ? feedbackListHtml : '<p style="color:#777; font-style:italic; text-align:center;">No reviews yet. Be the first to share your experience!</p>'}
</div>
</div>
<div class="card form-section">
<div class="section-header">Submit Your Feedback</div>
<form action="/submit-feedback" method="POST">
<div class="input-group">
<label>Patient Name <span style="color:red">*</span></label> 
<input type="text" name="name" required placeholder="Enter full name">
</div>
<div class="input-group">
<label>Mobile Number <span style="color:red">*</span></label> 
<input type="tel" name="mobile" pattern="[0-9]{10}" required placeholder="10-digit mobile number" title="Please enter exactly 10 digits">
</div>
<div class="input-group">
<label>Rate Your Experience <span style="color:red">*</span></label>
<select name="rating" required>
<option value="" disabled selected>Select a rating</option>
<option value="5">${STAR_FULL}${STAR_FULL}${STAR_FULL}${STAR_FULL}${STAR_FULL} (Excellent)</option>
<option value="4">${STAR_FULL}${STAR_FULL}${STAR_FULL}${STAR_FULL}${STAR_EMPTY} (Good)</option>
<option value="3">${STAR_FULL}${STAR_FULL}${STAR_FULL}${STAR_EMPTY}${STAR_EMPTY} (Average)</option>
<option value="2">${STAR_FULL}${STAR_FULL}${STAR_EMPTY}${STAR_EMPTY}${STAR_EMPTY} (Poor)</option>
<option value="1">${STAR_FULL}${STAR_EMPTY}${STAR_EMPTY}${STAR_EMPTY}${STAR_EMPTY} (Bad)</option>
</select>
</div>
<div class="input-group">
<label>Feedback Details <span style="color:red">*</span></label> 
<textarea name="details" rows="3" required placeholder="Tell us about your treatment experience..."></textarea>
</div>
<button type="submit">SUBMIT</button>
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
</script>
</body>
</html>

    `;

}

app.listen(PORT, () => {

    console.log(`Server running at http://localhost:${PORT}`);

});
 