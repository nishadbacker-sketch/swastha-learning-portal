
"use client";

import { useState } from "react";

type Language = "en" | "ml";

const domains = [
  {
    en: "Cognitive Development", ml: "ബൗദ്ധിക വികാസം",
    enItems: ["Memory Enhancement Activities", "Attention & Concentration Training", "Logical Thinking", "Critical Thinking", "Problem Solving", "Reasoning Skills", "Executive Function Development"],
    mlItems: ["ഓർമ്മശക്തി വർദ്ധിപ്പിക്കുന്ന പ്രവർത്തനങ്ങൾ", "ശ്രദ്ധയും ഏകാഗ്രതയും വളർത്തൽ", "ലോജിക്കൽ തിങ്കിംഗ്", "ക്രിട്ടിക്കൽ തിങ്കിംഗ്", "പ്രശ്നപരിഹാര ശേഷി", "റീസണിംഗ് സ്കിൽസ്", "എക്സിക്യൂട്ടീവ് ഫംഗ്ഷൻ വികസനം"]
  },
  {
    en: "Academic Development", ml: "അക്കാദമിക് വികാസം",
    enItems: ["Reading Skills", "Writing Skills", "Mathematical Skills", "Language Development", "Learning Interest Enhancement", "Study Skills", "Academic Remedial Support"],
    mlItems: ["വായനാ നൈപുണി", "എഴുത്ത് പരിശീലനം", "ഗണിത ശേഷി", "ഭാഷാ വികാസം", "പഠന താല്പര്യം വളർത്തൽ", "പഠന രീതികൾ", "അക്കാദമിക് റിമീഡിയൽ സപ്പോർട്ട്"]
  },
  {
    en: "Language & Communication", ml: "ഭാഷാ ആശയവിനിമയ വികാസം",
    enItems: ["Vocabulary Development", "Listening Skills", "Speaking Skills", "Expressive Language", "Communication Practice", "Conversation Skills"],
    mlItems: ["പദസമ്പത്ത് വികസനം", "ശ്രവണശേഷി", "സംസാരശേഷി", "ആശയപ്രകടനം", "ആശയവിനിമയ പരിശീലനം", "സംഭാഷണ നൈപുണി"]
  },
  {
    en: "Emotional Development", ml: "വൈകാരിക വികാസം",
    enItems: ["Emotional Regulation", "Anger Management", "Self-awareness", "Self-confidence Building", "Stress Management", "Frustration Tolerance", "Emotional Expression Activities"],
    mlItems: ["വികാര നിയന്ത്രണം", "ദേഷ്യം നിയന്ത്രിക്കൽ", "സ്വയം തിരിച്ചറിവ്", "ആത്മവിശ്വാസം വളർത്തൽ", "സ്ട്രെസ് മാനേജ്മെന്റ്", "നിരാശ തരണം ചെയ്യൽ", "വൈകാരിക പ്രകടന പ്രവർത്തനങ്ങൾ"]
  },
  {
    en: "Social Development", ml: "സാമൂഹിക വികാസം",
    enItems: ["Communication Skills", "Social Interaction", "Friendship Building", "Group Activities", "Sharing & Cooperation", "Social Etiquette", "Conflict Resolution"],
    mlItems: ["ആശയവിനിമയ ശേഷി", "സാമൂഹിക ഇടപെടലുകൾ", "സൗഹൃദങ്ങൾ സ്ഥാപിക്കൽ", "ഗ്രൂപ്പ് പ്രവർത്തനങ്ങൾ", "പങ്കുവെക്കലും സഹകരണവും", "സാമൂഹിക മര്യാദകൾ", "തർക്ക പരിഹാര ശേഷി"]
  },
  {
    en: "Motor Development", ml: "ചലന വികാസം",
    enItems: ["Fine Motor Activities", "Gross Motor Activities", "Hand-Eye Coordination", "Balance & Coordination", "Brain Gym Activities", "Physical Coordination Games"],
    mlItems: ["ഫൈൻ മോട്ടോർ ട്രെയിനിംഗ്", "ഗ്രോസ് മോട്ടോർ ട്രെയിനിംഗ്", "കണ്ണും കൈയും തമ്മിലുള്ള ഏകോപനം", "ശരീര സന്തുലനാവസ്ഥ", "ബ്രെയിൻ ജിം പ്രവർത്തനങ്ങൾ", "ഫിസിക്കൽ കോർഡിനേഷൻ ഗെയിംസ്"]
  },
  {
    en: "Creative Development", ml: "സർഗാത്മക വികാസം",
    enItems: ["Drawing & Painting", "Art & Craft", "Clay Modelling", "Music & Rhythm", "Storytelling", "Creative Thinking", "Imagination-Based Activities"],
    mlItems: ["വരയും വർണ്ണങ്ങളും", "ആർട്ട് & ക്രാഫ്റ്റ്", "ക്ലേ മോഡലിംഗ്", "സംഗീതവും താളവും", "കഥപറച്ചിൽ", "സർഗ്ഗാത്മക ചിന്ത", "ഭാവനാധിഷ്ഠിത പ്രവർത്തനങ്ങൾ"]
  },
  {
    en: "Life Skills Development", ml: "ജീവിതനൈപുണി വികസനം",
    enItems: ["Decision Making", "Time Management", "Self-care Skills", "Independent Living Skills", "Personal Responsibility", "Money Management", "Daily Routine Management"],
    mlItems: ["തീരുമാനങ്ങളെടുക്കൽ", "സമയബന്ധിത കാര്യനിർവ്വഹണം", "സ്വയം കാര്യങ്ങൾ ചെയ്യൽ", "സ്വതന്ത്ര ജീവിത നൈപുണികൾ", "വ്യക്തിഗത ഉത്തരവാദിത്തം", "പണത്തിന്റെ ഉപയോഗം", "ദിനചര്യകൾ ക്രമീകരിക്കൽ"]
  },
  {
    en: "Digital Wellness", ml: "ഡിജിറ്റൽ വെൽനെസ്",
    enItems: ["Healthy Screen Habits", "Digital Discipline", "Reducing Screen Dependency", "Offline Play Activities", "Digital Safety Awareness"],
    mlItems: ["ആരോഗ്യകരമായ ഫോൺ ശീലങ്ങൾ", "ഡിജിറ്റൽ അച്ചടക്കം", "സ്ക്രീൻ അമിതാശ്രയം കുറയ്ക്കൽ", "ഓഫ്‌ലൈൻ കളികൾ പ്രോത്സാഹിപ്പിക്കൽ", "ഡിജിറ്റൽ സുരക്ഷാ ബോധവൽക്കരണം"]
  },
  {
    en: "Parent & Family Support", ml: "രക്ഷിതാക്കൾക്കുള്ള പിന്തുണ",
    enItems: ["Parent Counselling", "Parenting Awareness Sessions", "Home-Based Activity Plans", "Parent-Child Interaction Activities", "Monthly Progress Review", "Individual Guidance"],
    mlItems: ["പാരന്റിംഗ് കൗൺസിലിംഗ്", "പാരന്റിംഗ് ബോധവൽക്കരണം", "വീട്ടിൽ ചെയ്യാവുന്ന ആക്റ്റിവിറ്റി പ്ലാനുകൾ", "രക്ഷിതാവും കുട്ടിയും ഒന്നിച്ചുള്ള പ്രവർത്തനങ്ങൾ", "മാസാന്ത പുരോഗതി വിലയിരുത്തൽ", "വ്യക്തിഗത മാർഗ്ഗനിർദ്ദേശം"]
  }
];

