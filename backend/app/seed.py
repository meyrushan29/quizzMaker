import random
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .core.security import create_password_hash
from .models import Answer, Question, Quiz, QuizSession, QuizStatus, SessionStatus, Student, User

MATTER_QUESTIONS = [
    {"text": "Which state of matter has a fixed shape and a fixed volume?", "a": "Liquid", "b": "Gas", "c": "Solid", "d": "Plasma", "correct": "C", "topic": "Matter", "difficulty": "Easy"},
    {"text": "What does mass measure?", "a": "The amount of matter in an object", "b": "The force of gravity on an object", "c": "The space an object occupies", "d": "The temperature of an object", "correct": "A", "topic": "Matter", "difficulty": "Easy"},
    {"text": "Which process changes a liquid directly into a gas at its surface, below boiling point?", "a": "Condensation", "b": "Evaporation", "c": "Sublimation", "d": "Freezing", "correct": "B", "topic": "Matter", "difficulty": "Easy"},
    {"text": "Which of the following best describes density?", "a": "Mass per unit volume", "b": "Volume per unit mass", "c": "Weight per unit area", "d": "Force per unit mass", "correct": "A", "topic": "Matter", "difficulty": "Medium"},
    {"text": "A gas has no fixed shape and no fixed volume because its particles...", "a": "are tightly packed and vibrate in place", "b": "are far apart and move freely", "c": "are arranged in a rigid lattice", "d": "do not move at all", "correct": "B", "topic": "Matter", "difficulty": "Medium"},
    {"text": "Which change of state is called sublimation?", "a": "Solid to gas directly", "b": "Gas to liquid", "c": "Liquid to solid", "d": "Solid to liquid", "correct": "A", "topic": "Matter", "difficulty": "Medium"},
    {"text": "Which of these is an example of a chemical change in matter?", "a": "Melting ice", "b": "Burning wood", "c": "Boiling water", "d": "Crushing chalk", "correct": "B", "topic": "Matter", "difficulty": "Medium"},
    {"text": "What happens to the particles of a substance when it is heated?", "a": "They move faster and spread apart", "b": "They stop moving completely", "c": "They shrink in size", "d": "They lose mass", "correct": "A", "topic": "Matter", "difficulty": "Easy"},
    {"text": "Which of the following is NOT a state of matter studied at O/L?", "a": "Solid", "b": "Liquid", "c": "Gas", "d": "Energy", "correct": "D", "topic": "Matter", "difficulty": "Easy"},
    {"text": "Ice floats on water mainly because ice is...", "a": "less dense than water", "b": "more dense than water", "c": "the same density as water", "d": "warmer than water", "correct": "A", "topic": "Matter", "difficulty": "Hard"},
    {"text": "What is the SI unit of mass?", "a": "Newton", "b": "Litre", "c": "Kilogram", "d": "Metre", "correct": "C", "topic": "Measurement", "difficulty": "Easy"},
    {"text": "What is the SI unit of volume for liquids commonly used in the lab?", "a": "Kilogram", "b": "Litre", "c": "Newton", "d": "Metre", "correct": "B", "topic": "Measurement", "difficulty": "Easy"},
    {"text": "Which instrument is used to measure the volume of a liquid accurately?", "a": "Thermometer", "b": "Measuring cylinder", "c": "Spring balance", "d": "Voltmeter", "correct": "B", "topic": "Measurement", "difficulty": "Easy"},
    {"text": "Which instrument is used to measure mass in the laboratory?", "a": "Metre rule", "b": "Stopwatch", "c": "Beam balance", "d": "Barometer", "correct": "C", "topic": "Measurement", "difficulty": "Medium"},
    {"text": "1000 cm^3 is equal to how many litres?", "a": "0.1 L", "b": "1 L", "c": "10 L", "d": "100 L", "correct": "B", "topic": "Measurement", "difficulty": "Medium"},
]

