-- ============================================================
-- Hardware Challenges Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- Production project: eybchcqwbizjmzyrviri
-- ============================================================

-- 1. Challenges table
CREATE TABLE IF NOT EXISTS hardware_challenges (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  stream          TEXT NOT NULL,           -- ECE / EEE / IoT / Mechanical / Civil
  category        TEXT NOT NULL,
  difficulty      TEXT NOT NULL,           -- Beginner / Intermediate / Advanced
  elo_reward      INTEGER NOT NULL DEFAULT 25,
  thumbnail       TEXT,                    -- Unsplash URL
  description     TEXT,
  context         TEXT,
  steps           JSONB DEFAULT '[]',      -- [{step,title,instruction}]
  rubric          TEXT,
  tags            JSONB DEFAULT '[]',
  attempts        INTEGER DEFAULT 0,
  views           INTEGER DEFAULT 0,
  likes           INTEGER DEFAULT 0,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Submissions table
CREATE TABLE IF NOT EXISTS hardware_submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id    TEXT REFERENCES hardware_challenges(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,
  answer          TEXT NOT NULL,
  score           INTEGER,                 -- 0-100
  grade           TEXT,
  elo_awarded     INTEGER DEFAULT 0,
  feedback        JSONB,                   -- {score,grade,elo_awarded,strengths,improvements,verdict,model_insight}
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Likes table (prevents duplicate likes)
CREATE TABLE IF NOT EXISTS hardware_likes (
  challenge_id    TEXT REFERENCES hardware_challenges(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (challenge_id, user_id)
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_hardware_challenges_stream     ON hardware_challenges(stream);
CREATE INDEX IF NOT EXISTS idx_hardware_challenges_difficulty ON hardware_challenges(difficulty);
CREATE INDEX IF NOT EXISTS idx_hardware_submissions_user      ON hardware_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_hardware_submissions_challenge ON hardware_submissions(challenge_id);

-- 5. RLS — allow authenticated users to read challenges, submit answers, like
ALTER TABLE hardware_challenges  ENABLE ROW LEVEL SECURITY;
ALTER TABLE hardware_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hardware_likes       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active challenges"
  ON hardware_challenges FOR SELECT
  USING (is_active = true);

CREATE POLICY "Authenticated users can insert submissions"
  ON hardware_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own submissions"
  ON hardware_submissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can like once"
  ON hardware_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can see own likes"
  ON hardware_likes FOR SELECT
  USING (auth.uid() = user_id);

-- 6. Seed the 8 starter challenges
INSERT INTO hardware_challenges (id, title, stream, category, difficulty, elo_reward, thumbnail, description, context, steps, rubric, tags) VALUES
(
  'ece-pwm-led',
  'PWM LED Brightness Control Circuit',
  'ECE', 'Circuits', 'Beginner', 25,
  'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80',
  'Design a PWM circuit using a 555 timer to control LED brightness at 1kHz with 25%, 50%, and 75% duty cycles.',
  'PWM (Pulse Width Modulation) is fundamental to motor control, power supplies, audio amplifiers and LED dimming. Understanding duty cycle lets you control average power without wasting energy as heat — the same principle used in EV motor controllers and smart lighting systems.',
  '[{"step":1,"title":"Understand PWM Fundamentals","instruction":"Define PWM and explain how duty cycle (percentage of on-time per period) controls average voltage. A 50% duty cycle at 5V gives an average of 2.5V. Calculate: average voltage = Vsupply × duty_cycle."},{"step":2,"title":"Calculate 555 Timer Component Values","instruction":"In astable mode: f = 1.44 / ((R1 + 2×R2) × C). For 1kHz with C=10nF, determine R1 and R2 values for each duty cycle. Duty cycle = R2 / (R1 + 2×R2) for the standard astable circuit."},{"step":3,"title":"Design the Circuit","instruction":"Draw the 555 timer astable circuit. Connect pin 8 (Vcc) to +5V, pin 1 (GND) to ground. Pin 4 (RESET) and pin 8 tie together. Add R1 between Vcc and pin 7, R2 between pin 7 and pin 2 (tie pin 2 and 6 together). C between pin 2 and GND. Output at pin 3."},{"step":4,"title":"Add LED Driver Stage","instruction":"A 555 can source/sink up to 200mA. Connect LED from pin 3 through a current-limiting resistor to GND. Calculate R_limit = (Vcc - V_LED) / I_LED where V_LED ≈ 2V for red LED, I_LED = 20mA. So R_limit = (5-2)/0.02 = 150Ω."},{"step":5,"title":"Verify and Analyse","instruction":"Confirm your circuit produces 1kHz frequency. Calculate power dissipation in each component. Explain why increasing duty cycle increases perceived brightness (human eye responds to average luminous flux)."}]',
  'Score based on: correct frequency calculation (20%), correct duty cycle analysis (20%), complete component list with values (20%), understanding of power relationships (20%), real-world application insight (20%)',
  '["555 Timer","PWM","Duty Cycle","LED Driver","Astable Multivibrator"]'
),
(
  'ece-rc-filter',
  'RC Low-Pass Filter Design & Frequency Analysis',
  'ECE', 'Signal Processing', 'Intermediate', 35,
  'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80',
  'Design a first-order RC low-pass filter with a -3dB cutoff at 2kHz. Analyse the gain response at 500Hz, 2kHz, and 10kHz.',
  'RC filters are used in audio electronics, sensor signal conditioning, power supply noise rejection, and anti-aliasing before ADC sampling. Every smartphone, speaker amplifier and medical ECG machine uses variations of this circuit.',
  '[{"step":1,"title":"Derive the Transfer Function","instruction":"For an RC low-pass filter, H(jω) = 1 / (1 + jωRC). The -3dB frequency is fc = 1 / (2π×R×C) where the gain drops to 0.707 (or -3dB) of the input. Explain what -3dB means in terms of power and voltage."},{"step":2,"title":"Select Component Values","instruction":"Target fc = 2000Hz. Choose C = 47nF (standard value). Calculate R = 1 / (2π × 2000 × 47×10⁻⁹). Round to nearest standard resistor value from E24 series. Verify your cutoff frequency with chosen values."},{"step":3,"title":"Calculate Gain at 3 Frequencies","instruction":"Use |H(jω)| = 1 / √(1 + (f/fc)²). Calculate gain in dB = 20×log₁₀(|H|) at: (a) 500Hz, (b) 2000Hz (should be -3dB), (c) 10kHz. First-order filters roll off at -20dB/decade above cutoff."},{"step":4,"title":"Sketch the Bode Plot","instruction":"Draw frequency (log scale: 100Hz to 100kHz) vs gain (dB). Mark: flat region at 0dB below fc, -3dB point at 2kHz, -20dB/decade slope above. Mark phase: 0° at low freq, -45° at fc, -90° at high freq."},{"step":5,"title":"Practical Considerations","instruction":"Discuss component tolerances (±5% resistors, ±20% capacitors can shift fc by up to 25%). Explain input/output impedance matching. Describe when you would use a second-order (Butterworth) filter instead."}]',
  'Score: correct transfer function derivation (20%), accurate component calculation (25%), correct gain values at all 3 frequencies (25%), proper Bode plot description (15%), practical engineering insights (15%)',
  '["RC Filter","Low-Pass","Bode Plot","Transfer Function","Signal Conditioning"]'
),
(
  'ece-opamp-inverting',
  'Op-Amp Inverting Amplifier with DC Bias Correction',
  'ECE', 'Analog', 'Advanced', 50,
  'https://images.unsplash.com/photo-1597476428990-7ee50f2a8e3d?w=800&q=80',
  'Design an inverting op-amp amplifier with gain of -10, input resistance 10kΩ, and a bias compensation resistor. Use a ±15V supply.',
  'Inverting amplifiers are used in audio mixers, instrumentation amplifiers, integrators, and active filters. Bias current compensation is critical in precision applications like medical devices, seismometers and scientific instruments where DC offset errors must be minimised.',
  '[{"step":1,"title":"Inverting Amplifier Fundamentals","instruction":"For inverting configuration: Gain = -Rf/Rin. The negative sign means phase inversion. Virtual ground at inverting input. Input resistance = Rin (not Rf || Rin). Set Rin = 10kΩ as given."},{"step":2,"title":"Calculate Feedback Resistor","instruction":"From |Gain| = Rf/Rin = 10, therefore Rf = 10 × 10kΩ = 100kΩ. Verify: with 1V input, output = -10V (within ±15V supply). Maximum linear output ≈ ±13.5V for most op-amps (1.5V headroom)."},{"step":3,"title":"Bias Compensation Resistor","instruction":"Op-amp input bias currents (Ib) flowing through unequal resistances create DC offset. Add Rbias = Rin || Rf at the non-inverting input. Rbias = 10kΩ || 100kΩ = (10k × 100k)/(10k + 100k) = 9.09kΩ, use standard 9.1kΩ."},{"step":4,"title":"Calculate Output DC Offset","instruction":"Without bias comp: Voffset = Ib × Rf. For LM741 with Ib=80nA: offset = 80nA × 100kΩ = 8mV. With bias comp and matched Ib: offset ≈ Ios × Rf where Ios is offset current (~20nA for 741). New offset = 20nA × 100kΩ = 2mV. Show the improvement."},{"step":5,"title":"GBWP and Slew Rate Limits","instruction":"For LM741 (GBWP=1MHz): maximum -3dB bandwidth at gain of -10 is 1MHz/10 = 100kHz. Slew rate of 0.5V/μs limits full-output sine wave to f_max = SR/(2π×Vout_peak) = 0.5×10⁶/(2π×13.5) = 5.9kHz. Describe what happens if you exceed these limits."}]',
  'Score: correct gain calculation (20%), correct Rf value (20%), bias resistor derivation (20%), offset improvement calculation (20%), bandwidth/slew rate analysis (20%)',
  '["Op-Amp","Inverting Amplifier","Bias Compensation","GBWP","Offset Voltage"]'
),
(
  'iot-dht11-esp32',
  'DHT11 Temperature & Humidity Monitor with ESP32',
  'IoT', 'Sensors', 'Beginner', 25,
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
  'Interface a DHT11 sensor with an ESP32 to log temperature and humidity every 30 seconds over Serial and display alerts when temp > 35°C.',
  'Environmental monitoring is at the core of smart agriculture, HVAC automation, data centre cooling and industrial safety systems. The skills you learn here — sensor interfacing, timing, threshold alerting — apply directly to building real IoT products.',
  '[{"step":1,"title":"Hardware Setup","instruction":"DHT11 has 4 pins: VCC (3.3V from ESP32 3V3 pin), DATA (GPIO4 through 10kΩ pull-up resistor to 3.3V), NC (no connect), GND. The pull-up resistor is mandatory for reliable single-wire communication. Add a 100nF decoupling capacitor between VCC and GND close to the sensor."},{"step":2,"title":"Understanding DHT11 Protocol","instruction":"DHT11 uses a custom single-wire protocol. Host pulls line LOW for >18ms to wake sensor. Sensor responds with 80μs LOW then 80μs HIGH. Each bit: 50μs LOW start, then 26-28μs HIGH = bit 0, or 70μs HIGH = bit 1. Total 40 bits: 8b humidity int + 8b humidity dec + 8b temp int + 8b temp dec + 8b checksum."},{"step":3,"title":"Arduino Code Structure","instruction":"Include DHT.h library. Define DHTPIN=4, DHTTYPE=DHT11. In setup(): Serial.begin(115200), dht.begin(). In loop(): use millis() (not delay()) for non-blocking 30-second sampling. Store lastSampleTime, only read when millis()-lastSampleTime >= 30000. Read: float t=dht.readTemperature(), h=dht.readHumidity(). Check isnan(t)||isnan(h) for errors."},{"step":4,"title":"Implement Alerting","instruction":"After successful read: if temperature > 35.0, print alert to Serial with timestamp (millis()/1000 seconds). Format output as CSV: timestamp,temperature,humidity for easy data logging. Implement a simple running average over last 3 readings to filter sensor noise."},{"step":5,"title":"Power & Range Analysis","instruction":"DHT11 accuracy: ±2°C temperature, ±5% RH. Range: 0-50°C, 20-90% RH. Sampling rate minimum: 1 second between reads (sensor internal limit). At 30s intervals, daily data = 2880 readings. Calculate storage needed for 30-day CSV log. Suggest improvements: DHT22 for ±0.5°C accuracy, or BME280 for pressure too."}]',
  'Score: correct wiring description (20%), protocol understanding (20%), non-blocking code using millis() (20%), alerting with error checking (20%), accuracy/limitation analysis (20%)',
  '["ESP32","DHT11","Single-Wire Protocol","Environmental Monitoring","RTOS"]'
),
(
  'iot-mqtt-smart-home',
  'MQTT Smart Home Automation with Node-RED',
  'IoT', 'Networking', 'Intermediate', 35,
  'https://images.unsplash.com/photo-1558089687-f282ffcbc0d6?w=800&q=80',
  'Design an MQTT-based smart home system: ESP32 publishes sensor data, Node-RED subscribes and controls a relay via MQTT. Include QoS levels and retained messages.',
  'MQTT (Message Queuing Telemetry Transport) is the dominant IoT protocol — used by AWS IoT, Azure IoT Hub, Google Cloud IoT, and millions of commercial devices from smart thermostats to industrial PLCs. This challenge teaches you the skills used in every commercial IoT product.',
  '[{"step":1,"title":"MQTT Architecture Design","instruction":"Draw the publish-subscribe architecture: ESP32 (publisher) → Mosquitto Broker (on Raspberry Pi or cloud) → Node-RED (subscriber + publisher). Topics: home/livingroom/temperature, home/livingroom/humidity, home/livingroom/light/command (for relay). Broker IP and port (default 1883, or 8883 for TLS)."},{"step":2,"title":"QoS Levels Explained","instruction":"QoS 0 (At most once): fire and forget, fastest, no delivery guarantee — use for frequent sensor readings. QoS 1 (At least once): delivery guaranteed, may duplicate — use for commands. QoS 2 (Exactly once): slowest, guaranteed once — use for financial or critical control messages. Choose appropriate QoS for each topic in your design."},{"step":3,"title":"ESP32 MQTT Publisher Code","instruction":"Use PubSubClient library. Connect to WiFi, then connect to MQTT broker with client.connect(clientId, username, password). In loop: publish sensor data every 30s with client.publish(topic, payload) at QoS 0. Subscribe to light/command topic at QoS 1. In callback function: parse payload, toggle relay GPIO. Handle reconnection if broker disconnects."},{"step":4,"title":"Retained Messages & Last Will","instruction":"Set retained=true on the ESP32 status topic (home/esp32/status). Broker stores last message; new subscribers immediately get device state. Configure Last Will Testament (LWT): if ESP32 disconnects unexpectedly, broker publishes offline to home/esp32/status automatically. Show LWT configuration in client.connect() call."},{"step":5,"title":"Node-RED Flow & Security","instruction":"Design Node-RED flow: mqtt-in node (subscribe temperature) → function node (threshold check: if temp>28, publish ON to light/command) → mqtt-out node. Add inject node for manual override. Discuss security: username/password authentication, TLS encryption with certificates, topic-level ACL (access control lists) to prevent unauthorized devices from subscribing to command topics."}]',
  'Score: architecture clarity (20%), correct QoS selection with justification (20%), ESP32 code logic (20%), retained messages and LWT (20%), security considerations (20%)',
  '["MQTT","IoT","Node-RED","Publish-Subscribe","ESP32","Smart Home"]'
),
(
  'mech-cantilever-beam',
  'Cantilever Beam Deflection Under Point Load',
  'Mechanical', 'Structures', 'Beginner', 25,
  'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&q=80',
  'A steel cantilever beam (L=2m, 50×50mm square cross-section) has a point load of 500N at the free end. Calculate max deflection, max bending stress, and check if it is safe per IS 800.',
  'Cantilever beams appear in aircraft wings, balconies, crane jibs, diving boards and circuit board supports. This analysis is the foundation of structural engineering — the same equations determine whether a bridge overpass or a solar panel mounting bracket will fail under load.',
  '[{"step":1,"title":"Beam Properties Calculation","instruction":"For a 50×50mm square cross-section: Area A = 50×50 = 2500 mm². Second moment of area I = bh³/12 = 50×50³/12 = 520833 mm⁴. Section modulus Z = I/(h/2) = 520833/25 = 20833 mm³. For steel: E (Young\'s Modulus) = 200 GPa = 200,000 N/mm²."},{"step":2,"title":"Maximum Bending Moment","instruction":"For cantilever with point load P at free end: Maximum bending moment M_max = P × L at the fixed support. M_max = 500N × 2000mm = 1,000,000 N·mm = 1 kN·m. The bending moment diagram is triangular, zero at free end, maximum at fixed end."},{"step":3,"title":"Maximum Bending Stress","instruction":"Bending stress σ = M/Z = 1,000,000 N·mm / 20,833 mm³ = 48 N/mm² = 48 MPa. For structural steel (Fe250 per IS 2062): yield strength Fy = 250 MPa. Allowable bending stress per IS 800 = 0.66 × Fy = 165 MPa. Factor of safety = 165/48 = 3.44. Is the beam safe? Compare your calculated stress to allowable stress."},{"step":4,"title":"Maximum Deflection Calculation","instruction":"For cantilever with point load at free end: δ_max = PL³/(3EI). δ_max = (500 × 2000³) / (3 × 200,000 × 520,833) = 4,000,000,000 / 312,500,000 = 12.8 mm. IS 800 deflection limit for beams: L/300 = 2000/300 = 6.67 mm. Is the deflection acceptable? This is a serviceability check — the beam may be structurally safe but too flexible."},{"step":5,"title":"Redesign if Required","instruction":"If deflection exceeds limit (12.8mm > 6.67mm limit), propose a solution. Options: (a) Increase section size — try 75×75mm and recalculate I and δ. (b) Add intermediate support converting cantilever to fixed-fixed beam. (c) Use I-section with same weight but higher I. Calculate what minimum I is needed to satisfy the deflection limit: I_min = PL³/(3E×δ_allow)."}]',
  'Score: correct section properties (20%), correct BM calculation (20%), correct stress with IS 800 comparison (20%), correct deflection (20%), redesign with engineering judgement (20%)',
  '["Cantilever Beam","Bending Stress","Deflection","IS 800","Structural Steel"]'
),
(
  'mech-gear-train',
  'Spur Gear Train Design for Speed Reduction',
  'Mechanical', 'Machine Design', 'Intermediate', 35,
  'https://images.unsplash.com/photo-1535905557558-afc4877a26fc?w=800&q=80',
  'Design a two-stage spur gear train to achieve an overall velocity ratio of 12:1. Input speed 1440 RPM, input torque 50 N·m. Calculate module, pitch circle diameters, and centre distances.',
  'Gear trains are in every machine: automobile gearboxes, wind turbine generators, lathe headstocks, robotic actuators and industrial conveyor systems. This challenge uses the same calculations a mechanical engineer applies before sending drawings to the machine shop.',
  '[{"step":1,"title":"Stage Ratio Distribution","instruction":"Overall velocity ratio VR = 12. Distribute across two stages: VR1 × VR2 = 12. For equal stages: √12 ≈ 3.46 (impractical). Better: VR1=3, VR2=4 (giving 12). Or VR1=4, VR2=3. Choose standard gear ratios. For each stage: if driver has T1 teeth, driven has T2 = T1 × VR. Choose T1 = 20 teeth (minimum to avoid undercutting for 20° pressure angle)."},{"step":2,"title":"Gear Tooth Calculations","instruction":"Stage 1: T1_driver=20 teeth, T1_driven=20×3=60 teeth. Stage 2: T2_driver=20 teeth, T2_driven=20×4=80 teeth. Choose module m=2 (standard). Pitch circle diameter d = m×T. Stage 1: d_driver=2×20=40mm, d_driven=2×60=120mm. Stage 2: d_driver=2×20=40mm, d_driven=2×80=160mm."},{"step":3,"title":"Centre Distance Calculation","instruction":"Centre distance C = (d1 + d2)/2. Stage 1: C1 = (40+120)/2 = 80mm. Stage 2: C2 = (40+160)/2 = 100mm. Total length of gear train ≈ C1 + C2 = 180mm (plus shaft diameters and bearing housings). The intermediate shaft runs at 1440/3 = 480 RPM."},{"step":4,"title":"Torque and Power Analysis","instruction":"Input power P = T×ω = 50 N·m × (1440×2π/60) = 50 × 150.8 = 7540 W ≈ 7.54 kW. Assuming η=98% per stage: output torque = 50×12×0.98² = 576 N·m. Output speed = 1440/12 = 120 RPM. Check: P_out = 576×(120×2π/60) = 576×12.57 = 7240W (loss = 300W in heat, matches ~4% loss for two stages)."},{"step":5,"title":"Material and Safety Factor","instruction":"For industrial gears, choose case-hardened alloy steel 20MnCr5: surface hardness 58-62 HRC, allowable contact stress 1200 MPa. Check Lewis bending equation: σ = Wt/(b×m×Y) where Wt = tangential force = 2×T_input/d_driver = 2×50/0.040 = 2500N, b=10m=20mm, Y=Lewis form factor≈0.32 for 20 teeth. Calculate and compare to allowable bending stress of 200 MPa."}]',
  'Score: correct ratio distribution (20%), tooth and diameter calculations (20%), centre distance (20%), power/torque/efficiency analysis (20%), material and stress check (20%)',
  '["Spur Gears","Velocity Ratio","Module","Pitch Circle","Lewis Equation"]'
),
(
  'civil-concrete-m25',
  'M25 Concrete Mix Design as per IS 10262',
  'Civil', 'Materials', 'Beginner', 25,
  'https://images.unsplash.com/photo-1545259741-2ea3ebf61fa3?w=800&q=80',
  'Design a M25 concrete mix for a RCC beam with moderate exposure. Calculate water-cement ratio, cement content, fine aggregate and coarse aggregate quantities for 1m³ of concrete.',
  'Concrete mix design is the foundation of all construction. Whether it is a highway bridge in Rajasthan, a high-rise in Mumbai, or an irrigation canal in Tamil Nadu — the engineer who gets the mix design right ensures structures that last 100+ years. M25 is the most common grade used in RCC structures across India.',
  '[{"step":1,"title":"Target Mean Strength","instruction":"Characteristic compressive strength fck = 25 MPa (for M25). Target mean strength ft = fck + 1.65×S where S is standard deviation. For good site control (IS 10262), S = 4 MPa for M25. ft = 25 + 1.65×4 = 31.6 MPa. This accounts for natural variability in concrete strength — 95% of test results should exceed 25 MPa."},{"step":2,"title":"Water-Cement Ratio","instruction":"From IS 456 Table 5, for moderate exposure (RCC beams and slabs): max w/c = 0.50, min cement = 300 kg/m³. From strength requirement (Abrams law relationship): for target strength 31.6 MPa using OPC 53 grade cement, use w/c = 0.45 (conservative). Lower w/c improves strength and durability but reduces workability."},{"step":3,"title":"Water Content","instruction":"From IS 10262 Table 2, for 20mm MSA (Maximum Size Aggregate) and medium workability (slump 50-75mm): water content = 186 litres/m³. For each 25mm increase in slump beyond 50mm, add 3% water. Adjust for admixtures if used (superplasticizer can reduce water by 20-30%). Final water content W = 186 litres/m³."},{"step":4,"title":"Cement and Aggregate Content","instruction":"Cement C = W / (w/c) = 186 / 0.45 = 413 kg/m³. Check: 413 > 300 kg/m³ minimum (IS 456). Volume of cement = 413/3150 = 0.131 m³ (density of OPC = 3150 kg/m³). Volume of water = 186/1000 = 0.186 m³. Air content = 1% = 0.01 m³. Volume of aggregates = 1 - 0.131 - 0.186 - 0.01 = 0.673 m³. From IS 10262 Table 3, for w/c=0.45 and zone II FA: FA proportion = 36% of total aggregate. FA volume = 0.36×0.673 = 0.242 m³, CA volume = 0.431 m³."},{"step":5,"title":"Final Mix Proportions","instruction":"FA mass = 0.242 × 2600 (density) = 630 kg/m³. CA mass = 0.431 × 2700 = 1164 kg/m³. Mix ratio by weight: Cement:FA:CA:Water = 1:1.53:2.82:0.45. In volume batching (for site): if 1 bag cement = 50 kg, per bag use FA = 76.5 kg, CA = 141 kg, water = 22.5 litres. Describe 3 cubes to be cast per batch for 7-day and 28-day compressive strength testing as per IS 516."}]',
  'Score: correct target strength with standard deviation (20%), correct w/c ratio with IS 456 reference (20%), water content selection (20%), accurate cement and aggregate calculation (20%), site-level mix and testing (20%)',
  '["M25 Concrete","IS 10262","Mix Design","Water-Cement Ratio","RCC"]'
)
ON CONFLICT (id) DO NOTHING;
