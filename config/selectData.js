// config/selectData.js

//skills
const skillsList = [     
  { id: "javascript", text: "JavaScript" }, { id: "typescript", text: "TypeScript" },
  { id: "python", text: "Python" }, { id: "java", text: "Java" },
  { id: "csharp", text: "C#" }, { id: "cpp", text: "C++" },
  { id: "go", text: "Go" }, { id: "ruby", text: "Ruby" },
  { id: "php", text: "PHP" }, { id: "swift", text: "Swift" },
  { id: "kotlin", text: "Kotlin" }, { id: "rust", text: "Rust" },

  // Frontend Frameworks / Libraries
  { id: "react", text: "React" }, { id: "angular", text: "Angular" },
  { id: "vuejs", text: "Vue.js" }, { id: "svelte", text: "Svelte" },
  { id: "jquery", text: "jQuery" }, { id: "bootstrap", text: "Bootstrap" },
  { id: "tailwindcss", text: "Tailwind CSS" },

  // Backend Frameworks
  { id: "nodejs", text: "Node.js" }, { id: "expressjs", text: "Express.js" },
  { id: "springboot", text: "Spring Boot" }, { id: "django", text: "Django" },
  { id: "flask", text: "Flask" }, { id: "laravel", text: "Laravel" },
  { id: "rails", text: "Ruby on Rails" }, { id: "nestjs", text: "NestJS" },

  // Databases
  { id: "sql", text: "SQL" }, { id: "mysql", text: "MySQL" },
  { id: "postgresql", text: "PostgreSQL" }, { id: "mongodb", text: "MongoDB" },
  { id: "redis", text: "Redis" }, { id: "firebase", text: "Firebase" },

  // DevOps & Cloud
  { id: "docker", text: "Docker" }, { id: "kubernetes", text: "Kubernetes" },
  { id: "aws", text: "AWS" }, { id: "azure", text: "Azure" },
  { id: "gcp", text: "Google Cloud Platform" }, { id: "jenkins", text: "Jenkins" },
  { id: "githubactions", text: "GitHub Actions" }, { id: "ci_cd", text: "CI/CD" },

  // Tools & Platforms
  { id: "git", text: "Git" }, { id: "npm", text: "NPM" },
  { id: "webpack", text: "Webpack" }, { id: "babel", text: "Babel" },
  { id: "eslint", text: "ESLint" }, { id: "vscode", text: "VS Code" },

  // Data / AI / ML
  { id: "dataanalysis", text: "Data Analysis" }, { id: "pandas", text: "Pandas" },
  { id: "numpy", text: "NumPy" }, { id: "scikit", text: "Scikit-learn" },
  { id: "tensorflow", text: "TensorFlow" }, { id: "pytorch", text: "PyTorch" },
  { id: "matplotlib", text: "Matplotlib" }, { id: "sqlalchemy", text: "SQLAlchemy" },

  // Design
  { id: "uidesign", text: "UI Design" }, { id: "uxdesign", text: "UX Design" },
  { id: "figma", text: "Figma" }, { id: "adobexd", text: "Adobe XD" },
  { id: "photoshop", text: "Photoshop" }, { id: "illustrator", text: "Illustrator" },

  // Testing
  { id: "jest", text: "Jest" }, { id: "mocha", text: "Mocha" },
  { id: "chai", text: "Chai" }, { id: "cypress", text: "Cypress" },
  { id: "selenium", text: "Selenium" }, { id: "postman", text: "Postman" },

  // Soft & Project Skills
  { id: "agile", text: "Agile" }, { id: "scrum", text: "Scrum" },
  { id: "projectmanagement", text: "Project Management" },
  { id: "communication", text: "Communication" },
  { id: "teamwork", text: "Teamwork" }, { id: "problemsolving", text: "Problem Solving" },

  // Extras
  { id: "restapi", text: "REST API" }, { id: "graphql", text: "GraphQL" },
  { id: "microservices", text: "Microservices" }, { id: "socketio", text: "Socket.IO" },
  { id: "seo", text: "SEO" }, { id: "contentwriting", text: "Content Writing" }];

//degree
const degreeLevelsList = [
    { id: "none", text: "No Formal Degree" }, { id: "highschool", text: "High School Diploma/GED" },
    { id: "vocational", text: "Vocational/Technical Certificate" }, { id: "associate", text: "Associate Degree" },
    { id: "bachelors", text: "Bachelor's Degree" }, { id: "masters", text: "Master's Degree" },
    { id: "doctorate", text: "Doctorate (Ph.D.)" }, { id: "professional", text: "Professional Degree (MD, JD, etc.)" },
    { id: "other", text: "Other" }
];