FORCE_QUESTIONS = [
    {"text": "What is the SI unit of force?", "a": "Joule", "b": "Newton", "c": "Watt", "d": "Pascal", "correct": "B", "topic": "Force", "difficulty": "Easy"},
    {"text": "Which one is a vector quantity?", "a": "Speed", "b": "Distance", "c": "Displacement", "d": "Mass", "correct": "C", "topic": "Force", "difficulty": "Medium"},
    {"text": "What is the approximate acceleration due to gravity on Earth?", "a": "9.8 m/s^2", "b": "9.8 km/h^2", "c": "10 N", "d": "1 m/s^2", "correct": "A", "topic": "Force", "difficulty": "Medium"},
    {"text": "Which law states that every action has an equal and opposite reaction?", "a": "Newton's First Law", "b": "Newton's Second Law", "c": "Newton's Third Law", "d": "Law of Gravitation", "correct": "C", "topic": "Force", "difficulty": "Medium"},
    {"text": "A force that opposes the relative motion between two surfaces in contact is called...", "a": "Gravity", "b": "Tension", "c": "Friction", "d": "Magnetism", "correct": "C", "topic": "Force", "difficulty": "Easy"},
    {"text": "Which of these best states Newton's First Law of Motion?", "a": "F = ma", "b": "An object stays at rest or moves at constant velocity unless acted on by a net force", "c": "Every action has an equal and opposite reaction", "d": "Energy cannot be created or destroyed", "correct": "B", "topic": "Force", "difficulty": "Hard"},
    {"text": "What is the formula for force according to Newton's Second Law?", "a": "F = m/a", "b": "F = ma", "c": "F = m + a", "d": "F = a/m", "correct": "B", "topic": "Force", "difficulty": "Medium"},
    {"text": "Weight is best described as...", "a": "The amount of matter in an object", "b": "The force of gravity acting on an object", "c": "The resistance of an object to acceleration", "d": "The volume of an object", "correct": "B", "topic": "Force", "difficulty": "Easy"},
    {"text": "Which of the following increases friction between two surfaces?", "a": "Making the surfaces smoother", "b": "Adding lubricant", "c": "Making the surfaces rougher", "d": "Reducing contact area", "correct": "C", "topic": "Force", "difficulty": "Medium"},
    {"text": "A balanced force on an object results in...", "a": "Acceleration", "b": "No change in motion", "c": "An increase in mass", "d": "A change in direction only", "correct": "B", "topic": "Force", "difficulty": "Hard"},
    {"text": "What is the SI unit of speed?", "a": "m/s", "b": "m/s^2", "c": "N", "d": "kg", "correct": "A", "topic": "Motion", "difficulty": "Easy"},
    {"text": "Distance is a ___ quantity while displacement is a ___ quantity.", "a": "vector, scalar", "b": "scalar, vector", "c": "scalar, scalar", "d": "vector, vector", "correct": "B", "topic": "Motion", "difficulty": "Medium"},
    {"text": "An object moving in a straight line at constant speed has...", "a": "zero acceleration", "b": "increasing acceleration", "c": "decreasing acceleration", "d": "constant deceleration", "correct": "A", "topic": "Motion", "difficulty": "Medium"},
    {"text": "Acceleration is defined as the rate of change of...", "a": "distance", "b": "velocity", "c": "mass", "d": "force", "correct": "B", "topic": "Motion", "difficulty": "Medium"},
    {"text": "If a car's velocity-time graph is a horizontal line, the car is...", "a": "accelerating", "b": "decelerating", "c": "moving at constant velocity", "d": "stationary", "correct": "C", "topic": "Motion", "difficulty": "Hard"},
]

