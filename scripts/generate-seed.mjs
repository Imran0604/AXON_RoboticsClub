// ============================================================================
// Generates supabase/seed.sql
//
// Why a generator instead of a hand-written SQL file: the demo accounts need
// real bcrypt hashes, and the judging rubric asks for enough sample data that
// evaluators never have to create fests, events or participants themselves.
// Writing ~200 registrations by hand would be unreadable and unmaintainable.
//
// Deterministic: a fixed PRNG seed means re-running produces identical SQL,
// so the committed seed.sql is reviewable in a diff.
//
//   node scripts/generate-seed.mjs
// ============================================================================

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// --- deterministic PRNG (mulberry32) -----------------------------------------
let _s = 0x9e3779b9;
function rnd() {
  _s |= 0;
  _s = (_s + 0x6d2b79f5) | 0;
  let t = Math.imul(_s ^ (_s >>> 15), 1 | _s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (a) => a[Math.floor(rnd() * a.length)];
const int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));

// --- SQL helpers -------------------------------------------------------------
const q = (v) => (v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);
const j = (v) => `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;

// --- demo password -----------------------------------------------------------
// Documented in the README. Shared across demo accounts deliberately so a
// judge never has to keep three passwords straight.
const DEMO_PASSWORD = "axon1234";
const HASH = bcrypt.hashSync(DEMO_PASSWORD, 10);

// --- people ------------------------------------------------------------------
const FIRST = [
  "Imran", "Tanvir", "Sumaiya", "Nusrat", "Rafiul", "Mehedi", "Sadia", "Arif",
  "Farhana", "Shakib", "Tahmid", "Ishrat", "Nafis", "Raisa", "Zarif", "Maliha",
  "Sabbir", "Anika", "Rizwan", "Tasnim", "Fahim", "Lamia", "Ridwan", "Samira",
  "Ashikur", "Jarin", "Naimur", "Oishi", "Shahriar", "Tamanna", "Mahir", "Prity",
  "Rakibul", "Sharmin", "Toufiq", "Nadia", "Hasibul", "Afsana", "Rayhan", "Mitu",
];
const LAST = [
  "Hossain", "Rahman", "Islam", "Ahmed", "Chowdhury", "Karim", "Akter", "Khan",
  "Haque", "Siddique", "Mahmud", "Alam", "Bhuiyan", "Sarker", "Talukder", "Mia",
  "Uddin", "Jahan", "Sultana", "Noor",
];
const INSTITUTIONS = [
  "Dhaka Residential Model College",
  "Notre Dame College, Dhaka",
  "Dhaka College",
  "Adamjee Cantonment College",
  "BUET",
  "Dhaka University",
  "North South University",
  "BRAC University",
  "Rajuk Uttara Model College",
  "Government Laboratory High School",
  "Ideal School and College",
  "Saint Joseph Higher Secondary School",
];

// --- fixed identifiers so cross-references are readable ----------------------
const ORG_ID = "a0000000-0000-4000-8000-000000000001";
const uid = (n) => `b0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const fid = (n) => `c0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const eid = (n) => `d0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const ffid = (n) => `e0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const rid = (n) => `f0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

// ============================================================================
// Fests
// Dates are absolute, not relative to generation time, so the demo story
// (one past fest, one running right now, two upcoming) stays stable through
// the whole judging window.
// ============================================================================
const fests = [
  {
    id: fid(1), n: 1,
    name: "AXON Tech Carnival 2026",
    slug: "axon-tech-carnival-2026",
    tagline: "Four days of robots, code and controlled chaos.",
    description:
      "The club's flagship festival. Eight competitive events and workshops spanning autonomous robotics, drone piloting, machine vision and esports, hosted across the college campus. Open to school and university students nationwide.",
    start_date: "2026-10-03", end_date: "2026-10-17",
    venue: "Main Campus, Dhaka Residential Model College",
    art_seed: 11,
  },
  {
    id: fid(2), n: 2,
    name: "RoboSprint Winter 2026",
    slug: "robosprint-winter-2026",
    tagline: "Build something that moves in 48 hours.",
    description:
      "A winter build sprint focused on making rather than competing. Teams arrive with an idea and leave with a working prototype, supported by mentor hours, a stocked component library and a lot of coffee.",
    start_date: "2026-12-12", end_date: "2026-12-14",
    venue: "AXON Lab & Innovation Hall",
    art_seed: 23,
  },
  {
    id: fid(3), n: 3,
    name: "Freshers' Circuit 2027",
    slug: "freshers-circuit-2027",
    tagline: "Your first robot starts here.",
    description:
      "An onboarding festival for students who have never picked up a soldering iron. Every session is beginner-first, free to attend, and ends with something you built yourself and get to keep.",
    start_date: "2027-02-20", end_date: "2027-02-22",
    venue: "AXON Lab, Academic Building 2",
    art_seed: 37,
  },
  {
    id: fid(4), n: 4,
    name: "AXON Tech Carnival 2025",
    slug: "axon-tech-carnival-2025",
    tagline: "The one that started it all.",
    description:
      "The club's first festival, archived here for reference. Results and registration records are preserved so members can look back at past editions.",
    start_date: "2025-09-18", end_date: "2025-09-20",
    venue: "Main Campus, Dhaka Residential Model College",
    art_seed: 5,
  },
];

