from pydantic import BaseModel


class TeacherPreferences(BaseModel):
    default_passing_percentage: int = 50
    at_risk_threshold_percentage: int = 50
    default_show_result_immediately: bool = True
    default_leaderboard_visible: bool = False
    default_randomize_questions: bool = False
    default_randomize_options: bool = False
    default_allow_late_join: bool = False
    default_allow_retake: bool = False
