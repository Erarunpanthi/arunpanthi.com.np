/* ============================================================
   WEEKLY CURRENT AFFAIRS — QUESTION BANK
   ------------------------------------------------------------
   HOW TO ADD NEXT WEDNESDAY'S TEST (no HTML edit needed):
   1. Copy the whole entry below (from  "2083-06-28": {  to its  }, )
   2. Paste it above that entry and change the date key to the new
      Wednesday's NEPALI (BS) date, format:  "YYYY-MM-DD"
      e.g. 2083 Ashwin 28 -> "2083-06-28"  (Baisakh=01 ... Chaitra=12)
   3. Replace name / details / questions. correct = option index (0-3).
   4. Run `node tools/generate-current-affairs-exams.js` from the repo root
      and commit the generated dated page so its URL works on GitHub Pages.
   The Wednesday button on the index page appears automatically;
   it shows "Give Exam / Start exam" as soon as an entry with that
   Wednesday's BS date exists here, otherwise "Questions coming soon".
   ============================================================ */
window.CA_TESTS = {
  "2083-06-28": {
    name: "Weekly Current Affairs Test — 28 Ashwin 2083",
    details: "Syllabus topic 1.16: Major events and current affairs of national and international importance. Nepal's current periodic plan, constitution & governance, economy, geography and recent national developments — Lok Sewa First Paper pattern.",
    questions: [
      { question: "Which is the current (Sixteenth) periodic plan period of Nepal?", options: ["2076/77–2080/81", "2081/82–2085/86", "2082/83–2086/87", "2080/81–2084/85"], correct: 1 },
      { question: "The Sixteenth Periodic Plan was endorsed with which slogan?", options: ["Prosperous Nepal, Happy Nepali", "Good Governance, Social Justice and Prosperity", "Development and Change", "One Nepal, One Economy"], correct: 1 },
      { question: "Which body prepares the periodic plans of Nepal?", options: ["Ministry of Finance", "National Planning Commission", "Nepal Rastra Bank", "Office of the Prime Minister"], correct: 1 },
      { question: "The Sixteenth Plan targets an average economic growth rate of about how much by 2085/86?", options: ["5.5%", "6.3%", "7.3%", "10.5%"], correct: 2 },
      { question: "Constitution Day (संविधान दिवस) is celebrated in Nepal on which date?", options: ["3 Ashwin", "15 Ashadh", "7 Ashwin", "19 Bhadra"], correct: 0 },
      { question: "How many provinces and local levels are there in Nepal respectively?", options: ["7 provinces, 753 local levels", "7 provinces, 743 local levels", "6 provinces, 753 local levels", "7 provinces, 763 local levels"], correct: 0 },
      { question: "Nepal's current fiscal year 2083/84 budget is presented on which date (Jestha 15)?", options: ["Baisakh 15", "Jestha 15", "Ashadh 1", "Shrawan 1"], correct: 1 },
      { question: "Which institution is the central bank of Nepal?", options: ["Nepal Bank Ltd.", "Nepal Rastra Bank", "Rastriya Banijya Bank", "Ministry of Finance"], correct: 1 },
      { question: "Nepal is set to graduate from the Least Developed Country (LDC) category in which year?", options: ["2024", "2025", "2026", "2030"], correct: 2 },
      { question: "The headquarters of SAARC is located in:", options: ["Dhaka", "Kathmandu", "New Delhi", "Colombo"], correct: 1 },
      { question: "How many member countries are there in BIMSTEC?", options: ["5", "6", "7", "8"], correct: 2 },
      { question: "Nepal became a member of the United Nations in:", options: ["1947 AD", "1950 AD", "1955 AD", "1961 AD"], correct: 2 },
      { question: "Which is the largest hydropower project currently operating in Nepal?", options: ["Upper Tamakoshi (456 MW)", "Kulekhani I", "Chameliya", "Kaligandaki A"], correct: 0 },
      { question: "Upper Tamakoshi Hydropower Project is located in which district?", options: ["Dolakha", "Rasuwa", "Sindhupalchok", "Sankhuwasabha"], correct: 0 },
      { question: "Nepal's Sixteenth Plan targets electricity generation capacity of about how much by 2085/86?", options: ["5,000 MW", "8,500 MW", "11,769 MW", "20,000 MW"], correct: 2 },
      { question: "According to the 2021 census (2078 BS), the population of Nepal is approximately:", options: ["26.4 million", "29.2 million", "30.5 million", "33.1 million"], correct: 1 },
      { question: "What is the literacy rate of Nepal as per the 2021 census (age 5+)?", options: ["65.9%", "71.2%", "76.2%", "82.4%"], correct: 2 },
      { question: "The Karnali River is known by which name after it enters India?", options: ["Ghaghara", "Sarda", "Rapti", "Bagmati"], correct: 0 },
      { question: "The headquarters of the United Nations is located in:", options: ["Geneva", "New York", "Vienna", "The Hague"], correct: 1 },
      { question: "Which day is observed as International Women's Day?", options: ["March 8", "March 21", "April 7", "May 1"], correct: 0 },
      { question: "Nepal's national flower and national bird respectively are:", options: ["Rhododendron and Himalayan Monal (Danphe)", "Marigold and Koklass", "Rhododendron and Spiny Babbler", "Lotus and Danphe"], correct: 0 },
      { question: "The monetary policy of Nepal is issued by:", options: ["Ministry of Finance", "Nepal Rastra Bank", "National Planning Commission", "SEBON"], correct: 1 },
      { question: "Sustainable Development Goals (SDGs) are targeted to be achieved globally by:", options: ["2025", "2030", "2040", "2050"], correct: 1 },
      { question: "How many Sustainable Development Goals (SDGs) are there?", options: ["15", "16", "17", "18"], correct: 2 },
      { question: "The President of Nepal is elected by:", options: ["Direct vote of citizens", "An electoral college of federal and provincial assemblies", "Only the House of Representatives", "The National Assembly only"], correct: 1 }
    ]
  }
};