const implementation = [
  ["Individual Assessment", "ഇൻഡിവിജ്വൽ അസസ്മെന്റ്", "Identify each child's unique strengths, talents and difficulties.", "ഓരോ കുട്ടിയുടെയും കഴിവുകളും ബുദ്ധിമുട്ടുകളും തിരിച്ചറിയുക"],
  ["Individual Development Plan", "വ്യക്തിഗത വികസന പദ്ധതി (IDP)", "Formulate a personalized development and intervention plan.", "ഓരോ കുട്ടിക്കും വ്യക്തിഗത വികസന പദ്ധതി തയ്യാറാക്കുക"],
  ["Structured Intervention", "സ്ട്രക്ചേർഡ് ഇന്റർവെൻഷൻ", "Provide targeted training sessions on designated weekly days.", "ആഴ്ചയിൽ നിശ്ചിത ദിവസങ്ങളിൽ പരിശീലനം നൽകുക"],
  ["Group Development Sessions", "ഗ്രൂപ്പ് സെഷനുകൾ", "Foster social interaction, communication and teamwork.", "സാമൂഹികവും ആശയവിനിമയപരവുമായ കഴിവുകൾ വികസിപ്പിക്കുക"],
  ["Progress Monitoring", "പ്രോഗ്രസ്സ് മോണിറ്ററിംഗ്", "Review and evaluate regular milestone progress.", "കുട്ടിയുടെ പുരോഗതി കൃത്യമായി വിലയിരുത്തുക"]
];

