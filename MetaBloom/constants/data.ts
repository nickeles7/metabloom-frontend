import {
  PiAirplaneTilt,
  PiClipboardText,
  PiCode,
  PiCodeFill,
  PiEnvelopeSimple,
  PiFileText,
  PiFire,
  PiGear,
  PiGraduationCap,
  PiGraduationCapFill,
  PiImage,
  PiImageFill,
  PiImageSquare,
  PiImageSquareFill,
  PiLaptop,
  PiLock,
  PiLockKey,
  PiMagicWand,
  PiMegaphone,
  PiMoon,
  PiPaintBrushHousehold,
  PiPaperPlaneTilt,
  PiPath,
  PiPencilSimpleLine,
  PiQuestion,
  PiRobot,
  PiRocketLaunch,
  PiSpeakerHigh,
  PiSpeakerHighFill,
  PiSun,
  PiVideo,
  PiVideoCameraFill,
} from "react-icons/pi";
import { v4 as uuidv4 } from "uuid";

//icons
import icon1 from "@/public/images/explore-article-icon-1.png";
import icon2 from "@/public/images/explore-article-icon-2.png";
import icon3 from "@/public/images/explore-article-icon-3.png";
import icon4 from "@/public/images/explore-article-icon-4.png";
import icon5 from "@/public/images/explore-article-icon-5.png";
import icon6 from "@/public/images/explore-article-icon-6.png";
import icon7 from "@/public/images/explore-article-icon-7.png";
import icon8 from "@/public/images/explore-article-icon-8.png";
import icon9 from "@/public/images/explore-article-icon-9.png";
import icon10 from "@/public/images/explore-article-icon-10.png";
import icon11 from "@/public/images/explore-article-icon-11.png";
import icon12 from "@/public/images/explore-article-icon-12.png";
import icon13 from "@/public/images/explore-article-icon-13.png";
import icon14 from "@/public/images/explore-article-icon-14.png";
import icon15 from "@/public/images/explore-article-icon-15.png";
import icon16 from "@/public/images/explore-article-icon-16.png";
import icon17 from "@/public/images/explore-article-icon-17.png";
import icon18 from "@/public/images/explore-article-icon-18.png";
import icon19 from "@/public/images/explore-article-icon-19.png";
import icon20 from "@/public/images/explore-article-icon-20.png";
import icon21 from "@/public/images/explore-article-icon-21.png";
import icon22 from "@/public/images/explore-article-icon-22.png";
import icon23 from "@/public/images/explore-article-icon-23.png";
import icon24 from "@/public/images/explore-article-icon-24.png";
import icon25 from "@/public/images/explore-article-icon-25.png";

//integration icons
import figma from "@/public/images/figma.png";
import shopify from "@/public/images/shopify.png";
import slack from "@/public/images/slack.png";
import webflow from "@/public/images/webflow.png";
import airtable from "@/public/images/airtable.png";
import monday from "@/public/images/monday.png";

export const chatOptions = [
  {
    id: uuidv4(),
    name: "Image Generator",
    label: "image",
    icon: PiImage,
    color: "77, 107, 254",
  },
  {
    id: uuidv4(),
    name: "Video Generator",
    label: "video",
    icon: PiVideo,
    color: "142, 51, 255",
  },
  {
    id: uuidv4(),
    name: "Audio Generator",
    label: "audio",
    icon: PiSpeakerHigh,
    color: "255, 86, 48",
  },
  {
    id: uuidv4(),
    name: "Photo Editor",
    label: "retouch",
    icon: PiImageSquare,
    color: "255, 171, 0",
  },
  {
    id: uuidv4(),
    name: "Education Feedback",
    label: "data-table",
    icon: PiGraduationCap,
    color: "34, 197, 94",
  },
  {
    id: uuidv4(),
    name: "Get Advice",
    label: "text",
    icon: PiMegaphone,
    color: "255, 86, 48",
  },
  {
    id: uuidv4(),
    name: "Code Generator",
    label: "code",
    icon: PiCode,
    color: "34, 197, 94",
  },
  {
    id: uuidv4(),
    name: "Help me write",
    label: "text",
    icon: PiPencilSimpleLine,
    color: "77, 107, 254",
  },
  {
    id: uuidv4(),
    name: "Summarize text",
    label: "text",
    icon: PiMagicWand,
    color: "255, 86, 48",
  },
  {
    id: uuidv4(),
    name: "Problem solving",
    label: "code",
    icon: PiQuestion,
    color: "142, 51, 255",
  },
];