// ============================================================================
// Events
// `fill` drives how many registrations get generated; `wait` adds waitlisted
// rows on top of a full event so the capacity rule is visible without a judge
// having to fill an event themselves.
// ============================================================================
const events = [
  {
    n: 1, fest: 1, title: "Line Follower Championship", slug: "line-follower-championship",
    category: "Hardware", fee: 300, cap: 40, team: [1, 3],
    starts_at: "2026-10-14T09:30:00+06:00", ends_at: "2026-10-14T16:00:00+06:00",
    deadline: "2026-10-12T23:59:00+06:00", venue: "Robotics Arena, Ground Floor",
    prize: "BDT 15,000 + trophy", art_seed: 101,
    summary: "Build an autonomous robot that tracks a black line through a timed circuit.",
    description:
      "The club's longest-running event. Robots must navigate a taped circuit autonomously — no remote control, no human intervention once the run begins. The track includes sharp turns, a gap section and a short incline. Three timed runs per team; the fastest clean run counts.\n\nRobots are measured and weighed at scrutineering before the first run. Teams bring their own hardware; a repair bench with basic tools and a soldering station is available all day.",
    rules:
      "Maximum footprint 25cm x 25cm x 20cm.\nFully autonomous operation — no wireless links of any kind.\nOnboard power only; maximum 12V supply.\nThree runs per team, best clean run counts.\nLeaving the track more than twice in a run voids that run.\nJudges' decisions on scrutineering and timing are final.",
    fill: "full", wait: 6,
  },
  {
    n: 2, fest: 1, title: "RoboSoccer 5v5", slug: "robosoccer-5v5",
    category: "Hardware", fee: 500, cap: 16, team: [3, 5],
    starts_at: "2026-10-15T10:00:00+06:00", ends_at: "2026-10-15T18:00:00+06:00",
    deadline: "2026-10-12T23:59:00+06:00", venue: "Robotics Arena, Ground Floor",
    prize: "BDT 25,000 + trophy", art_seed: 102,
    summary: "Five-a-side robot football in a knockout bracket. Remote control permitted.",
    description:
      "Teams field up to five robots on a 4m x 3m pitch in a straight knockout bracket. Matches are two halves of five minutes. Remote control is allowed — this event is about mechanical design and driving skill rather than autonomy.\n\nA practice pitch is open from 09:00 for calibration. Spare batteries and a charging station are provided.",
    rules:
      "Maximum five robots on the pitch per team at any time.\nEach robot maximum 20cm x 20cm footprint.\nNo projectile mechanisms, no entanglement devices, no intentional damage.\nTwo halves of five minutes, golden goal if level.\nTeam captain is the only person permitted to speak to the referee.",
    fill: 0.81, wait: 0,
  },
  {
    n: 3, fest: 1, title: "Drone Obstacle Rally", slug: "drone-obstacle-rally",
    category: "Drone", fee: 400, cap: 24, team: [1, 1],
    starts_at: "2026-10-15T09:00:00+06:00", ends_at: "2026-10-15T14:00:00+06:00",
    deadline: "2026-10-13T23:59:00+06:00", venue: "Netted Flight Cage, Field 2",
    prize: "BDT 12,000", art_seed: 103,
    summary: "Solo FPV time trial through a gated course inside a netted flight cage.",
    description:
      "A single-pilot time trial through eight illuminated gates, two hairpins and a descending tunnel. Flown line-of-sight or FPV, entirely inside a netted cage for safety. Two qualifying laps, fastest counts; the top six pilots go to a final.\n\nLoaner drones are available for three pilots who register early and request one — useful if you want to compete without owning a racing quad.",
    rules:
      "Maximum 5-inch propellers, maximum 6S battery.\nPropeller guards mandatory inside the cage.\nAll flying inside the net only; a breach is immediate disqualification.\nTwo qualifying laps per pilot, fastest lap counts.\nMissed gates add two seconds each.",
    fill: 0.75, wait: 0,
  },
  {
    n: 4, fest: 1, title: "Robotic Arm Pick-and-Place", slug: "robotic-arm-pick-and-place",
    category: "Hardware", fee: 350, cap: 20, team: [1, 2],
    starts_at: "2026-10-16T11:00:00+06:00", ends_at: "2026-10-16T15:30:00+06:00",
    deadline: "2026-10-13T23:59:00+06:00", venue: "AXON Lab, Bench Row A",
    prize: "BDT 10,000", art_seed: 104,
    summary: "Sort coloured blocks into bins against the clock with an arm you built.",
    description:
      "Teams bring a manipulator of any design and sort twelve coloured blocks into matching bins in under four minutes. Points for each correct placement, deductions for drops and for knocking the bin frame.\n\nAutonomous sorting scores double, so there is a real decision to make between a reliable teleoperated arm and an ambitious vision-driven one.",
    rules:
      "Arm must be team-built; off-the-shelf servos and brackets are fine.\nMaximum reach 60cm from the base.\nFour minute attempt, one attempt per team.\nAutonomous placements score two points, teleoperated score one.\nA dropped block may be retried; a knocked bin costs one point.",
    fill: 0.6, wait: 0,
  },
  {
    n: 5, fest: 1, title: "AI Vision Workshop", slug: "ai-vision-workshop",
    category: "AI / ML", fee: 0, cap: 60, team: [1, 1],
    starts_at: "2026-10-14T14:00:00+06:00", ends_at: "2026-10-14T17:00:00+06:00",
    deadline: "2026-10-13T18:00:00+06:00", venue: "Lecture Theatre 1",
    prize: null, art_seed: 105,
    summary: "Hands-on object detection, from a webcam feed to a working classifier.",
    description:
      "A three-hour practical session taking you from a raw webcam feed to a model that recognises objects in it. We cover image preprocessing, running a pretrained detector, reading its output honestly, and the gap between a demo that works in the lab and one that works in the arena.\n\nBring a laptop. Everything we use is free and open source — no paid API keys, no cloud account required.",
    rules:
      "Bring your own laptop with Python 3.10 or newer installed.\nNo prior machine learning experience assumed.\nSeats are first-come; registration closes the evening before.",
    fill: 0.73, wait: 0,
  },
  {
    n: 6, fest: 1, title: "Arduino Bootcamp", slug: "arduino-bootcamp",
    category: "Workshop", fee: 0, cap: 50, team: [1, 1],
    starts_at: "2026-10-13T10:00:00+06:00", ends_at: "2026-10-13T13:00:00+06:00",
    deadline: "2026-10-01T23:59:00+06:00", venue: "AXON Lab, Academic Building 2",
    prize: null, art_seed: 106,
    summary: "Microcontroller basics for complete beginners. Registration has closed.",
    description:
      "From blinking an LED to reading a sensor and driving a motor, in three hours. Boards and components are provided for use during the session.\n\nThis session's registration deadline has already passed — it is kept visible in the directory so you can see what the club runs, and so the platform's deadline handling is demonstrable.",
    rules:
      "No experience required.\nHardware is provided for use during the session.\nRegistration closed on 1 October.",
    fill: 0.94, wait: 0,
  },
  {
    n: 7, fest: 1, title: "Robo-Quiz", slug: "robo-quiz",
    category: "Quiz", fee: 0, cap: 100, team: [1, 2],
    starts_at: "2026-10-16T16:00:00+06:00", ends_at: "2026-10-16T18:00:00+06:00",
    deadline: "2026-10-15T20:00:00+06:00", venue: "Auditorium",
    prize: "BDT 5,000 + book vouchers", art_seed: 107,
    summary: "Rapid-fire rounds on robotics history, electronics and control theory.",
    description:
      "Four rounds, buzzer format, pairs or solo. Topics span robotics history, practical electronics, sensors, control theory and a picture round on famous machines. Written elimination first if more than forty teams enter.\n\nNo preparation required beyond general curiosity, though knowing what a PID controller does will not hurt.",
    rules:
      "Teams of one or two.\nWritten elimination round if entries exceed forty teams.\nNo phones or notes during any round.\nQuizmaster's ruling on an answer is final.",
    fill: 0.42, wait: 0,
  },
  {
    n: 8, fest: 1, title: "Esports: Rocket League", slug: "esports-rocket-league",
    category: "Esports", fee: 200, cap: 32, team: [2, 3],
    starts_at: "2026-10-17T12:00:00+06:00", ends_at: "2026-10-17T19:00:00+06:00",
    deadline: "2026-10-15T23:59:00+06:00", venue: "Computer Lab 3",
    prize: "BDT 8,000", art_seed: 108,
    summary: "Double-elimination 2v2 and 3v3 brackets on club machines.",
    description:
      "A double-elimination bracket run on club machines so nobody is advantaged by their own hardware. Best of three throughout, best of five for the final. Peripherals may be your own; bring your controller if you prefer it.\n\nThe bracket is seeded by a short qualifying round in the morning.",
    rules:
      "Teams of two or three, substitutions declared before the bracket is drawn.\nClub machines only; personal peripherals permitted.\nBest of three, final is best of five.\nNo external coaching between games in a series.",
    fill: 0.88, wait: 2,
  },
  {
    n: 9, fest: 2, title: "48-Hour Hardware Hackathon", slug: "48-hour-hardware-hackathon",
    category: "Software", fee: 600, cap: 25, team: [2, 4],
    starts_at: "2026-12-12T18:00:00+06:00", ends_at: "2026-12-14T18:00:00+06:00",
    deadline: "2026-12-08T23:59:00+06:00", venue: "Innovation Hall",
    prize: "BDT 40,000 across three placements", art_seed: 109,
    summary: "Two days, one prototype. Components, mentors and meals provided.",
    description:
      "Arrive with a team and an idea, leave with something that works. The component library is stocked with microcontrollers, sensors, motors, drivers and a 3D printer queue. Mentors from the club and two industry partners hold office hours throughout.\n\nJudging is on working demonstration first, then technical difficulty, then presentation. A polished idea that does not run scores below a rough one that does.",
    rules:
      "Teams of two to four; no solo entries.\nAll build work must happen on site during the 48 hours.\nPre-existing open-source libraries are allowed and encouraged; pre-built projects are not.\nFinal demo is five minutes plus three minutes of questions.\nComponents from the library must be returned or paid for.",
    fill: 0.64, wait: 0,
  },
  {
    n: 10, fest: 2, title: "CAD Design Sprint", slug: "cad-design-sprint",
    category: "Design", fee: 200, cap: 30, team: [1, 1],
    starts_at: "2026-12-13T10:00:00+06:00", ends_at: "2026-12-13T14:00:00+06:00",
    deadline: "2026-12-10T23:59:00+06:00", venue: "Computer Lab 1",
    prize: "BDT 6,000", art_seed: 110,
    summary: "Model a working mechanism to spec in four hours. Judged on manufacturability.",
    description:
      "A brief is handed out at the start and you have four hours to model a mechanism that satisfies it. Judged on whether it meets the spec, whether it could actually be manufactured, and how cleanly the model is constructed — named features and a sane sketch tree matter here.\n\nFusion 360, FreeCAD, SolidWorks and Onshape are all acceptable. The winning entry gets 3D printed and displayed in the lab.",
    rules:
      "Individual event.\nAny CAD package, including free and student licences.\nFour hours from brief to submitted file.\nSubmit as both native format and STEP.\nModel must be built during the sprint; templates are not permitted.",
    fill: 0.5, wait: 0,
  },
  {
    n: 11, fest: 2, title: "ROS 2 Navigation Workshop", slug: "ros-2-navigation-workshop",
    category: "Workshop", fee: 0, cap: 40, team: [1, 1],
    starts_at: "2026-12-14T10:00:00+06:00", ends_at: "2026-12-14T15:00:00+06:00",
    deadline: "2026-12-11T23:59:00+06:00", venue: "AXON Lab, Academic Building 2",
    prize: null, art_seed: 111,
    summary: "Get a simulated robot mapping and navigating a room autonomously.",
    description:
      "A full day on the ROS 2 navigation stack. We build up from publishing a transform to running SLAM on a simulated robot and sending it autonomous goals in a mapped room. Everything runs in Gazebo so no hardware is needed.\n\nComfort with a Linux terminal is assumed. We provide a prepared virtual machine image if you would rather not install ROS yourself.",
    rules:
      "Bring a laptop with at least 8GB RAM and 20GB free disk space.\nLinux terminal familiarity assumed.\nA prepared VM image is provided a week in advance.",
    fill: 0.55, wait: 0,
  },
  {
    n: 12, fest: 3, title: "Soldering 101", slug: "soldering-101",
    category: "Workshop", fee: 0, cap: 36, team: [1, 1],
    starts_at: "2027-02-20T10:00:00+06:00", ends_at: "2027-02-20T12:30:00+06:00",
    deadline: "2027-02-17T23:59:00+06:00", venue: "AXON Lab, Bench Row B",
    prize: null, art_seed: 112,
    summary: "Learn to solder properly and take home a working LED badge you built.",
    description:
      "Two and a half hours of supervised bench time. We cover iron temperature, tinning, through-hole joints, desoldering a mistake, and how to tell a cold joint from a good one. You assemble a small LED badge from a kit and keep it.\n\nEverything is provided. Safety glasses are mandatory and supplied at the bench.",
    rules:
      "No experience required; minimum age 13.\nAll tools, kits and safety glasses provided.\nClosed-toe shoes required at the bench.",
    fill: 0.47, wait: 0,
  },
  {
    n: 13, fest: 3, title: "Intro to Microcontrollers", slug: "intro-to-microcontrollers",
    category: "Workshop", fee: 0, cap: 45, team: [1, 1],
    starts_at: "2027-02-21T10:00:00+06:00", ends_at: "2027-02-21T13:00:00+06:00",
    deadline: "2027-02-18T23:59:00+06:00", venue: "Computer Lab 2",
    prize: null, art_seed: 113,
    summary: "From blinking an LED to reading a sensor, with boards provided.",
    description:
      "The natural follow-on from Soldering 101. We start by blinking an LED, then read an analogue sensor, then drive a small motor, then put all three together into something that reacts to its surroundings.\n\nBoards and components are provided for the session. Bring a laptop with a USB-A port or an adapter.",
    rules:
      "No experience required.\nBring a laptop; boards and components provided.\nSoftware install instructions are emailed three days before.",
    fill: 0.38, wait: 0,
  },
  {
    n: 14, fest: 3, title: "Robotics Project Showcase", slug: "robotics-project-showcase",
    category: "Hardware", fee: 0, cap: 20, team: [1, 4],
    starts_at: "2027-02-22T14:00:00+06:00", ends_at: "2027-02-22T18:00:00+06:00",
    deadline: "2027-02-19T23:59:00+06:00", venue: "Innovation Hall",
    prize: "Best project trophy + lab membership", art_seed: 114,
    summary: "Exhibit anything you have built. Unfinished work explicitly welcome.",
    description:
      "A table, a power socket and an audience. Show a finished robot, a half-built one, or a thing that only works if you hold the wire in exactly the right place — all three are welcome, and the half-built ones usually draw the better conversations.\n\nA panel circulates during the afternoon and awards a trophy, but the point of the event is the conversations, not the prize.",
    rules:
      "Teams of one to four.\nOne table and one 240V socket per team.\nProjects at any stage of completion are welcome.\nNothing that flies indoors, and nothing above 24V.",
    fill: 0.65, wait: 0,
  },
  {
    n: 15, fest: 4, title: "Line Follower Championship 2025", slug: "line-follower-championship-2025",
    category: "Hardware", fee: 250, cap: 32, team: [1, 3],
    starts_at: "2025-09-19T09:30:00+06:00", ends_at: "2025-09-19T16:00:00+06:00",
    deadline: "2025-09-16T23:59:00+06:00", venue: "Robotics Arena, Ground Floor",
    prize: "BDT 10,000 + trophy", art_seed: 115,
    summary: "The 2025 edition. Archived for reference; registration is long closed.",
    description:
      "The first edition of the club's flagship event, kept in the directory as an archive. Thirty-two teams entered and the winning clean run was 24.8 seconds.",
    rules: "Archived event. Rules as published in the 2025 edition handbook.",
    fill: 0.97, wait: 0,
  },
  {
    n: 16, fest: 4, title: "Robo-Quiz 2025", slug: "robo-quiz-2025",
    category: "Quiz", fee: 0, cap: 80, team: [1, 2],
    starts_at: "2025-09-20T16:00:00+06:00", ends_at: "2025-09-20T18:00:00+06:00",
    deadline: "2025-09-18T20:00:00+06:00", venue: "Auditorium",
    prize: "BDT 3,000", art_seed: 116,
    summary: "The 2025 quiz. Archived for reference.",
    description: "Archived from the 2025 festival. Sixty-one teams entered across four rounds.",
    rules: "Archived event.",
    fill: 0.76, wait: 0,
  },
];