const programmes = [
  ["Brain Boost", "ബ്രെയിൻ ബൂസ്റ്റ്", "Memory, Attention & Concentration Training", "ഓർമ്മശക്തി, ശ്രദ്ധ, ഏകാഗ്രത എന്നിവ വർദ്ധിപ്പിക്കൽ"],
  ["Smart Learner", "സ്മാർട്ട് ലേണർ", "Reading, Writing & Mathematics Academic Remedial", "വായന, എഴുത്ത്, ഗണിതം എന്നിവയിലെ മികച്ച മുന്നേറ്റം"],
  ["Emotional Intelligence", "ഇമോഷണൽ ഇന്റലിജൻസ്", "Emotional & Behavioural Development Support", "വൈകാരികവും പെരുമാറ്റപരവുമായ വികാസം"],
  ["Creative Kids", "ക്രിയേറ്റീവ് കിഡ്സ്", "Art, Craft, Music & Creative Thinking", "ആർട്ട്, ക്രാഫ്റ്റ്, മ്യൂസിക്, സർഗ്ഗാത്മക ചിന്ത"],
  ["Life Skills", "ലൈഫ് സ്കിൽസ്", "Communication, Independence & Social Skills", "ആശയവിനിമയം, സ്വയംപര്യാപ്തത, സാമൂഹിക കഴിവുകൾ"]
];

const translations = {
  en: {
    tagline: "Solution for all learning problems.",
    hero: "Swastha Learning Clinic",
    subtitle: "A Holistic Child Development Centre. Going beyond addressing academic challenges to nurture cognitive, emotional, social, motor, language, and creative abilities in children aged 3–17.",
    visionLabel: "Our Vision",
    vision: "Nurturing Every Ability, Empowering Every Child.",
    philosophy: "Our Core Philosophy",
    philosophyText: "Our objective is not merely increasing marks in exams. Rather, it is identifying each child's innate strengths and nurturing them into a confident, independent thinker, and socially capable individual.",
    umbrella: "All Development Under One Umbrella",
    domains: "10 Domains of Development",
    domainsSub: "Structured growth areas for children aged 3–17 years",
    implementation: "How We Implement",
    implementationSub: "Five core systems for comprehensive child development",
    programmes: "5 Key Specialized Modules",
    programmesSub: "Targeted interventions designed for specific child development needs",
    tool: "Parent Self-Assessment Tool",
    toolSub: "Select your child's age group and main area of concern.",
    age: "Child's Age Group",
    concern: "Primary Area of Concern",
    generate: "Generate Suggested Intervention",
    book: "Book Assessment",
    contact: "Direct Contact",
    footer: "Holistic Child Development & Learning Support Centre. Solution for all learning problems.",
    parent: "Parent Name",
    child: "Child's Name & Age",
    phone: "Contact Number",
    interest: "Primary Interest",
    send: "Send Assessment Request on WhatsApp",
    close: "Close",
    recommended: "Recommended Approach"
  },
  ml: {
    tagline: "എല്ലാ പഠന പ്രശ്നങ്ങൾക്കും പരിഹാരം.",
    hero: "സ്വാസ്ഥ ലേണിംഗ് ക്ലിനിക്",
    subtitle: "ഒരു ഹോളിസ്റ്റിക് ചൈൽഡ് ഡെവലപ്‌മെന്റ് സെന്റർ. കുട്ടികളുടെ പഠനപ്രശ്നങ്ങൾ പരിഹരിക്കുക എന്നതിൽ മാത്രം ഒതുങ്ങാതെ അവരുടെ ബൗദ്ധിക, വൈകാരിക, സാമൂഹിക, ശാരീരിക, ഭാഷാപരവും സർഗാത്മകവുമായ കഴിവുകൾ വളർത്തിയെടുക്കുക.",
    visionLabel: "പ്രധാന കാഴ്ചപ്പാട്",
    vision: "ഓരോ കഴിവുകളെയും വളർത്താം, ഓരോ കുട്ടിയെയും ശാക്തീകരിക്കാം.",
    philosophy: "സ്വാസ്ഥ്യയുടെ കാഴ്ചപ്പാട്",
    philosophyText: "കുട്ടിക്ക് പഠനത്തിൽ മാർക്ക് വർധിപ്പിക്കുക മാത്രമല്ല നമ്മുടെ ലക്ഷ്യം. മറിച്ച് കുട്ടിയുടെ കഴിവുകൾ കണ്ടെത്തി അവനെ/അവളെ ആത്മവിശ്വാസമുള്ള, സ്വതന്ത്രമായി ചിന്തിക്കാൻ കഴിയുന്ന, സാമൂഹികമായി ഇടപെടാൻ കഴിയുന്ന വ്യക്തിയായി വളർത്തിയെടുക്കുക.",
    umbrella: "എല്ലാ പരിശീലനങ്ങളും ഒരൊറ്റ കുടക്കീഴിൽ",
    domains: "10 പ്രധാന വികസന മേഖലകൾ",
    domainsSub: "3–17 വയസ്സുവരെയുള്ള കുട്ടികൾക്കായുള്ള വികസന ക്രമീകരണങ്ങൾ",
    implementation: "സ്ഥാപനത്തിൽ എങ്ങനെ നടപ്പിലാക്കാം?",
    implementationSub: "സമ്പൂർണ്ണ ശിശുവികസനത്തിനായി അഞ്ച് പ്രധാന സംവിധാനങ്ങൾ",
    programmes: "പ്രത്യേകമായി ആരംഭിക്കാവുന്ന 5 പ്രോഗ്രാമുകൾ",
    programmesSub: "കുട്ടികളുടെ ഓരോ പ്രത്യേക ആവശ്യങ്ങൾക്കനുസൃതമായ പരിശീലനങ്ങൾ",
    tool: "രക്ഷിതാക്കൾക്കുള്ള സ്വയം വിലയിരുത്തൽ സംവിധാനം",
    toolSub: "കുട്ടിയുടെ വയസ്സും പ്രധാന ആവശ്യവും തിരഞ്ഞെടുത്ത് അനുയോജ്യമായ പ്ലാൻ കണ്ടെത്തുക.",
    age: "കുട്ടിയുടെ വയസ്സ്",
    concern: "പ്രധാന വിഷയം / പ്രയാസം",
    generate: "ഉചിതമായ പ്ലാൻ കണ്ടെത്തുക",
    book: "അപ്പോയിന്റ്മെന്റ് ബുക്ക് ചെയ്യുക",
    contact: "ബന്ധപ്പെടുക",
    footer: "ഹോളിസ്റ്റിക് ചൈൽഡ് ഡെവലപ്‌മെന്റ് & ലേണിംഗ് സപ്പോർട്ട് സെന്റർ. എല്ലാ പഠന പ്രശ്നങ്ങൾക്കും മികച്ച പരിഹാരം.",
    parent: "രക്ഷിതാവിന്റെ പേര്",
    child: "കുട്ടിയുടെ പേര്, വയസ്സ്",
    phone: "ബന്ധപ്പെടാനുള്ള നമ്പർ",
    interest: "പ്രധാന താൽപര്യം",
    send: "വാട്സാപ്പിൽ അസസ്മെന്റ് അഭ്യർത്ഥന അയയ്ക്കുക",
    close: "അടയ്ക്കുക",
    recommended: "നിർദ്ദേശിക്കപ്പെടുന്ന പ്ലാൻ"
  }
};