//FieldofStudy
const fieldsOfStudyList = [   // Computer / IT / Engineering
  { id: "computerscience", text: "Computer Science" },
  { id: "softwareengineering", text: "Software Engineering" },
  { id: "informationtechnology", text: "Information Technology" },
  { id: "datascience", text: "Data Science" },
  { id: "cybersecurity", text: "Cybersecurity" },
  { id: "artificialintelligence", text: "Artificial Intelligence / Machine Learning" },
  { id: "electricalengineering", text: "Electrical Engineering" },
  { id: "mechanicalengineering", text: "Mechanical Engineering" },
  { id: "civilengineering", text: "Civil Engineering" },
  { id: "electronics", text: "Electronics and Communication Engineering" },
  { id: "biomedicalengineering", text: "Biomedical Engineering" },
  { id: "aerospaceengineering", text: "Aerospace Engineering" },

  // Business / Management / Commerce
  { id: "businessadministration", text: "Business Administration" },
  { id: "management", text: "Management" },
  { id: "finance", text: "Finance" },
  { id: "accounting", text: "Accounting" },
  { id: "economics", text: "Economics" },
  { id: "humanresources", text: "Human Resources" },
  { id: "entrepreneurship", text: "Entrepreneurship" },
  { id: "supplychain", text: "Supply Chain Management" },
  { id: "internationalbusiness", text: "International Business" },

  // Arts / Humanities / Social Science
  { id: "psychology", text: "Psychology" },
  { id: "sociology", text: "Sociology" },
  { id: "philosophy", text: "Philosophy" },
  { id: "education", text: "Education" },
  { id: "english", text: "English Literature / Language" },
  { id: "history", text: "History" },
  { id: "politicalscience", text: "Political Science" },
  { id: "communication", text: "Communication Studies" },
  { id: "languages", text: "Foreign Languages / Linguistics" },

  // Science / Math / Environment
  { id: "mathematics", text: "Mathematics / Applied Math" },
  { id: "statistics", text: "Statistics" },
  { id: "physics", text: "Physics" },
  { id: "chemistry", text: "Chemistry" },
  { id: "biology", text: "Biology" },
  { id: "environmentalscience", text: "Environmental Science" },
  { id: "geology", text: "Geology / Earth Sciences" },
  { id: "biotechnology", text: "Biotechnology" },

  // Design / Media / Creative
  { id: "graphicdesign", text: "Graphic Design" },
  { id: "uidesign", text: "UI Design" },
  { id: "uxdesign", text: "UX Design" },
  { id: "multimedia", text: "Multimedia / Animation" },
  { id: "interiordesign", text: "Interior Design" },
  { id: "fashiondesign", text: "Fashion Design" },
  { id: "film", text: "Film and Media Studies" },
  { id: "journalism", text: "Journalism" },
  { id: "marketing", text: "Marketing" },
  { id: "advertising", text: "Advertising / Public Relations" },

  // Health / Medical
  { id: "nursing", text: "Nursing" },
  { id: "medicine", text: "Medicine / MBBS" },
  { id: "publichealth", text: "Public Health" },
  { id: "pharmacy", text: "Pharmacy" },
  { id: "dental", text: "Dental Sciences" },
  { id: "physiotherapy", text: "Physiotherapy / Physical Therapy" },

  // Misc
  { id: "law", text: "Law" },
  { id: "criminology", text: "Criminology / Criminal Justice" },
  { id: "architecture", text: "Architecture" },
  { id: "libraryscience", text: "Library and Information Science" },
  { id: "aviation", text: "Aviation / Aeronautics" },
  { id: "hospitality", text: "Hospitality and Tourism" },
  { id: "sports", text: "Sports Science / Physical Education" },
  { id: "other", text: "Other / Not Listed" } ];

//Location
const locationsList = [   
  { id: "kathmandu", text: "Kathmandu" },
  { id: "lalitpur", text: "Lalitpur" },
  { id: "bhaktapur", text: "Bhaktapur" },
  { id: "pokhara", text: "Pokhara" },
  { id: "biratnagar", text: "Biratnagar" },
  { id: "birgunj", text: "Birgunj" },
  { id: "butwal", text: "Butwal" },
  { id: "dharan", text: "Dharan" },
  { id: "hetauda", text: "Hetauda" },
  { id: "janakpur", text: "Janakpur" },
  { id: "nepalgunj", text: "Nepalgunj" },
  { id: "bhairahawa", text: "Bhairahawa" },
  { id: "itahari", text: "Itahari" },
  { id: "dhangadhi", text: "Dhangadhi" },
  { id: "kirtipur", text: "Kirtipur" },
  { id: "tulsipur", text: "Tulsipur" },
  { id: "gaighat", text: "Gaighat" },
  { id: "illam", text: "Ilam" },
  { id: "palpa", text: "Palpa" },
  { id: "birtamod", text: "Birtamod" },
  { id: "kakadbhitta", text: "Kakadbhitta" },
  { id: "lamahi", text: "Lamahi" },
  { id: "mahendranagar", text: "Mahendranagar" },
  { id: "banepa", text: "Banepa" },
  { id: "dhulikhel", text: "Dhulikhel" },
  { id: "trishuli", text: "Trishuli" },
  { id: "gorkha", text: "Gorkha" },
  { id: "jaleshwar", text: "Jaleshwar" },
  { id: "gulariya", text: "Gulariya" },
  { id: "kalaiya", text: "Kalaiya" },
  { id: "rajbiraj", text: "Rajbiraj" },
  { id: "siraha", text: "Siraha" },
  { id: "malangwa", text: "Malangwa" },
  { id: "inaruwa", text: "Inaruwa" },
  { id: "lalbandi", text: "Lalbandi" },
  { id: "bardibas", text: "Bardibas" },
  { id: "others", text: "Other" }];


