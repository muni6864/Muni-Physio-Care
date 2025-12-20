const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const PORT = 3001;

// 1. MIDDLEWARE SETUP
app.use(express.urlencoded({ extended: true })); 
app.use(express.static('public')); 

// 2. DATABASE SETUP
const db = new sqlite3.Database('./Municlinic.db', (err) => {
    if (err) console.error(err.message);
    console.log('Connected to the SQLite database.');
});

db.serialize(() => {
    // Create Doctor Table
    db.run(`CREATE TABLE IF NOT EXISTS doctor (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        qualification TEXT,
        image_url TEXT,
        phone TEXT
    )`);

    // Create Feedback Table
    db.run(`CREATE TABLE IF NOT EXISTS feedbacks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_name TEXT,
        mobile TEXT,
        details TEXT,
        rating INTEGER
    )`);

    // Insert Dr. Munikrishna SN PT (Seed Data)
    db.get("SELECT * FROM doctor WHERE name = 'Dr. MuniKrishna SN PT'", (err, row) => {
        if (!row) {
            const stmt = db.prepare("INSERT INTO doctor (name, qualification, image_url, phone) VALUES (?, ?, ?, ?)");
            stmt.run('Dr. Munikrishna SN PT', 'Bachelor of Physiotherapy', '/doctor.jpg', '9113602399'); 
            stmt.finalize();
        }
    });
});

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
    
    const getStars = (count) => STAR_FULL.repeat(count) + STAR_EMPTY.repeat(5 - count);

    const avgRating = stats.avg_rating ? stats.avg_rating.toFixed(1) : "0.0"; 
    const totalReviews = stats.count || 0;
    const avgDisplay = `${STAR_FULL} ${avgRating}/5 (${totalReviews} Reviews)`;

    const feedbackListHtml = feedbacks.map(f => `
        <div class="feedback-card">
            <div class="feedback-header">
                <strong>${f.patient_name}</strong>
                <span class="stars">${getStars(f.rating)}</span>
            </div>
            <p>"${f.details}"</p>
        </div>
    `).join('');

    const docName = doctor ? doctor.name : "Dr.Munikrishna SN PT";
    const docQual = doctor ? doctor.qualification : "Specialist";
    const docImg = (doctor && doctor.image_url) ? doctor.image_url : "/doctor.jpg";
    const docPhone = doctor ? doctor.phone : "9113602399";
    
    const whatsAppLink = `https://wa.me/91${docPhone}`;
    const callLink = `tel:+91${docPhone}`;

    const servicesContent = `
        <div class="service-card"><h3>Ultrasound</h3><p>High-frequency sound waves for deep heat, reducing pain and speeding healing.</p></div>
        <div class="service-card"><h3>IFT</h3><p>Interferential Therapy uses currents to relieve pain and reduce inflammation.</p></div>
        <div class="service-card"><h3>TENS</h3><p>Electrical nerve stimulation to block pain signals and trigger endorphins.</p></div>
        <div class="service-card"><h3>Back Pain</h3><p>Tailored exercises like Cat-Cow and glute bridges for core strength.</p></div>
        <div class="service-card"><h3>Neck Pain</h3><p>Exercises and manual therapy to improve mobility and correct posture.</p></div>
        <div class="service-card"><h3>Knee Pain</h3><p>Strengthening quads and hamstrings to improve stability and function.</p></div>
    `;

    // Header Background Image
    const headerBgImage = "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1350&q=80";

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Muni Physio Clinic</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
        
        <style>
            :root { 
                --primary: #007bff; 
                --secondary: #28a745;
                --accent: #17a2b8;
                --bg-gradient: linear-gradient(135deg, #e0f7fa 0%, #ffffff 100%);
                --white: #ffffff; 
                --whatsapp: #25D366; 
                --card-shadow: 0 8px 20px rgba(0,0,0,0.08);
            }

            body { font-family: 'Poppins', sans-serif; margin: 0; background: var(--bg-gradient); color: #444; min-height: 100vh; }
            
            /* HEADER STYLES */
            .header-section { 
                background: linear-gradient(rgba(0, 64, 133, 0.85), rgba(0, 64, 133, 0.85)), url('${headerBgImage}');
                background-size: cover;
                background-position: center;
                text-align: center; 
                padding: 60px 20px; 
                box-shadow: 0 4px 20px rgba(0,0,0,0.3); 
                border-bottom: 5px solid var(--secondary); 
                color: var(--white);
            }
            .main-title { 
                color: var(--white);
                margin: 0; 
                font-size: 3rem; 
                font-weight: 700; 
                text-transform: uppercase; 
                letter-spacing: 2px; 
                text-shadow: 2px 2px 10px rgba(0,0,0,0.7);
            }
            .sub-title { 
                color: #e0e0e0;
                font-size: 1.2rem; 
                margin-top: 10px; 
                font-weight: 400; 
                text-shadow: 1px 1px 5px rgba(0,0,0,0.5);
            }

            /* LAYOUT */
            .container { display: grid; grid-template-columns: 350px 1fr; gap: 30px; max-width: 1300px; margin: 30px auto; padding: 0 20px; }
            .card { background: var(--white); padding: 25px; border-radius: 15px; box-shadow: var(--card-shadow); transition: transform 0.3s ease; }
            .card:hover { transform: translateY(-5px); }

            /* PROFILE */
            .profile-card { text-align: center; height: fit-content; border-top: 5px solid var(--secondary); }
            .profile-img { width: 180px; height: 180px; object-fit: cover; border-radius: 50%; border: 5px solid var(--white); box-shadow: 0 5px 15px rgba(0,0,0,0.15); margin-bottom: 15px; }
            .profile-name { font-size: 1.8rem; color: #333; margin: 10px 0 5px 0; }
            .profile-qual { color: #666; font-size: 0.95rem; margin-bottom: 5px; }
            
            .profile-expertise { color: var(--primary); font-weight: 600; font-size: 1rem; margin-bottom: 15px; background: #e0f2ff; padding: 5px 10px; border-radius: 20px; display: inline-block; }
            .rating-display { font-size: 1.1rem; color: #ff9800; font-weight: bold; margin-bottom: 15px; border: 1px dashed #ff9800; padding: 5px; border-radius: 8px; }

            .profile-phone { font-size: 1.2rem; font-weight: 600; color: #333; background: #f8f9fa; padding: 10px; border-radius: 8px; display: block; margin: 15px 0; }
            
            .btn-group { display: flex; gap: 15px; margin-top: 20px; }
            .btn { flex: 1; padding: 14px; border: none; border-radius: 8px; color: white; cursor: pointer; text-decoration: none; font-weight: 600; font-size: 1rem; text-align: center; transition: opacity 0.2s; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .btn:hover { opacity: 0.9; }
            .call { background: var(--secondary); }
            .msg { background: var(--whatsapp); }

            /* VIDEO BUTTONS */
            .video-section { margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px; }
            .video-btn { display: flex; align-items: center; width: 100%; background: #f8f9fa; border: 1px solid #ddd; padding: 10px; margin-bottom: 10px; border-radius: 8px; cursor: pointer; transition: 0.3s; text-align: left; }
            .video-btn:hover { background: #eef2f5; border-color: var(--primary); }
            .vid-thumb { width: 60px; height: 45px; object-fit: cover; border-radius: 5px; margin-right: 12px; border: 1px solid #ccc; }
            .vid-info { flex: 1; }
            .vid-title { font-weight: 600; font-size: 0.95rem; color: #333; display: block; }
            .vid-icon { font-size: 1.2rem; color: var(--primary); }

            /* POPUP MODAL STYLES */
            .modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.9); z-index: 1000; justify-content: center; align-items: center; }
            .modal-content { position: relative; width: 90%; max-width: 450px; background: #000; border-radius: 10px; overflow: hidden; box-shadow: 0 0 20px rgba(255,255,255,0.2); }
            .close-modal-btn { position: absolute; top: 10px; right: 15px; color: white; font-size: 35px; font-weight: bold; cursor: pointer; z-index: 1001; background: rgba(0,0,0,0.6); border-radius: 50%; width: 45px; height: 45px; line-height: 45px; text-align: center; }
            .close-modal-btn:hover { background: #ff4444; }
            iframe { width: 100%; height: 80vh; border: none; }

            /* SERVICES */
            .section-label { font-size: 1.8rem; color: #333; margin-bottom: 20px; border-bottom: 3px solid var(--accent); display: inline-block; padding-bottom: 5px; }
            .services-wrapper { overflow: hidden; background: white; padding: 30px 0; border-radius: 15px; margin-bottom: 30px; box-shadow: var(--card-shadow); position: relative; }
            .scroll-track { display: flex; width: max-content; animation: scroll 40s linear infinite; }
            .scroll-track:hover { animation-play-state: paused; }
            @keyframes scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }

            .service-card { display: inline-block; width: 300px; background: #f0f8ff; padding: 20px; margin: 0 15px; border-radius: 12px; border-left: 5px solid var(--primary); white-space: normal; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
            .service-card h3 { color: var(--primary); margin-top: 0; font-size: 1.2rem; }
            .service-card p { font-size: 0.9rem; line-height: 1.6; color: #555; }
            
            /* FORMS */
            .form-section h3 { margin-top: 0; color: var(--primary); }
            input, textarea, select { width: 100%; padding: 15px; margin: 10px 0 20px 0; border: 1px solid #e1e1e1; border-radius: 8px; background: #f9f9f9; font-family: inherit; box-sizing: border-box; }
            input:focus, textarea:focus { outline: none; border-color: var(--primary); background: #fff; }
            input:invalid, select:invalid { border-color: red; }
            
           /* UPDATED BUTTON STYLE: LEFT ALIGN */
           button[type="submit"] { 
                background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); 
                color: white; 
                border: none; 
                padding: 15px 40px; /* Padding for spacing */
                border-radius: 50px; 
                width: 100%; 
                font-size: 1.2rem; 
                font-weight: 700; 
                cursor: pointer; 
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(0, 123, 255, 0.4); 
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-top: 10px;
                text-align: left; /* MOVED TEXT TO LEFT */
            }
            button[type="submit"]:hover { 
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(0, 123, 255, 0.5);
                background: linear-gradient(135deg, #0056b3 0%, #004494 100%);
            }
            button[type="submit"]:active { transform: translateY(1px); }


            /* REVIEWS */
            .reviews-section { max-height: 600px; overflow-y: auto; }
            .feedback-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
            .feedback-card { background: #fff; padding: 20px; border-radius: 10px; border: 1px solid #eee; box-shadow: 0 2px 8px rgba(0,0,0,0.03); }
            .feedback-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #f0f0f0; padding-bottom: 10px; }
            .stars { color: #ffc107; letter-spacing: 2px; }
            
            @media (max-width: 900px) { .container { grid-template-columns: 1fr; } .main-title { font-size: 2rem; } .profile-img { width: 140px; height: 140px; } }
        </style>
    </head>
    <body>
    
    <div class="header-section">
        <h1 class="main-title">Muni Physio Clinic</h1>
        <div class="sub-title">Advanced Physiotherapy & Rehabilitation Center</div>
    </div>

    <div class="container">
        <div class="left-column">
            <div class="card profile-card">
                <img src="${docImg}" alt="Dr. ${docName}" class="profile-img" onerror="this.src=''; this.style.backgroundColor='#e0e0e0';">
                
                <h2 class="profile-name">${docName}</h2>
                <div class="profile-qual">${docQual}</div>
                
            
                
                <span class="profile-phone">${PHONE_ICON} ${docPhone}</span>

                <div class="btn-group">
                    <a href="${callLink}" class="btn call">Call Now</a>
                    <a href="${whatsAppLink}" target="_blank" class="btn msg">WhatsApp</a>
                </div>

                <div class="video-section">
                    <h3 style="font-size:1.1rem; color:#333; margin-bottom:15px;">Exercise Library</h3>
                    
                    <button class="video-btn" onclick="openVideo('https://www.youtube.com/embed/ze3H9ZaGFVE')">
                        <img src="https://img.youtube.com/vi/ze3H9ZaGFVE/0.jpg" class="vid-thumb">
                        <div class="vid-info"><span class="vid-title">General Physiotherapy</span></div>
                        <span class="vid-icon">${PLAY_ICON}</span>
                    </button>
                    
                    <button class="video-btn" onclick="openVideo('https://www.youtube.com/embed/LpRnOEdygFc')">
                        <img src="https://img.youtube.com/vi/LpRnOEdygFc/0.jpg" class="vid-thumb">
                        <div class="vid-info"><span class="vid-title">Lower Back Pain</span></div>
                        <span class="vid-icon">${PLAY_ICON}</span>
                    </button>
                    
                    <button class="video-btn" onclick="openVideo('https://www.youtube.com/embed/dHk-RqehNc8')">
                        <img src="https://img.youtube.com/vi/dHk-RqehNc8/0.jpg" class="vid-thumb">
                        <div class="vid-info"><span class="vid-title">Neck Pain Relief</span></div>
                        <span class="vid-icon">${PLAY_ICON}</span>
                    </button>
                    
                    <button class="video-btn" onclick="openVideo('https://www.youtube.com/embed/8euXMuNLRS4')">
                        <img src="https://img.youtube.com/vi/8euXMuNLRS4/0.jpg" class="vid-thumb">
                        <div class="vid-info"><span class="vid-title">Knee Pain Exercise</span></div>
                        <span class="vid-icon">${PLAY_ICON}</span>
                    </button>
                </div>
            </div>
        </div>

        <div class="main-content">
            <h3 class="section-label">Our Specialized Services</h3>
            <div class="services-wrapper">
                <div class="scroll-track">
                    ${servicesContent}
                    ${servicesContent}
                </div>
            </div>

            <div class="card reviews-section">
                <h3>Patient Reviews</h3>
                <div class="feedback-grid">
                    ${feedbackListHtml.length > 0 ? feedbackListHtml : '<p style="color:#777; font-style:italic;">No reviews yet. Be the first to share your experience!</p>'}
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
                    
                    <label>Feedback Details *</label> 
                    <textarea name="details" rows="3" required placeholder="Tell us about your treatment experience..."></textarea>
                    
                    <button type="submit">Submit</button>
                </form>
            </div>

            
        </div>
    </div>

    <div id="videoModal" class="modal-overlay">
        <div class="modal-content">
            <span class="close-modal-btn" onclick="closeVideo()">&times;</span>
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