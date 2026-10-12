from .base_page import BasePage


class AuthPage(BasePage):
    path = "/auth.html"

    def login(self, username: str, password: str, remember: bool = False, session_seconds: int | None = None):
        self.tid("login-username-input").fill(username)
        self.tid("login-password-input").fill(password)
        if remember:
            self.tid("login-remember-checkbox").check()
        if session_seconds is not None:
            self.tid("session-timeout-input").fill(str(session_seconds))
        self.tid("login-submit-btn").click()

    def logout(self):
        self.tid("logout-btn").click()