//broaderCategories
const broaderCategoriesList = [
  // Software Development
  { id: "webdevelopment", text: "Web Development" },
  { id: "frontenddevelopment", text: "Frontend Development" },
  { id: "backenddevelopment", text: "Backend Development" },
  { id: "fullstackdevelopment", text: "Full Stack Development" },
  { id: "mobiledevelopment", text: "Mobile App Development" },
  { id: "gamedevelopment", text: "Game Development" },
  { id: "softwareengineering", text: "Software Engineering" },

  // Data / AI / Analytics
  { id: "datascience", text: "Data Science & Analytics" },
  { id: "machinelearning", text: "Machine Learning / AI" },
  { id: "databases", text: "Database Management / Engineering" },
  { id: "businessintelligence", text: "Business Intelligence" },

  // Cloud / DevOps / Infra
  { id: "devopscloud", text: "DevOps & Cloud Engineering" },
  { id: "networking", text: "Networking & Infrastructure" },
  { id: "cybersecurity", text: "Cybersecurity & Information Security" },
  { id: "systemadministration", text: "System / IT Administration" },

  // Testing / QA
  { id: "qa", text: "Quality Assurance / Testing" },
  { id: "automationtesting", text: "Automation Testing" },

  // Design / Creative
  { id: "uidesign", text: "UI/UX Design" },
  { id: "graphicdesign", text: "Graphic & Visual Design" },
  { id: "animation", text: "Animation / Motion Design" },
  { id: "productdesign", text: "Product Design" },

  // Management
  { id: "projectmanagement", text: "Project Management" },
  { id: "productmanagement", text: "Product Management" },
  { id: "generalmanagement", text: "General Management" },
  { id: "operations", text: "Operations Management" },

  // Support & IT
  { id: "itsupport", text: "IT Support / Help Desk" },
  { id: "technicalsupport", text: "Technical Support" },

  // Business / Marketing / Sales
  { id: "marketingdigital", text: "Digital Marketing" },
  { id: "contentwriting", text: "Content Writing / Copywriting" },
  { id: "seo", text: "SEO / SEM" },
  { id: "sales", text: "Sales & Business Development" },
  { id: "customerrelations", text: "Customer Support / Relations" },

  // HR / Finance / Admin
  { id: "hr", text: "Human Resources" },
  { id: "recruitment", text: "Recruitment & Talent Acquisition" },
  { id: "finance", text: "Finance & Accounting" },
  { id: "admin", text: "Administrative / Clerical" },
  { id: "legal", text: "Legal & Compliance" },

  // Education / Research
  { id: "teaching", text: "Teaching / Training / Education" },
  { id: "research", text: "Research & Development" },

  // Misc
  { id: "contentcreation", text: "Content Creation / Social Media" },
  { id: "freelancing", text: "Freelancing / Remote Work" },
  { id: "internship", text: "Internships / Entry Level Roles" },
  { id: "other", text: "Other Technical Field" },
  { id: "othernontechnical", text: "Other Non-Technical Field" }
];


//Job Types
const jobTypeList = [ // For desiredJobTypes
     { id: "Full-time", text: "Full-time" },
     { id: "Part-time", text: "Part-time" },
     { id: "Contract", text: "Contract" },
     { id: "Internship", text: "Internship" }
];

const jobPostJobTypesList = [ 
    { id: "Full-time", text: "Full-time" },
    { id: "Part-time", text: "Part-time" },
    { id: "Contract", text: "Contract" },
    { id: "Internship", text: "Internship" }
];

const careerLevelsList = [
    { id: "Entry-Level", text: "Entry-Level" },
    { id: "Junior", text: "Junior" },
    { id: "Mid-Level", text: "Mid-Level" },
    { id: "Senior", text: "Senior" },
    { id: "Lead", text: "Lead" },
    { id: "Manager", text: "Manager" },
    { id: "Director", text: "Director" },
    { id: "Executive", text: "Executive" }
];

module.exports = {
    skillsList,
    degreeLevelsList,
    fieldsOfStudyList,
    locationsList,
    broaderCategoriesList,
    jobTypeList: jobPostJobTypesList, 
    careerLevelsList
};