ENERGY_QUESTIONS = [
    {"text": "What is the SI unit of energy?", "a": "Newton", "b": "Watt", "c": "Joule", "d": "Pascal", "correct": "C", "topic": "Energy", "difficulty": "Easy"},
    {"text": "Which law states that energy cannot be created or destroyed, only transformed?", "a": "Law of Conservation of Mass", "b": "Law of Conservation of Energy", "c": "Newton's First Law", "d": "Ohm's Law", "correct": "B", "topic": "Energy", "difficulty": "Medium"},
    {"text": "The energy possessed by a moving object is called...", "a": "Potential energy", "b": "Chemical energy", "c": "Kinetic energy", "d": "Thermal energy", "correct": "C", "topic": "Energy", "difficulty": "Easy"},
    {"text": "The energy stored in an object due to its position is called...", "a": "Kinetic energy", "b": "Potential energy", "c": "Sound energy", "d": "Electrical energy", "correct": "B", "topic": "Energy", "difficulty": "Easy"},
    {"text": "Which formula correctly gives kinetic energy?", "a": "KE = mgh", "b": "KE = 1/2 mv^2", "c": "KE = Fd", "d": "KE = m/v", "correct": "B", "topic": "Energy", "difficulty": "Hard"},
    {"text": "Which formula correctly gives gravitational potential energy?", "a": "PE = mgh", "b": "PE = 1/2 mv^2", "c": "PE = Fd", "d": "PE = ma", "correct": "A", "topic": "Energy", "difficulty": "Hard"},
    {"text": "Which of these is a renewable source of energy?", "a": "Coal", "b": "Natural gas", "c": "Solar energy", "d": "Petroleum", "correct": "C", "topic": "Energy", "difficulty": "Easy"},
    {"text": "In a hydroelectric power plant, which energy conversion mainly takes place?", "a": "Chemical to electrical", "b": "Potential to kinetic to electrical", "c": "Nuclear to thermal", "d": "Light to electrical", "correct": "B", "topic": "Energy", "difficulty": "Medium"},
    {"text": "Which of the following best describes thermal energy?", "a": "Energy due to the motion of particles in a substance", "b": "Energy stored in chemical bonds", "c": "Energy carried by light waves", "d": "Energy due to an object's position", "correct": "A", "topic": "Energy", "difficulty": "Medium"},
    {"text": "A ball held above the ground has mostly...", "a": "Kinetic energy", "b": "Potential energy", "c": "Sound energy", "d": "No energy", "correct": "B", "topic": "Energy", "difficulty": "Easy"},
    {"text": "What is the SI unit of power?", "a": "Joule", "b": "Newton", "c": "Watt", "d": "Volt", "correct": "C", "topic": "Work & Power", "difficulty": "Easy"},
    {"text": "Work done is calculated using which formula?", "a": "W = F x d", "b": "W = m x a", "c": "W = P x t", "d": "W = F / d", "correct": "A", "topic": "Work & Power", "difficulty": "Medium"},
    {"text": "Power is defined as...", "a": "Force applied over a distance", "b": "The rate at which work is done", "c": "The total energy stored in a system", "d": "The mass of an object times gravity", "correct": "B", "topic": "Work & Power", "difficulty": "Medium"},
    {"text": "If no displacement occurs in the direction of an applied force, the work done is...", "a": "Maximum", "b": "Negative", "c": "Zero", "d": "Equal to the force", "correct": "C", "topic": "Work & Power", "difficulty": "Hard"},
    {"text": "A machine that does 100 J of work in 5 seconds has a power output of...", "a": "20 W", "b": "500 W", "c": "5 W", "d": "105 W", "correct": "A", "topic": "Work & Power", "difficulty": "Hard"},
]

STUDENT_NAMES = [
    "Kavin Raj", "Arjun Kumar", "Tharindu Silva", "Nimal Perera", "Sasha Fernando",
    "Priya Senanayake", "Dilan Jayasuriya", "Manuela Gomes", "Rohan Silva", "Tania Perera",
]


async def _create_graded_session(
    db: AsyncSession,
    quiz: Quiz,
    student: Student,
    questions: list[Question],
    score_ratio: float,
    days_ago: int,
    rng: random.Random,
) -> None:
    submitted_at = datetime.utcnow() - timedelta(days=days_ago)
    started_at = submitted_at - timedelta(minutes=rng.randint(8, quiz.duration))

    correct_target = round(len(questions) * score_ratio)
    indices = list(range(len(questions)))
    rng.shuffle(indices)
    correct_indices = set(indices[:correct_target])

    session = QuizSession(
        quiz_id=quiz.id,
        student_id=student.id,
        attempt_number=1,
        joined_at=started_at,
        started_at=started_at,
        submitted_at=submitted_at,
        status=SessionStatus.submitted.value,
    )
    db.add(session)
    await db.flush()

    score = correct = wrong = 0
    for i, question in enumerate(questions):
        if i in correct_indices:
            selected = question.correct_answer
            is_correct = True
            correct += 1
            score += question.marks
        else:
            wrong_options = [k for k in ("A", "B", "C", "D") if k != question.correct_answer]
            selected = rng.choice(wrong_options)
            is_correct = False
            wrong += 1
        db.add(
            Answer(
                session_id=session.id,
                question_id=question.id,
                selected_answer=selected,
                is_correct=is_correct,
                answered_at=started_at + timedelta(seconds=rng.randint(10, 90) * (i + 1)),
            )
        )

    total_marks = sum(q.marks for q in questions) or 1
    session.score = score
    session.correct_count = correct
    session.wrong_count = wrong
    session.unanswered_count = 0
    session.percentage = round((score / total_marks) * 100)
    session.time_taken_seconds = int((submitted_at - started_at).total_seconds())