export const aiGeneratorOptions = [
  {
    id: uuidv4(),
    name: "Video Generator",
    icon: PiVideoCameraFill,
    color: "142, 51, 255",
  },
  {
    id: uuidv4(),
    name: "Photo Generator",
    icon: PiImageFill,
    color: "255, 86, 48",
  },
  {
    id: uuidv4(),
    name: " Photo Editor",
    icon: PiImageSquareFill,
    color: "77, 107, 254",
  },
  {
    id: uuidv4(),
    name: "Code Generator",
    icon: PiCodeFill,
    color: "34, 197, 94",
  },
  {
    id: uuidv4(),
    name: "Education Feedback",
    icon: PiGraduationCapFill,
    color: "255, 171, 0",
  },
  {
    id: uuidv4(),
    name: "Audio Generator",
    icon: PiSpeakerHighFill,
    color: "255, 86, 48",
  },
];

export const upgradePlanDetails = [
  {
    id: uuidv4(),
    name: "Basic",
    icon: PiPaperPlaneTilt,
    price: 0,
    features: [
      "3-6 messages per month",
      "Discord Community Access",
    ],
    notProvidedFeatures: [
      "Deck Inventory",
      "Access to the Affiliate Program",
      "Priotity Support",
    ],
  },
  {
    id: uuidv4(),
    name: "Standard",
    icon: PiAirplaneTilt,
    price: 10,
    features: [
      "80-100 messages per month",
      "Deck Inventory",
      "Discord Community Access",
      "Priotity Support",
    
    ],
    notProvidedFeatures: ["Access to the Affiliate Program"],
  },
  {
    id: uuidv4(),
    name: "Premium",
    icon: PiRocketLaunch,
    price: 20,
    features: [
      "180-200 messages per month",
      "Access to Affiliate Program(Learn More)",
      "Deck Inventory",
      "Discord Community Access",
      "Priotity Support",
    ],
    notProvidedFeatures: [],
  },
];


export const faqData = [
  {
    id: uuidv4(),
    question: "What is MetaBloom?",
    answer:
      "MetaBloom is an AI-powered Hearthstone deck building assistant that helps players create competitive decks, analyze the meta, and improve their gameplay using advanced AI technology.",
  },
  {
    id: uuidv4(),
    question: "How does MetaBloom work?",
    answer:
      "MetaBloom uses a sophisticated two-Claude AI architecture to analyze your requests, query multiple Hearthstone databases, and provide personalized deck recommendations and strategic advice.",
  },
  {
    id: uuidv4(),
    question: "Can I create custom Hearthstone decks?",
    answer:
      "Yes! MetaBloom can generate optimized Hearthstone decks for any class or playstyle, analyze existing decks, and provide deck codes that can be directly imported into Hearthstone.",
  },
  {
    id: uuidv4(),
    question: "Is there a free version of MetaBloom?",
    answer:
      "Yes! MetaBloom offers a free tier with basic features. For advanced features and unlimited access, you can upgrade to our Standard ($10/month) or Premium ($20/month) plans.",
  },
  {
    id: uuidv4(),
    question: "How do I get started with MetaBloom?",
    answer:
      "Simply sign up for an account, and you can immediately start chatting with our AI assistant to get deck recommendations, meta insights, and strategic advice for Hearthstone.",
  },
];

export const supportMenuItems = [
  {
    id: uuidv4(),
    name: "FAQ",
    icon: PiQuestion,
  },
  {
    id: uuidv4(),
    name: "Privacy",
    icon: PiLockKey,
  },
  {
    id: uuidv4(),
    name: "Help",
    icon: PiEnvelopeSimple,
  },
];

export const settingsTabItems = [
  {
    id: uuidv4(),
    name: "General",
    icon: PiGear,
  },
  {
    id: uuidv4(),
    name: "Security",
    icon: PiLock,
  },
  {
    id: uuidv4(),
    name: "Appearance",
    icon: PiPaintBrushHousehold,
  },
];

export const themeSettingsData = [
  {
    id: uuidv4(),
    name: "System",
    icon: PiLaptop,
  },
  {
    id: uuidv4(),
    name: "Light",
    icon: PiSun,
  },
  {
    id: uuidv4(),
    name: "Dark",
    icon: PiMoon,
  },
];

