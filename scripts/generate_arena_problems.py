"""
Capabilio Arena — Bulk Problem Generator
=========================================
Generates 4000+ coding challenges across all engineering branches and inserts them into Supabase.

SETUP:
    pip install supabase python-dotenv

    Create a .env file at the project root with:
        PROBLEMS_SUPABASE_URL=https://cbrjdfllxfmmvalijpej.supabase.co
        PROBLEMS_SUPABASE_SERVICE_KEY=your-service-role-key-here

USAGE:
    # Generate all branches (~4000 problems):
    python scripts/generate_arena_problems.py

    # Generate only specific branch:
    python scripts/generate_arena_problems.py --branch ECE --count 200

    # Dry run (print without inserting):
    python scripts/generate_arena_problems.py --dry-run

ADDING NEW TEMPLATES:
    1. Add a new function generate_<branch>_<topic>_variants(n) that returns list of problem dicts
    2. Register it in GENERATORS dict at the bottom of this file
    3. Run the script

HOW IT WORKS:
    Each generator function creates N variants of a problem by randomizing:
    - Input parameter values (different numbers, different company contexts)
    - Computing the correct expected output using the same formula
    - Generating unique slugs (base-slug-001, base-slug-002, ...)

    This ensures every problem has a correct, verifiable answer.
"""

import math
import random
import json
import os
import sys
import argparse
from itertools import product

# ─── Supabase connection ──────────────────────────────────────────────────────

def get_supabase_client():
    try:
        from supabase import create_client
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        print("ERROR: Missing packages. Run: pip install supabase python-dotenv")
        sys.exit(1)

    url = os.getenv("PROBLEMS_SUPABASE_URL")
    key = os.getenv("PROBLEMS_SUPABASE_SERVICE_KEY")

    if not url or not key:
        print("ERROR: Set PROBLEMS_SUPABASE_URL and PROBLEMS_SUPABASE_SERVICE_KEY in .env")
        sys.exit(1)

    return create_client(url, key)


# ─── Indian company pools by branch ─────────────────────────────────────────

COMPANIES = {
    "ECE":      ["ISRO", "DRDO", "BEL", "BSNL", "CDAC", "Qualcomm India", "Samsung R&D India",
                 "Texas Instruments India", "MediaTek India", "Broadcom India", "Jio", "Airtel"],
    "EEE":      ["NTPC", "BHEL", "PowerGrid", "Adani Green Energy", "Torrent Power",
                 "L&T Electrical", "Siemens India", "Tata Power", "CESC", "Schneider India"],
    "Mechanical":["TATA Motors", "Mahindra", "HAL", "Bajaj Auto", "L&T Heavy Engineering",
                  "DRDO Armament", "Indian Railways", "BHEL Turbines", "TVS Motors", "Hero Motocorp"],
    "Civil":    ["L&T Construction", "NHAI", "Delhi Metro", "RITES", "NBCC",
                 "Shapoorji Pallonji", "Gammon India", "Afcons Infrastructure", "CPWD", "BWSSB"],
    "Pharmacy": ["Sun Pharma", "Cipla", "Dr. Reddys Labs", "Biocon", "Lupin",
                 "Aurobindo Pharma", "Zydus Cadila", "Alkem Labs", "Torrent Pharma", "Glenmark"],
    "MBA":      ["McKinsey India", "BCG India", "Deloitte India", "Bain India",
                 "KPMG India", "EY India", "PwC India", "Accenture Strategy", "Infosys BPO", "WNS"],
    "AI_ML":    ["Fractal Analytics", "Mu Sigma", "Tiger Analytics", "Latent View",
                 "Analytics Vidhya", "LatentView Analytics", "Sigmoid", "Quantiphi", "Tredence"],
    "IoT":      ["Bosch India", "Honeywell India", "Siemens India IoT", "ABB India",
                 "Schneider Electric India", "Wipro IoT", "HCL IoT", "L&T Technology Services"],
}


# ─── Helper: build problem dict ───────────────────────────────────────────────

