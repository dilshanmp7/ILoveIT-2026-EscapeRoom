import type { EscapeRoomQuestion } from "./types";

// Deterministic user code generator: CPH-[SURNAME]-[DEPT_CODE]-[HASH4]
export function generateUserCode(
  firstName: string,
  lastName: string,
  department: string,
  shift: string,
): string {
  const normFirst = firstName.trim().toLowerCase();
  const normLast = lastName.trim().toLowerCase();
  const normDept = department.trim().toLowerCase();
  const normShift = shift.trim().toLowerCase();

  // Short surname part
  const cleanLast = normLast.replace(/[^a-z0-9]/g, "");
  const surnamePart = (cleanLast.slice(0, 4) || "USER").toUpperCase();

  // Department code
  let deptPart = "OPS";
  if (normDept.includes("it") || normDept.includes("tech")) deptPart = "IT";
  else if (normDept.includes("sort")) deptPart = "SRT";
  else if (normDept.includes("ramp")) deptPart = "RMP";
  else if (normDept.includes("ccpu")) deptPart = "CCP";
  else if (normDept.includes("ncg")) deptPart = "NCG";
  else if (normDept.includes("acs")) deptPart = "ACS";
  else if (normDept.includes("eat")) deptPart = "EAT";
  else if (normDept.includes("warehouse") || normDept.includes("uld")) deptPart = "ULD";
  else if (normDept.includes("customs") || normDept.includes("cafe")) deptPart = "CST";
  else if (normDept.includes("quality") || normDept.includes("qcs") || normDept.includes("occ")) deptPart = "QCS";
  else if (normDept.includes("security")) deptPart = "SEC";
  else if (normDept.includes("facility")) deptPart = "FAC";
  else if (normDept.includes("hse") || normDept.includes("safety")) deptPart = "HSE";
  else if (normDept.includes("maintenance") || normDept.includes("engineer")) deptPart = "ENG";
  else if (normDept.includes("hr") || normDept.includes("human")) deptPart = "HR";
  else if (normDept.includes("finance")) deptPart = "FIN";
  else if (normDept.includes("customer")) deptPart = "CS";
  else if (normDept.includes("reception")) deptPart = "RCP";
  else if (normDept.includes("training")) deptPart = "TRN";
  else if (normDept.includes("process")) deptPart = "PRC";
  else if (normDept.includes("pmo")) deptPart = "PMO";
  else if (normDept.includes("regulat")) deptPart = "REG";

  // Deterministic 4-char hex hash from full input
  const combined = `${normFirst}:${normLast}:${normDept}:${normShift}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash << 5) - hash + combined.charCodeAt(i);
    hash |= 0;
  }
  const hexHash = Math.abs(hash).toString(16).padStart(4, "0").slice(0, 4).toUpperCase();

  return `CPH-${surnamePart}-${deptPart}-${hexHash}`;
}

// 45 Curated Questions across 3 IT Themes (15 per level)
export const ESCAPE_ROOM_QUESTIONS: Record<1 | 2 | 3, EscapeRoomQuestion[]> = {
  // ==========================================
  // LEVEL 1: GENERAL AI (15 Questions)
  // ==========================================
  1: [
    {
      id: "ai-1",
      level: 1,
      q: "What does the term 'Gen AI' (Generative AI) mean?",
      options: [
        { id: 1, text: "AI that only works for generation-Z employees" },
        { id: 2, text: "AI that can create new content like text, images, code, or summaries from simple instructions" },
        { id: 3, text: "A high-voltage generator used during power outages at the hub" },
        { id: 4, text: "An automated conveyor belt motor" },
      ],
      correct: 2,
      hint: "It generates original content based on your instructions.",
      explanation: "Generative AI produces new text, code, images, and summaries rather than just retrieving static links.",
    },
    {
      id: "ai-2",
      level: 1,
      q: "Which of the following is an example of Generative AI widely used today?",
      options: [
        { id: 1, text: "Microsoft Copilot / ChatGPT" },
        { id: 2, text: "Microsoft Excel 97" },
        { id: 3, text: "A handheld barcode scanner" },
        { id: 4, text: "An automated roller bed" },
      ],
      correct: 1,
      hint: "Think of modern conversational AI assistants powered by large language models.",
      explanation: "Microsoft Copilot and ChatGPT use generative AI models to draft text, summarize documents, and write code.",
    },
    {
      id: "ai-3",
      level: 1,
      q: "If you type a request or question into an AI chatbot, what is your input instruction called?",
      options: [
        { id: 1, text: "A ticket" },
        { id: 2, text: "A prompt" },
        { id: 3, text: "An airway bill (AWB)" },
        { id: 4, text: "A sorting tag" },
      ],
      correct: 2,
      hint: "It's the text you write to prompt the AI to respond.",
      explanation: "A prompt is the instruction, question, or context given to an AI model to guide its output.",
    },
    {
      id: "ai-4",
      level: 1,
      q: "Why should you NEVER paste confidential DHL shipment details, customer phone numbers, or internal financial data into public AI tools?",
      options: [
        { id: 1, text: "The AI will immediately shut down" },
        { id: 2, text: "Public AI models may store and train on the data, leading to a serious data privacy leak" },
        { id: 3, text: "It slows down the local hub Wi-Fi" },
        { id: 4, text: "It automatically prints out shipping labels" },
      ],
      correct: 2,
      hint: "Public websites can retain your submissions and use them to train future models.",
      explanation: "Public AI tools can store inputs for model training, causing severe data privacy breaches and violating GDPR.",
    },
    {
      id: "ai-5",
      level: 1,
      q: "How can AI practically assist operations and floor teams in a logistics hub?",
      options: [
        { id: 1, text: "Replacing all ramp agents and sorters overnight" },
        { id: 2, text: "By predicting volume spikes, optimizing sort sorting paths, and forecasting delivery routes" },
        { id: 3, text: "By eliminating the requirement to wear safety shoes" },
        { id: 4, text: "By physically lifting heavy aircraft containers by itself" },
      ],
      correct: 2,
      hint: "Think about volume forecasting, sorting efficiency, and delivery route planning.",
      explanation: "AI excels at data analysis: predicting parcel arrival spikes, optimizing sorter chutes, and calculating fastest delivery paths.",
    },
    {
      id: "ai-6",
      level: 1,
      q: "When using AI to draft an email, translate a message, or write a shift handover note, who is ultimately responsible for the accuracy of the final text?",
      options: [
        { id: 1, text: "The AI software" },
        { id: 2, text: "The IT department" },
        { id: 3, text: "You (the human who reviews and sends it)" },
        { id: 4, text: "The computer manufacturer" },
      ],
      correct: 3,
      hint: "Human accountability: the person clicking 'Send' owns the communication.",
      explanation: "AI is an assistant. You are always responsible for fact-checking and reviewing any communication you send.",
    },
    {
      id: "ai-7",
      level: 1,
      q: "Which of these tasks is Generative AI best suited for?",
      options: [
        { id: 1, text: "Unloading cargo directly from an aircraft" },
        { id: 2, text: "Drafting a clear shift summary or translating an operational note into another language" },
        { id: 3, text: "Inspecting tire pressure on a DHL delivery van" },
        { id: 4, text: "Repairing a jammed conveyor roller" },
      ],
      correct: 2,
      hint: "Generative AI works with text, language, and structured summaries, not physical mechanics.",
      explanation: "Generative AI excels at synthesizing text, translating between languages, and creating clear handover summaries.",
    },
    {
      id: "ai-8",
      level: 1,
      q: "What should you do if an AI-generated answer looks strange, suspicious, or too good to be true?",
      options: [
        { id: 1, text: "Forward it immediately to the whole team" },
        { id: 2, text: "Double-check the facts with trusted DHL systems and IT Department colleagues" },
        { id: 3, text: "Turn off your monitor immediately" },
        { id: 4, text: "Trust that AI is always 100% correct" },
      ],
      correct: 2,
      hint: "Never blindly trust unverified outputs; always cross-check with internal sources.",
      explanation: "Always cross-reference unexpected AI outputs with trusted DHL systems, verified documentation, or IT colleagues.",
    },
    {
      id: "ai-9",
      level: 1,
      q: "What does the principle 'Human in the Loop' mean in AI?",
      options: [
        { id: 1, text: "Humans should physically stand inside automated conveyor systems" },
        { id: 2, text: "A human must oversee, review, and validate AI outputs before taking critical actions" },
        { id: 3, text: "Humans are not allowed to use automated software" },
        { id: 4, text: "AI makes every final decision without any human involvement" },
      ],
      correct: 2,
      hint: "A person remains in the loop to supervise, evaluate, and approve the machine's recommendations.",
      explanation: "Human in the Loop ensures that automated AI suggestions are validated by human expertise before decisions are finalized.",
    },
    {
      id: "ai-10",
      level: 1,
      q: "What makes an AI prompt effective and useful?",
      options: [
        { id: 1, text: "Using single-word instructions like 'fix' or 'write'" },
        { id: 2, text: "Providing clear context, role, goal, and format constraints" },
        { id: 3, text: "Writing in all capital letters" },
        { id: 4, text: "Pasting confidential passwords into the question" },
      ],
      correct: 2,
      hint: "The more context and clarity you provide about role, goal, and structure, the better the result.",
      explanation: "Effective prompts define the AI's role, background context, exact goal, and preferred output format.",
    },
    {
      id: "ai-11",
      level: 1,
      q: "Which DHL team should you contact if you are unsure whether an AI tool is approved for official work use?",
      options: [
        { id: 1, text: "Warehouse Maintenance" },
        { id: 2, text: "IT / Information Security" },
        { id: 3, text: "Ramp Operations" },
        { id: 4, text: "The cafeteria team" },
      ],
      correct: 2,
      hint: "The department that governs technology, cybersecurity, and software compliance.",
      explanation: "IT and Information Security assess tools to ensure they meet DHL security standards and data privacy compliance.",
    },
    {
      id: "ai-12",
      level: 1,
      q: "What is the primary difference between a regular search engine (like Google) and a Generative AI tool?",
      options: [
        { id: 1, text: "A search engine creates custom stories, while AI only gives website links" },
        { id: 2, text: "A search engine locates existing web pages; Generative AI synthesizes, analyzes, and drafts new content" },
        { id: 3, text: "Generative AI only works on smartphones" },
        { id: 4, text: "Search engines require login passwords, but AI tools never do" },
      ],
      correct: 2,
      hint: "Search indexes existing web pages; Generative AI synthesizes and writes new answers directly.",
      explanation: "Search engines index and return existing links, whereas Generative AI analyzes data and generates new content.",
    },
    {
      id: "ai-13",
      level: 1,
      q: "What is 'Deepfake'?",
      options: [
        { id: 1, text: "A very deep container used in the warehouse" },
        { id: 2, text: "AI-generated video, photo, or audio that convincingly impersonates a real person" },
        { id: 3, text: "A database connection error" },
        { id: 4, text: "A broken optical scanner belt" },
      ],
      correct: 2,
      hint: "Synthetic digital media falsely impersonating someone's face or voice.",
      explanation: "Deepfakes are synthetic media generated by neural networks to convincingly clone an individual's likeness or voice.",
    },
    {
      id: "ai-14",
      level: 1,
      q: "Why can Generative AI sometimes give two different answers to the same question asked twice?",
      options: [
        { id: 1, text: "Because it learns and predicts probabilistic word sequences rather than reciting a fixed script" },
        { id: 2, text: "Because your keyboard language changed" },
        { id: 3, text: "Because the hub lights flickered" },
        { id: 4, text: "Because the internet cable was unplugged" },
      ],
      correct: 1,
      hint: "LLMs use probability distributions to select each subsequent word.",
      explanation: "Language models generate text probabilistically based on token likelihoods, resulting in natural phrasing variations.",
    },
    {
      id: "ai-15",
      level: 1,
      q: "Which of the following is considered an ethical and compliant way to use AI at DHL?",
      options: [
        { id: 1, text: "Feeding personal employee evaluations into an unapproved online tool" },
        { id: 2, text: "Using DHL-approved AI tools to brainstorm ideas, format tables, or refine email drafts" },
        { id: 3, text: "Generating fake sick leave documents" },
        { id: 4, text: "Copying customer billing records into a free public website" },
      ],
      correct: 2,
      hint: "Look for company-approved platforms used for legitimate workplace productivity.",
      explanation: "Using company-sanctioned enterprise AI tools for brainstorming, formatting, and drafting complies with DHL policy.",
    },
    {
      id: "ai-16",
      level: 1,
      q: "Which department can benefit from AI?",
      options: [
        { id: 1, text: "HR" },
        { id: 2, text: "Finance" },
        { id: 3, text: "IT" },
        { id: 4, text: "All of the above" },
      ],
      correct: 4,
      hint: "AI has valuable productivity applications across all business functions.",
      explanation: "AI empowers HR with job specifications, Finance with anomaly detection, IT with automation, and Operations with routing.",
    },
    {
      id: "ai-17",
      level: 1,
      q: "What should you do if an AI answer seems incorrect?",
      options: [
        { id: 1, text: "Trust it anyway" },
        { id: 2, text: "Verify with other sources" },
        { id: 3, text: "Delete your computer" },
        { id: 4, text: "Send it to everyone" },
      ],
      correct: 2,
      hint: "Always corroborate suspicious claims with verified documentation.",
      explanation: "If an AI output seems questionable, independently verify the facts using official documentation or team experts.",
    },
    {
      id: "ai-18",
      level: 1,
      q: "When is AI most effective?",
      options: [
        { id: 1, text: "People use it responsibly and verify important information" },
        { id: 2, text: "Nobody checks its answers" },
        { id: 3, text: "It replaces all human decisions" },
        { id: 4, text: "It works without any human involvement" },
      ],
      correct: 1,
      hint: "Responsible usage paired with human critical thinking yields the best results.",
      explanation: "AI is most powerful when used as a responsible partner alongside human verification and critical judgment.",
    },
  ],

  // ==========================================
  // LEVEL 2: DHL CPH HUB APPLICATIONS (15 Questions)
  // ==========================================
  2: [
    {
      id: "app-1",
      level: 2,
      q: "Which of the following applications is used in DHL?",
      options: [
        { id: 1, text: "Blue Whale" },
        { id: 2, text: "Fedex ship manager" },
        { id: 3, text: "Captain Peter" },
        { id: 4, text: "GUS butterfly blue" },
      ],
      correct: 4,
      hint: "Look for the butterfly-coded operational software system used in DHL.",
      explanation: "GUS Butterfly Blue is a core operational system used within DHL Express for facility workflows.",
    },
    {
      id: "app-2",
      level: 2,
      q: "Which of the following applications is not used in DHL?",
      options: [
        { id: 1, text: "Sherloc" },
        { id: 2, text: "Amazon Prime" },
        { id: 3, text: "Butterfly Limitless" },
        { id: 4, text: "Maverick" },
      ],
      correct: 2,
      hint: "Identify the consumer subscription service from an external competitor/retailer.",
      explanation: "Amazon Prime is a consumer e-commerce service, not an internal enterprise application used in DHL operations.",
    },
    {
      id: "app-3",
      level: 2,
      q: "What is the primary responsibility of an Application Team in DHL HUB?",
      options: [
        { id: 1, text: "Driving delivery vehicles" },
        { id: 2, text: "Monitoring, supporting, and resolving application issues" },
        { id: 3, text: "Managing warehouse inventory" },
        { id: 4, text: "Recruiting employees" },
      ],
      correct: 2,
      hint: "The team is dedicated to IT software health, troubleshooting incidents, and application availability.",
      explanation: "The Application Team ensures hub software stability by monitoring performance, providing technical support, and resolving incidents.",
    },
    {
      id: "app-4",
      level: 2,
      q: "If users find any functional error in any application which is used in DHL, what should the user do?",
      options: [
        { id: 1, text: "Contact security guard" },
        { id: 2, text: "Log out the application and do nothing" },
        { id: 3, text: "Raise a ticket" },
        { id: 4, text: "Contact HR" },
      ],
      correct: 3,
      hint: "Submit an official incident report through IT service management.",
      explanation: "Raising an IT ticket ensures the issue is logged, prioritized by technical support, and tracked to resolution.",
    },
    {
      id: "app-5",
      level: 2,
      q: "Why is user acceptance testing (UAT) performed before production deployment?",
      options: [
        { id: 1, text: "To increase system downtime" },
        { id: 2, text: "To verify that changes meet business requirements" },
        { id: 3, text: "To uninstall applications" },
        { id: 4, text: "To reduce documentation" },
      ],
      correct: 2,
      hint: "Real end-users test the features to ensure they solve the operational need without breaking workflows.",
      explanation: "UAT allows business and floor users to validate that new software features meet practical requirements before going live.",
    },
    {
      id: "app-6",
      level: 2,
      q: "Which application is commonly used to automate repetitive business processes?",
      options: [
        { id: 1, text: "Power Automate" },
        { id: 2, text: "Notepad" },
        { id: 3, text: "Paint" },
        { id: 4, text: "Calculator" },
      ],
      correct: 1,
      hint: "A Microsoft Power Platform tool built for automated workflows and integrations.",
      explanation: "Microsoft Power Automate streamlines repetitive tasks by connecting cloud services and desktop workflows.",
    },
    {
      id: "app-7",
      level: 2,
      q: "Which application is mainly used to create and manage DHL support tickets?",
      options: [
        { id: 1, text: "Paint" },
        { id: 2, text: "Excel" },
        { id: 3, text: "WordPad" },
        { id: 4, text: "ServiceNow" },
      ],
      correct: 4,
      hint: "The global enterprise cloud platform used for IT service management (ITSM) and incident tickets.",
      explanation: "ServiceNow is DHL's enterprise IT service management platform for logging, routing, and resolving technical support tickets.",
    },
    {
      id: "app-8",
      level: 2,
      q: "What is the primary purpose of DHL Campfire?",
      options: [
        { id: 1, text: "To organize outdoor events for employees" },
        { id: 2, text: "To manage DHL's logistics operations" },
        { id: 3, text: "To provide a digital learning and collaboration platform" },
        { id: 4, text: "To maintain room temperature during Winter" },
      ],
      correct: 3,
      hint: "An internal DHL community hub designed for employee knowledge sharing, training, and collaboration.",
      explanation: "DHL Campfire connects teams across the organization for digital learning, discussions, and best-practice sharing.",
    },
    {
      id: "app-9",
      level: 2,
      q: "In which application can you make your Individual Development Plan (IDP) in DHL?",
      options: [
        { id: 1, text: "My Talent World" },
        { id: 2, text: "Data compliance and classification" },
        { id: 3, text: "Pick-to-Light" },
        { id: 4, text: "Employee opinion survey" },
      ],
      correct: 1,
      hint: "The career development and HR portal where employees track goals, competencies, and learning paths.",
      explanation: "My Talent World is DHL's talent and performance platform where employees formulate and update their Individual Development Plans (IDP).",
    },
    {
      id: "app-10",
      level: 2,
      q: "Should each application have a login ID and password for user access?",
      options: [
        { id: 1, text: "No, as user should be able to login from any employee's computer" },
        { id: 2, text: "No, as it complicates the user’s experience unnecessarily" },
        { id: 3, text: "Yes, to ensure security and protect user data" },
        { id: 4, text: "Only for mobile applications, not for web applications" },
      ],
      correct: 3,
      hint: "Authentication guarantees identity verification and restricts unauthorized access to company systems.",
      explanation: "Unique login credentials ensure accountability, protect sensitive DHL data, and prevent unauthorized access.",
    },
    {
      id: "app-11",
      level: 2,
      q: "In DHL Express operations, what does the 'CAFE' (or GCA) system handle?",
      options: [
        { id: 1, text: "Customs Automated Formalities & Electronic Clearance" },
        { id: 2, text: "Canteen Food & Coffee Ordering" },
        { id: 3, text: "Cabin Air Filtration for Aircraft" },
        { id: 4, text: "Courier Activity & Fleet Evaluation" },
      ],
      correct: 1,
      hint: "Think about duty declarations and regulatory customs clearances at Copenhagen Hub.",
      explanation: "CAFE / GCA is DHL's specialized Customs clearance application handling import/export declarations and clearance events.",
    },
    {
      id: "app-12",
      level: 2,
      q: "What is 'NetScan' / 'AIMS' primarily used for by operational personnel at CPH Hub?",
      options: [
        { id: 1, text: "Capturing parcel barcode checkpoints (WC, PL, DF, AR) via handheld scanners" },
        { id: 2, text: "Streaming music over the warehouse PA system" },
        { id: 3, text: "Controlling office room thermostat temperatures" },
        { id: 4, text: "Ordering diesel fuel for apron tractors" },
      ],
      correct: 1,
      hint: "It operates on mobile handheld scanners (HHTs) to log parcel movements.",
      explanation: "NetScan/AIMS captures checkpoint scans that provide real-time Track & Trace visibility across the DHL global network.",
    },
    {
      id: "app-13",
      level: 2,
      q: "What does the 'QCS' (Quality Control System) do in the Hub sorting process?",
      options: [
        { id: 1, text: "Monitors sort integrity, detects misrouted parcels, and enforces SLA performance" },
        { id: 2, text: "Tests the sweetness of canteen sodas" },
        { id: 3, text: "Cleans the conveyor belts automatically every morning" },
        { id: 4, text: "Counts the number of steps employees take per shift" },
      ],
      correct: 1,
      hint: "Quality Control ensures shipments reach the right flight container on time.",
      explanation: "QCS tracks sort quality, flagging missorts, missing pieces, and ensuring compliance with network service standards.",
    },
    {
      id: "app-14",
      level: 2,
      q: "What does SCADA / PLC control on the CPH Hub automated sorting floor?",
      options: [
        { id: 1, text: "Conveyor belts, diverters, barcode camera tunnels, and parcel tray sorters" },
        { id: 2, text: "Accounting spreadsheets for month-end payroll" },
        { id: 3, text: "Customer phone call recordings" },
        { id: 4, text: "Employee email signature banners" },
      ],
      correct: 1,
      hint: "Industrial automation systems that physically direct packages along conveyors.",
      explanation: "Programmable Logic Controllers (PLCs) and SCADA supervise the high-speed sorting conveyor hardware, chutes, and sensors.",
    },
    {
      id: "app-15",
      level: 2,
      q: "What is 'DWS' in the CPH automated sorting line?",
      options: [
        { id: 1, text: "Dimensioning, Weighing, and Scanning system" },
        { id: 2, text: "Digital Warehouse Salary" },
        { id: 3, text: "Direct Weather Satellite" },
        { id: 4, text: "Daily Worker Schedule" },
      ],
      correct: 1,
      hint: "It measures the volume, weight, and reads the barcode in one high-speed pass.",
      explanation: "DWS systems dynamically capture legal-for-trade parcel weight, volumetric dimensions, and optical barcode reads on conveyors.",
    },
  ],

  // ==========================================
  // LEVEL 3: DHL SECURITY AWARENESS (15 Questions)
  // ==========================================
  3: [
    {
      id: "sec-1",
      level: 3,
      q: "Which of the following are signs of a phishing email? (Select all that apply)",
      options: [
        { id: 1, text: "Urgent requests for immediate action" },
        { id: 2, text: "Unexpected attachments" },
        { id: 3, text: "Personalized greeting from a known colleague" },
        { id: 4, text: "Poor spelling or grammar" },
      ],
      correct: 1,
      correctAnswers: [1, 2, 4],
      hint: "Phishing often uses artificial urgency, unusual attachments, and sloppy spelling/grammar.",
      explanation: "Urgent demands, unexpected attachments, and poor grammar are classic phishing indicators. Legitimate personalized greetings from verified colleagues are typically standard.",
    },
    {
      id: "sec-2",
      level: 3,
      q: "Which of the following are common signs of a phishing email? (Select all that apply.)",
      options: [
        { id: 1, text: "Urgent requests to take immediate action" },
        { id: 2, text: "Unexpected attachments or links" },
        { id: 3, text: "Email sent from a suspicious or misspelled domain" },
        { id: 4, text: "Personalized greeting using your correct name" },
        { id: 5, text: "Requests for passwords or sensitive information" },
      ],
      correct: 1,
      correctAnswers: [1, 2, 3, 5],
      hint: "Look for artificial panic, unexpected files/links, spoofed sender domains, and credential harvesting.",
      explanation: "Phishers use spoofed domains, unexpected attachments/links, artificial panic, and requests for passwords. Legitimate DHL systems never ask for your password via email.",
    },
    {
      id: "sec-3",
      level: 3,
      q: "Which practices help create a strong password? (Select all that apply)",
      options: [
        { id: 1, text: "Use a mix of letters, numbers, and symbols" },
        { id: 2, text: "Use personal information such as your birthday" },
        { id: 3, text: "Use a long passphrase" },
        { id: 4, text: "Use unique passwords for each account" },
      ],
      correct: 1,
      correctAnswers: [1, 3, 4],
      hint: "Combine length, character variety, and account uniqueness. Never use predictable personal dates.",
      explanation: "Strong passwords use complex character mixes, long passphrases, and unique credentials per system. Personal dates like birthdays are easily guessed or found on social media.",
    },
    {
      id: "sec-4",
      level: 3,
      q: "Which of the following are examples of sensitive information? (Select all that apply)",
      options: [
        { id: 1, text: "Customer data" },
        { id: 2, text: "Employee payroll information" },
        { id: 3, text: "Public website content" },
        { id: 4, text: "Login credentials" },
      ],
      correct: 1,
      correctAnswers: [1, 2, 4],
      hint: "Confidential customer details, payroll, and passwords must be protected. Public marketing content is already open.",
      explanation: "Customer data, payroll records, and credentials are confidential/restricted assets under DHL Data Classification. Public website content is non-confidential.",
    },
    {
      id: "sec-5",
      level: 3,
      q: "What are good practices when working remotely? (Select all that apply)",
      options: [
        { id: 1, text: "Use a Zscaler (Private access) when required" },
        { id: 2, text: "Lock your screen when away" },
        { id: 3, text: "Connect to any public Wi-Fi without precautions" },
        { id: 4, text: "Keep company devices secure" },
      ],
      correct: 1,
      correctAnswers: [1, 2, 4],
      hint: "Use company VPN/Zscaler, physically lock your device when stepping away, and avoid unsecured public Wi-Fi.",
      explanation: "Zscaler secures network traffic, locking screens protects against shoulder surfing, and safeguarding company hardware prevents theft. Never connect to open public Wi-Fi without precautions.",
    },
    {
      id: "sec-6",
      level: 3,
      q: "Which actions can help prevent malware infections? (Select all that apply)",
      options: [
        { id: 1, text: "Keep software updated" },
        { id: 2, text: "Download files only from trusted sources" },
        { id: 3, text: "Disable antivirus software" },
        { id: 4, text: "Scan attachments before opening" },
      ],
      correct: 1,
      correctAnswers: [1, 2, 4],
      hint: "Regular patches, trusted downloads, and active scanning stop malware. Never disable security software.",
      explanation: "Patching vulnerabilities, sourcing files from approved software repositories, and scanning attachments prevent malware. Antivirus software must always remain active.",
    },
    {
      id: "sec-7",
      level: 3,
      q: "Which are examples of social engineering attacks? (Select all that apply)",
      options: [
        { id: 1, text: "Phishing" },
        { id: 2, text: "Tailgating" },
        { id: 3, text: "Vishing (voice phishing)" },
        { id: 4, text: "Software patching" },
      ],
      correct: 1,
      correctAnswers: [1, 2, 3],
      hint: "Social engineering tricks humans psychologically—via email, voice phone calls, or physical following.",
      explanation: "Phishing (email), Vishing (voice calls), and Tailgating (unauthorized physical entry) exploit human trust. Software patching is a defensive security maintenance practice.",
    },
    {
      id: "sec-8",
      level: 3,
      q: "What should you do before clicking a link in an email? (Select all that apply)",
      options: [
        { id: 1, text: "Hover over the link to inspect the URL" },
        { id: 2, text: "Verify the sender" },
        { id: 3, text: "Click the link immediately if it looks important" },
        { id: 4, text: "Check for suspicious domains" },
      ],
      correct: 1,
      correctAnswers: [1, 2, 4],
      hint: "Inspect the actual target URL by hovering, verify who sent it, and examine the domain name.",
      explanation: "Always hover to inspect destination URLs, check sender authenticity, and scrutinize domain spelling before clicking any hyperlink.",
    },
    {
      id: "sec-9",
      level: 3,
      q: "Which situations should be reported to the Security / IT team? (Select all that apply)",
      options: [
        { id: 1, text: "Lost company device" },
        { id: 2, text: "Suspected phishing email" },
        { id: 3, text: "Unauthorized access attempts" },
        { id: 4, text: "Routine approved software updates" },
      ],
      correct: 1,
      correctAnswers: [1, 2, 3],
      hint: "Lost laptops/phones, phishing emails, and suspicious login attempts must be reported immediately.",
      explanation: "Lost hardware, phishing, and unauthorized access attempts are security incidents requiring immediate IT response. Approved updates are normal operations.",
    },
    {
      id: "sec-10",
      level: 3,
      q: "What are characteristics of secure websites? (Select all that apply)",
      options: [
        { id: 1, text: "HTTPS is used" },
        { id: 2, text: "Valid security certificate" },
        { id: 3, text: "Requests for sensitive data without encryption" },
        { id: 4, text: "Trusted domain name" },
      ],
      correct: 1,
      correctAnswers: [1, 2, 4],
      hint: "Look for the padlock/HTTPS protocol, valid TLS/SSL certificates, and trusted official domains.",
      explanation: "Secure sites utilize HTTPS (TLS encryption), maintain verified certificates, and operate under legitimate trusted domain names.",
    },
    {
      id: "sec-11",
      level: 3,
      q: "Which actions help protect physical security in the workplace? (Select all that apply)",
      options: [
        { id: 1, text: "Wear your ID badge" },
        { id: 2, text: "Challenge unknown visitors according to policy" },
        { id: 3, text: "Hold doors open for everyone without verification" },
        { id: 4, text: "Secure confidential documents" },
      ],
      correct: 1,
      correctAnswers: [1, 2, 4],
      hint: "Visible ID badges, challenging unbadged strangers, and locking away sensitive paperwork protect the hub.",
      explanation: "Displaying ID badges, challenging unescorted visitors, and locking away confidential paper prevent physical intrusion. Never hold secure doors open for unbadged individuals.",
    },
    {
      id: "sec-12",
      level: 3,
      q: "What are the benefits of Multi-Factor Authentication (MFA)? (Select all that apply)",
      options: [
        { id: 1, text: "Adds an extra layer of security" },
        { id: 2, text: "Helps protect compromised passwords" },
        { id: 3, text: "Eliminates all cyber threats" },
        { id: 4, text: "Reduces unauthorized account access" },
      ],
      correct: 1,
      correctAnswers: [1, 2, 4],
      hint: "MFA adds a critical second verification layer, shielding accounts even if a password is stolen.",
      explanation: "MFA dramatically reduces account takeovers by requiring a secondary verification factor. While powerful, it does not eliminate 100% of all cyber threats.",
    },
    {
      id: "sec-13",
      level: 3,
      q: "Which of the following are good data handling practices? (Select all that apply)",
      options: [
        { id: 1, text: "Share data only with authorized individuals" },
        { id: 2, text: "Encrypt sensitive information when required" },
        { id: 3, text: "Store confidential files on unapproved systems" },
        { id: 4, text: "Follow company data classification policies" },
      ],
      correct: 1,
      correctAnswers: [1, 2, 4],
      hint: "Authorize access on a need-to-know basis, encrypt sensitive files, and follow DHL data classification rules.",
      explanation: "Protecting data involves sharing only with authorized recipients, utilizing encryption, and adhering to DHL data handling and classification standards.",
    },
    {
      id: "sec-14",
      level: 3,
      q: "Which indicators may suggest a malicious attachment? (Select all that apply)",
      options: [
        { id: 1, text: "Unexpected file received" },
        { id: 2, text: "Request to enable macros" },
        { id: 3, text: "Attachment from a verified business process only" },
        { id: 4, text: "Unusual file extension" },
      ],
      correct: 1,
      correctAnswers: [1, 2, 4],
      hint: "Unexpected files, prompt to enable macros (VBA code), and unusual extensions (e.g. .exe, .scr, .zip) indicate danger.",
      explanation: "Unexpected files, macro execution prompts, and atypical file extensions are prime indicators of malware payloads.",
    },
    {
      id: "sec-15",
      level: 3,
      q: "What should you do if you suspect your password has been compromised? (Select all that apply)",
      options: [
        { id: 1, text: "Change the password immediately" },
        { id: 2, text: "Inform the IT/Security team" },
        { id: 3, text: "Continue using the same password" },
        { id: 4, text: "Enable MFA if available" },
      ],
      correct: 1,
      correctAnswers: [1, 2, 4],
      hint: "Reset credentials right away, notify IT Security, and activate Multi-Factor Authentication.",
      explanation: "If compromised, immediately rotate your password, report the incident to IT/Information Security, and ensure MFA is enabled to block unauthorized access.",
    },
  ],
};

// Helper: randomly pick N distinct questions for a specific level
export function getRandomQuestionsForLevel(level: 1 | 2 | 3, count = 10): EscapeRoomQuestion[] {
  const pool = structuredClone(ESCAPE_ROOM_QUESTIONS[level]);
  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = pool[i]!;
    pool[i] = pool[j]!;
    pool[j] = temp;
  }
  return pool.slice(0, count);
}

// 32 Standard CPH Hub Departments
export const CPH_DEPARTMENTS = [
  "IT",
  "CCPU",
  "HR",
  "Operation",
  "Security",
  "NCG",
  "ACS",
  "Engineering",
  "Facility & Support",
  "Finance",
  "Network Support Group",
  "RAMP",
  "EAT",
  "Regional Station",
  "Sort (TDI)",
  "Ramp Neutral",
  "Sort Neutral (TDI)",
  "CPH Nordic Training",
  "Processes",
  "Reception",
  "Sort Control",
  "Sort (DDI)",
  "Operation Support",
  "Sort Neutral (DDI)",
  "Sort Maintenance",
  "CPH- REGULARTORY AND PUBLIC AFFAIRS",
  "CPH - PMO_MAA",
  "CPH - Project Manager_MAA",
  "REGULARTORY AND PUBLIC AFFAIRS",
  "ProcessEngineering",
  "Program Management",
  "Other",
] as const;

export const CPH_SHIFTS = ["AM Shift", "Day Shift", "PM Shift"] as const;