export const accentColorItems = [
  {
    id: uuidv4(),
    color: "#4D6BFE",
  },
  {
    id: uuidv4(),
    color: "#8E33FF",
  },
  {
    id: uuidv4(),
    color: "#00B8D9",
  },
  {
    id: uuidv4(),
    color: "#22C55E",
  },
  {
    id: uuidv4(),
    color: "#FFAB00",
  },
  {
    id: uuidv4(),
    color: "#FF5630",
  },
  {
    id: uuidv4(),
    color: "#0B1323",
  },
];

export const customBotsData = [
  // {
  //   id: uuidv4(),
  //   icon: icon1,
  //   title: "Research Specialist",
  //   desc: "Helps with academic research, paper analysis, and citation management",
  //   tag: "Research",
  //   color: "77, 107, 254",
  // },
  // {
  //   id: uuidv4(),
  //   icon: icon10,
  //   title: "Programming Guide",
  //   desc: "Assists with programming, code reviews, and best practices",
  //   tag: "Programming",
  //   color: "142, 51, 255",
  // },
  // {
  //   id: uuidv4(),
  //   icon: icon12,
  //   title: "Writing Mentor",
  //   desc: "Helps improve writing style, grammar, and content structure",
  //   tag: "Writing",
  //   color: "0, 184, 217",
  // },
  {
    id: uuidv4(),
    icon: icon16,
    title: "Hearthy Connect",
    desc: "Connects your hearthstone game logs to MetaBloom",
    tag: "Research",
    color: "34, 197, 94",
  },
];

export const aiGeneratorBrainstorm = [
  {
    id: uuidv4(),
    name: "Ultra Pro AI",
    icon: PiRobot,
  },
  {
    id: uuidv4(),
    name: "4K+ Upscaling",
    icon: PiRocketLaunch,
  },
  {
    id: uuidv4(),
    name: "High Resolution",
    icon: PiAirplaneTilt,
  },
  {
    id: uuidv4(),
    name: "Medium Precision",
    icon: PiFire,
  },
  {
    id: uuidv4(),
    name: "Low Resolution",
    icon: PiPaperPlaneTilt,
  },
];

export const upgradeModalData = [
  {
    id: uuidv4(),
    title: "2.1v Flash",
    desc: "Get everyday help",
    isNew: true,
  },
  {
    id: uuidv4(),
    title: "2.0v Flash Thinking Experimental",
    desc: "Best for multi-step reasoning",
    isNew: true,
  },
  {
    id: uuidv4(),
    title: "1.9.1 Thinking Experimental with apps",
    desc: "Reasoning across YouTube, Maps & Search",
    isNew: true,
  },
  {
    id: uuidv4(),
    title: "1.9 Flash",
    desc: "Previous Model",
    isNew: false,
  },
  {
    id: uuidv4(),
    title: "1.5 Flash",
    desc: "Start Journey With AI",
    isNew: false,
  },
];

export const integrationItemsData = [
  {
    id: uuidv4(),
    name: "Slack",
    desc: "Real-time messaging and notifications.",
    icon: slack,
  },
  {
    id: uuidv4(),
    name: "Shopify",
    desc: "Manage your e-commerce platform.",
    icon: shopify,
  },
  {
    id: uuidv4(),
    name: "Webflow",
    desc: "Manage your Webflow site content.",
    icon: webflow,
  },
  {
    id: uuidv4(),
    name: "Airtable",
    desc: "Connect and manage your Airtable bases.",
    icon: airtable,
  },
  {
    id: uuidv4(),
    name: "Monday",
    desc: "Manage team workflows and projects.",
    icon: monday,
  },
  {
    id: uuidv4(),
    name: "Figma",
    desc: "Access and preview Figma designs.",
    icon: figma,
  },
];

