const form = document.getElementById("detailsForm");
const userForm = document.getElementById("welcome-screen");
const testPage = document.getElementById("test-page");
let currentQuestion = 0;
let score = 0;
const questions = [
    { text: "What is 2+2?", options: ["2", "3", "4", "5"], correct: 3, marks: 1 },
    { text: "What is 5*5?", options: ["10", "15", "25", "30"], correct: 3, marks: 2 },
    // Add more questions here
];

// Form Submit Event
form.addEventListener("submit", (e) => {
    e.preventDefault();
    document.getElementById("display-username").innerText = form.username.value;
    document.getElementById("display-email").innerText = form.email.value;
    document.getElementById("display-phone").innerText = form.phone.value;
    document.getElementById("display-university").innerText = form.university.value;

    userForm.style.display = "none";  // Hide the welcome screen
    testPage.style.display = "block"; // Show the test page
    startTest();
});

function startTest() {
    loadQuestion();
    startTimer();
}

function loadQuestion() {
    const question = questions[currentQuestion];
    document.getElementById("question-text").innerText = question.text;
    const optionButtons = document.querySelectorAll(".option-btn");
    optionButtons.forEach((btn, index) => {
        btn.innerText = question.options[index];
        btn.onclick = () => selectAnswer(index + 1); // options are 1-based
    });
}

function selectAnswer(option) {
    if (questions[currentQuestion].correct === option) {
        score += questions[currentQuestion].marks;
    }
    currentQuestion++;
    if (currentQuestion < questions.length) {
        loadQuestion();
    } else {
        endTest();
    }
}

function startTimer() {
    let time = 100 * 60; // 100 minutes
    const timer = document.getElementById("timer");
    const interval = setInterval(() => {
        const minutes = Math.floor(time / 60);
        const seconds = time % 60;
        timer.textContent = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
        if (--time < 0) {
            clearInterval(interval);
            endTest();
        }
    }, 1000);
}

function endTest() {
    testPage.style.display = "none";
    const resultPage = document.getElementById("result-page");
    resultPage.style.display = "block";

    const message = score > 50 ? "🎉 Congratulations! You passed." : `You scored ${score}. Keep trying!`;
    document.getElementById("result-message").innerHTML = `<p>${message}</p>`;
}