export default function HomePage() {
  const [lang, setLang] = useState<Language>("en");
  const [age, setAge] = useState("3-6");
  const [concern, setConcern] = useState("cognitive");
  const [recommendation, setRecommendation] = useState("");
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState("General Individual Assessment");
  const [parentName, setParentName] = useState("");
  const [childInfo, setChildInfo] = useState("");
  const [phone, setPhone] = useState("");

  const t = translations[lang];

  const recommendations: Record<string, [string, string]> = {
    cognitive: ["Brain Boost", "For memory, attention, concentration and executive functioning skills."],
    academic: ["Smart Learner", "Individual assessment followed by reading, writing and mathematics support."],
    behavioural: ["Emotional Intelligence", "Support for emotional expression, positive behaviour and screen-time management."],
    social: ["Life Skills", "Group sessions for communication, friendship building and independence."],
    creative: ["Creative Kids", "Art, craft, music and storytelling to encourage imagination and confidence."]
  };

  function makeRecommendation() {
    setRecommendation(recommendations[concern][0]);
    setSelectedProgram(recommendations[concern][0]);
  }

  function sendBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = [
      "*SWASTHA Learning Clinic – Assessment Booking*",
      `• Parent Name: ${parentName}`,
      `• Child's Name & Age: ${childInfo}`,
      `• Contact Number: ${phone}`,
      `• Primary Interest: ${selectedProgram}`,
      recommendation ? `• Suggested Module: ${recommendation}` : "",
      `• Age Group: ${age}`
    ].filter(Boolean).join("\n");

    window.open(
      `https://wa.me/919249056889?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <main>
      <header className="topbar">
        <a href="/" className="brand">
          <span className="brand-mark">S</span>
          <span><strong>SWASTHA</strong><small>LEARNING CLINIC</small></span>
        </a>
        <nav className="top-actions">
          <a className="login-link" href="/login">Login / Register</a>
          <button className="language-button" onClick={() => setLang(lang === "en" ? "ml" : "en")}>
            {lang === "en" ? "മലയാളം" : "English"}
          </button>
        </nav>
      </header>

      <nav className="section-nav">
        <a href="#domains">{lang === "en" ? "10 Domains" : "10 വികസന മേഖലകൾ"}</a>
        <a href="#implementation">{lang === "en" ? "Implementation" : "നടപ്പിലാക്കൽ"}</a>
        <a href="#programmes">{lang === "en" ? "Programmes" : "പരിശീലനങ്ങൾ"}</a>
        <a href="#finder">{lang === "en" ? "Parent Tool" : "രക്ഷിതാക്കൾക്ക്"}</a>
      </nav>

      <section className="hero">
        <span className="gold-pill">{t.tagline}</span>
        <h1>{t.hero}</h1>
        <p className="hero-subtitle">{t.subtitle}</p>
        <div className="vision-box">
          <span>{t.visionLabel}</span>
          <h2>“{t.vision}”</h2>
        </div>
        <div className="hero-buttons">
          <a className="call-button" href="tel:9249056889">Call +91 92490 56889</a>
          <a className="whatsapp-button" href="https://wa.me/919249056889" target="_blank" rel="noreferrer">WhatsApp Inquiry</a>
        </div>
        <div className="stats">
          <div><strong>3–17 Years</strong><span>{lang === "en" ? "Age Coverage" : "വയസ്സ് പരിധി"}</span></div>
          <div><strong>10 Domains</strong><span>{lang === "en" ? "Child Development" : "വികസന മേഖലകൾ"}</span></div>
          <div><strong>5 Systems</strong><span>{lang === "en" ? "Implementation" : "സംവിധാനങ്ങൾ"}</span></div>
          <div><strong>5 Modules</strong><span>{lang === "en" ? "Specialized Training" : "പ്രത്യേക പരിശീലനങ്ങൾ"}</span></div>
        </div>
      </section>

      <section className="philosophy">
        <span className="eyebrow">{t.philosophy}</span>
        <p>{t.philosophyText}</p>
        <div className="umbrella">
          <h3>{t.umbrella}</h3>
          <div className="chips">
            {(lang === "en"
              ? ["Special Education", "Learning Support", "Cognitive Training", "Behavioural Support", "Creative Development", "Life Skills"]
              : ["സ്പെഷ്യൽ എഡ്യൂക്കേഷൻ", "ലേണിംഗ് സപ്പോർട്ട്", "കോഗ്നിറ്റീവ് ട്രെയിനിംഗ്", "ബിഹേവിയറൽ സപ്പോർട്ട്", "ക്രിയേറ്റീവ് ഡെവലപ്‌മെന്റ്", "ലൈഫ് സ്കിൽസ്"]
            ).map(item => <span key={item}>{item}</span>)}
          </div>
        </div>
      </section>

      <section className="content-section soft" id="domains">
        <div className="section-heading">
          <span className="eyebrow">{lang === "en" ? "Complete Framework" : "സമ്പൂർണ്ണ വികസന മാതൃക"}</span>
          <h2>{t.domains}</h2>
          <p>{t.domainsSub}</p>
        </div>
        <div className="domain-grid">
          {domains.map((item, index) => (
            <article className="content-card" key={item.en}>
              <span className="number">{String(index + 1).padStart(2, "0")}</span>
              <h3>{lang === "en" ? item.en : item.ml}</h3>
              <ul>
                {(lang === "en" ? item.enItems : item.mlItems).map(point => <li key={point}>{point}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="content-section" id="implementation">
        <div className="section-heading">
          <span className="eyebrow">{lang === "en" ? "Execution Methodology" : "പ്രവർത്തന രീതി"}</span>
          <h2>{t.implementation}</h2>
          <p>{t.implementationSub}</p>
        </div>
        <div className="implementation-grid">
          {implementation.map((item, index) => (
            <article className="step-card" key={item[0]}>
              <span className="step-number">{index + 1}</span>
              <h3>{lang === "en" ? item[0] : item[1]}</h3>
              <p>{lang === "en" ? item[2] : item[3]}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="content-section soft" id="programmes">
        <div className="section-heading">
          <span className="eyebrow">{lang === "en" ? "Focused Modules" : "പ്രത്യേക പരിശീലനങ്ങൾ"}</span>
          <h2>{t.programmes}</h2>
          <p>{t.programmesSub}</p>
        </div>
        <div className="programme-grid">
          {programmes.map((item, index) => (
            <article className="programme-card" key={item[0]}>
              <span className="number">MODULE 0{index + 1}</span>
              <h3>{lang === "en" ? item[0] : item[1]}</h3>
              <p>{lang === "en" ? item[2] : item[3]}</p>
              <button onClick={() => { setSelectedProgram(item[0]); setBookingOpen(true); }}>
                {t.book}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="finder" id="finder">
        <div className="section-heading">
          <span className="eyebrow">{lang === "en" ? "Interactive Recommendation" : "രക്ഷിതാക്കൾക്കുള്ള ഗൈഡ്"}</span>
          <h2>{t.tool}</h2>
          <p>{t.toolSub}</p>
        </div>
        <div className="finder-card">
          <div className="form-grid">
            <label>{t.age}
              <select value={age} onChange={e => setAge(e.target.value)}>
                <option value="3-6">3–6 Years</option>
                <option value="7-11">7–11 Years</option>
                <option value="12-17">12–17 Years</option>
              </select>
            </label>
            <label>{t.concern}
              <select value={concern} onChange={e => setConcern(e.target.value)}>
                <option value="cognitive">Memory / Attention / Concentration</option>
                <option value="academic">Reading / Writing / Math Difficulty</option>
                <option value="behavioural">Stubbornness / Anger / Screen Time</option>
                <option value="social">Social Etiquette / Communication</option>
                <option value="creative">Creative Expression & Confidence</option>
              </select>
            </label>
          </div>
          <button className="primary-button full" onClick={makeRecommendation}>{t.generate}</button>
          {recommendation && (
            <div className="recommendation">
              <span>{t.recommended}</span>
              <h3>{recommendation}</h3>
              <p>{recommendations[concern][1]}</p>
              <button className="primary-button" onClick={() => setBookingOpen(true)}>{t.book}</button>
            </div>
          )}
        </div>
      </section>

      <footer className="footer">
        <div>
          <h2>SWASTHA</h2>
          <strong>LEARNING CLINIC</strong>
          <p>{t.footer}</p>
        </div>
        <div>
          <h3>{t.contact}</h3>
          <p>+91 92490 56889</p>
          <a href="https://wa.me/919249056889" target="_blank" rel="noreferrer">WhatsApp</a>
        </div>
        <div>
          <h3>{t.visionLabel}</h3>
          <p><em>{t.vision}</em></p>
        </div>
        <p className="copyright">© {new Date().getFullYear()} Swastha Learning Clinic. All rights reserved.</p>
      </footer>

      <div className="mobile-actions">
        <a href="tel:9249056889">Call</a>
        <a href="https://wa.me/919249056889" target="_blank" rel="noreferrer">WhatsApp</a>
        <button onClick={() => setBookingOpen(true)}>{t.book}</button>
      </div>

      {bookingOpen && (
        <div className="modal-backdrop" onClick={() => setBookingOpen(false)}>
          <div className="booking-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setBookingOpen(false)}>×</button>
            <h2>{lang === "en" ? "Book Individual Assessment" : "വ്യക്തിഗത അസസ്മെന്റ് ബുക്ക് ചെയ്യുക"}</h2>
            <p>{lang === "en" ? "Send your assessment request directly through WhatsApp." : "വാട്സാപ്പ് വഴി അസസ്മെന്റ് അഭ്യർത്ഥന അയയ്ക്കുക."}</p>
            <form onSubmit={sendBooking}>
              <label>{t.parent}
                <input required value={parentName} onChange={e => setParentName(e.target.value)} placeholder="Parent / Guardian Name" />
              </label>
              <label>{t.child}
                <input required value={childInfo} onChange={e => setChildInfo(e.target.value)} placeholder="Child's name and age" />
              </label>
              <label>{t.phone}
                <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91" />
              </label>
              <label>{t.interest}
                <select value={selectedProgram} onChange={e => setSelectedProgram(e.target.value)}>
                  <option>General Individual Assessment</option>
                  {programmes.map(item => <option key={item[0]}>{item[0]}</option>)}
                </select>
              </label>
              <button className="primary-button full" type="submit">{t.send}</button>
            </form>
            <button className="cancel-button" onClick={() => setBookingOpen(false)}>{t.close}</button>
          </div>
        </div>
      )}

      <style jsx global>{`
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body { margin: 0; background: #f7faf8; color: #132838; font-family: Arial, sans-serif; }
        a { text-decoration: none; }
        button, input, select { font: inherit; }
        .topbar { min-height: 76px; padding: 12px 5%; background: white; display:flex; align-items:center; justify-content:space-between; gap:16px; position:sticky; top:0; z-index:20; box-shadow:0 2px 12px #13283812; }
        .brand { display:flex; align-items:center; gap:10px; color:#132838; }
        .brand-mark { width:42px; height:42px; display:grid; place-items:center; border-radius:13px; background:#1b4d3e; color:#d4af37; font-size:24px; font-weight:900; }
        .brand strong { display:block; font-size:19px; letter-spacing:1px; }
        .brand small { display:block; color:#1b4d3e; font-size:10px; font-weight:800; letter-spacing:2px; }
        .top-actions { display:flex; align-items:center; gap:10px; }
        .login-link, .language-button { border:0; border-radius:30px; padding:11px 16px; font-size:12px; font-weight:800; cursor:pointer; }
        .login-link { background:#1b4d3e; color:white; }
        .language-button { background:#fffcf0; color:#132838; border:1px solid #d4af37; }
        .section-nav { display:flex; justify-content:center; flex-wrap:wrap; gap:24px; padding:13px; background:#fff; border-top:1px solid #edf1ed; }
        .section-nav a { color:#1b4d3e; font-size:12px; font-weight:800; }
        .hero { position:relative; padding:65px 5% 55px; text-align:center; color:white; background:linear-gradient(145deg,#132838,#1b4d3e); }
        .gold-pill { display:inline-block; padding:9px 19px; border-radius:30px; background:#d4af37; color:#132838; font-size:12px; font-weight:900; }
        .hero h1 { font-size:clamp(34px,6vw,58px); margin:22px 0 14px; }
        .hero-subtitle { max-width:850px; margin:0 auto; color:#d8eee4; line-height:1.8; font-size:16px; }
        .vision-box { max-width:650px; margin:30px auto 22px; padding:22px; border:1px solid #d4af3780; background:#ffffff12; border-radius:20px; }
        .vision-box span { color:#e5c65c; font-size:11px; font-weight:900; text-transform:uppercase; letter-spacing:2px; }
        .vision-box h2 { margin:10px 0 0; font-size:clamp(21px,3vw,30px); }
        .hero-buttons { display:flex; justify-content:center; flex-wrap:wrap; gap:12px; margin:25px 0; }
        .hero-buttons a { padding:14px 22px; border-radius:30px; font-size:13px; font-weight:900; color:#132838; background:#d4af37; }
        .hero-buttons .whatsapp-button { background:#168653; color:white; }
        .stats { max-width:850px; margin:35px auto 0; padding-top:22px; border-top:1px solid #ffffff25; display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
        .stats div { padding:15px 8px; border:1px solid #ffffff20; border-radius:13px; background:#ffffff0c; }
        .stats strong, .stats span { display:block; }
        .stats strong { color:#e5c65c; font-size:17px; }
        .stats span { color:#d5e0dc; font-size:11px; margin-top:5px; }
        .philosophy { padding:55px 6%; text-align:center; background:white; }
        .eyebrow { display:inline-block; padding:7px 13px; border-radius:30px; background:#1b4d3e15; color:#1b4d3e; font-size:11px; font-weight:900; text-transform:uppercase; letter-spacing:1px; }
        .philosophy > p { max-width:900px; margin:22px auto; font-size:19px; line-height:1.8; font-weight:700; }
        .umbrella { padding:20px; border:1px solid #d4af3760; border-radius:18px; background:#fffcf0; }
        .umbrella h3 { color:#996515; font-size:14px; }
        .chips { display:flex; flex-wrap:wrap; justify-content:center; gap:9px; }
        .chips span { background:white; border:1px solid #eee2bb; border-radius:9px; padding:9px 12px; font-size:12px; font-weight:800; }
        .content-section { padding:65px 5%; background:white; }
        .content-section.soft { background:#f7faf8; }
        .section-heading { text-align:center; max-width:800px; margin:0 auto 38px; }
        .section-heading h2 { margin:13px 0 8px; font-size:clamp(26px,4vw,38px); color:#132838; }
        .section-heading p { margin:0; color:#63756e; line-height:1.7; font-size:14px; }
        .domain-grid { max-width:1200px; margin:auto; display:grid; grid-template-columns:repeat(3,1fr); gap:18px; }
        .content-card, .programme-card { padding:23px; border-radius:17px; background:white; border:1px solid #dce8e1; box-shadow:0 5px 18px #1328380a; }
        .content-card h3, .programme-card h3 { margin:8px 0 12px; color:#132838; font-size:17px; }
        .number { color:#996515; font-size:11px; font-weight:900; letter-spacing:1px; }
        .content-card ul { padding-left:18px; margin:0; color:#52655e; font-size:13px; line-height:1.9; }
        .implementation-grid { max-width:1200px; margin:auto; display:grid; grid-template-columns:repeat(5,1fr); gap:13px; }
        .step-card { padding:22px 15px; text-align:center; border-radius:17px; background:#f7faf8; border:1px solid #e4ece6; }
        .step-number { width:43px; height:43px; display:grid; place-items:center; margin:0 auto 14px; border-radius:50%; background:#1b4d3e; color:#d4af37; font-weight:900; font-size:20px; }
        .step-card h3 { font-size:14px; }
        .step-card p, .programme-card p { color:#64766f; font-size:12px; line-height:1.7; }
        .programme-grid { max-width:1200px; margin:auto; display:grid; grid-template-columns:repeat(5,1fr); gap:14px; }
        .programme-card { display:flex; flex-direction:column; }
        .programme-card button { margin-top:auto; padding:11px; border:0; border-radius:10px; background:#1b4d3e; color:white; font-weight:800; font-size:12px; cursor:pointer; }
        .finder { padding:65px 5%; background:#132838; color:white; }
        .finder .section-heading h2 { color:white; }
        .finder .section-heading p { color:#d5e0dc; }
        .finder .eyebrow { background:#ffffff18; color:#e5c65c; }
        .finder-card { max-width:850px; margin:auto; padding:28px; border-radius:20px; background:white; color:#132838; }
        .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
        label { display:block; margin-bottom:14px; font-size:12px; font-weight:800; color:#1b4d3e; }
        input, select { display:block; width:100%; margin-top:8px; padding:13px; border:1px solid #dce8e1; border-radius:9px; background:#f7faf8; color:#132838; }
        .primary-button { padding:13px 19px; border:0; border-radius:10px; background:#1b4d3e; color:white; font-weight:900; font-size:13px; cursor:pointer; }
        .primary-button.full { width:100%; }
        .recommendation { margin-top:20px; padding:20px; border-radius:13px; background:#fffcf0; border:1px solid #d4af37; }
        .recommendation span { color:#996515; font-size:11px; font-weight:900; text-transform:uppercase; }
        .recommendation p { color:#52655e; font-size:13px; line-height:1.6; }
        .footer { display:grid; grid-template-columns:2fr 1fr 1fr; gap:30px; padding:45px 6% 75px; background:#132838; color:white; }
        .footer h2 { margin:0; font-size:28px; }
        .footer strong { color:#e5c65c; font-size:12px; letter-spacing:2px; }
        .footer p { color:#d5e0dc; font-size:13px; line-height:1.7; }
        .footer h3 { color:#e5c65c; font-size:13px; }
        .footer a { color:#d5e0dc; font-size:13px; }
        .copyright { grid-column:1/-1; padding-top:20px; border-top:1px solid #ffffff25; text-align:center; }
        .mobile-actions { display:none; }
        .modal-backdrop { position:fixed; inset:0; z-index:50; display:grid; place-items:center; padding:16px; background:#132838bb; overflow-y:auto; }
        .booking-modal { position:relative; width:100%; max-width:470px; max-height:95vh; overflow:auto; padding:28px; border-radius:20px; background:white; color:#132838; }
        .booking-modal h2 { font-size:22px; }
        .booking-modal > p { color:#63756e; font-size:13px; }
        .modal-close { position:absolute; right:16px; top:12px; border:0; background:none; font-size:28px; cursor:pointer; }
        .cancel-button { display:block; margin:12px auto 0; border:0; background:none; color:#63756e; cursor:pointer; }
        @media(max-width:850px) {
          .domain-grid { grid-template-columns:repeat(2,1fr); }
          .implementation-grid { grid-template-columns:repeat(2,1fr); }
          .programme-grid { grid-template-columns:repeat(2,1fr); }
        }
        @media(max-width:560px) {
          .topbar { padding:10px 12px; }
          .brand strong { font-size:15px; }
          .brand small { font-size:8px; }
          .brand-mark { width:35px; height:35px; }
          .top-actions { gap:6px; }
          .login-link, .language-button { padding:10px 11px; font-size:10px; }
          .section-nav { gap:12px; }
          .section-nav a { font-size:10px; }
          .hero { padding:45px 18px; }
          .hero-subtitle { font-size:14px; }
          .stats { grid-template-columns:repeat(2,1fr); }
          .philosophy > p { font-size:16px; }
          .domain-grid, .implementation-grid, .programme-grid, .form-grid { grid-template-columns:1fr; }
          .content-section, .finder { padding:48px 16px; }
          .finder-card { padding:19px; }
          .footer { grid-template-columns:1fr; padding-bottom:95px; }
          .copyright { grid-column:auto; }
          .mobile-actions { position:fixed; bottom:0; left:0; right:0; z-index:30; display:flex; gap:7px; padding:9px; background:#ffffffed; box-shadow:0 -3px 15px #13283818; }
          .mobile-actions a, .mobile-actions button { flex:1; padding:12px 5px; border:0; border-radius:9px; text-align:center; background:#1b4d3e; color:white; font-size:11px; font-weight:900; }
          .mobile-actions button { background:#d4af37; color:#132838; }
        }
      `}</style>
    </main>
  );
}