export const explorePageData = [
  {
    id: uuidv4(),
    title: "Featured",
    desc: "Curated top picks from this week",
    articles: [
      {
        id: uuidv4(),
        title: "AI Video Maker by Descript",
        desc: "Turn your ideas into videos with the AI Video Maker by Descript—a powerful text-to-speech video generator and video editor in one.",
        icon: icon1,
      },
      {
        id: uuidv4(),
        title: "Mermaid Chart: diagrams and charts",
        desc: "Official MetaBloom from the Mermaid team. Generate a Mermaid diagram or chart with text including video generator and video editor in one.",
        icon: icon2,
      },
      {
        id: uuidv4(),
        title: "Form And Survey Maker by demo.co",
        desc: "Build and share live surveys with the AI Video Maker by Descript—a powerful text-to-speech video generator and video editor in one.",
        icon: icon3,
      },
      {
        id: uuidv4(),
        title: "Tutor Me",
        desc: "Your personal AI tutor by Khan Academy! I'm Khanmigo Lite - here to help you with math, science, and—a powerful text-to-speech video generator.",
        icon: icon4,
      },
    ],
  },
  {
    id: uuidv4(),
    title: "Trending",
    desc: "Most popular MetaBloom by our community",
    articles: [
      {
        id: uuidv4(),
        title: "AI Innovations Reshaping the Future",
        desc: "Explore cutting-edge AI advancements driving transformation. From automation to deep learning, discover groundbreaking.",
        icon: icon5,
      },
      {
        id: uuidv4(),
        title: "The Rise of AI Technology",
        desc: "Artificial intelligence is evolving rapidly. Stay updated with the latest AI breakthroughs, trends, and emerging tools revolutionizing.",
        icon: icon6,
      },
      {
        id: uuidv4(),
        title: "Stay Updated with AI Trends",
        desc: "Keep up with AI’s fast-paced evolution. Learn about innovations in automation, robotics, and machine learning.",
        icon: icon7,
      },
      {
        id: uuidv4(),
        title: "Exploring the Future of AI",
        desc: "AI is changing how we work and live. Discover upcoming trends, research, and advancements that redefine industries.",
        icon: icon8,
      },
      {
        id: uuidv4(),
        title: "AI-Powered Future: What’s Next?",
        desc: "Predict the future of AI-driven technology. Explore innovations in AI-powered assistants, automation, and predictive analytics.",
        icon: icon9,
      },
      {
        id: uuidv4(),
        title: "AI’s Latest Breakthroughs",
        desc: "Get the latest AI news and updates. Learn about groundbreaking research, industry shifts, and revolutionary discoveries.",
        icon: icon10,
      },
    ],
  },
  {
    id: uuidv4(),
    title: "Writing",
    desc: "Enhance your writing with tools for creation, editing, and style refinement",
    articles: [
      {
        id: uuidv4(),
        title: "AI-Powered Writing for Creativity",
        desc: "Enhance your writing with AI tools. Generate ideas, improve grammar, and create engaging content effortlessly.",
        icon: icon11,
      },
      {
        id: uuidv4(),
        title: "Write Smarter with AI Help",
        desc: "Boost your productivity with AI writing assistants. Get real-time feedback, refine your style, and craft compelling narratives with ease.",
        icon: icon12,
      },
      {
        id: uuidv4(),
        title: "AI Writing: The Future Tool",
        desc: "From blogs to business reports, AI enhances content creation. Explore AI-driven writing tools that help improve clarity and efficiency.",
        icon: icon13,
      },
      {
        id: uuidv4(),
        title: "Transform Your Words with AI",
        desc: "Experience AI-enhanced writing assistance. Generate professional-quality text, refine drafts, and create high-impact content.",
        icon: icon14,
      },
      {
        id: uuidv4(),
        title: "AI Text Generation Made Easy",
        desc: "Simplify content creation with AI-powered writing. Generate high-quality text, rephrase sentences, and optimize readability.",
        icon: icon15,
      },
      {
        id: uuidv4(),
        title: "Boost Writing Skills with AI",
        desc: "Take your writing to the next level. AI helps enhance tone, grammar, and structure, making every piece clear and engaging.",
        icon: icon16,
      },
    ],
  },
  {
    id: uuidv4(),
    title: "Productivity",
    desc: "Increase your efficiency",
    articles: [
      {
        id: uuidv4(),
        title: "AI Tools for Maximum Efficiency",
        desc: "Optimize your workflow with AI-powered automation. Save time, eliminate repetitive tasks, and enhance focus with intelligent.",
        icon: icon17,
      },
      {
        id: uuidv4(),
        title: "Work Smarter with AI Solutions",
        desc: "AI enhances productivity by automating tedious tasks. From scheduling to data processing, let AI handle the workload.",
        icon: icon18,
      },
      {
        id: uuidv4(),
        title: "Increase Productivity AI Assistance",
        desc: "Streamline your daily tasks with AI-powered organization tools. Stay on top of deadlines, manage projects.",
        icon: icon19,
      },
      {
        id: uuidv4(),
        title: "AI Automation for Smarter Workflows",
        desc: "Let AI handle repetitive work. Automate scheduling, email responses, and task management to free up valuable time.",
        icon: icon20,
      },
      {
        id: uuidv4(),
        title: "The Future of Smart Work",
        desc: "AI-driven solutions make productivity effortless. Use machine learning tools to enhance workplace efficiency, manage tasks.",
        icon: icon21,
      },
      {
        id: uuidv4(),
        title: "Revolutionizing Work with AI Tech",
        desc: "Embrace AI-powered tools for a smarter workflow. Automate time-consuming processes and focus on what truly matters in your work.",
        icon: icon22,
      },
    ],
  },
  {
    id: uuidv4(),
    title: "Research & Analysis",
    desc: "Find, evaluate, interpret, and visualize information",
    articles: [
      {
        id: uuidv4(),
        title: "AI for Smarter Data Analysis",
        desc: "Unlock deep insights using AI-powered research tools. Analyze large datasets, find trends, and make data-driven decisions efficiently.",
        icon: icon23,
      },
      {
        id: uuidv4(),
        title: "Revolutionizing Research AI Tools",
        desc: "AI is transforming how we analyze data. Enhance your research with machine learning models designed for accuracy and efficiency.",
        icon: icon24,
      },
      {
        id: uuidv4(),
        title: "AI Insights for Smarter Decisions",
        desc: "Process information faster with AI-driven analytics. From business reports to academic research, AI helps uncover valuable insights.",
        icon: icon25,
      },
      {
        id: uuidv4(),
        title: "Transform Data Actionable Insights",
        desc: "AI-powered analytics provide real-time data interpretation. Identify trends, predict outcomes, and optimize strategies using intelligent.",
        icon: icon1,
      },
      {
        id: uuidv4(),
        title: "Deep Learning for Data Analysis",
        desc: "Leverage deep learning to analyze patterns and trends. AI-powered tools make complex research faster, more precise, and highly effective.",
        icon: icon7,
      },
      {
        id: uuidv4(),
        title: "AI Research: Smarter, Faster, Better",
        desc: "Accelerate research with AI automation. From literature reviews to predictive modeling, AI simplifies complex data analysis.",
        icon: icon8,
      },
    ],
  },
  {
    id: uuidv4(),
    title: "Education",
    desc: "Explore new ideas, revisit existing skills",
    articles: [
      {
        id: uuidv4(),
        title: "AI-Powered Learning for Students",
        desc: "AI transforms education by personalizing learning experiences. Get instant feedback, adaptive quizzes, and AI-generated study plans.",
        icon: icon2,
      },
      {
        id: uuidv4(),
        title: "Smart Education with AI Assistance",
        desc: "Enhance learning with AI-powered tools. From automated tutoring to AI-driven assessments, modern education.",
        icon: icon3,
      },
      {
        id: uuidv4(),
        title: "AI Tutors: The Future of Learning",
        desc: "AI-powered tutors provide personalized lessons, improving knowledge retention and engagement. Learn at your own pace.",
        icon: icon4,
      },
      {
        id: uuidv4(),
        title: "Learning with AI Technology",
        desc: "AI makes learning smarter. Interactive study assistants help students grasp complex topics, while AI-generated summaries study.",
        icon: icon5,
      },
      {
        id: uuidv4(),
        title: "Personalized Learning with AI",
        desc: "AI analyzes your progress and adapts to your learning style. Get tailored recommendations, instant feedback.",
        icon: icon7,
      },
      {
        id: uuidv4(),
        title: "Smarter Classrooms with AI",
        desc: "AI-powered tools enhance education with interactive learning, automated grading, and real-time student performance tracking.",
        icon: icon8,
      },
    ],
  },
  {
    id: uuidv4(),
    title: "Lifestyle",
    desc: "Get tips on travel, workouts, style, food, and more",
    articles: [
      {
        id: uuidv4(),
        title: "AI for a Smarter Life",
        desc: "AI simplifies everyday life with intelligent automation, from smart home devices to personalized recommendations.",
        icon: icon9,
      },
      {
        id: uuidv4(),
        title: "Personalized AI for Daily Living",
        desc: "Experience AI-powered convenience. From smart assistants to automated routines, AI enhances comfort, productivity.",
        icon: icon10,
      },
      {
        id: uuidv4(),
        title: "Smart Assistants for Effortless Living",
        desc: "Let AI handle your daily tasks. Voice assistants, smart reminders, and AI-powered planning tools help streamline routines with ease.",
        icon: icon11,
      },
      {
        id: uuidv4(),
        title: "AI-Driven Lifestyle Enhancements",
        desc: "Upgrade your daily life with AI solutions. Manage tasks, track fitness, and get tailored recommendations for a seamless experience.",
        icon: icon12,
      },
      {
        id: uuidv4(),
        title: "AI Technology for Smarter Homes",
        desc: "Control your home with AI-powered automation. From smart lighting to voice-controlled devices, technology simplifies life for greater comfort.",
        icon: icon7,
      },
      {
        id: uuidv4(),
        title: "Live Smarter with AI Innovations",
        desc: "AI enhances your lifestyle by managing schedules, automating tasks, and providing personalized suggestions.",
        icon: icon8,
      },
    ],
  },
  {
    id: uuidv4(),
    title: "Programming",
    desc: "Write code, debug, test, and learn",
    articles: [
      {
        id: uuidv4(),
        title: "AI-Assisted Coding for Developers",
        desc: "Accelerate programming with AI-powered suggestions. Get real-time code recommendations, debug efficiently.",
        icon: icon15,
      },
      {
        id: uuidv4(),
        title: "Code Faster with AI Assistance",
        desc: "AI-driven coding assistants help you write cleaner, more efficient code. Automate repetitive tasks and optimize performance with AI.",
        icon: icon16,
      },
      {
        id: uuidv4(),
        title: "AI in Software Development",
        desc: "Transform programming with AI automation. From generating code to predictive debugging, AI is revolutionizing software.",
        icon: icon17,
      },
      {
        id: uuidv4(),
        title: "Smart Coding with AI Tools",
        desc: "Enhance development workflows with AI-powered solutions. Automate repetitive coding tasks, debug errors, and optimize algorithms.",
        icon: icon18,
      },
      {
        id: uuidv4(),
        title: "The Future of AI Coding",
        desc: "AI is reshaping programming. Explore tools that suggest code, optimize structures, and streamline development processes.",
        icon: icon19,
      },
      {
        id: uuidv4(),
        title: "AI Debugging & Optimization",
        desc: "Use AI-driven debugging tools to detect errors faster and enhance code performance, making software development smarter.",
        icon: icon20,
      },
    ],
  },
];

