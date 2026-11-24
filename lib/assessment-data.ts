// Original Swastha Learning Clinic assessment question bank.
export type AssessmentLevel = "LP" | "UP" | "HS" | "HSS";
export type AssessmentScore = "0" | "1" | "2" | "3" | "NA";

export const CHECKLIST_DATA = {
      LP: {
        code: "LP",
        shortTitle: "LP LEVEL — CHILD ASSESSMENT CHECKLIST",
        badge: "Lower Primary | Classes 1–4",
        ageRange: "Approximate age: 6–10 years",
        purpose: "To identify the child's learning abilities, digital habits, social and moral development, practical thinking, strengths and areas requiring support. Methods: Direct observation, activity-based assessment, child interaction, parent interview, and teacher input.",
        profileFields: [
          { key: "studentName", label: "Child's Name", type: "text", placeholder: "Full name" },
          { key: "dobAge", label: "Date of Birth / Age", type: "text", placeholder: "e.g., 12/05/2018 (8 yrs)" },
          { key: "school", label: "School Name", type: "text", placeholder: "School name" },
          { key: "presentClass", label: "Present Class", type: "text", placeholder: "e.g., Class 3" },
          { key: "medium", label: "Medium of Instruction", type: "text", placeholder: "e.g., English / Malayalam" },
          { key: "assessmentDate", label: "Date of Assessment", type: "date" },
          { key: "parentName", label: "Parent / Guardian Name", type: "text", placeholder: "Parent/Guardian" },
          { key: "contact", label: "Contact Number", type: "text", placeholder: "Phone number" },
          { key: "assessor", label: "Assessor", type: "text", placeholder: "Assessor name" },
          { key: "languages", label: "Languages Used", type: "text", placeholder: "e.g., Malayalam, English" }
        ],
        areas: [
          {
            id: "LP_A1",
            title: "AREA 1: LEARNING ABILITY & ACADEMIC DEVELOPMENT",
            subDomains: [
              {
                id: "LP_1A",
                title: "A. Language & Reading Skills",
                items: [
                  "Recognises Malayalam letters.",
                  "Recognises English letters.",
                  "Recognises basic letter sounds.",
                  "Reads familiar, simple words.",
                  "Reads simple sentences appropriate to the child's class level.",
                  "Understands what is read and answers simple questions.",
                  "Identifies familiar objects and actions from pictures.",
                  "Expresses thoughts verbally.",
                  "Retells key information from a short story or event."
                ]
              },
              {
                id: "LP_1B",
                title: "B. Writing Skills",
                items: [
                  "Holds and controls a pencil or pen appropriately for the task.",
                  "Copies letters and numbers.",
                  "Writes own name and familiar words.",
                  "Attempts to write simple words from dictation.",
                  "Maintains appropriate spacing between words.",
                  "Uses drawing to express an idea.",
                  "Writes simple sentences appropriate to the child's class level."
                ]
              },
              {
                id: "LP_1C",
                title: "C. Mathematical Ability",
                items: [
                  "Recognises numbers.",
                  "Counts objects accurately.",
                  "Understands number sequence.",
                  "Identifies more/less and greater/smaller.",
                  "Performs addition appropriate to the child's class level.",
                  "Performs subtraction appropriate to the child's class level.",
                  "Recognises basic shapes and patterns.",
                  "Applies simple concepts of time and money in daily situations."
                ]
              },
              {
                id: "LP_1D",
                title: "D. Cognitive & Learning Skills",
                items: [
                  "Maintains attention during an activity.",
                  "Remembers and follows spoken instructions.",
                  "Recalls objects or pictures shown earlier.",
                  "Follows one- or two-step instructions.",
                  "Classifies objects by colour, shape, size or category.",
                  "Identifies similarities and differences.",
                  "Arranges pictures or events in a logical sequence.",
                  "Attempts to solve simple puzzles and problems.",
                  "Shows curiosity and interest in learning new activities.",
                  "Attempts to complete tasks and asks for help when needed."
                ]
              }
            ]
          },
          {
            id: "LP_A2",
            title: "AREA 2: DIGITAL INVOLVEMENT & BEHAVIOUR",
            subDomains: [
              {
                id: "LP_2A",
                title: "A. Digital Usage Pattern",
                items: [
                  "Uses digital devices such as mobile phones, tablets or television.",
                  "Parent/guardian has an approximate record of daily screen time.",
                  "Can describe the type of content or games usually accessed.",
                  "Shows basic understanding of the difference between educational and entertainment use.",
                  "Has appropriate adult supervision while using digital devices.",
                  "Screen use during meals, study time and before sleep has been discussed with the parent."
                ]
              },
              {
                id: "LP_2B",
                title: "B. Digital Habits & Self-Regulation",
                items: [
                  "Responds appropriately when asked to stop or put away a device.",
                  "Engages in play and other activities without a screen.",
                  "Shows interest in books, toys, art or hands-on activities.",
                  "Screen use does not regularly interrupt learning activities, or concerns are documented.",
                  "Any effect of screen use on sleep or family interaction has been explored.",
                  "Knows basic online safety rules, such as not communicating with strangers online."
                ]
              }
            ]
          },
          {
            id: "LP_A3",
            title: "AREA 3: HUMANITY, MORAL VALUES & PRACTICAL LIFE SKILLS",
            subDomains: [
              {
                id: "LP_3A",
                title: "A. Moral Values & Empathy",
                items: [
                  "Treats others with kindness and respect.",
                  "Attempts to share toys or belongings.",
                  "Expresses gratitude when someone helps.",
                  "Notices when another person is upset or needs help.",
                  "Attempts to recognise and acknowledge mistakes.",
                  "Shows a basic understanding of honesty.",
                  "Respects other people's feelings and personal boundaries."
                ]
              },
              {
                id: "LP_3B",
                title: "B. Social & Emotional Skills",
                items: [
                  "Interacts with children of a similar age.",
                  "Participates in group activities.",
                  "Expresses feelings verbally or in an appropriate way.",
                  "Waits for turns and listens when others are speaking.",
                  "Attempts to manage disappointment with age-appropriate support.",
                  "Seeks help instead of using physical aggression when a problem occurs.",
                  "Shows basic awareness of how to behave with familiar and unfamiliar people."
                ]
              },
              {
                id: "LP_3C",
                title: "C. Practical Thinking & Safety",
                items: [
                  "Identifies common household objects and their uses.",
                  "Recognises potentially dangerous objects or situations.",
                  "Knows to ask a trusted adult for help when in danger.",
                  "Understands the need for adult support when crossing roads.",
                  "Recognises and takes care of personal belongings.",
                  "Follows familiar daily routines.",
                  "Understands simple cause-and-effect relationships.",
                  "Attempts to make simple decisions in everyday situations."
                ]
              },
              {
                id: "LP_3D",
                title: "D. Independent Living Skills",
                items: [
                  "Eats independently, as appropriate for age and ability.",
                  "Completes age-appropriate steps of dressing.",
                  "Follows personal hygiene routines such as handwashing and toothbrushing.",
                  "Attempts to organise school bag and learning materials.",
                  "Puts used items back in their proper place.",
                  "Participates in simple, age-appropriate household responsibilities."
                ]
              }
            ]
          }
        ],
        parentInterview: [
          "Approximately how much total screen time (hours/minutes) does the child have daily?",
          "What type of content or apps does the child usually access?",
          "How does the child respond when screen time is limited?",
          "Does screen use affect sleep, meals, study or play? If yes, how?",
          "What activities does the child enjoy apart from digital devices?",
          "What helps the child learn or complete tasks at home?",
          "Parent's main concerns:"
        ],
        practicalActivities: [],
        talents: [
          "Drawing and painting",
          "Music and rhythm",
          "Dance and movement",
          "Sports and physical activities",
          "Building and construction activities",
          "Storytelling and speaking",
          "Creative thinking",
          "Helping others and leadership",
          "Hands-on activities",
          "Nature and observation"
        ],
        lpInterventions: [
          "Reading", "Writing", "Mathematics", "Attention", "Memory",
          "Language", "Digital habits", "Social skills", "Emotional skills",
          "Practical life skills", "Talent enrichment"
        ],
        idpRows: [
          "Language & Reading",
          "Writing & Fine Motor",
          "Mathematics",
          "Cognitive & Learning Skills",
          "Digital Habits & Safety",
          "Moral Values & Social-Emotional Skills",
          "Practical Thinking & Independent Living",
          "Talents & Interests"
        ]
      },

      UP: {
        code: "UP",
        shortTitle: "UP LEVEL — CHILD ASSESSMENT CHECKLIST",
        badge: "Upper Primary | Classes 5–7",
        ageRange: "Approximate age: 10–13 years",
        purpose: "To identify each child's learning abilities, strengths, support needs, digital habits, social understanding and practical life skills. Assess through interaction, observation and activities—not questions alone.",
        profileFields: [
          { key: "studentName", label: "Child's Name", type: "text", placeholder: "Full name" },
          { key: "dobAge", label: "Date of Birth / Age", type: "text", placeholder: "e.g., 11 yrs" },
          { key: "school", label: "School", type: "text", placeholder: "School name" },
          { key: "presentClass", label: "Present Class", type: "text", placeholder: "e.g., Class 6" },
          { key: "medium", label: "Medium of Instruction", type: "text", placeholder: "e.g., English" },
          { key: "assessmentDate", label: "Assessment Date", type: "date" },
          { key: "parentName", label: "Parent / Guardian", type: "text", placeholder: "Parent/Guardian" },
          { key: "contact", label: "Contact Number", type: "text", placeholder: "Phone number" },
          { key: "assessor", label: "Assessor", type: "text", placeholder: "Assessor name" },
          { key: "languages", label: "Languages Used", type: "text", placeholder: "e.g., English, Malayalam" }
        ],
        areas: [
          {
            id: "UP_A1",
            title: "AREA 1: LEARNING ABILITY & ACADEMIC DEVELOPMENT",
            subDomains: [
              {
                id: "UP_1A",
                title: "A. Language, reading and comprehension",
                items: [
                  "Reads age/class-appropriate text with reasonable accuracy.",
                  "Reads with suitable pace, phrasing and fluency.",
                  "Understands the main idea of a passage.",
                  "Identifies key details and answers factual questions.",
                  "Makes simple inferences and predicts what may happen next.",
                  "Understands vocabulary from context and uses new words.",
                  "Follows spoken instructions containing three or more steps.",
                  "Expresses ideas clearly in conversation or discussion.",
                  "Retells a story or explains information in a logical order.",
                  "Recognises and corrects misunderstandings by asking questions."
                ]
              },
              {
                id: "UP_1B",
                title: "B. Writing and written expression",
                items: [
                  "Writes legibly with appropriate letter formation and spacing.",
                  "Writes complete sentences with appropriate punctuation.",
                  "Uses basic grammar appropriately for the language being assessed.",
                  "Organises ideas into a short paragraph with a clear sequence.",
                  "Writes a short description, personal account or story.",
                  "Summarises information in their own words.",
                  "Copies information accurately from a board or book.",
                  "Spells familiar and grade-appropriate words accurately.",
                  "Reviews written work and makes corrections when prompted.",
                  "Completes written tasks within a reasonable, individually appropriate time."
                ]
              },
              {
                id: "UP_1C",
                title: "C. Mathematics and applied numeracy",
                items: [
                  "Reads, writes, compares and orders numbers appropriate to class level.",
                  "Understands place value and number relationships.",
                  "Performs age/class-appropriate addition and subtraction.",
                  "Uses multiplication and division concepts in suitable tasks.",
                  "Understands fractions and simple decimals as taught.",
                  "Recognises common 2D/3D shapes and basic spatial concepts.",
                  "Identifies patterns and continues a number or shape sequence.",
                  "Solves simple word problems and identifies the required operation.",
                  "Reads simple tables, charts or graphs.",
                  "Applies money, measurement and time concepts to everyday situations."
                ]
              },
              {
                id: "UP_1D",
                title: "D. Attention, memory and executive learning skills",
                items: [
                  "Begins a familiar task after receiving instructions.",
                  "Maintains attention for an age- and task-appropriate period.",
                  "Follows multi-step instructions in the correct order.",
                  "Remembers and uses information recently taught.",
                  "Recalls visual information such as pictures, symbols or patterns.",
                  "Recalls spoken information such as words or short instructions.",
                  "Plans the steps needed to complete a task.",
                  "Organises books, materials and schoolwork.",
                  "Manages time and completes class/homework tasks with appropriate support.",
                  "Checks work and notices simple errors.",
                  "Persists when a task becomes challenging.",
                  "Transfers a learned skill to a new but similar activity."
                ]
              },
              {
                id: "UP_1E",
                title: "E. Reasoning, creativity and learning approach",
                items: [
                  "Identifies similarities, differences and relationships.",
                  "Groups or classifies objects/information using a stated rule.",
                  "Explains how they arrived at an answer.",
                  "Uses logical reasoning to solve an unfamiliar problem.",
                  "Suggests more than one way to solve a task.",
                  "Shows curiosity and asks relevant questions.",
                  "Uses feedback to improve a response or product.",
                  "Shows interest or confidence in at least one learning area."
                ]
              }
            ]
          },
          {
            id: "UP_A2",
            title: "AREA 2: DIGITAL INVOLVEMENT & DIGITAL BEHAVIOUR",
            subDomains: [
              {
                id: "UP_2A",
                title: "A. Digital access and usage pattern",
                items: [
                  "Uses a smartphone, tablet, computer or television on a typical day.",
                  "Can describe the main purposes of device use (learning, communication, games, videos, etc.).",
                  "Uses digital devices for schoolwork or learning when appropriate.",
                  "Uses entertainment apps, games or video platforms.",
                  "Uses social media or messaging apps (record platform/age suitability separately).",
                  "Uses devices during meals, study time or family activities.",
                  "Uses a device close to bedtime or during the night.",
                  "Has access to age-appropriate adult guidance while online."
                ]
              },
              {
                id: "UP_2B",
                title: "B. Self-regulation, safety and impact",
                items: [
                  "Can stop device use at an agreed time with reasonable support.",
                  "Follows family/school rules for device use.",
                  "Can shift from screen activities to non-screen tasks.",
                  "Screen use does not regularly interfere with homework or daily responsibilities.",
                  "Screen use does not regularly displace sleep, physical activity or face-to-face interaction.",
                  "Knows not to share passwords, home address, phone number or private images.",
                  "Knows to tell a trusted adult about upsetting, frightening or inappropriate content.",
                  "Understands that online messages, images and people may not be trustworthy.",
                  "Shows respectful behaviour when communicating online.",
                  "Can identify when online information may be misleading and check with a trusted source."
                ]
              }
            ]
          },
          {
            id: "UP_A3",
            title: "AREA 3: HUMANITY, SOCIAL VALUES & PRACTICAL LIFE SKILLS",
            subDomains: [
              {
                id: "UP_3A",
                title: "A. Empathy, respect and ethical understanding",
                items: [
                  "Recognises that other people may have different feelings or viewpoints.",
                  "Shows consideration when someone is upset or needs help.",
                  "Uses respectful language with peers and adults.",
                  "Shares resources and takes turns in group activities.",
                  "Understands fairness and can explain a simple fair/unfair situation.",
                  "Can distinguish honesty from lying in familiar situations.",
                  "Accepts responsibility for their actions and attempts to correct mistakes.",
                  "Respects differences in ability, language, culture and background.",
                  "Understands that teasing, bullying and exclusion can hurt others.",
                  "Shows care for shared spaces, animals and the environment."
                ]
              },
              {
                id: "UP_3B",
                title: "B. Social interaction and emotional skills",
                items: [
                  "Initiates or responds to age-appropriate social interaction.",
                  "Participates in pair or group activities.",
                  "Listens while another person is speaking.",
                  "Expresses needs, opinions and feelings in an understandable way.",
                  "Identifies common emotions in self and others.",
                  "Uses an appropriate strategy when frustrated or disappointed.",
                  "Waits, negotiates and takes turns during shared activities.",
                  "Handles disagreement without aggression or intimidation.",
                  "Seeks help from a trusted adult when needed.",
                  "Recognises personal boundaries and respects others' boundaries."
                ]
              },
              {
                id: "UP_3C",
                title: "C. Practical thinking, common sense and safety",
                items: [
                  "Chooses a sensible response to a familiar everyday problem.",
                  "Identifies common risks at home, school and in public places.",
                  "Explains basic pedestrian and road-crossing safety.",
                  "Knows what to do and whom to approach if separated from family/school group.",
                  "Knows how to seek help in an emergency.",
                  "Uses common household and school items safely.",
                  "Understands basic hygiene and health routines.",
                  "Makes simple choices and can explain a reason.",
                  "Understands basic money use, prices and change in familiar situations.",
                  "Uses public/shared facilities responsibly."
                ]
              },
              {
                id: "UP_3D",
                title: "D. Independence and responsibility",
                items: [
                  "Organises school bag, books and personal materials.",
                  "Keeps personal belongings in an appropriate place.",
                  "Follows a daily routine with age-appropriate reminders.",
                  "Manages basic personal hygiene independently or with appropriate support.",
                  "Completes an assigned household or classroom responsibility.",
                  "Prepares for school and checks required materials.",
                  "Uses time appropriately for study, rest and recreation.",
                  "Makes safe, age-appropriate decisions when an adult is not immediately beside them.",
                  "Recognises when a task is beyond their ability and asks for help.",
                  "Takes responsibility for completing agreed tasks."
                ]
              }
            ]
          }
        ],
        parentInterview: [
          "On a usual school day and a weekend day, approximately how much screen time does the child have?",
          "Which devices, apps, games or content does the child use most often?",
          "Is screen use supervised? What rules or limits are followed at home?",
          "Have you noticed any effect on sleep, homework, mood, physical activity or family interaction?",
          "How does the child respond when device use ends or is restricted?",
          "What activities does the child enjoy away from screens?"
        ],
        practicalActivities: [
          { name: "Reading for meaning", task: "Give a short age-appropriate passage; ask the child to retell it and answer questions.", observe: "Accuracy, fluency, comprehension, inference and confidence." },
          { name: "Everyday maths", task: "Use a pretend shop with labelled items and play money.", observe: "Number sense, calculation, decision-making and money concepts." },
          { name: "Planning task", task: "Ask the child to plan how to complete a small project with 3–4 steps.", observe: "Sequencing, organisation, flexibility and persistence." },
          { name: "Digital safety scenarios", task: "Ask what they would do if a stranger online requested personal details or sent an upsetting message.", observe: "Risk recognition, privacy awareness and help-seeking." },
          { name: "Empathy scenario", task: "Discuss a short story where one child is excluded from a game.", observe: "Perspective-taking, fairness and possible helpful actions." },
          { name: "Practical problem", task: "Present a safe scenario: a water bottle spills on a classroom floor.", observe: "Noticing risk, taking sensible action and seeking help." }
        ],
        talents: [
          "Art, drawing, craft or design",
          "Music, rhythm or dance",
          "Sports, movement or coordination",
          "Building, assembling or hands-on tasks",
          "Storytelling, speaking or drama",
          "Leadership, teamwork or organising",
          "Nature, animals or environmental interests",
          "Technology, coding or digital creativity",
          "Problem-solving or practical creativity",
          "Other observed interest or emerging strength"
        ],
        idpRows: [
          "Reading / writing",
          "Mathematics",
          "Attention / memory / planning",
          "Digital habits / online safety",
          "Social-emotional skills",
          "Practical life skills",
          "Talent development"
        ]
      },

      HS: {
        code: "HS",
        shortTitle: "HS LEVEL — CHILD ASSESSMENT CHECKLIST",
        badge: "High School | Classes 8–10",
        ageRange: "Approximate age: 13–16 years",
        purpose: "To identify the learner's academic abilities, thinking skills, digital habits, social-emotional development, values, practical judgement and areas requiring support. Use observation, age-appropriate tasks, learner interaction and parent/teacher input.",
        profileFields: [
          { key: "studentName", label: "Student Name", type: "text", placeholder: "Full name" },
          { key: "dobAge", label: "Date of Birth / Age", type: "text", placeholder: "e.g., 14 yrs" },
          { key: "school", label: "School", type: "text", placeholder: "School name" },
          { key: "presentClass", label: "Present Class", type: "text", placeholder: "e.g., Class 9" },
          { key: "medium", label: "Medium of Instruction", type: "text", placeholder: "e.g., English" },
          { key: "assessmentDate", label: "Assessment Date", type: "date" },
          { key: "parentName", label: "Parent / Guardian", type: "text", placeholder: "Parent/Guardian" },
          { key: "contact", label: "Contact Number", type: "text", placeholder: "Phone number" },
          { key: "assessor", label: "Assessor", type: "text", placeholder: "Assessor name" },
          { key: "languages", label: "Languages Used", type: "text", placeholder: "e.g., English, Malayalam" },
          { key: "stream", label: "Subjects / Stream", type: "text", placeholder: "Core subjects" },
          { key: "accommodations", label: "Relevant Accommodations", type: "text", placeholder: "Access needs / accommodations if any" }
        ],
        areas: [
          {
            id: "HS_A1",
            title: "AREA 1: LEARNING ABILITY & ACADEMIC DEVELOPMENT",
            subDomains: [
              {
                id: "HS_1A",
                title: "A. Reading, comprehension and language",
                items: [
                  "Reads class-appropriate texts accurately and with suitable fluency.",
                  "Identifies the central idea, key details and purpose of a text.",
                  "Makes inferences and draws conclusions using evidence from a passage.",
                  "Understands subject-specific vocabulary and unfamiliar words from context.",
                  "Compares information across two short texts or sources.",
                  "Summarises information in their own words without losing key meaning.",
                  "Follows complex spoken and written instructions.",
                  "Expresses ideas clearly in discussion, presentation or explanation.",
                  "Recognises ambiguity, bias or unsupported claims in a simple text.",
                  "Uses appropriate language for different audiences and situations."
                ]
              },
              {
                id: "HS_1B",
                title: "B. Writing and communication",
                items: [
                  "Structures paragraphs with a clear topic, supporting details and conclusion.",
                  "Writes coherent essays, reports, letters or subject-based answers appropriate to class.",
                  "Uses grammar, punctuation and spelling appropriately.",
                  "Explains opinions with relevant reasons or examples.",
                  "Organises information logically using headings, notes or diagrams.",
                  "Paraphrases and summarises without copying entire passages.",
                  "Completes written work with legible presentation and appropriate detail.",
                  "Reviews, edits and improves written work using feedback.",
                  "Records notes from a lesson, text or presentation.",
                  "Communicates questions and asks for clarification when needed."
                ]
              },
              {
                id: "HS_1C",
                title: "C. Mathematics, reasoning and subject application",
                items: [
                  "Uses number operations, fractions, decimals, percentages and ratios at class level.",
                  "Understands and applies algebraic concepts taught at the current level.",
                  "Interprets graphs, tables, charts and numerical information.",
                  "Chooses an appropriate method to solve a mathematical problem.",
                  "Shows working steps and explains mathematical reasoning.",
                  "Applies measurement, geometry and spatial concepts to tasks.",
                  "Identifies patterns, relationships and logical sequences.",
                  "Uses scientific or subject concepts to explain familiar real-life situations.",
                  "Distinguishes relevant from irrelevant information in a problem.",
                  "Checks whether an answer is reasonable and corrects errors."
                ]
              },
              {
                id: "HS_1D",
                title: "D. Attention, memory and executive functioning",
                items: [
                  "Begins tasks independently after instructions are given.",
                  "Maintains attention during an age- and task-appropriate activity.",
                  "Remembers and follows multi-step instructions.",
                  "Recalls previously learned information when required.",
                  "Plans and breaks a large task into manageable steps.",
                  "Prioritises tasks according to urgency and importance.",
                  "Organises study materials, notes and assignments.",
                  "Estimates time and completes work within an agreed schedule.",
                  "Monitors progress and checks work before submission.",
                  "Adapts a plan when a task or situation changes.",
                  "Persists after making mistakes or facing a difficult task.",
                  "Uses effective study strategies such as revision, practice or self-testing."
                ]
              },
              {
                id: "HS_1E",
                title: "E. Critical thinking, creativity and learning motivation",
                items: [
                  "Distinguishes fact, opinion and assumption in familiar examples.",
                  "Evaluates whether a reason or piece of evidence supports a conclusion.",
                  "Considers more than one perspective before forming an opinion.",
                  "Identifies a problem and suggests possible solutions.",
                  "Explains the reasons behind a decision or answer.",
                  "Connects ideas across subjects or applies learning to new situations.",
                  "Shows curiosity and asks meaningful questions.",
                  "Generates original ideas or alternative approaches.",
                  "Accepts constructive feedback and uses it to improve.",
                  "Identifies personal academic strengths and areas to develop."
                ]
              }
            ]
          },
          {
            id: "HS_A2",
            title: "AREA 2: DIGITAL INVOLVEMENT & DIGITAL WELL-BEING",
            subDomains: [
              {
                id: "HS_2A",
                title: "A. Digital access, purpose and learning use",
                items: [
                  "Uses a phone, computer, tablet or other digital device on a typical day.",
                  "Can estimate and describe weekday and weekend screen time.",
                  "Uses digital tools for research, assignments or revision.",
                  "Can search for information using relevant keywords.",
                  "Compares information across sources rather than relying on the first result.",
                  "Uses educational platforms or productivity tools appropriately.",
                  "Uses social media, messaging, video or gaming platforms (record details separately).",
                  "Can distinguish learning-related use from entertainment use.",
                  "Understands that AI-generated or online content may contain errors.",
                  "Can identify the source or author of information used in schoolwork."
                ]
              },
              {
                id: "HS_2B",
                title: "B. Self-regulation, safety, ethics and impact",
                items: [
                  "Follows agreed limits or routines for device use.",
                  "Can stop or pause screen use to attend to an important responsibility.",
                  "Manages notifications and other digital distractions during study.",
                  "Screen use does not regularly interfere with sleep or daily functioning.",
                  "Maintains offline activities, exercise and face-to-face relationships.",
                  "Protects passwords, personal information and account access.",
                  "Understands privacy settings and the risks of sharing personal content.",
                  "Recognises cyberbullying, scams, grooming or inappropriate contact and knows how to seek help.",
                  "Communicates respectfully and considers the impact of online posts.",
                  "Checks credibility, date and source before sharing information.",
                  "Respects copyright and acknowledges sources in schoolwork.",
                  "Uses AI tools honestly and does not present generated work as their own when this is prohibited."
                ]
              }
            ]
          },
          {
            id: "HS_A3",
            title: "AREA 3: HUMANITY, SOCIAL-EMOTIONAL & PRACTICAL LIFE SKILLS",
            subDomains: [
              {
                id: "HS_3A",
                title: "A. Values, empathy and ethical judgement",
                items: [
                  "Recognises and considers the feelings and viewpoints of others.",
                  "Demonstrates empathy through words or helpful actions.",
                  "Respects differences in ability, identity, language, culture and background.",
                  "Recognises bullying, discrimination and exclusion and understands their impact.",
                  "Shows honesty in everyday situations and academic work.",
                  "Accepts responsibility for choices and their consequences.",
                  "Can discuss fairness, respect, consent and personal boundaries at an age-appropriate level.",
                  "Considers how a decision may affect other people.",
                  "Respects shared property, public spaces and the environment.",
                  "Can identify a trusted adult or appropriate support when a situation feels unsafe."
                ]
              },
              {
                id: "HS_3B",
                title: "B. Social interaction and emotional regulation",
                items: [
                  "Communicates needs, opinions and disagreement respectfully.",
                  "Listens to others without regularly interrupting or dismissing them.",
                  "Participates constructively in group tasks and teamwork.",
                  "Recognises common emotional triggers and describes feelings.",
                  "Uses safe strategies to manage stress, frustration or disappointment.",
                  "Resolves ordinary disagreements through discussion or help-seeking.",
                  "Accepts feedback without becoming persistently disengaged.",
                  "Respects boundaries and recognises when others need space.",
                  "Seeks help from a trusted person when facing pressure or distress.",
                  "Shows confidence to express a different opinion respectfully."
                ]
              },
              {
                id: "HS_3C",
                title: "C. Practical thinking, safety and everyday judgement",
                items: [
                  "Identifies risks in familiar home, school and community situations.",
                  "Chooses a safe response to an emergency scenario and knows whom to contact.",
                  "Understands road, travel and public-place safety appropriate to age.",
                  "Can evaluate a simple real-life problem and identify practical options.",
                  "Understands basic health, hygiene and personal-care responsibilities.",
                  "Recognises unsafe requests, coercion or pressure from peers or strangers.",
                  "Uses basic money concepts such as budgeting, price comparison and change.",
                  "Reads and follows simple instructions on labels, notices or forms.",
                  "Uses time and resources responsibly when completing a practical task.",
                  "Explains the likely consequences of a practical decision."
                ]
              },
              {
                id: "HS_3D",
                title: "D. Independence, responsibility and future readiness",
                items: [
                  "Organises personal belongings, school materials and study space.",
                  "Maintains an appropriate personal hygiene routine.",
                  "Plans homework, revision and other responsibilities.",
                  "Completes agreed household or community responsibilities.",
                  "Can prepare a simple snack or carry out a safe age-appropriate daily task.",
                  "Can communicate basic needs and relevant information in the community.",
                  "Understands the importance of saving, spending and budgeting.",
                  "Identifies personal interests, strengths and areas for improvement.",
                  "Explores possible careers or further-study pathways.",
                  "Sets a realistic short-term goal and identifies steps to achieve it.",
                  "Recognises when independent action is appropriate and when adult guidance is needed.",
                  "Shows accountability for commitments and deadlines."
                ]
              }
            ]
          }
        ],
        parentInterview: [
          "On school days and weekends, approximately how much recreational and educational screen time does the student have?",
          "What devices, apps, games and online platforms are used most often?",
          "What household agreements or boundaries exist for device use?",
          "Have you noticed effects on sleep, study, mood, relationships or physical activity?",
          "Can the student stop device use and move to another activity without major difficulty?",
          "Has the student experienced upsetting online contact, cyberbullying or unsafe content? (Discuss sensitively.)"
        ],
        practicalActivities: [
          { name: "Study planning", task: "Give a sample weekly workload and ask the student to plan study, rest and activities.", observe: "Prioritising, realistic time estimates, flexibility and organisation." },
          { name: "Source checking", task: "Provide two short online-style information extracts with different reliability cues.", observe: "Evidence checking, source awareness and critical thinking." },
          { name: "Budget challenge", task: "Give a fictional amount of money and a list of essential and optional expenses.", observe: "Calculation, prioritising, comparison and reasoning." },
          { name: "Ethical dilemma", task: "Discuss a fictional case of a friend being excluded or pressured to cheat.", observe: "Empathy, values, independent judgement and help-seeking." },
          { name: "Digital safety scenario", task: "Ask how they would respond to a suspicious link, request for private images or cyberbullying.", observe: "Risk recognition, privacy awareness and safe action." },
          { name: "Everyday problem-solving", task: "Present a safe scenario such as missing a bus or discovering a small spill in a shared area.", observe: "Calm decision-making, practical action and seeking appropriate help." }
        ],
        talents: [
          "Visual art, design, craft or creative production.",
          "Music, rhythm, dance, drama or performance.",
          "Sports, movement, physical coordination or fitness.",
          "Technology, coding, digital design or media creation.",
          "Writing, reading, languages, debate or public speaking.",
          "Leadership, teamwork, mentoring or organising.",
          "Practical making, repair, building or hands-on work.",
          "Scientific curiosity, investigation or experimentation.",
          "Entrepreneurial ideas, initiative or problem-solving.",
          "Care for nature, animals or community activities."
        ],
        idpRows: [
          "Academic skills / subject learning",
          "Study strategies & executive skills",
          "Digital wellbeing & online safety",
          "Social-emotional development",
          "Values & practical judgement",
          "Independence / daily living",
          "Career and future pathway exploration",
          "Talent / interest development"
        ]
      },

      HSS: {
        code: "HSS",
        shortTitle: "HSS LEVEL — CHILD ASSESSMENT CHECKLIST",
        badge: "Higher Secondary | Classes 11–12",
        ageRange: "Approximate age: 16–18 years",
        purpose: "To understand the learner's academic readiness, independent learning, digital judgement, ethical reasoning, social-emotional development, practical independence and future pathway readiness.",
        profileFields: [
          { key: "studentName", label: "Student Name", type: "text", placeholder: "Full name" },
          { key: "dobAge", label: "Date of Birth / Age", type: "text", placeholder: "e.g., 17 yrs" },
          { key: "school", label: "School", type: "text", placeholder: "School name" },
          { key: "presentClass", label: "Present Class", type: "text", placeholder: "e.g., Class 12" },
          { key: "medium", label: "Medium of Instruction", type: "text", placeholder: "e.g., English" },
          { key: "assessmentDate", label: "Assessment Date", type: "date" },
          { key: "parentName", label: "Parent / Guardian", type: "text", placeholder: "Parent/Guardian" },
          { key: "contact", label: "Contact Number", type: "text", placeholder: "Phone number" },
          { key: "assessor", label: "Assessor", type: "text", placeholder: "Assessor name" },
          { key: "languages", label: "Languages Used", type: "text", placeholder: "e.g., English, Malayalam" },
          { key: "stream", label: "Subject Group / Stream", type: "text", placeholder: "e.g., Science / Commerce / Humanities" },
          { key: "careerInterest", label: "Career Interest (if known)", type: "text", placeholder: "e.g., Engineering, Design, Healthcare..." }
        ],
        areas: [
          {
            id: "HSS_A1",
            title: "AREA 1: LEARNING ABILITY & ACADEMIC DEVELOPMENT",
            subDomains: [
              {
                id: "HSS_1A",
                title: "A. Advanced reading, comprehension and information literacy",
                items: [
                  "Reads and interprets subject-related texts appropriate to the student's course.",
                  "Identifies the central argument, evidence, assumptions and conclusion in a text.",
                  "Compares multiple sources and identifies agreement, disagreement or gaps.",
                  "Distinguishes fact, opinion, interpretation and unsupported claims.",
                  "Interprets complex vocabulary and technical terms using context or references.",
                  "Summarises lengthy information accurately in concise notes.",
                  "Draws reasoned inferences and supports conclusions with evidence.",
                  "Evaluates the reliability, relevance and limitations of information sources.",
                  "Understands charts, research summaries, reports or data-based information.",
                  "Communicates complex information clearly to an intended audience."
                ]
              },
              {
                id: "HSS_1B",
                title: "B. Academic writing and communication",
                items: [
                  "Structures essays, reports, project work or subject answers coherently.",
                  "Develops a clear argument supported by relevant evidence or examples.",
                  "Uses subject-specific vocabulary accurately.",
                  "Paraphrases and synthesises information from more than one source.",
                  "Uses citations or acknowledges sources according to given instructions.",
                  "Edits writing for clarity, accuracy, grammar and presentation.",
                  "Prepares and delivers an organised oral presentation.",
                  "Participates in academic discussion and responds constructively to questions.",
                  "Communicates professionally through appropriate written formats.",
                  "Adapts communication to purpose, audience and context."
                ]
              },
              {
                id: "HSS_1C",
                title: "C. Subject application, quantitative and research skills",
                items: [
                  "Applies subject knowledge to unfamiliar or real-world situations.",
                  "Interprets numerical information, percentages, ratios or statistics relevant to the course.",
                  "Uses mathematical or logical reasoning to solve multi-step problems.",
                  "Reads and interprets graphs, tables, diagrams or datasets.",
                  "Selects an appropriate method or tool for a given academic problem.",
                  "Explains the process and reasoning used to reach a conclusion.",
                  "Identifies a research question or problem for a project.",
                  "Finds and records relevant information from credible sources.",
                  "Organises findings and presents conclusions supported by evidence.",
                  "Recognises limitations, uncertainty or possible errors in information."
                ]
              },
              {
                id: "HSS_1D",
                title: "D. Independent learning and executive functioning",
                items: [
                  "Sets realistic academic goals for a term, examination or project.",
                  "Breaks long-term assignments into manageable stages.",
                  "Prioritises tasks and manages competing deadlines.",
                  "Creates and follows a workable study timetable.",
                  "Uses effective revision strategies and monitors learning progress.",
                  "Studies independently and seeks help when genuinely needed.",
                  "Maintains organised notes, files and learning materials.",
                  "Manages examination preparation and assessment requirements.",
                  "Reflects on feedback and adjusts learning strategies.",
                  "Persists through challenging work and manages setbacks constructively.",
                  "Balances study with sleep, recreation and other responsibilities.",
                  "Identifies when additional academic or accessibility support is needed."
                ]
              },
              {
                id: "HSS_1E",
                title: "E. Critical thinking, creativity and decision-making",
                items: [
                  "Evaluates claims by examining evidence and reasoning.",
                  "Identifies assumptions, bias or conflicting perspectives.",
                  "Considers ethical, social or practical implications of an issue.",
                  "Generates more than one possible solution to a complex problem.",
                  "Chooses a solution using relevant criteria and explains the choice.",
                  "Connects concepts across subjects or fields of interest.",
                  "Develops original ideas for projects or practical challenges.",
                  "Revises an approach when new evidence becomes available.",
                  "Recognises uncertainty and avoids unsupported conclusions.",
                  "Reflects on personal strengths, limitations and learning goals."
                ]
              }
            ]
          },
          {
            id: "HSS_A2",
            title: "AREA 2: DIGITAL INVOLVEMENT, DIGITAL LITERACY & WELL-BEING",
            subDomains: [
              {
                id: "HSS_2A",
                title: "A. Digital use and academic productivity",
                items: [
                  "Can describe typical daily screen time separately for study and recreation.",
                  "Uses digital platforms to access course materials and learning resources.",
                  "Uses search strategies to locate relevant academic information.",
                  "Evaluates the credibility, authorship, date and purpose of online sources.",
                  "Uses digital tools to create documents, presentations or data-based work.",
                  "Organises digital files, notes, calendars and assignment deadlines.",
                  "Uses AI tools with awareness of limitations, errors and possible bias.",
                  "Verifies AI-generated information before relying on or submitting it.",
                  "Discloses or acknowledges digital and AI assistance when required.",
                  "Understands plagiarism, copyright, academic integrity and proper attribution."
                ]
              },
              {
                id: "HSS_2B",
                title: "B. Digital safety, ethics and self-regulation",
                items: [
                  "Maintains strong passwords and uses appropriate account security practices.",
                  "Understands privacy settings and limits unnecessary sharing of personal data.",
                  "Recognises phishing, scams, impersonation and suspicious links.",
                  "Knows how to respond to cyberbullying, harassment or unsafe online contact.",
                  "Communicates respectfully and responsibly on digital platforms.",
                  "Considers the permanence and possible consequences of online posts.",
                  "Manages notifications and screen distractions during focused work.",
                  "Maintains healthy boundaries around recreational screen use.",
                  "Digital use does not regularly displace sleep, exercise or responsibilities.",
                  "Can take breaks from devices and participate in offline activities."
                ]
              }
            ]
          },
          {
            id: "HSS_A3",
            title: "AREA 3: HUMANITY, ETHICAL VALUES, PRACTICAL LIFE SKILLS & FUTURE READINESS",
            subDomains: [
              {
                id: "HSS_3A",
                title: "A. Ethical reasoning, empathy and social responsibility",
                items: [
                  "Considers the rights, dignity and viewpoints of other people.",
                  "Demonstrates empathy through respectful communication and action.",
                  "Recognises discrimination, exploitation, bullying and exclusion.",
                  "Can reason about fairness, honesty, consent and personal boundaries.",
                  "Considers the wider impact of personal choices on others and society.",
                  "Shows accountability and takes steps to correct mistakes.",
                  "Respects diversity and interacts without demeaning stereotypes.",
                  "Understands responsible participation in community and civic life.",
                  "Shows concern for environmental sustainability and shared resources.",
                  "Can identify trusted support when facing an ethical or safety concern."
                ]
              },
              {
                id: "HSS_3B",
                title: "B. Emotional maturity, relationships and communication",
                items: [
                  "Identifies personal emotions and communicates them appropriately.",
                  "Uses constructive strategies to manage stress and pressure.",
                  "Responds to disagreement without intimidation or disrespect.",
                  "Maintains appropriate boundaries in friendships and relationships.",
                  "Recognises unhealthy pressure or controlling behaviour.",
                  "Listens to differing views and responds thoughtfully.",
                  "Contributes reliably to group work and shared responsibilities.",
                  "Accepts constructive criticism and reflects before reacting.",
                  "Seeks help when experiencing significant distress or uncertainty.",
                  "Shows confidence while respecting the rights and views of others."
                ]
              },
              {
                id: "HSS_3C",
                title: "C. Practical judgement, safety and community participation",
                items: [
                  "Assesses risks and chooses safe actions in unfamiliar everyday situations.",
                  "Knows how to contact appropriate emergency services or trusted support.",
                  "Understands personal, travel, road and public-place safety.",
                  "Recognises coercion, exploitation, scams and unsafe requests.",
                  "Can compare options and make reasoned everyday decisions.",
                  "Understands basic health, hygiene and preventive-care responsibilities.",
                  "Can read and respond to common forms, notices, labels or instructions.",
                  "Understands consumer awareness, digital payments and transaction safety.",
                  "Can plan a simple journey or community task with appropriate safety awareness.",
                  "Shows responsibility towards public property and community spaces."
                ]
              },
              {
                id: "HSS_3D",
                title: "D. Independent living and financial literacy",
                items: [
                  "Plans and manages a personal daily or weekly routine.",
                  "Maintains personal hygiene, clothing and health-related routines.",
                  "Prepares a simple meal or snack safely, where appropriate.",
                  "Manages basic household tasks and shared responsibilities.",
                  "Understands income, expenses, savings and budgeting.",
                  "Compares prices and makes informed purchasing decisions.",
                  "Understands basic banking, digital payment and transaction precautions.",
                  "Recognises common financial risks, fraud and misleading offers.",
                  "Maintains important personal documents and information safely.",
                  "Knows when and how to seek assistance for tasks beyond current ability."
                ]
              },
              {
                id: "HSS_3E",
                title: "E. Career awareness, higher education and future planning",
                items: [
                  "Identifies personal interests, strengths, values and areas for development.",
                  "Can name possible higher-education, training or employment pathways.",
                  "Understands basic entry requirements for a chosen pathway.",
                  "Explores reliable information about courses, careers or training options.",
                  "Identifies skills needed for a preferred career or further study.",
                  "Prepares a basic resume or personal profile with appropriate support.",
                  "Communicates strengths and experiences in an interview-style activity.",
                  "Sets short-term and longer-term goals and identifies next steps.",
                  "Understands workplace expectations such as punctuality and responsibility.",
                  "Recognises the need for lifelong learning and adapting to change."
                ]
              }
            ]
          }
        ],
        parentInterview: [
          "Approximately how much screen time is used for study and recreation on weekdays and weekends?",
          "What devices, apps, platforms or AI tools are used most often?",
          "Does digital use affect sleep, study, mood, relationships or daily responsibilities?",
          "What family expectations or agreements exist for device use?",
          "Does the student demonstrate safe and responsible online behaviour?",
          "Is any support needed for digital safety, focus or healthy routines?"
        ],
        practicalActivities: [
          { name: "Study & deadline planning", task: "Provide a fictional set of assignments, dates and commitments; ask the student to plan a realistic week.", observe: "Prioritising, time estimation, planning and flexibility." },
          { name: "Information evaluation", task: "Provide two short sources with different credibility indicators and ask which is more reliable and why.", observe: "Evidence checking, source evaluation and reasoning." },
          { name: "Budget and payment safety", task: "Give a fictional monthly budget and sample expenses; include a suspicious payment request scenario.", observe: "Budgeting, comparison, fraud awareness and decision-making." },
          { name: "Ethical dilemma", task: "Discuss a fictional situation involving academic dishonesty, peer pressure or unfair treatment.", observe: "Values, empathy, independent reasoning and accountability." },
          { name: "Career exploration", task: "Ask the student to identify a pathway of interest and find the skills and next steps required.", observe: "Self-awareness, research, planning and communication." },
          { name: "Digital safety scenario", task: "Present a phishing message or unsafe online request and ask what action should be taken.", observe: "Risk recognition, privacy and safe help-seeking." }
        ],
        talents: [
          "Academic inquiry, research or subject expertise.",
          "Art, design, craft, architecture or creative production.",
          "Music, dance, theatre, media or performance.",
          "Sports, fitness, movement or coaching.",
          "Technology, coding, digital design or content creation.",
          "Writing, languages, debate or public speaking.",
          "Leadership, teamwork, mentoring or community service.",
          "Entrepreneurship, initiative or business-related thinking.",
          "Practical making, repair, building or technical skills.",
          "Scientific investigation, nature or environmental interests."
        ],
        idpRows: [
          "Academic / subject learning",
          "Study habits & independent learning",
          "Digital literacy / safety / balance",
          "Social-emotional / ethical development",
          "Independent living / financial skills",
          "Career / further-study exploration",
          "Talent and interest development"
        ]
      }
    };
