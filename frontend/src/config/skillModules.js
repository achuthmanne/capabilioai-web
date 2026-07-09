/**
 * skillModules.js — W3Schools-style learning module content for ALL domains.
 *
 * Product vision: give students with 0 domain knowledge a 20–30% head-start
 * before they enter corporate life. Content is simple, practical, jargon-free.
 *
 * Each entry:
 *   concept   — 2-3 sentences: what it is and why it matters
 *   keyPoints — 3–4 bullet points the student must understand
 *   tryThis   — one tiny hands-on exercise doable in < 5 minutes
 *   resources — free links: YouTube shorts, official docs, articles
 */

// ─── Resource type tags ───────────────────────────────────────────────────────
// "video" | "docs" | "article" | "interactive"

export const SKILL_MODULES = {

  // ═══════════════════════════════════════════════════════════════════════════
  // IT / CS SKILLS
  // ═══════════════════════════════════════════════════════════════════════════

  "SQL Basics": {
    concept: "SQL (Structured Query Language) is how you talk to a database. Every company stores data in tables — SQL lets you search, filter, and summarise that data in seconds. It is the #1 skill data analysts use every single day.",
    keyPoints: [
      "SELECT retrieves rows; FROM says which table; WHERE filters them",
      "JOIN connects two tables on a matching column (like customer_id)",
      "GROUP BY + COUNT/SUM turns rows into summaries (sales per region)",
      "ORDER BY sorts results; LIMIT caps how many rows you see",
    ],
    tryThis: "Open https://sqliteonline.com, paste: SELECT name, salary FROM employees WHERE salary > 50000 ORDER BY salary DESC LIMIT 5; — change the number and see what changes.",
    resources: [
      { title: "W3Schools SQL Tutorial", url: "https://www.w3schools.com/sql/", type: "interactive" },
      { title: "YouTube: SQL in 60 minutes — Web Dev Simplified", url: "https://www.youtube.com/watch?v=p3qvj9hO_Bo", type: "video" },
      { title: "Mode SQL Tutorial (free, hands-on)", url: "https://mode.com/sql-tutorial/", type: "interactive" },
    ],
  },

  "Python (pandas)": {
    concept: "Pandas is Python's go-to library for working with tables of data — like Excel but in code. You load a CSV, clean it, filter rows, compute averages, and export results — all in a few lines. Every data role uses it.",
    keyPoints: [
      "df = pd.read_csv('file.csv') loads a file into a DataFrame",
      "df['column'] selects a column; df[df['age'] > 25] filters rows",
      "df.groupby('city')['sales'].sum() groups and aggregates",
      "df.isnull().sum() finds missing values — always check this first",
    ],
    tryThis: "Run in Python: import pandas as pd; df = pd.DataFrame({'name':['Alice','Bob'],'score':[85,62]}); print(df[df['score']>70])",
    resources: [
      { title: "Pandas Getting Started (official docs)", url: "https://pandas.pydata.org/docs/getting_started/intro_tutorials/", type: "docs" },
      { title: "YouTube: Pandas for Beginners — Corey Schafer", url: "https://www.youtube.com/watch?v=vmEHCJofslg", type: "video" },
      { title: "W3Schools Python Pandas", url: "https://www.w3schools.com/python/pandas/default.asp", type: "interactive" },
    ],
  },

  "Data Cleaning": {
    concept: "Real data is messy — missing values, typos, wrong formats, duplicate rows. Data cleaning fixes all of this before analysis. Garbage in = garbage out: if your data is dirty, your conclusions will be wrong.",
    keyPoints: [
      "Check for nulls with df.isnull().sum() and decide: drop or fill?",
      "Remove duplicates with df.drop_duplicates()",
      "Fix data types: df['date'] = pd.to_datetime(df['date'])",
      "Standardise strings: df['city'].str.strip().str.lower()",
    ],
    tryThis: "Create a small DataFrame with one None value, one duplicate row. Use dropna() and drop_duplicates() to clean it.",
    resources: [
      { title: "YouTube: Data Cleaning with Pandas", url: "https://www.youtube.com/watch?v=bDhvCp3_lYw", type: "video" },
      { title: "Kaggle: Data Cleaning Course (free)", url: "https://www.kaggle.com/learn/data-cleaning", type: "interactive" },
    ],
  },

  "Python Basics": {
    concept: "Python is a beginner-friendly language used in data science, automation, web development, and AI. Its readable syntax means less time fighting the language and more time solving the actual problem.",
    keyPoints: [
      "Variables: x = 5; name = 'Alice' — no type declarations needed",
      "Lists: my_list = [1, 2, 3]; loops: for item in my_list: print(item)",
      "Functions: def greet(name): return f'Hello {name}'",
      "If/else: if score >= 60: print('Pass') else: print('Fail')",
    ],
    tryThis: "Write a function that takes a list of numbers and returns only those above 50.",
    resources: [
      { title: "W3Schools Python Tutorial", url: "https://www.w3schools.com/python/", type: "interactive" },
      { title: "YouTube: Python for Beginners — Programming with Mosh", url: "https://www.youtube.com/watch?v=_uQrJ0TkZlc", type: "video" },
    ],
  },

  "HTML5 & CSS3": {
    concept: "HTML is the structure of every web page — headings, paragraphs, buttons. CSS makes it look good — colours, fonts, spacing, layout. Together they are the foundation of all frontend work.",
    keyPoints: [
      "HTML tags: <h1> heading, <p> paragraph, <div> container, <button> button",
      "CSS selectors: .class, #id, element — they target what to style",
      "Box model: margin (outside) → border → padding → content",
      "Flexbox: display:flex on a parent lets children line up side-by-side",
    ],
    tryThis: "Open browser console → Elements tab. Find a button on any website and change its background-color in the Styles panel.",
    resources: [
      { title: "W3Schools HTML & CSS", url: "https://www.w3schools.com/html/", type: "interactive" },
      { title: "YouTube: HTML & CSS Full Course — Dave Gray", url: "https://www.youtube.com/watch?v=mU6anWqZJcc", type: "video" },
      { title: "CSS Tricks Flexbox Guide", url: "https://css-tricks.com/snippets/css/a-guide-to-flexbox/", type: "article" },
    ],
  },

  "JavaScript (ES6)": {
    concept: "JavaScript makes web pages interactive — it handles button clicks, fetches data from APIs, and updates content without reloading the page. ES6 brought cleaner syntax: arrow functions, let/const, template literals.",
    keyPoints: [
      "const greet = (name) => `Hello ${name}` — arrow function + template literal",
      "fetch('url').then(r => r.json()).then(data => console.log(data)) — API call",
      "document.getElementById('id').textContent = 'Hello' — update the DOM",
      "Array methods: .map(), .filter(), .find() — avoid loops in most cases",
    ],
    tryThis: "In browser console type: [1,2,3,4,5].filter(n => n % 2 === 0) — see even numbers returned.",
    resources: [
      { title: "W3Schools JavaScript", url: "https://www.w3schools.com/js/", type: "interactive" },
      { title: "JavaScript.info — The Modern JavaScript Tutorial", url: "https://javascript.info/", type: "article" },
      { title: "YouTube: JavaScript in 100 seconds — Fireship", url: "https://www.youtube.com/watch?v=DHjqpvDnNGE", type: "video" },
    ],
  },

  "React Basics": {
    concept: "React is a JavaScript library for building user interfaces out of reusable components. A component is just a function that returns HTML-like JSX. React updates only the parts of the page that change, making it fast.",
    keyPoints: [
      "Component: function Button() { return <button>Click me</button> }",
      "Props: data passed INTO a component — like function arguments",
      "State: useState(0) — data that changes over time and re-renders the UI",
      "useEffect: runs code when the component loads or when data changes",
    ],
    tryThis: "Create a counter: const [count, setCount] = useState(0); return <button onClick={() => setCount(count+1)}>{count}</button>",
    resources: [
      { title: "React Official Docs (new — great for beginners)", url: "https://react.dev/learn", type: "docs" },
      { title: "YouTube: React in 100 seconds — Fireship", url: "https://www.youtube.com/watch?v=Tn6-PIqc4UM", type: "video" },
      { title: "W3Schools React", url: "https://www.w3schools.com/react/", type: "interactive" },
    ],
  },

  "REST API Basics": {
    concept: "A REST API is how two programs talk over the internet. The frontend (your browser) sends an HTTP request to a server, and the server replies with JSON data. Every app — weather, maps, payments — uses APIs.",
    keyPoints: [
      "GET retrieves data; POST creates data; PUT updates; DELETE removes",
      "Endpoints are URLs: GET /users returns all users, GET /users/5 returns user 5",
      "Response codes: 200 OK, 201 Created, 404 Not Found, 500 Server Error",
      "JSON is the data format: { \"name\": \"Alice\", \"age\": 25 }",
    ],
    tryThis: "Open browser console and run: fetch('https://jsonplaceholder.typicode.com/users/1').then(r=>r.json()).then(console.log)",
    resources: [
      { title: "REST API concepts in 5 minutes — YouTube", url: "https://www.youtube.com/watch?v=SLwpqD8n3d0", type: "video" },
      { title: "W3Schools JSON Tutorial", url: "https://www.w3schools.com/js/js_json_intro.asp", type: "interactive" },
      { title: "Postman Learning Center", url: "https://learning.postman.com/docs/getting-started/introduction/", type: "docs" },
    ],
  },

  "Git & GitHub": {
    concept: "Git tracks every change you make to your code, so you can go back to any previous version. GitHub stores your code online and lets you collaborate. Every company uses Git — it is not optional.",
    keyPoints: [
      "git init → git add . → git commit -m 'message' → git push",
      "Branches: git checkout -b feature/login to work without breaking main",
      "git pull gets the latest code from your teammates",
      "git log shows the history of all commits",
    ],
    tryThis: "Create a folder, run git init, create a file, add and commit it. See the commit in git log.",
    resources: [
      { title: "GitHub's own beginner guide", url: "https://docs.github.com/en/get-started/quickstart", type: "docs" },
      { title: "YouTube: Git in 100 seconds — Fireship", url: "https://www.youtube.com/watch?v=hwP7WQkmECE", type: "video" },
      { title: "W3Schools Git Tutorial", url: "https://www.w3schools.com/git/", type: "interactive" },
    ],
  },

  "Version Control (Git)": {
    concept: "Git tracks every change you make to your code, so you can go back to any previous version. GitHub stores your code online and lets you collaborate. Every company uses Git — it is not optional.",
    keyPoints: [
      "git init → git add . → git commit -m 'message' → git push",
      "Branches: git checkout -b feature/login to work without breaking main",
      "git pull gets the latest code from your teammates",
      "git log shows the history of all commits",
    ],
    tryThis: "Create a folder, run git init, create a file, add and commit it. See the commit in git log.",
    resources: [
      { title: "GitHub's own beginner guide", url: "https://docs.github.com/en/get-started/quickstart", type: "docs" },
      { title: "YouTube: Git in 100 seconds — Fireship", url: "https://www.youtube.com/watch?v=hwP7WQkmECE", type: "video" },
    ],
  },

  "Docker Basics": {
    concept: "Docker packages your app and everything it needs (libraries, settings) into a container. This means your app runs the same way on your laptop, your teammate's laptop, and the production server. No more 'it works on my machine'.",
    keyPoints: [
      "Image = the blueprint; Container = a running instance of that image",
      "Dockerfile defines how to build the image: FROM, RUN, COPY, CMD",
      "docker build -t myapp . builds; docker run -p 3000:3000 myapp runs it",
      "docker-compose.yml runs multiple containers together (app + database)",
    ],
    tryThis: "Install Docker Desktop. Run: docker run hello-world — it downloads and runs a test container.",
    resources: [
      { title: "Docker official Get Started guide", url: "https://docs.docker.com/get-started/", type: "docs" },
      { title: "YouTube: Docker in 100 seconds — Fireship", url: "https://www.youtube.com/watch?v=Gjnup-PuquQ", type: "video" },
    ],
  },

  "Linux Command Line": {
    concept: "Most servers run Linux. As a developer or DevOps engineer, you connect to them via terminal and navigate entirely with commands — no mouse, no GUI. This is a day-1 skill for any backend/DevOps/cloud role.",
    keyPoints: [
      "ls (list files), cd (change directory), pwd (where am I?)",
      "cat file.txt (read file), nano file.txt (edit file)",
      "grep 'error' logs.txt searches for text inside a file",
      "chmod +x script.sh makes a file executable; sudo runs as admin",
    ],
    tryThis: "Open Terminal. Type: ls -la to see hidden files. cd into a folder, then pwd to print where you are.",
    resources: [
      { title: "YouTube: Linux Command Line for Beginners — NetworkChuck", url: "https://www.youtube.com/watch?v=ZtqBQ68cfJc", type: "video" },
      { title: "W3Schools Linux Tutorial", url: "https://www.w3schools.com/bash/", type: "interactive" },
      { title: "The Linux Command Line (free book)", url: "https://linuxcommand.org/tlcl.php", type: "article" },
    ],
  },

  "Networking Fundamentals (TCP/IP)": {
    concept: "Every computer on the internet communicates using TCP/IP. Understanding how data travels from your browser to a server — through IP addresses, ports, and protocols — is essential for web development, security, and DevOps.",
    keyPoints: [
      "IP address = unique address of every device (e.g. 192.168.1.1)",
      "Port = channel within a device (80 for HTTP, 443 for HTTPS, 22 for SSH)",
      "TCP ensures data arrives completely and in order; UDP is faster but lossy",
      "DNS translates google.com into an IP address your computer can reach",
    ],
    tryThis: "Open Terminal and run: ping google.com — watch the round-trip times. Then: nslookup google.com to see the IP.",
    resources: [
      { title: "YouTube: Computer Networking in 100 seconds — Fireship", url: "https://www.youtube.com/watch?v=keeqnciDVOo", type: "video" },
      { title: "Cloudflare: How the Internet Works", url: "https://www.cloudflare.com/learning/network-layer/how-does-the-internet-work/", type: "article" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ECE — EMBEDDED ENGINEER SKILLS
  // ═══════════════════════════════════════════════════════════════════════════

  "Embedded C Programming": {
    concept: "Embedded C is C programming adapted for microcontrollers — tiny computers with limited RAM (few KB) and no operating system. You control hardware directly by writing values to registers. Every IoT device, home appliance, and car ECU runs embedded C.",
    keyPoints: [
      "volatile uint32_t *reg = (uint32_t *)0x40020000; — reading/writing hardware registers",
      "No malloc in bare-metal: you manage memory manually with fixed buffers",
      "#define GPIOA_ODR (*(volatile uint32_t *)0x40020014) — register macro pattern",
      "Bit operations: reg |= (1<<5) sets bit 5; reg &= ~(1<<5) clears it",
    ],
    tryThis: "Write a function that sets bit 3 of a 32-bit integer without changing other bits. Use: value |= (1 << 3);",
    resources: [
      { title: "YouTube: Embedded C for Beginners — Fastbit Embedded Brain Academy", url: "https://www.youtube.com/watch?v=qMUzLU636s8", type: "video" },
      { title: "Barr Group: Embedded C Coding Standard (free PDF)", url: "https://barrgroup.com/embedded-systems/books/embedded-c-coding-standard", type: "docs" },
      { title: "W3Schools C Tutorial (language fundamentals)", url: "https://www.w3schools.com/c/", type: "interactive" },
    ],
  },

  "GPIO & Register Control": {
    concept: "GPIO (General Purpose Input/Output) pins let a microcontroller talk to the physical world — turn on an LED, read a button press, or communicate with a sensor. Controlling them requires writing to specific hardware registers.",
    keyPoints: [
      "Enable the GPIO clock first: RCC->AHB1ENR |= RCC_AHB1ENR_GPIOAEN",
      "Set pin direction: GPIOA->MODER |= (1 << (pin*2)) for output mode",
      "Set pin HIGH: GPIOA->ODR |= (1 << pin); clear it: GPIOA->ODR &= ~(1<<pin)",
      "Read input: if (GPIOA->IDR & (1 << pin)) — bit is 1 means pin is HIGH",
    ],
    tryThis: "On paper: write the sequence of register writes needed to blink an LED on PA5 (STM32). Steps: enable clock → set MODER → toggle ODR.",
    resources: [
      { title: "YouTube: STM32 GPIO Tutorial — Controllerstech", url: "https://www.youtube.com/watch?v=fnMHAyP33mI", type: "video" },
      { title: "STM32 Reference Manual RM0090 (GPIO section)", url: "https://www.st.com/resource/en/reference_manual/rm0090-stm32f405415-stm32f407417-stm32f427437-and-stm32f429439-advanced-armbased-32bit-mcus-stmicroelectronics.pdf", type: "docs" },
    ],
  },

  "UART / SPI / I2C Protocols": {
    concept: "These are the three most common serial protocols used between a microcontroller and peripherals (sensors, displays, other chips). UART is simplest (2 wires), SPI is fastest (4 wires), I2C allows many devices on 2 wires.",
    keyPoints: [
      "UART: TX pin sends, RX pin receives, baud rate must match both ends (e.g. 115200)",
      "SPI: MOSI (master out), MISO (master in), SCK (clock), CS (chip select)",
      "I2C: SDA (data) + SCL (clock), every device has a unique 7-bit address",
      "BRR register sets baud rate: BRR = APB_clock / baud_rate",
    ],
    tryThis: "Calculate BRR for UART at 9600 baud if APB1 clock is 36 MHz. Answer: 36,000,000 / 9600 = 3750.",
    resources: [
      { title: "YouTube: UART vs SPI vs I2C — Simply Explained", url: "https://www.youtube.com/watch?v=IyGwvGzrqp8", type: "video" },
      { title: "SparkFun: Serial Communication", url: "https://learn.sparkfun.com/tutorials/serial-communication", type: "article" },
      { title: "I2C Basics — NXP Application Note AN10216", url: "https://www.nxp.com/docs/en/application-note/AN10216.pdf", type: "docs" },
    ],
  },

  "UART / SPI / I2C": {
    concept: "These are the three most common serial protocols used between a microcontroller and peripherals (sensors, displays, other chips). UART is simplest (2 wires), SPI is fastest (4 wires), I2C allows many devices on 2 wires.",
    keyPoints: [
      "UART: TX pin sends, RX pin receives, baud rate must match both ends",
      "SPI: MOSI, MISO, SCK, CS — full-duplex, clock-synchronised",
      "I2C: SDA + SCL, every device has a unique 7-bit address, open-drain bus",
      "BRR = APB_clock / baud_rate — the key formula for UART configuration",
    ],
    tryThis: "Calculate BRR for UART at 115200 baud if APB clock is 36 MHz. Answer: 36,000,000 / 115200 ≈ 312.",
    resources: [
      { title: "YouTube: UART vs SPI vs I2C — Simply Explained", url: "https://www.youtube.com/watch?v=IyGwvGzrqp8", type: "video" },
      { title: "SparkFun: Serial Communication Guide", url: "https://learn.sparkfun.com/tutorials/serial-communication", type: "article" },
    ],
  },

  "Interrupt Handling": {
    concept: "An interrupt tells the CPU to stop what it is doing and handle an urgent event (button press, timer overflow, received data). Without interrupts you would have to constantly poll in a loop, wasting CPU time.",
    keyPoints: [
      "ISR (Interrupt Service Routine) is the function that runs when the interrupt fires",
      "NVIC (Nested Vector Interrupt Controller) enables/prioritises interrupts in ARM Cortex-M",
      "Keep ISRs short — set a flag, handle the work in main loop",
      "volatile keyword required for variables shared between ISR and main code",
    ],
    tryThis: "On paper: describe what happens step-by-step when a UART byte arrives and triggers an interrupt. Draw: main loop → interrupt fires → ISR runs → returns.",
    resources: [
      { title: "YouTube: Interrupts in Embedded Systems — ControllersTech", url: "https://www.youtube.com/watch?v=_HOyqpLN9aE", type: "video" },
      { title: "ARM Cortex-M NVIC documentation", url: "https://developer.arm.com/documentation/ddi0337/e/nested-vectored-interrupt-controller", type: "docs" },
    ],
  },

  "Digital Logic (Gates, Flip-Flops)": {
    concept: "All digital electronics — CPUs, memory, microcontrollers — are built from logic gates (AND, OR, NOT, NAND, XOR). Flip-flops are memory elements that store a single bit. Understanding these is the foundation of digital hardware.",
    keyPoints: [
      "AND: output is 1 only when ALL inputs are 1",
      "OR: output is 1 when ANY input is 1; NOT: inverts the input",
      "NAND/NOR are universal gates — you can build any circuit from only NANDs",
      "D flip-flop stores 1 bit; on the clock edge, output Q copies input D",
    ],
    tryThis: "Draw a truth table for: output = A AND (NOT B). Fill in all 4 combinations of A,B.",
    resources: [
      { title: "YouTube: Logic Gates — Ben Eater", url: "https://www.youtube.com/watch?v=gI-qXk7XojA", type: "video" },
      { title: "W3Schools Logic Gates", url: "https://www.w3schools.com/cs/cs_logic_gates.php", type: "interactive" },
      { title: "Nand2Tetris — Build a computer from gates (free)", url: "https://www.nand2tetris.org/", type: "interactive" },
    ],
  },

  "Bit Manipulation": {
    concept: "In embedded systems you often control individual bits within a hardware register — not the whole byte. Bit manipulation lets you set, clear, toggle, or read a single bit without disturbing the others.",
    keyPoints: [
      "Set bit N: value |= (1 << N)",
      "Clear bit N: value &= ~(1 << N)",
      "Toggle bit N: value ^= (1 << N)",
      "Check bit N: if (value & (1 << N)) — true if that bit is set",
    ],
    tryThis: "Start with value = 0b00001010. Set bit 0. Clear bit 3. What is the result in binary and hex?",
    resources: [
      { title: "YouTube: Bit Manipulation — CS Dojo", url: "https://www.youtube.com/watch?v=NLKQEOgBAnw", type: "video" },
      { title: "Embedded Artistry: Practical Bit Manipulation", url: "https://embeddedartistry.com/blog/2017/07/05/demystifying-bitwise-operations/", type: "article" },
    ],
  },

  "RTOS Fundamentals": {
    concept: "An RTOS (Real-Time Operating System) like FreeRTOS lets you run multiple tasks on a microcontroller at once. One task blinks an LED, another reads a sensor, another sends data over UART — the RTOS scheduler switches between them rapidly.",
    keyPoints: [
      "Task = a function that runs independently; xTaskCreate() registers it",
      "Scheduler switches tasks every few milliseconds (context switch)",
      "Semaphore/mutex protects shared resources between tasks",
      "vTaskDelay(pdMS_TO_TICKS(500)) waits 500ms without blocking the CPU",
    ],
    tryThis: "Read the FreeRTOS blink demo. Find xTaskCreate() and identify: task function, name, stack size, priority.",
    resources: [
      { title: "FreeRTOS Getting Started Guide", url: "https://www.freertos.org/FreeRTOS-quick-start-guide.html", type: "docs" },
      { title: "YouTube: FreeRTOS Explained — DigiKey", url: "https://www.youtube.com/watch?v=F321087yYy4", type: "video" },
    ],
  },

  "Reading Datasheets": {
    concept: "A datasheet is the manufacturer's complete reference for a chip — pin functions, electrical limits, timing diagrams, register maps. As an embedded engineer you will read datasheets every day. Learning to navigate them quickly is critical.",
    keyPoints: [
      "Check the Block Diagram first — understand what's inside the chip",
      "Electrical Characteristics: max voltage, current — violating these destroys hardware",
      "Register Map section: the table of addresses and bit fields you'll write in code",
      "Timing diagrams show the exact sequence/duration of signals",
    ],
    tryThis: "Download the STM32F103 datasheet from st.com. Find: the GPIO base address and the GPIOA_ODR register offset.",
    resources: [
      { title: "YouTube: How to Read a Datasheet — Phil's Lab", url: "https://www.youtube.com/watch?v=V1tzK0V5k_8", type: "video" },
      { title: "Sparkfun: How to Read a Schematic", url: "https://learn.sparkfun.com/tutorials/how-to-read-a-schematic", type: "article" },
    ],
  },

  "Basic Sensor Interfacing": {
    concept: "Sensors convert physical quantities (temperature, distance, light) into electrical signals that a microcontroller can read. You interface sensors by reading analog voltages (ADC) or digital serial data (I2C/SPI).",
    keyPoints: [
      "Analog sensors: voltage proportional to measurement → read with ADC",
      "DHT11/DHT22: temperature + humidity sensor with 1-wire digital protocol",
      "HC-SR04 ultrasonic: pulse width of echo pin = distance (cm = time × 0.034/2)",
      "Always check VCC, GND, and signal connections from datasheet first",
    ],
    tryThis: "Look up DHT11 datasheet. Find: supply voltage range, output pin timing, data format for temperature reading.",
    resources: [
      { title: "YouTube: Arduino Sensor tutorials — Paul McWhorter", url: "https://www.youtube.com/watch?v=z8mzMIrMbQE", type: "video" },
      { title: "SparkFun Sensor Guide", url: "https://learn.sparkfun.com/tutorials/sensor-types", type: "article" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ECE — VLSI / DIGITAL DESIGN
  // ═══════════════════════════════════════════════════════════════════════════

  "Verilog Basics": {
    concept: "Verilog is a Hardware Description Language (HDL) — you use it to describe digital circuits, not to write software. When you write Verilog, you are designing hardware that will be synthesised onto an FPGA or into an ASIC chip.",
    keyPoints: [
      "module defines a hardware block with inputs and outputs",
      "assign (combinational) vs always @(posedge clk) (sequential/registered)",
      "reg stores state; wire connects things (like a physical wire)",
      "Simulation: you write a testbench to test your module before fabricating",
    ],
    tryThis: "Write a 2-input AND gate: module and_gate(input a, b, output y); assign y = a & b; endmodule",
    resources: [
      { title: "YouTube: Verilog Tutorial for Beginners — Neso Academy", url: "https://www.youtube.com/watch?v=PJGvZSlsLKs", type: "video" },
      { title: "HDLBits — Free Verilog practice exercises", url: "https://hdlbits.01xz.net/wiki/Main_Page", type: "interactive" },
      { title: "Asic-World Verilog Tutorial", url: "https://www.asic-world.com/verilog/veritut.html", type: "article" },
    ],
  },

  "Digital Logic Design": {
    concept: "Digital logic design is the art of building circuits that process binary (0/1) data. It is how CPUs, memory controllers, and all digital chips are created. Combinational circuits compute outputs instantly; sequential circuits have memory (registers).",
    keyPoints: [
      "Combinational: output depends only on current inputs (adder, mux, decoder)",
      "Sequential: output depends on inputs AND past state (counter, register)",
      "Karnaugh Map (K-map) simplifies Boolean expressions into minimal gates",
      "Finite State Machine (FSM): Moore (output from state) vs Mealy (output from state+input)",
    ],
    tryThis: "Design a 2-bit binary counter truth table: what are the next-state values for each current state?",
    resources: [
      { title: "YouTube: Digital Logic Design — Neso Academy", url: "https://www.youtube.com/watch?v=M0mx8S05v60", type: "video" },
      { title: "Nand2Tetris (free course — build a CPU)", url: "https://www.nand2tetris.org/", type: "interactive" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ECE — ANALOG / HARDWARE
  // ═══════════════════════════════════════════════════════════════════════════

  "Ohm's Law": {
    concept: "Ohm's Law (V = IR) is the fundamental relationship between voltage, current, and resistance in a circuit. Everything in electronics — from LEDs to motors to amplifiers — can be analysed starting from this single equation.",
    keyPoints: [
      "V = IR: Voltage (V) = Current (A) × Resistance (Ω)",
      "Power: P = VI = I²R = V²/R — tells you how hot a component gets",
      "Kirchhoff's Voltage Law: voltages around a loop sum to zero",
      "Kirchhoff's Current Law: currents entering a node = currents leaving",
    ],
    tryThis: "A 5V supply drives current through a 470Ω resistor to an LED. What is the current? (Answer: ~10.6 mA — safe for most LEDs)",
    resources: [
      { title: "YouTube: Ohm's Law — ElectroBOOM", url: "https://www.youtube.com/watch?v=_-jX3dezzMg", type: "video" },
      { title: "Khan Academy: Electric Circuits", url: "https://www.khanacademy.org/science/physics/circuits-topic", type: "interactive" },
      { title: "All About Circuits — DC Circuit Theory", url: "https://www.allaboutcircuits.com/textbook/direct-current/", type: "article" },
    ],
  },

  "Circuit Reading (Schematics)": {
    concept: "A schematic is the wiring diagram for an electronic circuit. You need to read schematics to understand PCB designs, fix hardware bugs, or connect components correctly. Every hardware engineer reads schematics daily.",
    keyPoints: [
      "Resistor: zig-zag line; Capacitor: two parallel lines; Inductor: loops",
      "VCC/VDD = power supply rail; GND = ground (return path for current)",
      "A net name (e.g. UART_TX) on two separate lines means they are connected",
      "Pull-up resistor: connects signal to VCC; ensures default HIGH when floating",
    ],
    tryThis: "Find the schematic for Arduino Uno online. Locate: the LED pin (D13), its series resistor, and ground connection.",
    resources: [
      { title: "SparkFun: How to Read a Schematic", url: "https://learn.sparkfun.com/tutorials/how-to-read-a-schematic", type: "article" },
      { title: "YouTube: Reading Schematics — GreatScott!", url: "https://www.youtube.com/watch?v=9cps7Q_IrX0", type: "video" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // IoT SKILLS
  // ═══════════════════════════════════════════════════════════════════════════

  "MQTT Protocol": {
    concept: "MQTT is a lightweight publish-subscribe messaging protocol designed for IoT devices with limited bandwidth and power. A device publishes data to a topic; any other device subscribed to that topic receives it. It runs on top of TCP/IP.",
    keyPoints: [
      "Broker (e.g. Mosquitto) is the server that routes messages between devices",
      "Client publishes: mosquitto_pub -t 'home/temp' -m '24.5'",
      "Client subscribes: mosquitto_sub -t 'home/temp' — receives all messages on that topic",
      "QoS 0 = fire and forget; QoS 1 = at least once; QoS 2 = exactly once",
    ],
    tryThis: "Install Mosquitto on your computer. Open two terminals: subscribe in one, publish in the other. See the message appear.",
    resources: [
      { title: "YouTube: MQTT Explained — Simply Explained", url: "https://www.youtube.com/watch?v=EIxdz-2rhLs", type: "video" },
      { title: "HiveMQ MQTT Essentials (free guide)", url: "https://www.hivemq.com/mqtt-essentials/", type: "article" },
    ],
  },

  "Arduino & Raspberry Pi": {
    concept: "Arduino is a microcontroller board — great for controlling hardware (LEDs, motors, sensors) with simple C code. Raspberry Pi is a full Linux computer — great for heavier processing, networking, and Python scripts. Many IoT projects use both together.",
    keyPoints: [
      "Arduino loop() runs forever; setup() runs once at power-on",
      "digitalWrite(13, HIGH) turns pin 13 on; analogRead(A0) reads a sensor voltage",
      "Raspberry Pi GPIO: import RPi.GPIO as GPIO; GPIO.output(18, GPIO.HIGH)",
      "Arduino communicates with RPi over UART (Serial) or I2C",
    ],
    tryThis: "Write Arduino code to blink the built-in LED on pin 13: digitalWrite(13, HIGH); delay(500); digitalWrite(13, LOW); delay(500);",
    resources: [
      { title: "Arduino Official Tutorials", url: "https://www.arduino.cc/en/Tutorial/HomePage", type: "docs" },
      { title: "Raspberry Pi Official Documentation", url: "https://www.raspberrypi.com/documentation/", type: "docs" },
      { title: "YouTube: Getting Started with Arduino — Paul McWhorter", url: "https://www.youtube.com/watch?v=fJWR7dBuc18", type: "video" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EEE SKILLS
  // ═══════════════════════════════════════════════════════════════════════════

  "AC/DC Circuits": {
    concept: "DC circuits have constant voltage/current (batteries, USB). AC circuits alternate direction sinusoidally (mains power, generators). Both use the same Ohm's Law, but AC adds impedance (resistance + reactance from capacitors and inductors).",
    keyPoints: [
      "DC: V and I are constant — straightforward Ohm's law V = IR",
      "AC: V(t) = Vm·sin(2πft) — oscillates at frequency f (50 Hz in India, 60 Hz in USA)",
      "RMS voltage: Vrms = Vm/√2 — 230V mains means peak voltage is 325V",
      "Power factor = cos(φ) — lower PF means wasted reactive power",
    ],
    tryThis: "Mains supply is 230V RMS. Calculate the peak voltage. (Answer: 230 × √2 ≈ 325 V)",
    resources: [
      { title: "Khan Academy: AC vs DC Electricity", url: "https://www.khanacademy.org/science/physics/circuits-topic", type: "interactive" },
      { title: "YouTube: AC Circuits basics — Michel van Biezen", url: "https://www.youtube.com/watch?v=uKMOa6oMeUI", type: "video" },
      { title: "All About Circuits — AC Theory", url: "https://www.allaboutcircuits.com/textbook/alternating-current/", type: "article" },
    ],
  },

  "Transformer Working Principle": {
    concept: "A transformer transfers AC electrical energy between two coils through electromagnetic induction. It can step voltage up or down — this is why we can transmit power at 400kV over long distances and step it down to 230V at home.",
    keyPoints: [
      "Turns ratio: V1/V2 = N1/N2 = I2/I1 — the fundamental transformer equation",
      "Step-up transformer: N2 > N1 → higher secondary voltage",
      "Step-down transformer: N2 < N1 → lower secondary voltage (e.g. 11kV to 415V)",
      "Ideal transformer: input power = output power (P_in = V1·I1 = V2·I2 = P_out)",
    ],
    tryThis: "A transformer has 1000 primary turns, 50 secondary turns, 230V input. What is the secondary voltage? (Answer: 11.5V)",
    resources: [
      { title: "YouTube: Transformers Explained — The Engineering Mindset", url: "https://www.youtube.com/watch?v=vh_aCAHThTQ", type: "video" },
      { title: "Khan Academy: Transformers", url: "https://www.khanacademy.org/science/electrical-engineering/ee-electromagnetism", type: "interactive" },
    ],
  },

  "3-Phase Power": {
    concept: "Most industrial power is three-phase — three AC voltages 120° apart in time. It is more efficient to transmit than single-phase and produces constant (non-pulsating) torque in motors. Every factory, data centre, and large building uses three-phase power.",
    keyPoints: [
      "3-phase power: P = √3 × VL × IL × cos(φ) where VL = line voltage",
      "Star (Y) connection: VL = √3 × Vph; Delta (Δ) connection: IL = √3 × Iph",
      "In India: line voltage = 415V, phase voltage = 240V (415/√3)",
      "Balanced load: current in neutral wire = 0 (so neutral can be thin)",
    ],
    tryThis: "A balanced 3-phase load draws 10A at 415V line voltage with PF 0.8. Calculate total power. P = 1.732 × 415 × 10 × 0.8 ≈ 5750 W",
    resources: [
      { title: "YouTube: 3 Phase Electricity Explained — The Engineering Mindset", url: "https://www.youtube.com/watch?v=4oRT7PoXSS0", type: "video" },
      { title: "All About Circuits: 3-Phase Power Systems", url: "https://www.allaboutcircuits.com/textbook/alternating-current/chpt-10/", type: "article" },
    ],
  },

  "Electrical Machines Basics": {
    concept: "Electrical machines convert electrical energy to mechanical energy (motors) or vice versa (generators). DC motors, induction motors, and synchronous generators are in everything — fans, pumps, EVs, power plants.",
    keyPoints: [
      "Induction motor: synchronous speed Ns = 120f/P; slip s = (Ns - Nr)/Ns",
      "DC motor: back EMF E = V - Ia×Ra; torque T = Ka×Φ×Ia",
      "Efficiency η = Output power / Input power × 100%",
      "Torque-speed curve: at starting, torque is high; at full speed, current drops",
    ],
    tryThis: "A 4-pole induction motor runs on 50 Hz supply. Calculate synchronous speed. (Ns = 120×50/4 = 1500 RPM)",
    resources: [
      { title: "YouTube: How Electric Motors Work — Lesics", url: "https://www.youtube.com/watch?v=CWulQ1ZSE3c", type: "video" },
      { title: "Khan Academy: Magnetic Forces and Faraday's Law", url: "https://www.khanacademy.org/science/physics/magnetic-forces-and-magnetic-fields", type: "interactive" },
    ],
  },

  "Protection Devices (Fuses, Relays, MCBs)": {
    concept: "Protection devices automatically disconnect a circuit during a fault (overload, short circuit, overvoltage) to prevent damage to equipment and prevent fire. Understanding how to select and wire them is critical for any electrical engineer.",
    keyPoints: [
      "Fuse: melts when current exceeds rating — one-time protection, cheap",
      "MCB (Miniature Circuit Breaker): trips and can be reset — used in homes and offices",
      "Relay: electrically-controlled switch — low-power signal controls high-power circuit",
      "Current rating must match the cable rating — never upsize a fuse without upsizing the cable",
    ],
    tryThis: "A 2.5mm² copper cable can carry 20A. Which MCB rating should you choose to protect it? Answer: 16A or 20A (never higher than the cable rating).",
    resources: [
      { title: "YouTube: How MCBs Work — The Engineering Mindset", url: "https://www.youtube.com/watch?v=Ur4OKEQ1mfY", type: "video" },
      { title: "ABB: Guide to Low-voltage Circuit Breakers (free PDF)", url: "https://library.e.abb.com/public/cd10a6b7cb5f4b67b6cf4e7e2a7c0d1f/1SDC210067D0201.pdf", type: "docs" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MECHANICAL ENGINEERING SKILLS
  // ═══════════════════════════════════════════════════════════════════════════

  "Engineering Drawing Basics": {
    concept: "Engineering drawings are the universal language of manufacturing — they tell a machine shop or factory exactly what to make and to what tolerance. Every part you design starts as a drawing with dimensions, material, and finish specifications.",
    keyPoints: [
      "Views: front, top, side (orthographic projection) — 3 views show the whole part",
      "Dimensions: always use mm in engineering; include tolerances (±0.1)",
      "Title block: part name, drawing number, material, scale, revision",
      "Hidden lines (dashed) show features not visible from that view",
    ],
    tryThis: "Draw a simple L-bracket from three views (front, top, side) on graph paper. Add two dimensions to each view.",
    resources: [
      { title: "YouTube: Engineering Drawing for Beginners — The Efficient Engineer", url: "https://www.youtube.com/watch?v=MnJCzXHVRBk", type: "video" },
      { title: "W3Schools Engineering Drawing reference", url: "https://www.w3schools.com/engineering/drawing/", type: "interactive" },
      { title: "AutoCAD official tutorials", url: "https://www.autodesk.com/products/autocad/free-trial", type: "interactive" },
    ],
  },

  "Strength of Materials": {
    concept: "Strength of Materials (also called Mechanics of Materials) studies how solid bodies deform and fail under load. It answers: will this beam break? How much will it deflect? What wall thickness do I need? Every structural and mechanical component is designed using these principles.",
    keyPoints: [
      "Stress σ = Force / Area (Pa or N/mm²); Strain ε = Deformation / Original length",
      "Young's Modulus E = σ/ε — stiffness of the material (steel ≈ 200 GPa)",
      "Bending stress: σ = M·y / I where M = moment, y = distance from neutral axis, I = 2nd moment of area",
      "Factor of Safety FoS = Yield strength / Working stress — typically 2–4",
    ],
    tryThis: "A steel bar (A = 100 mm²) carries 10 kN tensile load. Find stress. σ = 10,000 N / 100 mm² = 100 MPa. Steel yield = 250 MPa. FoS = 2.5 — safe!",
    resources: [
      { title: "YouTube: Mechanics of Materials — The Efficient Engineer", url: "https://www.youtube.com/watch?v=K2N6I2ANDns", type: "video" },
      { title: "Khan Academy: Stress and Strain", url: "https://www.khanacademy.org/science/physics/mechanical-waves-and-sound", type: "interactive" },
    ],
  },

  "Thermodynamics Basics": {
    concept: "Thermodynamics studies energy — how it transfers as heat and work, and how efficiently we can convert one form to another. Every engine, refrigerator, power plant, and HVAC system is designed using thermodynamic principles.",
    keyPoints: [
      "1st Law: Energy is conserved — Q - W = ΔU (heat in - work out = change in energy)",
      "2nd Law: Heat naturally flows from hot to cold; entropy always increases",
      "Carnot efficiency η = 1 - (TL/TH) — maximum possible efficiency between two temperatures",
      "Ideal gas: PV = nRT — relates pressure, volume, temperature, and amount of gas",
    ],
    tryThis: "A heat engine takes heat from 500K and rejects to 300K. Maximum efficiency? η = 1 - 300/500 = 40%",
    resources: [
      { title: "YouTube: Thermodynamics — The Efficient Engineer", url: "https://www.youtube.com/watch?v=7xM5deh8uus", type: "video" },
      { title: "Khan Academy: Thermodynamics", url: "https://www.khanacademy.org/science/physics/thermodynamics", type: "interactive" },
    ],
  },

  "Manufacturing Processes": {
    concept: "Manufacturing processes turn raw materials into finished parts. As a fresh graduate in any mechanical or production role, you need to understand which process is appropriate for which material, shape, and volume requirement.",
    keyPoints: [
      "Casting: molten metal poured into moulds — for complex shapes, large volumes",
      "Machining (turning, milling, drilling): removes material — for precise dimensions",
      "Welding: joins metals by melting — MIG, TIG, arc welding are most common",
      "Sheet metal: bending, punching, stamping — enclosures, brackets, automotive panels",
    ],
    tryThis: "For a plastic water bottle: which process? (Blow moulding). For a steel shaft: which process? (Turning on a lathe). For a car door panel: (Sheet metal stamping).",
    resources: [
      { title: "YouTube: Manufacturing Processes Overview — The Efficient Engineer", url: "https://www.youtube.com/watch?v=R1t7hfOQO30", type: "video" },
      { title: "MIT OpenCourseWare: Manufacturing", url: "https://ocw.mit.edu/courses/2-008-design-and-manufacturing-ii-spring-2004/", type: "docs" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CIVIL ENGINEERING SKILLS
  // ═══════════════════════════════════════════════════════════════════════════

  "Structural Analysis Basics": {
    concept: "Structural analysis determines the forces, moments, and deflections in a structure under load. Before any beam, column, or slab is designed, an engineer calculates whether it can safely carry the expected loads without failure.",
    keyPoints: [
      "Support types: pin (reactions in x and y), roller (reaction in y only), fixed (reactions + moment)",
      "Equilibrium: ΣFx = 0, ΣFy = 0, ΣM = 0 — three equations, three unknowns",
      "Shear Force Diagram (SFD) and Bending Moment Diagram (BMD) — essential for beam design",
      "Maximum bending moment in a simply supported beam with UDL: M = wL²/8",
    ],
    tryThis: "A simply supported beam, 6m span, carries 10 kN/m UDL. Find max bending moment. M = 10 × 6² / 8 = 45 kN·m",
    resources: [
      { title: "YouTube: Structural Analysis — The Efficient Engineer", url: "https://www.youtube.com/watch?v=HFpEGiqGsBk", type: "video" },
      { title: "SkyCiv Structural Analysis Basics", url: "https://skyciv.com/education/structural-analysis-resources/", type: "article" },
    ],
  },

  "Concrete Mix Basics": {
    concept: "Concrete is made of cement, sand, aggregate (gravel/stone), and water. The mix ratio determines strength. Understanding mix design is essential for any site or structural engineer — bad concrete = structural failure.",
    keyPoints: [
      "Nominal mix M20 means fck = 20 MPa characteristic compressive strength",
      "Water-cement ratio: lower = stronger but less workable; typically 0.4–0.5",
      "M15 (1:2:4), M20 (1:1.5:3), M25 (1:1:2) — cement:sand:aggregate ratios",
      "Curing: keep concrete moist for 28 days to develop full strength",
    ],
    tryThis: "You need M20 concrete. Nominal mix is 1:1.5:3. If you use 1 bag cement (50 kg), how much sand and aggregate (by weight) do you need? (Sand: 75 kg, Aggregate: 150 kg)",
    resources: [
      { title: "YouTube: Concrete Mix Design Explained — Civil Engineering Videos", url: "https://www.youtube.com/watch?v=7KpNsBpz3h8", type: "video" },
      { title: "IS 456:2000 Plain and Reinforced Concrete Code (free download)", url: "https://law.resource.org/pub/in/bis/S04/is.456.2000.pdf", type: "docs" },
    ],
  },

  "Surveying Fundamentals": {
    concept: "Surveying measures distances, angles, and elevations to create maps or set out construction work. Before any building, road, or bridge is constructed, surveyors establish exact positions and levels so construction follows the design precisely.",
    keyPoints: [
      "Levelling: finding height differences between points using a level instrument",
      "Theodolite measures horizontal and vertical angles precisely",
      "Total Station combines electronic distance measurement (EDM) with angle measurement",
      "Benchmark (BM) = a point of known elevation — all other levels are relative to it",
    ],
    tryThis: "Given a staff reading of 2.345m at BM (elevation 100.00m), and a foresight reading of 1.123m. Calculate the elevation of the second point. Answer: 100 + 2.345 - 1.123 = 101.222m",
    resources: [
      { title: "YouTube: Surveying Basics — Civil Engineering Academy", url: "https://www.youtube.com/watch?v=QG-yvPJlMnc", type: "video" },
      { title: "NPTEL: Surveying and Levelling course (free)", url: "https://nptel.ac.in/courses/105102044", type: "interactive" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // COMMUNICATION SYSTEMS
  // ═══════════════════════════════════════════════════════════════════════════

  "Modulation Basics (AM/FM/BPSK)": {
    concept: "Modulation embeds information onto a carrier wave for transmission. Without modulation, multiple signals would interfere at the same frequency. AM varies amplitude, FM varies frequency, BPSK/QPSK vary phase — different tradeoffs for bandwidth and noise resistance.",
    keyPoints: [
      "AM (Amplitude Modulation): simple but sensitive to noise; used in AM radio",
      "FM (Frequency Modulation): better noise immunity; used in FM radio, VHF",
      "BPSK: binary data maps to 0° or 180° phase — robust in digital comms",
      "BER (Bit Error Rate) measures how often bits are received wrongly — lower is better",
    ],
    tryThis: "If carrier frequency is 1 MHz and modulating signal is 1 kHz AM: what two sideband frequencies appear in the spectrum? Answer: 999 kHz and 1001 kHz.",
    resources: [
      { title: "YouTube: AM vs FM vs PM — Simply Explained", url: "https://www.youtube.com/watch?v=Ht_Mf1LxRUM", type: "video" },
      { title: "Khan Academy: Signals and Systems", url: "https://www.khanacademy.org/math/algebra/x2f8bb11595b61c86:functions", type: "interactive" },
    ],
  },

  "dB & dBm Units": {
    concept: "dB (decibel) is a logarithmic unit for comparing ratios — signal power, amplifier gain, cable loss. Because signals can vary over millions to billions, log scale makes numbers manageable. dBm is power relative to 1 milliwatt.",
    keyPoints: [
      "dB = 10·log10(P2/P1) for power; 20·log10(V2/V1) for voltage",
      "0 dBm = 1 mW; +10 dBm = 10 mW; -10 dBm = 0.1 mW",
      "Cascaded: gains and losses simply add/subtract in dB (not multiply)",
      "Link budget: TX_power + Antenna_gain - Path_loss + RX_gain = received power",
    ],
    tryThis: "An amplifier has 20 dB gain and input power is -30 dBm. What is output power? Answer: -30 + 20 = -10 dBm.",
    resources: [
      { title: "YouTube: dB Explained — W2AEW", url: "https://www.youtube.com/watch?v=FNxYgKEMssk", type: "video" },
      { title: "ARRL: Understanding dB", url: "http://www.arrl.org/files/file/Technology/pdf/Understanding%20the%20Decibel.pdf", type: "article" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERIC SKILLS (fallback for unknown skills)
  // ═══════════════════════════════════════════════════════════════════════════

  "Problem Solving": {
    concept: "Problem solving is the core skill every employer tests. It is not about memorising solutions — it is about breaking down an unfamiliar problem into smaller steps, using existing knowledge, and systematically reaching a solution.",
    keyPoints: [
      "Understand before solving: restate the problem in your own words",
      "Identify what you know, what you need to find, what constraints apply",
      "Try a small example first — concrete examples reveal patterns",
      "Check your answer: does it make physical/logical sense?",
    ],
    tryThis: "Estimate the number of cricket balls that fit in a school bus. Break it down: estimate bus volume, estimate ball volume, divide. Practise this kind of Fermi estimation.",
    resources: [
      { title: "YouTube: How to Think Like a Programmer — Fireship", url: "https://www.youtube.com/watch?v=azcrPFhaY9k", type: "video" },
      { title: "NPTEL: Problem Solving Through Programming in C", url: "https://nptel.ac.in/courses/106105085", type: "interactive" },
    ],
  },

  "Writing Clean Code": {
    concept: "Clean code is code that any teammate can read and understand without asking you. It uses meaningful variable names, short functions, comments where non-obvious, and consistent style. Messy code causes bugs, delays, and frustration for the entire team.",
    keyPoints: [
      "Meaningful names: getUserById() not gub(), temperature not t",
      "Single responsibility: each function does one thing and does it well",
      "DRY (Don't Repeat Yourself): extract repeated logic into a function",
      "Comments explain WHY, not WHAT — the code itself shows what it does",
    ],
    tryThis: "Take any 20-line function you wrote before. Rename three variables to be more descriptive. Extract one repeated pattern into a helper function.",
    resources: [
      { title: "YouTube: Clean Code — Uncle Bob (Chapter 1)", url: "https://www.youtube.com/watch?v=7EmboKQH8lM", type: "video" },
      { title: "Refactoring Guru — Clean Code Cheat Sheet", url: "https://refactoring.guru/refactoring", type: "article" },
    ],
  },
}

/**
 * Get module content for a skill, with graceful fallback.
 */
export function getSkillModule(skillName) {
  if (!skillName) return null
  // Exact match
  if (SKILL_MODULES[skillName]) return SKILL_MODULES[skillName]
  // Case-insensitive match
  const lower = skillName.toLowerCase()
  const key = Object.keys(SKILL_MODULES).find(k => k.toLowerCase() === lower)
  if (key) return SKILL_MODULES[key]
  // Partial match (skill name contains key or key contains skill name)
  const partial = Object.keys(SKILL_MODULES).find(k =>
    lower.includes(k.toLowerCase()) || k.toLowerCase().includes(lower)
  )
  return partial ? SKILL_MODULES[partial] : null
}