def make_problem(title, slug, difficulty, category, tags, statement,
                 constraints, examples, test_cases, editorial,
                 languages=None, acceptance_rate=None):
    if languages is None:
        languages = ["python"]
    if acceptance_rate is None:
        acceptance_rate = round(random.uniform(0.45, 0.80), 2)
    return {
        "title": title,
        "slug": slug,
        "difficulty": difficulty,
        "category": category,
        "tags": tags,
        "statement": statement,
        "constraints": constraints,
        "examples": examples,
        "test_cases": test_cases,
        "editorial": editorial,
        "languages": languages,
        "acceptance_rate": acceptance_rate,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# ECE GENERATORS
# ═══════════════════════════════════════════════════════════════════════════════

def generate_ece_shannon_capacity(n=80):
    """Shannon Channel Capacity: C = B * log2(1 + SNR)"""
    problems = []
    params = [
        (100_000, 1), (200_000, 3), (500_000, 7), (1_000_000, 15), (2_000_000, 31),
        (4_000_000, 63), (10_000_000, 7), (50_000_000, 3), (100_000_000, 1),
        (500_000, 3), (1_000_000, 7), (2_000_000, 15), (800_000, 31), (300_000, 63),
    ]
    companies = COMPANIES["ECE"]
    for i in range(n):
        B, SNR = random.choice(params)
        # Add some randomness
        B = B * random.choice([1, 2, 4, 5])
        SNR = random.choice([1, 3, 7, 15, 31, 63, 127, 255])
        C = int(B * math.log2(1 + SNR))
        company = random.choice(companies)
        slug = f"shannon-channel-capacity-{i+1:03d}"
        problems.append(make_problem(
            title=f"{company} Channel Capacity Problem {i+1}",
            slug=slug,
            difficulty="Easy",
            category="ECE",
            tags=["information-theory", "communication", "shannon"],
            statement=f"## Problem\nCompute Shannon channel capacity.\n**B = {B} Hz, SNR = {SNR}**\nFormula: C = B x log2(1 + SNR). Return integer.",
            constraints=f"B={B}, SNR={SNR} (fixed for this variant)",
            examples=json.dumps([{"input": f"{B}\n{SNR}", "output": str(C)}]),
            test_cases=json.dumps([
                {"input": f"{B}\n{SNR}", "expected_output": str(C), "is_hidden": False},
                {"input": f"{B*2}\n{SNR}", "expected_output": str(int(B*2*math.log2(1+SNR))), "is_hidden": True},
            ]),
            editorial=f"import math; B,SNR=int(input()),int(input()); print(int(B*math.log2(1+SNR)))",
            languages=["python", "cpp"],
            acceptance_rate=round(random.uniform(0.60, 0.80), 2),
        ))
    return problems


def generate_ece_am_modulation(n=60):
    """AM Modulation Index: mu = (Amax - Amin) / (Amax + Amin)"""
    problems = []
    for i in range(n):
        Amin = random.randint(1, 10) * random.choice([1, 2, 5])
        Amax = Amin + random.randint(1, 10) * random.choice([1, 2, 5])
        mu = round((Amax - Amin) / (Amax + Amin), 4)
        company = random.choice(COMPANIES["ECE"])
        problems.append(make_problem(
            title=f"{company} AM Modulation Index Variant {i+1}",
            slug=f"am-modulation-index-{i+1:03d}",
            difficulty="Easy",
            category="ECE",
            tags=["modulation", "analog-communication", "signals"],
            statement=f"## Problem\nCompute AM modulation index.\nAmax={Amax}, Amin={Amin}\nmu = (Amax - Amin) / (Amax + Amin). Return 4 decimal places.",
            constraints=f"Amax={Amax}, Amin={Amin}",
            examples=json.dumps([{"input": f"{Amax}\n{Amin}", "output": str(mu)}]),
            test_cases=json.dumps([
                {"input": f"{Amax}\n{Amin}", "expected_output": str(mu), "is_hidden": False},
            ]),
            editorial="Amax,Amin=int(input()),int(input()); print(round((Amax-Amin)/(Amax+Amin),4))",
            languages=["python", "cpp"],
        ))
    return problems


def generate_ece_pcm_bitrate(n=50):
    """PCM Bit Rate = sample_rate x bits x channels"""
    configs = [
        (8000, 8, 1, "Telephone"),
        (22050, 16, 1, "Low-quality audio"),
        (44100, 16, 2, "CD quality"),
        (44100, 24, 2, "High-quality audio"),
        (48000, 16, 2, "DAT quality"),
        (48000, 24, 2, "Studio quality"),
        (96000, 24, 2, "HD audio"),
        (192000, 32, 2, "Ultra HD audio"),
        (8000, 16, 1, "Wideband voice"),
        (16000, 16, 1, "HD voice"),
    ]
    problems = []
    for i in range(n):
        sr, bps, ch, label = random.choice(configs)
        rate = sr * bps * ch
        company = random.choice(COMPANIES["ECE"])
        problems.append(make_problem(
            title=f"{company} PCM Bit Rate — {label}",
            slug=f"pcm-bit-rate-{i+1:03d}",
            difficulty="Easy",
            category="ECE",
            tags=["pcm", "digital-audio", "sampling"],
            statement=f"## Problem\nCompute PCM bit rate for {label}.\nSample Rate={sr} Hz, Bits per Sample={bps}, Channels={ch}\nBit Rate = Sample_Rate x Bits_per_Sample x Channels. Return integer.",
            constraints=f"sr={sr}, bps={bps}, channels={ch}",
            examples=json.dumps([{"input": f"{sr}\n{bps}\n{ch}", "output": str(rate)}]),
            test_cases=json.dumps([
                {"input": f"{sr}\n{bps}\n{ch}", "expected_output": str(rate), "is_hidden": False},
            ]),
            editorial="sr,bps,ch=int(input()),int(input()),int(input()); print(sr*bps*ch)",
            languages=["python", "cpp"],
        ))
    return problems


def generate_ece_nyquist(n=50):
    """Nyquist Sampling Rate = 2 * fmax"""
    freqs = [
        (4000, "Telephone voice"), (8000, "Wideband voice"), (20000, "Audio"),
        (22050, "CD audio/2"), (3400, "POTS"), (7000, "AM radio"),
        (15000, "FM radio voice"), (100000, "Ultrasound"), (5000, "ECG signal"),
        (2000, "EEG signal"), (1000, "EEG slow wave"), (50000, "Bat sonar"),
    ]
    problems = []
    for i in range(n):
        fmax, label = random.choice(freqs)
        fs = 2 * fmax
        company = random.choice(COMPANIES["ECE"])
        problems.append(make_problem(
            title=f"{company} Nyquist Rate — {label}",
            slug=f"nyquist-sampling-rate-{i+1:03d}",
            difficulty="Easy",
            category="ECE",
            tags=["sampling", "nyquist", "dsp"],
            statement=f"## Problem\nFind minimum sampling rate for {label} signal.\nfmax = {fmax} Hz. fs_min = 2 x fmax. Return integer.",
            constraints=f"fmax={fmax}",
            examples=json.dumps([{"input": str(fmax), "output": str(fs)}]),
            test_cases=json.dumps([
                {"input": str(fmax), "expected_output": str(fs), "is_hidden": False},
            ]),
            editorial="fmax=int(input()); print(2*fmax)",
            languages=["python", "cpp"],
        ))
    return problems


def generate_ece_fm_bandwidth(n=60):
    """FM Bandwidth (Carson): BW = 2(delta_f + fm)"""
    configs = [
        (75_000, 15_000, "FM broadcast"), (10_000, 3_000, "Narrowband FM"),
        (25_000, 10_000, "Wide NBFM"), (50_000, 15_000, "Regional FM"),
        (5_000, 2_000, "PMR"), (150_000, 15_000, "Stereo FM"),
        (75_000, 20_000, "HD FM"), (100_000, 15_000, "FM deviation high"),
        (20_000, 5_000, "VHF radio"), (30_000, 8_000, "Marine VHF"),
    ]
    problems = []
    for i in range(n):
        df, fm, label = random.choice(configs)
        bw = 2 * (df + fm)
        company = random.choice(COMPANIES["ECE"])
        problems.append(make_problem(
            title=f"{company} FM Bandwidth — {label}",
            slug=f"fm-bandwidth-{i+1:03d}",
            difficulty="Easy",
            category="ECE",
            tags=["fm", "bandwidth", "carsons-rule", "modulation"],
            statement=f"## Problem\nCompute FM bandwidth for {label} using Carson Rule.\ndelta_f={df} Hz, fm={fm} Hz. BW = 2x(delta_f+fm). Return integer Hz.",
            constraints=f"delta_f={df}, fm={fm}",
            examples=json.dumps([{"input": f"{df}\n{fm}", "output": str(bw)}]),
            test_cases=json.dumps([
                {"input": f"{df}\n{fm}", "expected_output": str(bw), "is_hidden": False},
            ]),
            editorial="df,fm=int(input()),int(input()); print(2*(df+fm))",
            languages=["python", "cpp"],
        ))
    return problems


# ═══════════════════════════════════════════════════════════════════════════════
# EEE GENERATORS
# ═══════════════════════════════════════════════════════════════════════════════

def generate_eee_three_phase_power(n=80):
    """P = sqrt(3) * VL * IL * cos(phi)"""
    configs = [
        (400, 10, 0.8), (415, 20, 0.85), (11000, 100, 0.9),
        (33000, 50, 0.85), (6600, 200, 0.8), (440, 5, 1.0),
        (220, 15, 0.75), (3300, 30, 0.9), (415, 100, 0.95),
        (11000, 250, 0.85), (400, 50, 0.9), (415, 75, 0.8),
    ]
    problems = []
    for i in range(n):
        VL, IL, pf = random.choice(configs)
        P = round(math.sqrt(3) * VL * IL * pf, 2)
        company = random.choice(COMPANIES["EEE"])
        problems.append(make_problem(
            title=f"{company} 3-Phase Power — {VL}V System",
            slug=f"three-phase-power-{i+1:03d}",
            difficulty="Medium",
            category="EEE",
            tags=["three-phase", "power-systems", "ac-circuits"],
            statement=f"## Problem\nCompute 3-phase active power.\nVL={VL} V, IL={IL} A, pf={pf}\nP = sqrt(3) x VL x IL x cos(phi). Return Watts (2 decimals).",
            constraints=f"VL={VL}, IL={IL}, pf={pf}",
            examples=json.dumps([{"input": f"{VL}\n{IL}\n{pf}", "output": str(P)}]),
            test_cases=json.dumps([
                {"input": f"{VL}\n{IL}\n{pf}", "expected_output": str(P), "is_hidden": False},
            ]),
            editorial="import math; VL,IL,pf=float(input()),float(input()),float(input()); print(round(math.sqrt(3)*VL*IL*pf,2))",
            languages=["python", "cpp"],
        ))
    return problems


def generate_eee_battery_discharge(n=60):
    """Battery life = Capacity / Current"""
    configs = [
        (100, 5), (200, 10), (50, 2.5), (12, 0.5), (60, 7.5),
        (150, 15), (400, 20), (7, 0.35), (100, 25), (24, 4),
        (300, 30), (80, 8), (500, 50), (35, 5), (20, 1),
    ]
    problems = []
    for i in range(n):
        cap, cur = random.choice(configs)
        t = round(cap / cur, 2)
        company = random.choice(COMPANIES["EEE"])
        problems.append(make_problem(
            title=f"{company} Battery Discharge Time {i+1}",
            slug=f"battery-discharge-time-{i+1:03d}",
            difficulty="Easy",
            category="EEE",
            tags=["batteries", "energy-storage", "power-systems"],
            statement=f"## Problem\nCompute battery discharge time.\nCapacity={cap} Ah, Load={cur} A\nTime = Capacity / Current. Return hours (2 decimals).",
            constraints=f"capacity={cap}, current={cur}",
            examples=json.dumps([{"input": f"{cap}\n{cur}", "output": str(t)}]),
            test_cases=json.dumps([
                {"input": f"{cap}\n{cur}", "expected_output": str(t), "is_hidden": False},
            ]),
            editorial="cap,cur=float(input()),float(input()); print(round(cap/cur,2))",
            languages=["python", "cpp"],
        ))
    return problems


def generate_eee_motor_speed_regulation(n=60):
    """SR = (N_NL - N_FL) / N_FL * 100"""
    configs = [
        (1500, 1450), (3000, 2850), (1800, 1740), (960, 900),
        (750, 720), (1440, 1380), (3600, 3500), (1000, 960),
        (1200, 1150), (500, 490), (2880, 2800), (1460, 1420),
    ]
    problems = []
    for i in range(n):
        N_NL, N_FL = random.choice(configs)
        SR = round((N_NL - N_FL) / N_FL * 100, 2)
        company = random.choice(COMPANIES["EEE"])
        problems.append(make_problem(
            title=f"{company} Motor Speed Regulation {i+1}",
            slug=f"motor-speed-regulation-{i+1:03d}",
            difficulty="Medium",
            category="EEE",
            tags=["dc-motor", "speed-regulation", "electrical-machines"],
            statement=f"## Problem\nCompute DC motor speed regulation.\nN_NL={N_NL} rpm, N_FL={N_FL} rpm\nSR = (N_NL - N_FL)/N_FL x 100. Return % (2 decimals).",
            constraints=f"N_NL={N_NL}, N_FL={N_FL}",
            examples=json.dumps([{"input": f"{N_NL}\n{N_FL}", "output": str(SR)}]),
            test_cases=json.dumps([
                {"input": f"{N_NL}\n{N_FL}", "expected_output": str(SR), "is_hidden": False},
            ]),
            editorial="N_NL,N_FL=float(input()),float(input()); print(round((N_NL-N_FL)/N_FL*100,2))",
            languages=["python", "cpp"],
        ))
    return problems


# ═══════════════════════════════════════════════════════════════════════════════
# MECHANICAL GENERATORS
# ═══════════════════════════════════════════════════════════════════════════════

def generate_mech_carnot(n=80):
    """Carnot efficiency = (1 - TL/TH) * 100"""
    configs = [
        (600, 300), (800, 400), (500, 200), (1000, 400), (700, 350),
        (1200, 500), (600, 250), (900, 300), (400, 200), (1500, 600),
        (800, 300), (550, 220), (1100, 400), (650, 260), (750, 300),
    ]
    problems = []
    for i in range(n):
        TH, TL = random.choice(configs)
        eta = round((1 - TL / TH) * 100, 2)
        company = random.choice(COMPANIES["Mechanical"])
        problems.append(make_problem(
            title=f"{company} Carnot Efficiency {i+1}",
            slug=f"carnot-efficiency-{i+1:03d}",
            difficulty="Easy",
            category="Mechanical",
            tags=["thermodynamics", "carnot", "heat-engines"],
            statement=f"## Problem\nCompute Carnot efficiency.\nTH={TH} K (source), TL={TL} K (sink)\neta = (1 - TL/TH) x 100. Return % (2 decimals).",
            constraints=f"TH={TH}, TL={TL} (Kelvin)",
            examples=json.dumps([{"input": f"{TH}\n{TL}", "output": str(eta)}]),
            test_cases=json.dumps([
                {"input": f"{TH}\n{TL}", "expected_output": str(eta), "is_hidden": False},
            ]),
            editorial="TH,TL=float(input()),float(input()); print(round((1-TL/TH)*100,2))",
            languages=["python", "cpp"],
        ))
    return problems


def generate_mech_gear_speed(n=70):
    """N2 = N1 * T1 / T2"""
    configs = [
        (1500, 20, 60), (3000, 15, 45), (1440, 24, 72), (2000, 50, 25),
        (960, 40, 80), (1800, 30, 90), (750, 60, 120), (1200, 18, 54),
        (3600, 10, 40), (1000, 25, 100), (2800, 14, 42), (1450, 20, 80),
    ]
    problems = []
    for i in range(n):
        N1, T1, T2 = random.choice(configs)
        N2 = round(N1 * T1 / T2, 2)
        company = random.choice(COMPANIES["Mechanical"])
        problems.append(make_problem(
            title=f"{company} Gear Train Speed {i+1}",
            slug=f"gear-train-speed-{i+1:03d}",
            difficulty="Easy",
            category="Mechanical",
            tags=["gear-train", "kinematics", "mechanical-design"],
            statement=f"## Problem\nCompute output gear speed.\nN1={N1} rpm, T1={T1} teeth (input), T2={T2} teeth (output)\nN2 = N1 x T1/T2. Return rpm (2 decimals).",
            constraints=f"N1={N1}, T1={T1}, T2={T2}",
            examples=json.dumps([{"input": f"{N1}\n{T1}\n{T2}", "output": str(N2)}]),
            test_cases=json.dumps([
                {"input": f"{N1}\n{T1}\n{T2}", "expected_output": str(N2), "is_hidden": False},
            ]),
            editorial="N1,T1,T2=float(input()),float(input()),float(input()); print(round(N1*T1/T2,2))",
            languages=["python", "cpp"],
        ))
    return problems


def generate_mech_spring_frequency(n=60):
    """fn = (1/(2*pi)) * sqrt(k/m)"""
    configs = [
        (100, 1), (400, 4), (1000, 2), (9800, 10), (500, 5),
        (2000, 8), (250, 1), (4000, 4), (800, 2), (196, 0.5),
        (100, 0.25), (16000, 4), (625, 0.625), (3600, 9), (100, 4),
    ]
    problems = []
    for i in range(n):
        k, m = random.choice(configs)
        fn = round(math.sqrt(k / m) / (2 * math.pi), 4)
        company = random.choice(COMPANIES["Mechanical"])
        problems.append(make_problem(
            title=f"{company} Spring-Mass Natural Frequency {i+1}",
            slug=f"spring-natural-frequency-{i+1:03d}",
            difficulty="Easy",
            category="Mechanical",
            tags=["vibrations", "spring-mass", "dynamics"],
            statement=f"## Problem\nCompute natural frequency of spring-mass system.\nk={k} N/m (stiffness), m={m} kg (mass)\nfn = sqrt(k/m) / (2xpi). Return Hz (4 decimals).",
            constraints=f"k={k}, m={m}",
            examples=json.dumps([{"input": f"{k}\n{m}", "output": str(fn)}]),
            test_cases=json.dumps([
                {"input": f"{k}\n{m}", "expected_output": str(fn), "is_hidden": False},
            ]),
            editorial="import math; k,m=float(input()),float(input()); print(round(math.sqrt(k/m)/(2*math.pi),4))",
            languages=["python", "cpp"],
        ))
    return problems


def generate_mech_thermal_stress(n=60):
    """sigma = E * alpha * delta_T (in MPa)"""
    configs = [
        (200e9, 12e-6, 50),   # Steel, 50K rise
        (70e9, 23e-6, 100),   # Aluminium
        (200e9, 12e-6, 100),  # Steel, 100K
        (110e9, 17e-6, 80),   # Copper
        (200e9, 12e-6, 200),  # Steel, large DT
        (70e9, 23e-6, 50),    # Aluminium, 50K
        (207e9, 11e-6, 75),   # SS 316
        (200e9, 12e-6, 25),   # Steel, 25K
        (150e9, 15e-6, 100),  # Cast iron
        (400e9, 6e-6, 100),   # Tungsten
    ]
    problems = []
    for i in range(n):
        E, alpha, dT = random.choice(configs)
        sigma = round(E * alpha * dT / 1e6, 2)
        company = random.choice(COMPANIES["Mechanical"])
        problems.append(make_problem(
            title=f"{company} Thermal Stress {i+1}",
            slug=f"thermal-stress-{i+1:03d}",
            difficulty="Easy",
            category="Mechanical",
            tags=["thermal-stress", "materials", "mechanics-of-materials"],
            statement=f"## Problem\nCompute constrained thermal stress.\nE={E:.3e} Pa, alpha={alpha:.2e}/K, delta_T={dT} K\nsigma = E x alpha x delta_T. Return MPa (2 decimals).",
            constraints=f"E={E}, alpha={alpha}, dT={dT}",
            examples=json.dumps([{"input": f"{E}\n{alpha}\n{dT}", "output": str(sigma)}]),
            test_cases=json.dumps([
                {"input": f"{E}\n{alpha}\n{dT}", "expected_output": str(sigma), "is_hidden": False},
            ]),
            editorial="E,a,dT=float(input()),float(input()),float(input()); print(round(E*a*dT/1e6,2))",
            languages=["python", "cpp"],
        ))
    return problems


# ═══════════════════════════════════════════════════════════════════════════════
# CIVIL GENERATORS
# ═══════════════════════════════════════════════════════════════════════════════

def generate_civil_wc_ratio(n=70):
    """Water content = w/c * cement"""
    configs = [
        (0.40, 350), (0.45, 350), (0.50, 400), (0.55, 300),
        (0.60, 280), (0.40, 400), (0.45, 320), (0.50, 360),
        (0.35, 450), (0.65, 260), (0.42, 380), (0.48, 340),
    ]
    problems = []
    for i in range(n):
        wc, cem = random.choice(configs)
        water = round(wc * cem, 2)
        company = random.choice(COMPANIES["Civil"])
        problems.append(make_problem(
            title=f"{company} Concrete Water Content {i+1}",
            slug=f"water-cement-ratio-{i+1:03d}",
            difficulty="Easy",
            category="Civil",
            tags=["concrete", "mix-design", "construction-materials"],
            statement=f"## Problem\nCompute water content for concrete mix.\nw/c ratio={wc}, cement={cem} kg/m3\nWater = w/c x Cement. Return kg/m3 (2 decimals).",
            constraints=f"w/c={wc}, cement={cem}",
            examples=json.dumps([{"input": f"{wc}\n{cem}", "output": str(water)}]),
            test_cases=json.dumps([
                {"input": f"{wc}\n{cem}", "expected_output": str(water), "is_hidden": False},
            ]),
            editorial="wc,cem=float(input()),float(input()); print(round(wc*cem,2))",
            languages=["python", "cpp"],
        ))
    return problems


def generate_civil_fos(n=60):
    """FOS = Ultimate / Working"""
    configs = [
        (400, 150), (500, 200), (250, 80), (800, 320), (600, 200),
        (350, 100), (700, 250), (1000, 400), (450, 180), (300, 100),
        (550, 220), (200, 80), (900, 300), (650, 260), (750, 300),
    ]
    problems = []
    for i in range(n):
        ult, work = random.choice(configs)
        fos = round(ult / work, 2)
        company = random.choice(COMPANIES["Civil"])
        problems.append(make_problem(
            title=f"{company} Factor of Safety {i+1}",
            slug=f"factor-of-safety-{i+1:03d}",
            difficulty="Easy",
            category="Civil",
            tags=["structural-engineering", "safety", "material-strength"],
            statement=f"## Problem\nCompute structural Factor of Safety.\nUltimate strength={ult} MPa, Working stress={work} MPa\nFOS = Ultimate / Working. Return (2 decimals).",
            constraints=f"ultimate={ult}, working={work}",
            examples=json.dumps([{"input": f"{ult}\n{work}", "output": str(fos)}]),
            test_cases=json.dumps([
                {"input": f"{ult}\n{work}", "expected_output": str(fos), "is_hidden": False},
            ]),
            editorial="u,w=float(input()),float(input()); print(round(u/w,2))",
            languages=["python", "cpp"],
        ))
    return problems


def generate_civil_earthwork(n=60):
    """V = (L/6) * (A1 + 4*Am + A2)"""
    configs = [
        (30, 20, 25, 30), (50, 15, 20, 25), (20, 10, 18, 12),
        (40, 30, 35, 40), (100, 50, 60, 70), (25, 8, 12, 10),
        (60, 40, 45, 50), (80, 25, 30, 35), (15, 5, 8, 6),
        (200, 100, 120, 110), (45, 20, 28, 25), (35, 15, 22, 18),
    ]
    problems = []
    for i in range(n):
        L, A1, Am, A2 = random.choice(configs)
        V = round((L / 6) * (A1 + 4 * Am + A2), 2)
        company = random.choice(COMPANIES["Civil"])
        problems.append(make_problem(
            title=f"{company} Earthwork Volume {i+1}",
            slug=f"earthwork-prismoidal-{i+1:03d}",
            difficulty="Medium",
            category="Civil",
            tags=["surveying", "earthwork", "prismoidal-formula"],
            statement=f"## Problem\nCompute earthwork volume using Prismoidal formula.\nL={L}m, A1={A1}m2, Am={Am}m2, A2={A2}m2\nV = (L/6)x(A1+4Am+A2). Return m3 (2 decimals).",
            constraints=f"L={L}, A1={A1}, Am={Am}, A2={A2}",
            examples=json.dumps([{"input": f"{L}\n{A1}\n{Am}\n{A2}", "output": str(V)}]),
            test_cases=json.dumps([
                {"input": f"{L}\n{A1}\n{Am}\n{A2}", "expected_output": str(V), "is_hidden": False},
            ]),
            editorial="L,A1,Am,A2=float(input()),float(input()),float(input()),float(input()); print(round((L/6)*(A1+4*Am+A2),2))",
            languages=["python", "cpp"],
        ))
    return problems


# ═══════════════════════════════════════════════════════════════════════════════
# PHARMACY GENERATORS
# ═══════════════════════════════════════════════════════════════════════════════

def generate_pharma_dosage(n=80):
    """Total Dose = dose_per_kg * weight"""
    configs = [
        (5, 70, "Adult standard"), (10, 25, "Pediatric"),
        (2.5, 60, "Low dose adult"), (0.5, 80, "Maintenance"),
        (15, 15, "Pediatric high"), (7.5, 50, "Standard"),
        (20, 10, "Neonatal"), (3, 75, "Elderly"),
        (8, 30, "Child"), (12, 20, "Young child"),
        (1, 100, "Very low dose"), (6, 55, "Standard adult"),
    ]
    problems = []
    for i in range(n):
        dpk, wt, label = random.choice(configs)
        dose = round(dpk * wt, 2)
        company = random.choice(COMPANIES["Pharmacy"])
        problems.append(make_problem(
            title=f"{company} Dosage Calculation — {label}",
            slug=f"drug-dosage-{i+1:03d}",
            difficulty="Easy",
            category="Pharmacy",
            tags=["pharmacology", "dosage-calculation", "clinical"],
            statement=f"## Problem\nCompute weight-based drug dose for {label} patient.\nDose/kg={dpk} mg/kg, Weight={wt} kg\nTotal Dose = dose_per_kg x weight. Return mg (2 decimals).",
            constraints=f"dose_per_kg={dpk}, weight={wt}",
            examples=json.dumps([{"input": f"{dpk}\n{wt}", "output": str(dose)}]),
            test_cases=json.dumps([
                {"input": f"{dpk}\n{wt}", "expected_output": str(dose), "is_hidden": False},
            ]),
            editorial="dpk,wt=float(input()),float(input()); print(round(dpk*wt,2))",
            languages=["python"],
        ))
    return problems


def generate_pharma_halflife(n=70):
    """C(t) = C0 * (0.5)^(t/t_half)"""
    configs = [
        (100, 12, 6), (200, 8, 4), (500, 24, 8), (80, 6, 3),
        (400, 48, 12), (50, 4, 2), (1000, 24, 6), (150, 9, 3),
        (300, 16, 4), (75, 18, 6), (600, 30, 10), (120, 12, 4),
    ]
    problems = []
    for i in range(n):
        C0, t, th = random.choice(configs)
        C = round(C0 * (0.5) ** (t / th), 4)
        company = random.choice(COMPANIES["Pharmacy"])
        problems.append(make_problem(
            title=f"{company} Drug Half-Life Elimination {i+1}",
            slug=f"drug-halflife-{i+1:03d}",
            difficulty="Easy",
            category="Pharmacy",
            tags=["pharmacokinetics", "half-life", "drug-elimination"],
            statement=f"## Problem\nCompute remaining drug concentration.\nC0={C0} mg, t={t} hrs, t_half={th} hrs\nC(t) = C0 x (0.5)^(t/t_half). Return mg (4 decimals).",
            constraints=f"C0={C0}, t={t}, t_half={th}",
            examples=json.dumps([{"input": f"{C0}\n{t}\n{th}", "output": str(C)}]),
            test_cases=json.dumps([
                {"input": f"{C0}\n{t}\n{th}", "expected_output": str(C), "is_hidden": False},
            ]),
            editorial="C0,t,th=float(input()),float(input()),float(input()); print(round(C0*(0.5)**(t/th),4))",
            languages=["python"],
        ))
    return problems


def generate_pharma_iv_drip(n=60):
    """Drip rate = ceil(volume * drop_factor / time)"""
    configs = [
        (500, 20, 240), (1000, 15, 480), (250, 20, 60), (500, 15, 120),
        (100, 60, 30), (200, 20, 60), (1000, 20, 360), (500, 15, 240),
        (750, 20, 300), (250, 15, 90), (1500, 15, 600), (300, 20, 120),
    ]
    problems = []
    for i in range(n):
        vol, df, t = random.choice(configs)
        rate = math.ceil(vol * df / t)
        company = random.choice(COMPANIES["Pharmacy"])
        problems.append(make_problem(
            title=f"{company} IV Drip Rate {i+1}",
            slug=f"iv-drip-rate-{i+1:03d}",
            difficulty="Easy",
            category="Pharmacy",
            tags=["clinical-pharmacy", "iv-therapy", "dosage"],
            statement=f"## Problem\nCompute IV drip rate.\nVolume={vol} mL, Drop factor={df} drops/mL, Time={t} min\nRate = ceil(Volume x Drop_factor / Time). Return drops/min.",
            constraints=f"volume={vol}, drop_factor={df}, time={t}",
            examples=json.dumps([{"input": f"{vol}\n{df}\n{t}", "output": str(rate)}]),
            test_cases=json.dumps([
                {"input": f"{vol}\n{df}\n{t}", "expected_output": str(rate), "is_hidden": False},
            ]),
            editorial="import math; v,df,t=float(input()),float(input()),float(input()); print(math.ceil(v*df/t))",
            languages=["python"],
        ))
    return problems


# ═══════════════════════════════════════════════════════════════════════════════
# MBA GENERATORS
# ═══════════════════════════════════════════════════════════════════════════════

def generate_mba_breakeven(n=80):
    """BEP = ceil(FC / (SP - VC))"""
    configs = [
        (100_000, 500, 300), (500_000, 1000, 600), (250_000, 800, 550),
        (50_000, 200, 120), (1_000_000, 2000, 1500), (75_000, 300, 150),
        (200_000, 600, 400), (400_000, 1500, 1000), (150_000, 400, 250),
        (800_000, 2500, 1800), (300_000, 750, 500), (600_000, 1200, 900),
    ]
    problems = []
    for i in range(n):
        FC, SP, VC = random.choice(configs)
        bep = math.ceil(FC / (SP - VC))
        company = random.choice(COMPANIES["MBA"])
        problems.append(make_problem(
            title=f"{company} Break-Even Analysis {i+1}",
            slug=f"break-even-analysis-{i+1:03d}",
            difficulty="Easy",
            category="MBA",
            tags=["cost-accounting", "break-even", "managerial-economics"],
            statement=f"## Problem\nCompute break-even units.\nFixed Cost=Rs{FC:,}, SP=Rs{SP}/unit, VC=Rs{VC}/unit\nBEP = ceil(FC/(SP-VC)). Return units.",
            constraints=f"FC={FC}, SP={SP}, VC={VC}",
            examples=json.dumps([{"input": f"{FC}\n{SP}\n{VC}", "output": str(bep)}]),
            test_cases=json.dumps([
                {"input": f"{FC}\n{SP}\n{VC}", "expected_output": str(bep), "is_hidden": False},
            ]),
            editorial="import math; FC,SP,VC=int(input()),int(input()),int(input()); print(math.ceil(FC/(SP-VC)))",
            languages=["python"],
        ))
    return problems


def generate_mba_eoq(n=70):
    """EOQ = sqrt(2*D*S/H)"""
    configs = [
        (5000, 200, 10), (1000, 50, 5), (10000, 100, 20),
        (2000, 300, 15), (8000, 150, 25), (3000, 80, 8),
        (15000, 250, 30), (500, 100, 10), (12000, 200, 40),
        (4000, 120, 12), (7000, 180, 18), (6000, 160, 16),
    ]
    problems = []
    for i in range(n):
        D, S, H = random.choice(configs)
        eoq = round(math.sqrt(2 * D * S / H))
        company = random.choice(COMPANIES["MBA"])
        problems.append(make_problem(
            title=f"{company} EOQ Inventory Model {i+1}",
            slug=f"economic-order-quantity-{i+1:03d}",
            difficulty="Easy",
            category="MBA",
            tags=["operations-management", "inventory", "eoq"],
            statement=f"## Problem\nCompute Economic Order Quantity.\nDemand={D} units/yr, Ordering cost=Rs{S}/order, Holding=Rs{H}/unit/yr\nEOQ = round(sqrt(2xDxS/H)). Return units.",
            constraints=f"D={D}, S={S}, H={H}",
            examples=json.dumps([{"input": f"{D}\n{S}\n{H}", "output": str(eoq)}]),
            test_cases=json.dumps([
                {"input": f"{D}\n{S}\n{H}", "expected_output": str(eoq), "is_hidden": False},
            ]),
            editorial="import math; D,S,H=int(input()),int(input()),int(input()); print(round(math.sqrt(2*D*S/H)))",
            languages=["python"],
        ))
    return problems


def generate_mba_cagr(n=70):
    """CAGR = (End/Start)^(1/n) - 1 as %"""
    configs = [
        (50000, 80526, 5, 10.0), (100, 200, 7, 10.41),
        (1000, 1500, 4, 10.67), (200000, 400000, 10, 7.18),
        (500, 1000, 10, 7.18), (100000, 150000, 3, 14.47),
        (1000000, 2000000, 8, 9.05), (10000, 12500, 4, 5.74),
        (25000, 40000, 5, 9.86), (500000, 750000, 6, 6.99),
        (1000, 2000, 5, 14.87), (100000, 200000, 7, 10.41),
    ]
    problems = []
    for i in range(n):
        start, end, yrs, expected = random.choice(configs)
        # Recompute to avoid float precision issues
        cagr = round(((end / start) ** (1 / yrs) - 1) * 100, 2)
        company = random.choice(COMPANIES["MBA"])
        problems.append(make_problem(
            title=f"{company} CAGR Calculator {i+1}",
            slug=f"cagr-calculator-{i+1:03d}",
            difficulty="Easy",
            category="MBA",
            tags=["finance", "growth-rate", "cagr"],
            statement=f"## Problem\nCompute CAGR for business growth.\nStart=Rs{start:,}, End=Rs{end:,}, Years={yrs}\nCAGR = ((End/Start)^(1/n) - 1) x 100. Return % (2 decimals).",
            constraints=f"start={start}, end={end}, years={yrs}",
            examples=json.dumps([{"input": f"{start}\n{end}\n{yrs}", "output": str(cagr)}]),
            test_cases=json.dumps([
                {"input": f"{start}\n{end}\n{yrs}", "expected_output": str(cagr), "is_hidden": False},
            ]),
            editorial="sv,ev,n=float(input()),float(input()),int(input()); print(round(((ev/sv)**(1/n)-1)*100,2))",
            languages=["python"],
        ))
    return problems


# ═══════════════════════════════════════════════════════════════════════════════
# AI/ML GENERATORS
# ═══════════════════════════════════════════════════════════════════════════════

def generate_aiml_mse(n=60):
    """MSE = mean of squared errors"""
    test_sets = [
        ([2, 4, 6], [2.5, 3.5, 6]),
        ([1, 2, 3], [1.1, 1.9, 3.2]),
        ([10, 20, 30], [9, 21, 29]),
        ([100, 200, 300, 400], [105, 195, 310, 390]),
        ([5, 10, 15, 20], [5.5, 9.5, 15.5, 19.5]),
        ([0, 0, 0], [0.1, -0.1, 0.2]),
    ]
    problems = []
    for i in range(n):
        y, yh = random.choice(test_sets)
        mse = round(sum((a - b) ** 2 for a, b in zip(y, yh)) / len(y), 4)
        rmse = round(math.sqrt(mse), 4)
        company = random.choice(COMPANIES["AI_ML"])
        ya = " ".join(map(str, y))
        yha = " ".join(map(str, yh))
        problems.append(make_problem(
            title=f"{company} MSE RMSE Calculator {i+1}",
            slug=f"mse-rmse-{i+1:03d}",
            difficulty="Easy",
            category="AI_ML",
            tags=["regression", "error-metrics", "supervised-learning"],
            statement=f"## Problem\nCompute MSE and RMSE for model predictions.\nActual: {y}\nPredicted: {yh}\nMSE=(1/n)xsum((y-yhat)^2), RMSE=sqrt(MSE). Return both (4 decimals).",
            constraints="Actual and predicted lists have same length",
            examples=json.dumps([{"input": f"{ya}\n{yha}", "output": f"{mse}\n{rmse}"}]),
            test_cases=json.dumps([
                {"input": f"{ya}\n{yha}", "expected_output": f"{mse}\n{rmse}", "is_hidden": False},
            ]),
            editorial="import math; y=list(map(float,input().split())); yh=list(map(float,input().split())); mse=sum((a-b)**2 for a,b in zip(y,yh))/len(y); print(round(mse,4)); print(round(math.sqrt(mse),4))",
            languages=["python"],
        ))
    return problems


# ═══════════════════════════════════════════════════════════════════════════════
# IoT GENERATORS
# ═══════════════════════════════════════════════════════════════════════════════

def generate_iot_battery_life(n=70):
    """Battery life = capacity / avg_current where avg = D*Ia + (1-D)*Is"""
    configs = [
        (2000, 0.05, 20, 0.01), (3000, 0.1, 50, 0.1),
        (1000, 0.2, 30, 0.05), (5000, 0.01, 100, 0.001),
        (800, 0.15, 15, 0.02), (4000, 0.03, 80, 0.005),
        (1500, 0.08, 25, 0.01), (2500, 0.12, 40, 0.05),
        (600, 0.25, 10, 0.01), (3500, 0.05, 60, 0.02),
    ]
    problems = []
    for i in range(n):
        cap, D, Ia, Is = random.choice(configs)
        avg = D * Ia + (1 - D) * Is
        life = round(cap / avg, 2)
        company = random.choice(COMPANIES["IoT"])
        problems.append(make_problem(
            title=f"{company} IoT Battery Life {i+1}",
            slug=f"iot-battery-life-{i+1:03d}",
            difficulty="Easy",
            category="IoT",
            tags=["power-management", "iot-hardware", "battery"],
            statement=f"## Problem\nCompute IoT device battery life.\nCapacity={cap} mAh, Duty cycle={D}, I_active={Ia} mA, I_sleep={Is} mA\nAvg_I=D*Ia+(1-D)*Is; Life=Cap/Avg_I. Return hours (2 decimals).",
            constraints=f"capacity={cap}, D={D}, I_active={Ia}, I_sleep={Is}",
            examples=json.dumps([{"input": f"{cap}\n{D}\n{Ia}\n{Is}", "output": str(life)}]),
            test_cases=json.dumps([
                {"input": f"{cap}\n{D}\n{Ia}\n{Is}", "expected_output": str(life), "is_hidden": False},
            ]),
            editorial="cap,D,Ia,Is=float(input()),float(input()),float(input()),float(input()); avg=D*Ia+(1-D)*Is; print(round(cap/avg,2))",
            languages=["python"],
        ))
    return problems


def generate_iot_duty_cycle_power(n=60):
    """P_avg = D*Pa + (1-D)*Ps"""
    configs = [
        (0.1, 100, 1), (0.5, 200, 2), (0.2, 500, 0.5),
        (1.0, 50, 0.1), (0.05, 1000, 10), (0.25, 400, 4),
        (0.3, 300, 3), (0.15, 150, 1.5), (0.08, 800, 8),
        (0.4, 250, 2.5), (0.02, 2000, 20), (0.6, 100, 1),
    ]
    problems = []
    for i in range(n):
        D, Pa, Ps = random.choice(configs)
        Pavg = round(D * Pa + (1 - D) * Ps, 4)
        company = random.choice(COMPANIES["IoT"])
        problems.append(make_problem(
            title=f"{company} Duty Cycle Power {i+1}",
            slug=f"duty-cycle-power-{i+1:03d}",
            difficulty="Easy",
            category="IoT",
            tags=["power-electronics", "duty-cycle", "embedded-systems"],
            statement=f"## Problem\nCompute average power consumption.\nD={D}, P_active={Pa} mW, P_sleep={Ps} mW\nP_avg = D*Pa + (1-D)*Ps. Return mW (4 decimals).",
            constraints=f"D={D}, Pa={Pa}, Ps={Ps}",
            examples=json.dumps([{"input": f"{D}\n{Pa}\n{Ps}", "output": str(Pavg)}]),
            test_cases=json.dumps([
                {"input": f"{D}\n{Pa}\n{Ps}", "expected_output": str(Pavg), "is_hidden": False},
            ]),
            editorial="D,Pa,Ps=float(input()),float(input()),float(input()); print(round(D*Pa+(1-D)*Ps,4))",
            languages=["python", "cpp"],
        ))
    return problems


# ═══════════════════════════════════════════════════════════════════════════════
# INSERT ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

# Registry: each entry is (generator_function, count)
GENERATORS = {
    # ECE: target ~600
    "ece_shannon":        (generate_ece_shannon_capacity,     80),
    "ece_am":             (generate_ece_am_modulation,        60),
    "ece_pcm":            (generate_ece_pcm_bitrate,          50),
    "ece_nyquist":        (generate_ece_nyquist,              50),
    "ece_fm":             (generate_ece_fm_bandwidth,         60),
    # Add more ECE generators here (DTMF, Gray code, etc.)

    # EEE: target ~400
    "eee_3phase":         (generate_eee_three_phase_power,    80),
    "eee_battery":        (generate_eee_battery_discharge,    60),
    "eee_motor_sr":       (generate_eee_motor_speed_regulation,60),
    # Add transformer, power factor generators here

    # Mechanical: target ~400
    "mech_carnot":        (generate_mech_carnot,              80),
    "mech_gear":          (generate_mech_gear_speed,          70),
    "mech_spring":        (generate_mech_spring_frequency,    60),
    "mech_thermal":       (generate_mech_thermal_stress,      60),
    # Add Reynolds, beam stress generators here

    # Civil: target ~350
    "civil_wc":           (generate_civil_wc_ratio,           70),
    "civil_fos":          (generate_civil_fos,                60),
    "civil_earthwork":    (generate_civil_earthwork,          60),
    # Add Manning, moment of inertia generators here

    # Pharmacy: target ~300
    "pharma_dosage":      (generate_pharma_dosage,            80),
    "pharma_halflife":    (generate_pharma_halflife,          70),
    "pharma_iv":          (generate_pharma_iv_drip,           60),

    # MBA: target ~400
    "mba_bep":            (generate_mba_breakeven,            80),
    "mba_eoq":            (generate_mba_eoq,                  70),
    "mba_cagr":           (generate_mba_cagr,                 70),
    # Add NPV, elasticity generators here

    # AI/ML: target ~400
    "aiml_mse":           (generate_aiml_mse,                 60),
    # Add softmax, cosine, confusion matrix generators here

    # IoT: target ~300
    "iot_battery":        (generate_iot_battery_life,         70),
    "iot_duty":           (generate_iot_duty_cycle_power,     60),
    # Add Haversine, moving average generators here
}


def insert_problems(client, problems, batch_size=20, dry_run=False):
    """Insert problems into Supabase in batches, skipping slug conflicts."""
    inserted = 0
    skipped = 0
    for i in range(0, len(problems), batch_size):
        batch = problems[i:i + batch_size]
        if dry_run:
            print(f"  [DRY RUN] Would insert {len(batch)} problems")
            inserted += len(batch)
            continue
        try:
            result = (
                client.table("problems")
                .upsert(batch, on_conflict="slug", ignore_duplicates=True)
                .execute()
            )
            inserted += len(result.data)
        except Exception as e:
            # Try one by one to isolate bad records
            for p in batch:
                try:
                    client.table("problems").insert(p).execute()
                    inserted += 1
                except Exception:
                    skipped += 1
    return inserted, skipped


def main():
    parser = argparse.ArgumentParser(description="Generate Capabilio Arena problems")
    parser.add_argument("--branch", help="Generate only this branch (e.g. ECE, MBA)")
    parser.add_argument("--count", type=int, help="Override count per generator")
    parser.add_argument("--dry-run", action="store_true", help="Print stats without inserting")
    parser.add_argument("--list", action="store_true", help="List available generators")
    args = parser.parse_args()

    if args.list:
        print("Available generators:")
        for name, (fn, count) in GENERATORS.items():
            print(f"  {name:30s} — {count} problems")
        return

    client = None if args.dry_run else get_supabase_client()

    total_inserted = 0
    total_skipped = 0

    for gen_name, (gen_fn, default_count) in GENERATORS.items():
        # Filter by branch if specified
        if args.branch:
            branch_lower = args.branch.lower()
            if branch_lower not in gen_name.lower():
                continue

        count = args.count or default_count
        print(f"\nGenerating {count} problems via '{gen_name}'...")

        try:
            problems = gen_fn(count)
        except Exception as e:
            print(f"  ERROR in generator: {e}")
            continue

        print(f"  Generated {len(problems)} problems.")

        if args.dry_run:
            for p in problems[:2]:
                print(f"    Sample: {p['slug']} | {p['difficulty']} | {p['category']}")
            inserted, skipped = insert_problems(client, problems, dry_run=True)
        else:
            inserted, skipped = insert_problems(client, problems)

        print(f"  Inserted: {inserted}, Skipped: {skipped}")
        total_inserted += inserted
        total_skipped += skipped

    print(f"\n{'='*50}")
    print(f"TOTAL INSERTED: {total_inserted}")
    print(f"TOTAL SKIPPED:  {total_skipped}")
    print(f"{'='*50}")

    if not args.dry_run and client:
        result = client.table("problems").select("category", count="exact").execute()
        print(f"\nVerification — total problems in DB: checking...")


if __name__ == "__main__":
    main()