// ============================================================================
// Form fields per event.
// Every event gets the three common fields; competitive events additionally
// collect the things an organizer actually needs to run the day.
// ============================================================================
const COMMON = [
  { label: "Full name", key: "full_name", type: "text", required: true, placeholder: "As it should appear on your certificate" },
  { label: "Institution", key: "institution", type: "text", required: true, placeholder: "School, college or university" },
  { label: "Class / Year", key: "year", type: "select", required: true, options: ["Class 9", "Class 10", "Class 11", "Class 12", "Undergraduate 1st year", "Undergraduate 2nd year", "Undergraduate 3rd year", "Undergraduate 4th year"] },
];
const EXTRA = {
  Hardware: [
    { label: "Robot name", key: "robot_name", type: "text", required: false, placeholder: "Give it something memorable" },
    { label: "Microcontroller used", key: "mcu", type: "select", required: true, options: ["Arduino Uno / Nano", "ESP32", "STM32", "Raspberry Pi / Pi Pico", "Teensy", "Other"] },
    { label: "Do you need a bench slot for repairs?", key: "bench_slot", type: "radio", required: true, options: ["Yes", "No"] },
    { label: "T-shirt size", key: "tshirt", type: "select", required: false, options: ["S", "M", "L", "XL", "XXL"] },
  ],
  Drone: [
    { label: "Frame size", key: "frame", type: "select", required: true, options: ["3 inch", "5 inch", "7 inch"] },
    { label: "Do you need a loaner drone?", key: "loaner", type: "radio", required: true, options: ["Yes, please", "No, I have my own"] },
    { label: "Years of FPV experience", key: "fpv_years", type: "number", required: false, placeholder: "0 is a perfectly good answer" },
  ],
  "AI / ML": [
    { label: "Laptop operating system", key: "laptop_os", type: "select", required: true, options: ["Windows", "macOS", "Linux"] },
    { label: "Python experience", key: "py_level", type: "radio", required: true, options: ["None", "Some basics", "Comfortable", "Very comfortable"] },
  ],
  Workshop: [
    { label: "Have you attended an AXON workshop before?", key: "returning", type: "radio", required: true, options: ["Yes", "No"] },
    { label: "Anything we should know? (dietary, access, other)", key: "accessibility", type: "textarea", required: false, placeholder: "Optional — we read every one of these" },
  ],
  Software: [
    { label: "Project idea in one sentence", key: "idea", type: "textarea", required: true, placeholder: "It can change later — we just want to plan mentors" },
    { label: "GitHub profile", key: "github", type: "url", required: false, placeholder: "https://github.com/yourname" },
    { label: "Primary language", key: "language", type: "select", required: true, options: ["Python", "C / C++", "JavaScript / TypeScript", "Rust", "Other"] },
  ],
  Design: [
    { label: "CAD package you will use", key: "cad", type: "select", required: true, options: ["Fusion 360", "SolidWorks", "FreeCAD", "Onshape", "Other"] },
  ],
  Esports: [
    { label: "In-game username", key: "ign", type: "text", required: true, placeholder: "Exactly as it appears in game" },
    { label: "Preferred bracket", key: "bracket", type: "radio", required: true, options: ["2v2", "3v3"] },
    { label: "Bringing your own controller?", key: "controller", type: "radio", required: false, options: ["Yes", "No"] },
  ],
  Quiz: [
    { label: "Team name", key: "quiz_team", type: "text", required: false, placeholder: "Leave blank if entering solo" },
  ],
};