export const phpCode = `<?php
session_start();
$conn = new
mysqli("localhost", "root", "", "your_database");
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect);
}
if
($_SERVER["REQUEST"] == "POST")
{
    $name = $_POST["name"];
    $gmail = $_POST["gmail"];
    $phone = $_POST["phone"];
    $pass =($_POST["pass"],
    PASSWORD_BCRYPT);
    $stmt = $conn->
    prepare("INSERT INTO users
    (name, gmail, phone, pass);
    $stmt->
    bind_param("ssss", $name, $gmail,
    $phone, $password);

<body>
    <h2>Register</h2>
    <?php
    if(isset($_SESSION['error']))
    { echo "<p style='color:red;'>"
    "</p>"; unset($_SESSION['error']); } ?>

</body>
</html>
`;

export const countryOptions = [
  { value: "afganistan", label: "Afganistan" },
  { value: "america", label: "United States" },
  { value: "london", label: "United Kingdom" },
  { value: "china", label: "China" },
];

export const emailPreferenceOptions = [
  {
    value: "I am okay with promo emails",
    label: "I am okay with promo emails",
  },
  { value: "I want only update emails", label: "I want only update email" },
  {
    value: "I want only security emails",
    label: "I want only security emails",
  },
  { value: "I want all emails", label: "I want all emails" },
];

export const languageOptions = [
  {
    value: "English",
    label: "English",
  },
  {
    value: "French",
    label: "French",
  },
  {
    value: "Arabic",
    label: "Arabic",
  },
  {
    value: "Japanese",
    label: "Japanese",
  },
];

export const exploreBotTags = [
  "Featured",
  "Trending",
  "Writing",
  "Productivity",
  "Research & Analysis",
  "Lifestyle",
  "Education",
  "Programming",
];

export const botCategory = [
  {
    value: "Education",
    label: "Education",
  },
  {
    value: "Research",
    label: "Research",
  },
  {
    value: "Video Creation",
    label: "Video Creation",
  },
];

export const responseStyle = [
  {
    value: "Response Style 1",
    label: "Response Style 1",
  },
  {
    value: "Response Style 2",
    label: "Response Style 2",
  },
  {
    value: "Response Style 3",
    label: "Response Style 3",
  },
];
