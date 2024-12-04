// Form and Page Handling
const form = document.getElementById("detailsForm");
const userForm = document.getElementById("user-form");
const testPage = document.getElementById("test-page");
const resultPage = document.getElementById("result-page");

let currentQuestion = 0;
let attempted = 0;
let score = 0;
const questions = [
    { text: "What is 2+2?", options: ["2", "3", "4", "5"], correct: 3, marks: 1 },
    { text: "What is 5*5?", options: ["10", "15", "25", "30"], correct: 3, marks: 2 },
    // Add more questions here
];
const answers = [];

// Form Submit Event
form.addEventListener("submit", (e) => {
    e.preventDefault();
    document.getElementById("display-username").innerText = form.username.value;
    document.getElementById("display-email").innerText = form.email.value;
    document.getElementById("display-phone").innerText = form.phone.value;
    document.getElementById("display-university").innerText = form.university.value;

    userForm.style.display = "none";
    testPage.style.display = "block";
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
        btn.onclick = () => selectAnswer(index + 1);
    });
    updateStatus();
}

function selectAnswer(option) {
    if (!answers[currentQuestion]) attempted++;
    answers[currentQuestion] = option;
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
    resultPage.style.display = "block";

    const message =
        score > 50
            ? "🎉 Congratulations! You passed."
            : `You scored ${score}. Keep trying!`;

    document.getElementById("result-message").innerHTML = `<p>${message}</p>`;
    const answersList = document.getElementById("correct-answers");
    questions.forEach((q, index) => {
        const li = document.createElement("li");
        li.textContent = `${q.text} - Correct Answer: ${
            q.options[q.correct - 1]
        }`;
        answersList.appendChild(li);
    });
}