const TEAM_WORDS_A = ["Circuit", "Servo", "Torque", "Vector", "Delta", "Nimbus", "Quantum", "Iron", "Volt", "Axis", "Helix", "Photon", "Kinetic", "Binary", "Cobalt"];
const TEAM_WORDS_B = ["Breakers", "Sentinels", "Dynamics", "Collective", "Syndicate", "Pioneers", "Mavericks", "Works", "Labs", "Squad", "Union", "Crew"];

// ============================================================================
// Build the SQL
// ============================================================================
const out = [];
out.push(`-- ============================================================================
-- AXON Robotics Club — sample data
--
-- GENERATED FILE. Edit scripts/generate-seed.mjs and re-run:
--     node scripts/generate-seed.mjs
--
-- Run supabase/schema.sql first, then this file, in the Supabase SQL Editor.
--
-- Demo accounts (password for all three: ${DEMO_PASSWORD})
--     admin@axon.club      — super admin
--     organizer@axon.club  — organizer
--     student@axon.club    — participant
-- ============================================================================

begin;

truncate audit_log, registrations, event_form_fields, events, fests, organizations, users restart identity cascade;
`);

// --- organization ---
out.push(`
-- Organization ---------------------------------------------------------------
insert into organizations (id, name, slug, tagline, about, website, email) values
(${q(ORG_ID)}, ${q("AXON Robotics Club")}, ${q("axon")}, ${q("Signals into motion.")},
 ${q("AXON is the robotics society of Dhaka Residential Model College. We build autonomous machines, run the country's longest-standing line-follower championship, and teach anyone who turns up how to solder. Founded 2025, student-run, open to all levels.")},
 ${q("https://axon-robotics-club.vercel.app")}, ${q("hello@axon.club")});
`);