async def seed_demo_data(db: AsyncSession) -> None:
    existing = await db.execute(select(User).where(User.email == "teacher@example.com"))
    if existing.scalars().first():
        return

    rng = random.Random(42)

    teacher = User(
        email="teacher@example.com",
        password_hash=create_password_hash("Password123!"),
        role="teacher",
        preferences={
            "default_passing_percentage": 50,
            "at_risk_threshold_percentage": 50,
            "default_show_result_immediately": True,
            "default_leaderboard_visible": False,
            "default_randomize_questions": False,
            "default_randomize_options": False,
            "default_allow_late_join": False,
            "default_allow_retake": False,
        },
    )
    db.add(teacher)
    await db.flush()

    students = [
        Student(student_id=f"STU{str(i + 1).zfill(3)}", name=name, grade="Grade 10", class_name="10-A", subject="Science")
        for i, name in enumerate(STUDENT_NAMES)
    ]
    db.add_all(students)
    await db.flush()

    quiz_definitions = [
        {
            "title": "Grade 10 Science - Matter",
            "subject": "Science",
            "grade": "Grade 10",
            "chapter": "Matter",
            "description": "Properties, states and measurement of matter.",
            "duration": 20,
            "passing_percentage": 50,
            "status": QuizStatus.completed.value,
            "leaderboard_visible": True,
            "questions": MATTER_QUESTIONS,
            "days_ago": 12,
            "participants": 8,
        },
        {
            "title": "Grade 10 Science - Force",
            "subject": "Science",
            "grade": "Grade 10",
            "chapter": "Force",
            "description": "Force, motion and Newton's laws.",
            "duration": 18,
            "passing_percentage": 50,
            "status": QuizStatus.completed.value,
            "leaderboard_visible": True,
            "questions": FORCE_QUESTIONS,
            "days_ago": 5,
            "participants": 7,
        },
        {
            "title": "Grade 10 Science - Energy",
            "subject": "Science",
            "grade": "Grade 10",
            "chapter": "Energy",
            "description": "Forms of energy, work and power.",
            "duration": 22,
            "passing_percentage": 50,
            "status": QuizStatus.draft.value,
            "leaderboard_visible": False,
            "questions": ENERGY_QUESTIONS,
            "days_ago": None,
            "participants": 0,
        },
    ]

    for quiz_data in quiz_definitions:
        question_defs = quiz_data.pop("questions")
        days_ago = quiz_data.pop("days_ago")
        participants = quiz_data.pop("participants")

        quiz = Quiz(
            **quiz_data,
            total_marks=len(question_defs),
            randomize_questions=False,
            randomize_options=False,
            show_result_immediately=True,
            allow_retake=False,
            allow_late_join=False,
            created_by=teacher.id,
        )
        db.add(quiz)
        await db.flush()

        questions = [
            Question(
                quiz_id=quiz.id,
                order_index=i,
                question_text=q["text"],
                option_a=q["a"],
                option_b=q["b"],
                option_c=q["c"],
                option_d=q["d"],
                correct_answer=q["correct"],
                marks=1,
                topic=q["topic"],
                difficulty=q["difficulty"],
            )
            for i, q in enumerate(question_defs)
        ]
        db.add_all(questions)
        await db.flush()

        if quiz.status == QuizStatus.completed.value and participants:
            quiz.quiz_code = f"{quiz.subject[:3].upper()}{rng.randint(100, 999)}"
            quiz.started_at = datetime.utcnow() - timedelta(days=days_ago, minutes=quiz.duration)
            quiz.ends_at = datetime.utcnow() - timedelta(days=days_ago)
            participating_students = students[:participants]
            for student in participating_students:
                score_ratio = rng.uniform(0.35, 0.98)
                await _create_graded_session(db, quiz, student, questions, score_ratio, days_ago, rng)

    await db.commit()