// --- users ---
const users = [
  { id: uid(1), name: "Nusrat Jahan Rahman", email: "admin@axon.club", role: "admin", phone: "+8801711000001", inst: "Dhaka Residential Model College" },
  { id: uid(2), name: "Tanvir Hossain", email: "organizer@axon.club", role: "organizer", phone: "+8801711000002", inst: "Dhaka Residential Model College" },
  { id: uid(3), name: "Imran Kabir", email: "student@axon.club", role: "participant", phone: "+8801711000003", inst: "Notre Dame College, Dhaka" },
  { id: uid(4), name: "Sadia Afrin", email: "sadia.organizer@axon.club", role: "organizer", phone: "+8801711000004", inst: "Dhaka Residential Model College" },
];
const PARTICIPANT_START = 10;
const PARTICIPANT_COUNT = 150;
const seen = new Set(users.map((u) => u.email));
for (let i = 0; i < PARTICIPANT_COUNT; i++) {
  const first = pick(FIRST);
  const last = pick(LAST);
  const name = `${first} ${last}`;
  let email = `${first}.${last}`.toLowerCase().replace(/[^a-z.]/g, "") + `${int(10, 99)}@student.axon.club`;
  while (seen.has(email)) email = `${first}.${last}`.toLowerCase() + `${int(100, 999)}@student.axon.club`;
  seen.add(email);
  users.push({
    id: uid(PARTICIPANT_START + i),
    name,
    email,
    role: "participant",
    phone: `+88017${int(10000000, 99999999)}`,
    inst: pick(INSTITUTIONS),
  });
}

out.push(`
-- Users ---------------------------------------------------------------------
-- All demo accounts share the bcrypt hash of "${DEMO_PASSWORD}".
insert into users (id, name, email, phone, institution, password_hash, role) values`);
out.push(
  users
    .map((u) => `(${q(u.id)}, ${q(u.name)}, ${q(u.email)}, ${q(u.phone)}, ${q(u.inst)}, ${q(HASH)}, ${q(u.role)})`)
    .join(",\n") + ";\n"
);

// --- fests ---
out.push(`
-- Fests ---------------------------------------------------------------------
insert into fests (id, org_id, name, slug, tagline, description, start_date, end_date, venue, art_seed) values`);
out.push(
  fests
    .map(
      (f) =>
        `(${q(f.id)}, ${q(ORG_ID)}, ${q(f.name)}, ${q(f.slug)}, ${q(f.tagline)}, ${q(f.description)}, ${q(f.start_date)}, ${q(f.end_date)}, ${q(f.venue)}, ${f.art_seed})`
    )
    .join(",\n") + ";\n"
);

// --- events ---
out.push(`
-- Events --------------------------------------------------------------------
insert into events (id, fest_id, title, slug, category, summary, description, starts_at, ends_at, venue, capacity, registration_deadline, fee_bdt, team_min, team_max, prize, rules, art_seed) values`);
out.push(
  events
    .map(
      (e) =>
        `(${q(eid(e.n))}, ${q(fid(e.fest))}, ${q(e.title)}, ${q(e.slug)}, ${q(e.category)}, ${q(e.summary)}, ${q(e.description)}, ${q(e.starts_at)}, ${q(e.ends_at)}, ${q(e.venue)}, ${e.cap}, ${q(e.deadline)}, ${e.fee}, ${e.team[0]}, ${e.team[1]}, ${q(e.prize)}, ${q(e.rules)}, ${e.art_seed})`
    )
    .join(",\n") + ";\n"
);

// --- form fields ---
let ffn = 0;
const ffRows = [];
for (const e of events) {
  const fields = [...COMMON, ...(EXTRA[e.category] ?? [])];
  fields.forEach((f, i) => {
    ffn++;
    ffRows.push(
      `(${q(ffid(ffn))}, ${q(eid(e.n))}, ${q(f.label)}, ${q(f.key)}, ${q(f.type)}, ${q(f.placeholder ?? null)}, ${q(f.help_text ?? null)}, ${f.required}, ${j(f.options ?? [])}, ${i})`
    );
  });
}
out.push(`
-- Registration form fields --------------------------------------------------
-- This is the form builder's data. Each event's registration form is rendered
-- from these rows, which is what removes the need for Google Forms.
insert into event_form_fields (id, event_id, label, field_key, type, placeholder, help_text, required, options, position) values`);
out.push(ffRows.join(",\n") + ";\n");

// --- registrations ---
// The demo participant account must already hold a spread of registrations,
// otherwise a judge signing in as "student@axon.club" sees an empty page and
// cannot evaluate the view/manage requirement at all. Each entry pins one
// status so every state is reachable from that one account.
const DEMO_USER = uid(3);
const DEMO_PLAN = {
  1: "waitlisted",   // full event -> shows queue position
  3: "confirmed",
  5: "confirmed",
  7: "pending",      // awaiting organiser review
  9: "confirmed",    // upcoming fest, team entry
  15: "checked_in",  // past event -> attendance history
};

let rn = 0;
const regRows = [];
const auditRows = [];
const usedPairs = new Set();

const YEARS = COMMON[2].options;

function answersFor(e, user) {
  const a = { full_name: user.name, institution: user.inst, year: pick(YEARS) };
  for (const f of EXTRA[e.category] ?? []) {
    if (f.type === "select" || f.type === "radio") a[f.key] = pick(f.options);
    else if (f.type === "number") a[f.key] = String(int(0, 4));
    else if (f.type === "url") a[f.key] = rnd() > 0.5 ? `https://github.com/${user.name.split(" ")[0].toLowerCase()}` : "";
    else if (f.type === "textarea") a[f.key] = rnd() > 0.6 ? "Looking forward to it." : "";
    else a[f.key] = rnd() > 0.4 ? `${pick(TEAM_WORDS_A)}-${int(1, 99)}` : "";
  }
  return a;
}

for (const e of events) {
  const isPast = new Date(e.starts_at) < new Date("2026-10-05T00:00:00+06:00");
  const target = e.fill === "full" ? e.cap : Math.round(e.cap * e.fill);

  // Pool of candidate participants for this event
  const pool = users.filter((u) => u.role === "participant");

  let seated = 0;
  let waitlisted = 0;
  let attempts = 0;

  // Place the demo participant before anyone else so their seat is reserved
  // inside this event's capacity rather than overflowing it.
  const demoStatus = DEMO_PLAN[e.n];
  if (demoStatus) {
    const demoUser = users.find((u) => u.id === DEMO_USER);
    usedPairs.add(`${e.n}:${DEMO_USER}`);
    rn++;
    if (demoStatus === "waitlisted") waitlisted++;
    else seated++;

    const teamed = e.team[1] > 1;
    {
      const members = teamed
        ? [{ name: "Rafiul Karim", institution: "Notre Dame College, Dhaka" }]
        : [];
      regRows.push(
        `(${q(rid(rn))}, ${q(eid(e.n))}, ${q(DEMO_USER)}, ${q(demoStatus)}, ${q(
          `AXN-${String(e.n).padStart(2, "0")}-${String(rn).padStart(4, "0")}`
        )}, ${q(teamed ? "Axon Cadets" : null)}, ${j(members)}, ${j(answersFor(e, demoUser))}, ${
          demoStatus === "waitlisted" ? 1 : "NULL"
        }, ${
          demoStatus === "checked_in"
            ? q(new Date(new Date(e.starts_at).getTime() + 12 * 60000).toISOString())
            : "NULL"
        }, ${q(new Date(new Date(e.deadline).getTime() - 9 * 86400000).toISOString())})`
      );
    }
  }
  while ((seated < target || waitlisted < e.wait) && attempts < pool.length * 3) {
    attempts++;
    const u = pick(pool);
    const key = `${e.n}:${u.id}`;
    if (usedPairs.has(key)) continue;
    usedPairs.add(key);

    let status;
    if (seated < target) {
      // Spread statuses realistically across the seated population.
      const roll = rnd();
      if (isPast) status = roll < 0.82 ? "checked_in" : "confirmed";
      else if (roll < 0.07) status = "pending";
      else if (roll < 0.93) status = "confirmed";
      else status = "checked_in";
      seated++;
    } else {
      status = "waitlisted";
      waitlisted++;
    }

    rn++;
    const teamed = e.team[1] > 1 && rnd() > 0.45;
    const teamName = teamed ? `${pick(TEAM_WORDS_A)} ${pick(TEAM_WORDS_B)}` : null;
    const members = teamed
      ? Array.from({ length: int(e.team[0] === 1 ? 1 : e.team[0] - 1, e.team[1] - 1) }, () => ({
          name: `${pick(FIRST)} ${pick(LAST)}`,
          institution: pick(INSTITUTIONS),
        }))
      : [];

    const code = `AXN-${String(e.n).padStart(2, "0")}-${String(rn).padStart(4, "0")}`;
    const daysBefore = int(2, 26);
    const created = new Date(new Date(e.deadline).getTime() - daysBefore * 86400000 - int(0, 82800) * 1000);

    regRows.push(
      `(${q(rid(rn))}, ${q(eid(e.n))}, ${q(u.id)}, ${q(status)}, ${q(code)}, ${q(teamName)}, ${j(members)}, ${j(answersFor(e, u))}, ${
        status === "waitlisted" ? waitlisted : "NULL"
      }, ${status === "checked_in" ? q(new Date(new Date(e.starts_at).getTime() + int(5, 90) * 60000).toISOString()) : "NULL"}, ${q(created.toISOString())})`
    );
  }

  // A few cancelled and rejected rows per event so those states are visible
  // in the admin filters without a judge having to produce them.
  for (let k = 0; k < (isPast ? 1 : 2); k++) {
    const u = pick(pool);
    const key = `${e.n}:${u.id}`;
    if (usedPairs.has(key)) continue;
    usedPairs.add(key);
    rn++;
    const status = k === 0 ? "cancelled" : "rejected";
    const code = `AXN-${String(e.n).padStart(2, "0")}-${String(rn).padStart(4, "0")}`;
    const created = new Date(new Date(e.deadline).getTime() - int(5, 30) * 86400000);
    regRows.push(
      `(${q(rid(rn))}, ${q(eid(e.n))}, ${q(u.id)}, ${q(status)}, ${q(code)}, NULL, ${j([])}, ${j(answersFor(e, u))}, NULL, NULL, ${q(created.toISOString())})`
    );
    auditRows.push(
      `(${q(uid(2))}, ${q(status === "cancelled" ? "registration.cancelled" : "registration.rejected")}, ${q("registration")}, ${q(rid(rn))}, ${j({ event: e.slug, by: "organizer@axon.club" })}, ${q(created.toISOString())})`
    );
  }
}

out.push(`
-- Registrations -------------------------------------------------------------
-- ${regRows.length} rows spanning every status, so capacity, waitlist and
-- deadline behaviour are all observable in the seeded state.
insert into registrations (id, event_id, user_id, status, ticket_code, team_name, team_members, answers, waitlist_position, checked_in_at, created_at) values`);
out.push(regRows.join(",\n") + ";\n");

out.push(`
-- Audit log -----------------------------------------------------------------
insert into audit_log (actor_id, action, entity, entity_id, meta, created_at) values`);
out.push(auditRows.join(",\n") + ";\n");

out.push(`
commit;

-- Sanity check: run this after seeding to confirm the data landed.
--   select
--     (select count(*) from fests)         as fests,
--     (select count(*) from events)        as events,
--     (select count(*) from users)         as users,
--     (select count(*) from registrations) as registrations;
`);

mkdirSync(join(ROOT, "supabase"), { recursive: true });
const sql = out.join("\n");
writeFileSync(join(ROOT, "supabase", "seed.sql"), sql, "utf8");

console.log("wrote supabase/seed.sql");
console.log(`  organizations 1`);
console.log(`  users         ${users.length}`);
console.log(`  fests         ${fests.length}`);
console.log(`  events        ${events.length}`);
console.log(`  form fields   ${ffRows.length}`);
console.log(`  registrations ${regRows.length}`);
console.log(`  audit rows    ${auditRows.length}`);
console.log(`  size          ${(sql.length / 1024).toFixed(0)} KB`);
console.log(`  demo password ${DEMO_PASSWORD}`);
